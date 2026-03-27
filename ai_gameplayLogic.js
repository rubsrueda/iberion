// ======================================================================================
// ===           IA v17.1 - VERSIÓN CONSOLIDADA Y ESTABLE                           ===
// ===       Integra la lógica de aiLogic.js, a.js y b.js en una única base        ===
// ======================================================================================
console.log("ai_gameplayLogic.js v17.1 CONSOLIDADO CARGADO");

const AiGameplayManager = {
    unitRoles: new Map(),
    turn_targets: new Set(),
    strategicAxes: [], // Guardará los 4 puntos de objetivo para los ejes
    missionAssignments: new Map(), // Guardará misiones del tipo (unitId -> missionDetails)
    _lastNodeList: {},
    _lastDecisionLog: {},
    _config: null,
    _constructionQueue: new Map(), // playerNumber -> { hex: {r,c}, structureType, turnoCreado, nodoRazon }
    _occupyThenBuildMissions: new Map(), // unitId -> { targetR, targetC, structureType, turnsActive }

    _trace: function(event, payload = {}) {
        try {
            const trace = {
                event,
                turn: gameState?.turnNumber,
                phase: gameState?.currentPhase,
                currentPlayer: gameState?.currentPlayer,
                ts: Date.now(),
                ...payload
            };
            console.log(`[IA TRACE] ${JSON.stringify(trace)}`);
        } catch (e) {
            console.warn(`[IA TRACE] Error serializando traza '${event}': ${e.message}`);
        }
    },

    _registrarDecisionMotor: function(playerNumber, payload) {
        if (!payload) return;

        this._config = IaConfigManager.get() || this._config;
        this._lastNodeList[playerNumber] = payload.nodos || [];
        this._lastDecisionLog[playerNumber] = {
            turnNumber: gameState.turnNumber,
            playerNumber,
            nivel: payload.nivel || 'N/A',
            accion: payload.accion || payload.recomendacion?.accion || payload.recomendacion?.tipo || 'SIN_ACCION',
            nodo: payload.nodo || payload.recomendacion?.nodo_tipo || payload.recomendacion?.tipo || 'SIN_NODO',
            prioridad: payload.prioridad || payload.recomendacion?.prioridad || 'N/A',
            razon_texto: payload.razon_texto || payload.recomendacion?.razon_texto || 'Sin razon_texto',
            snapshot: payload.snapshot || null
        };

        const log = this._lastDecisionLog[playerNumber];
        console.log(
            `[IA-MOTOR] TURNO:${log.turnNumber} JUGADOR:${playerNumber} NIVEL:${log.nivel} ACCION:${log.accion} NODO:${log.nodo} PRIORIDAD:${log.prioridad} RAZON:${log.razon_texto}`
        );

        if (typeof Chronicle !== 'undefined' && (log.nivel === 0 || log.nivel === 1 || log.prioridad === 'CRÍTICA' || log.prioridad === 'ALTA')) {
            Chronicle.logEvent('ia_decision', {
                playerNumber,
                nivel: log.nivel,
                accion: log.accion,
                nodo: log.nodo,
                prioridad: log.prioridad,
                razon_texto: log.razon_texto
            });
        }
    },
    
    executeTurn: async function(playerNumber) {
        AiGameplayManager.missionAssignments = new Map();
        console.group(`%c[IA Turn] INICIO para Jugador IA ${playerNumber} | Turno ${gameState.turnNumber}`, "background: #333; color: #98fb98; font-size: 1.1em;");
        console.log(`[IA DEBUG] ownedHexPercentage=${AiGameplayManager.ownedHexPercentage(playerNumber)}`);
        AiGameplayManager._trace('turn_start', {
            playerNumber,
            ownedHexPercentage: AiGameplayManager.ownedHexPercentage(playerNumber)
        });

            // --- FASE 1: CREACIÓN DE UNIDADES (APERTURA LEGACY) ---
        const ownUnitsAtTurnStart = units.filter(u => u.player === playerNumber && u.currentHealth > 0);
        const deployedCount = gameState.unitsPlacedByPlayer?.[playerNumber] || 0;
        const hasDeployedOpeningForce = deployedCount > 0 || ownUnitsAtTurnStart.some(u => (u.name || '').includes('Pionero de Corredor'));

        if (gameState.turnNumber === 1 && AiGameplayManager.ownedHexPercentage(playerNumber) < 0.2) {
            if (hasDeployedOpeningForce) {
                console.log(`[IA STRATEGY] Gran Apertura SKIP: ya existe fuerza de despliegue inicial (${ownUnitsAtTurnStart.length} unidades, placed=${deployedCount}).`);
            } else {
                console.log(`[IA STRATEGY] Ejecutando Gran Apertura...`);
                await AiGameplayManager._executeGrandOpening_v20(playerNumber);
            }
        }

        // --- FASE 1b: EVALUACIÓN ESTRATÉGICA CON MOTOR DE DECISIONES (FASE 2c) ---
        // Inicializa el módulo de integración con la decisión actual
        AiGameplayManager._currentMotorDecision = null;
        console.log(`[IA DEBUG] IaIntegration disponible: ${typeof IaIntegration !== 'undefined'}`);
        console.log(`[IA DEBUG] IaDecisionEngine disponible: ${typeof IaDecisionEngine !== 'undefined'}`);
        
        if (typeof IaIntegration !== 'undefined') {
            try {
                const decision = await IaIntegration.inicializarTurnoConDecision(playerNumber);
                if (decision) {
                    AiGameplayManager._currentMotorDecision = decision; // GUARDAR PARA planStrategicObjectives
                    AiGameplayManager._trace('motor_decision', {
                        playerNumber,
                        accion: decision?.recomendacion?.accion || decision?.recomendacion?.tipo || 'N/A',
                        nodo: decision?.recomendacion?.nodo_tipo || decision?.recomendacion?.tipo || 'N/A',
                        prioridad: decision?.recomendacion?.prioridad || 'N/A',
                        prioritarios: decision?.prioritarios?.slice(0, 5).map(n => ({ tipo: n.tipo, r: n.r, c: n.c, peso: n.peso })) || []
                    });
                    this._registrarDecisionMotor(playerNumber, {
                        ...decision,
                        nivel: decision.criteriosActivados?.capitalAmenazada ? 0 : decision.criteriosActivados?.crisisEconomica ? 2 : 1,
                        accion: decision.recomendacion?.accion || decision.recomendacion?.tipo,
                        nodo: decision.recomendacion?.nodo_tipo || decision.recomendacion?.tipo,
                        prioridad: decision.recomendacion?.prioridad,
                        razon_texto: decision.recomendacion?.razon_texto
                    });
                    console.log(`[IA DEBUG] ✓ Motor decision cacheada: ${decision.prioritarios?.length || 0} nodos prioritarios`);
                } else {
                    console.warn(`[IA DEBUG] ✗ Motor decision NULL`);
                    AiGameplayManager._trace('motor_decision_null', { playerNumber });
                }
            } catch (e) {
                console.error(`[IA DEBUG] ERROR en inicializarTurnoConDecision: ${e.message}`);
                AiGameplayManager._trace('motor_decision_error', { playerNumber, error: e.message });
            }
        }
            
            // La gestión del imperio (construcción, investigación, producción normal) se ejecuta DESPUÉS
            // de la Gran Apertura o en su lugar en turnos posteriores.
            console.log(`[IA STRATEGY] Ejecutando gestión de imperio...`);
        await AiGameplayManager.manageEmpire(playerNumber);

            // --- FASE 2: ACCIÓN DE UNIDADES ---
            // Se crea la lista de unidades a mover DESPUÉS de que TODAS las fases de creación hayan terminado.
            // Esto garantiza que tanto las unidades de la Gran Apertura como las de producción normal
            // se incluyan en la lista de acciones de este turno.
        const unitsToAction = units.filter(u => u.player === playerNumber && u.currentHealth > 0 && !u.hasMoved);
            console.log(`[IA PLANNER] ${unitsToAction.length} unidades listas para actuar este turno.`);
        AiGameplayManager._trace('planner_units_to_action', {
            playerNumber,
            units: unitsToAction.map(u => ({ id: u.id, name: u.name, r: u.r, c: u.c, regs: u.regiments?.length || 0 }))
        });

            // 1. Primero, se intenta activar el protocolo de consolidación.
            //    Esta función "marca" a las unidades necesarias con misiones de CONSOLIDATE/AWAIT.
        this._checkForConsolidationProtocol(playerNumber);

            // 2. A continuación, se planifican los ejes estratégicos de expansión.
        this.planStrategicObjectives(playerNumber);

            // 3. Finalmente, se asignan misiones de expansión (AXIS_ADVANCE)
            //    SOLAMENTE a aquellas unidades que AÚN NO tienen una misión asignada.
        const unassignedUnits = unitsToAction.filter(u => !this.missionAssignments.has(u.id));
        this.assignUnitsToAxes(playerNumber, unassignedUnits);
        AiGameplayManager._trace('planner_assignments_ready', {
            playerNumber,
            assignedCount: this.missionAssignments.size,
            assignments: Array.from(this.missionAssignments.entries()).map(([unitId, m]) => ({
                unitId,
                type: m?.type,
                objective: m?.objective ? { r: m.objective.r, c: m.objective.c } : null,
                nodoTipo: m?.nodoTipo || null,
                axisName: m?.axisName || null
            }))
        });
        
            // <<== FIN DE LA LÓGICA CORREGIDA ==>>

            // --- FASE 3: EJECUCIÓN DE ACCIONES ---
            // La ejecución se mantiene igual, ya que cada unidad ahora tiene una misión clara.
        unitsToAction.sort((a, b) => (b.currentMovement || b.movement) - (a.currentMovement || a.movement));

        for (const unit of unitsToAction) {
            const unitInMemory = getUnitById(unit.id);
                // Comprobamos de nuevo por si una acción anterior (ej. fusión) ya la ha hecho actuar.
            if (unitInMemory?.currentHealth > 0 && !unitInMemory.hasMoved) {

                if (typeof centerMapOn === 'function') centerMapOn(unitInMemory.r, unitInMemory.c);
                
                await AiGameplayManager.decideAndExecuteUnitAction(unitInMemory);
                await new Promise(resolve => setTimeout(resolve, 200)); 
            }
        }
        
        // Una vez que todas las unidades han actuado, la IA finaliza su turno.
        // --- RELAY AFTERMATH PASS ---
        // Units spawned by relay-splits during this turn were not in the original unitsToAction snapshot.
        // Give them a chance to act (e.g., chain a second relay or build a road).
        const originalIds = new Set(unitsToAction.map(u => u.id));
        const relaySpawned = units.filter(u =>
            u.player === playerNumber &&
            u.currentHealth > 0 &&
            !u.hasMoved &&
            !originalIds.has(u.id) &&
            AiGameplayManager.missionAssignments.has(u.id)
        );
        if (relaySpawned.length > 0) {
            AiGameplayManager._trace('relay_aftermath_pass', { playerNumber, count: relaySpawned.length, unitIds: relaySpawned.map(u => u.id) });
        }
        for (const unit of relaySpawned) {
            const unitInMem = getUnitById(unit.id);
            if (unitInMem?.currentHealth > 0 && !unitInMem.hasMoved) {
                if (typeof centerMapOn === 'function') centerMapOn(unitInMem.r, unitInMem.c);
                await AiGameplayManager.decideAndExecuteUnitAction(unitInMem);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        console.log(`[IA Gameplay] Todas las unidades han actuado. Finalizando turno de la IA en 1.5 segundos...`);
        
        setTimeout(() => {
            // Se asegura de que el turno sigue siendo de la IA antes de pasarlo,
            // para evitar conflictos si el jugador abandona la partida mientras tanto.
            if (gameState.currentPlayer === playerNumber && gameState.currentPhase === 'play') {
                if (typeof handleEndTurn === "function") {
                    handleEndTurn();
                } else {
                    console.error("CRÍTICO: handleEndTurn no está disponible para que la IA termine su turno.");
                }
            }
        }, 1500); // Espera 1.5 segundos para que la última animación se vea.
        
        // Limpiar cache de integración (FASE 2c)
        if (typeof IaIntegration !== 'undefined') {
            IaIntegration.limpiarCache();
        }

        AiGameplayManager._trace('turn_end', {
            playerNumber,
            actedUnits: unitsToAction.length
        });
        
        console.groupEnd();
    },
        
    manageEmpire: async function(playerNumber) {
        console.groupCollapsed(`%c[IA Empire] Gestión Estratégica`, "color: #4CAF50");

        // PRIORIDAD MÁXIMA: DEFENSA DE LA CAPITAL
        const capitalDefenseActivated = this._executeCapitalDefenseProtocol(playerNumber);

        // Si el protocolo de defensa se activó, la IA no hace nada más en esta fase.
        // Se centra completamente en la producción de emergencia.
        if (capitalDefenseActivated) {
            console.log("[IA Empire] Protocolo de defensa de capital activado. Omitiendo otras gestiones de imperio.");
            console.groupEnd();
            return;
        }

        // SI NO HAY AMENAZA EN LA CAPITAL, CONTINÚA CON LA LÓGICA NORMAL:

        // TAREA CONTINUA: Flujos orgánicos autónomos (independientes del motor de decisión).
        // Camino + Caravana se ejecutan sin ponderación y por pares válidos.
        AiGameplayManager._ensureTradeInfrastructureOrganic(playerNumber);

        // TAREA CONTINUA: Evolución orgánica de asentamientos.
        AiGameplayManager._ensureCityExpansionOrganic(playerNumber);

        await AiGameplayManager._handle_BOA_Construction(playerNumber);

        // PRIORIDAD 2: PRODUCCIÓN AVANZADA DESDE LAS BASES (Lógica de a.js integrada)
        await AiGameplayManager._handle_BOA_Production(playerNumber);

        // PRIORIDAD 3: REFUERZOS DE DEFENSA (Fallback si no hay producción avanzada)
        AiGameplayManager.handleStrategicReinforcements(playerNumber);
        
        // PRIORIDAD 4: MANTENER PRESIÓN Y EXPANSIÓN (Fallback final)
        AiGameplayManager.handlePressureProduction(playerNumber);

        // Tarea continua: construir proyectos de carreteras
        AiGameplayManager.executeRoadProjects(playerNumber);
        
        console.groupEnd();
    },
    
    _handle_BOA_Construction: async function(playerNumber) {
        console.log("[DIAGNÓSTICO] Entrando en _handle_BOA_Construction (v5 All-in-One).");
        
        // PUNTO 1: Limpiar cola de construcción si pasaron 2+ turnos
        const playerQueue = AiGameplayManager._constructionQueue.get(playerNumber);
        if (playerQueue && (gameState.turnNumber - playerQueue.turnoCreado) >= 2) {
            console.log(`[IA CONSTRUCCIÓN] Limpiando cola de construcción desactualizada (creada en turno ${playerQueue.turnoCreado})`);
            AiGameplayManager._constructionQueue.delete(playerNumber);
        }

        const playerRes = gameState.playerResources[playerNumber];
        const playerTechs = playerRes.researchedTechnologies || [];

        // Integración IA nodal: convertir corredor_comercial en tareas OCCUPY_THEN_BUILD.
        if (typeof IaDecisionEngine !== 'undefined' && typeof IaDecisionEngine.evaluarEstadoYTomarDecision === 'function') {
            try {
                const decision = this._currentMotorDecision || await IaDecisionEngine.evaluarEstadoYTomarDecision(playerNumber);
                const nodoCorredor = decision?.prioritarios?.find(n => n.tipo === 'corredor_comercial');
                // IaNodoValor.crearNodo no copia 'origen'/'destino' — basta con que el nodo exista.
                if (nodoCorredor) {
                    await this._runCommercialCorridorController(playerNumber, nodoCorredor);
                }
            } catch (e) {
                console.warn('[IA CORREDOR] No se pudo generar misión de corredor_comercial:', e?.message || e);
            }
        }

        // Programa BOA de fortificaciones: se mantiene desde turno 6.
        if (gameState.turnNumber < 6 || AiGameplayManager.fortressCount(playerNumber) >= 2) {
            return;
        }

        // --- FASE 1: INVESTIGACIÓN ---
        // Si no tiene la tecnología, la investiga y el código CONTINÚA.
        if (!playerTechs.includes('FORTIFICATIONS')) {
            console.log("[DIAGNÓSTICO] Fase 1: Necesita investigar para FORTIFICATIONS.");
            const pathToFortifications = AiGameplayManager._findTechPath('FORTIFICATIONS', playerTechs);
            
            if (pathToFortifications && pathToFortifications.length > 0) {
                for (const techId of pathToFortifications) {
                    console.log(`   -> Investigando prerrequisito: ${techId}.`);
                    if (typeof attemptToResearch === "function") {
                        // La función attemptToResearch ya valida y consume los recursos.
                        // Si falla, se detendrá internamente y no podremos continuar.
                        attemptToResearch(techId);
                    }
                }
            }
        }
        
        // --- FASE 2: CONSTRUCCIÓN (Solo si ahora tiene la tecnología) ---
        // Volvemos a comprobar si, tras la fase de investigación, ya tenemos la tecnología.
        if (playerTechs.includes('FORTIFICATIONS')) {
            console.log("[DIAGNÓSTICO] Fase 2: Tiene tecnología. Buscando ubicación para construir...");
            const location = AiGameplayManager._findBestFortressLocation(playerNumber);

            if (!location) {
                console.log("[DIAGNÓSTICO] Saliendo: No se encontró ubicación candidata válida.");
                return;
            }

            const hexToBuild = board[location.r]?.[location.c];
            if (!hexToBuild) return;

            // PUNTO 1: VALIDACIÓN GUARDRAIL: ¿La IA posee este hex?
            if (hexToBuild.owner !== playerNumber) {
                console.warn(`%c[IA CONSTRUCCIÓN] ⚠️ GUARDRAIL ACTIVADO: Hex (${location.r},${location.c}) NO pertenece a la IA (dueño: ${hexToBuild.owner}).`, "color: #FF6B6B; background: #FFE5E5; padding: 5px;");
                // PUNTO 2: Crear misión OCCUPY_THEN_BUILD en lugar de intentar construir
                const nearestUnit = units.filter(u => u.player === playerNumber && u.currentHealth > 0)
                    .sort((a, b) => hexDistance(a.r, a.c, location.r, location.c) - hexDistance(b.r, b.c, location.r, location.c))[0];
                if (nearestUnit) {
                    console.log(`[IA CONSTRUCCIÓN] 📍 Creando misión OCCUPY_THEN_BUILD para ${nearestUnit.name}`);
                    AiGameplayManager.missionAssignments.set(nearestUnit.id, {
                        type: 'OCCUPY_THEN_BUILD',
                        objective: location,
                        structureType: 'Camino',
                        nodoRazon: 'BOA_CONSTRUCTION'
                    });
                    AiGameplayManager._constructionQueue.set(playerNumber, {
                        r: location.r,
                        c: location.c,
                        structureType: 'Fortaleza',
                        turnoCreado: gameState.turnNumber,
                        nodoRazon: 'BOA_CONSTRUCTION'
                    });
                }
                return;
            }

            // PUNTO 3: TRAZABILIDAD - Logging completo antes de construir
            const capitalDist = gameState.cities.find(c => c.isCapital && c.owner === playerNumber)
                ? hexDistance(location.r, location.c, gameState.cities.find(c => c.isCapital && c.owner === playerNumber).r, gameState.cities.find(c => c.isCapital && c.owner === playerNumber).c)
                : -1;
            
            console.log(`%c[IA BUILD DECISION] TURNO=${gameState.turnNumber} FASE=${gameState.currentPhase} JUGADOR=${playerNumber} ESTR=Camino (${location.r},${location.c}) DUENO=${hexToBuild.owner} RAZON=BOA_CONSTRUCTION DIST=${capitalDist}`, "color: #4CAF50; font-weight: bold;");

            // <<== LÓGICA DE CONSTRUCCIÓN SECUENCIAL SIN RETORNOS ==>>

            // 2.1: Construir CAMINO si es necesario.
            if (!hexToBuild.structure) {
                const roadCost = STRUCTURE_TYPES['Camino'].cost;
                if (playerRes.piedra >= roadCost.piedra && playerRes.madera >= roadCost.madera) {
                    console.log(`%c      -> ¡EJECUTANDO PASO 1! Construcción de Camino en (${location.r}, ${location.c}).`, "color: lightblue");
                    handleConfirmBuildStructure({ playerId: playerNumber, r: location.r, c: location.c, structureType: 'Camino' });
                    await new Promise(resolve => setTimeout(resolve, 20)); // Pequeña pausa para asegurar la actualización del estado
                }
            }

            // 2.2: Construir FORTALEZA si ya hay un camino.
            // Volvemos a leer el estado del hex para asegurarnos de que el camino se ha construido.
            const hexAfterRoad = board[location.r]?.[location.c];
            if (hexAfterRoad && hexAfterRoad.structure === 'Camino') {
                const fortCost = STRUCTURE_TYPES['Fortaleza'].cost;
                if (playerRes.oro >= fortCost.oro && playerRes.piedra >= fortCost.piedra && playerRes.hierro >= fortCost.hierro) {
                    console.log(`%c      -> ¡EJECUTANDO PASO 2! Mejora a Fortaleza en (${location.r}, ${location.c}).`, "color: lightgreen");
                    console.log(`%c[IA BUILD DECISION] TURNO=${gameState.turnNumber} FASE=${gameState.currentPhase} JUGADOR=${playerNumber} ESTR=Fortaleza (${location.r},${location.c}) DUENO=${playerNumber} RAZON=BOA_CONSTRUCTION DIST=${capitalDist}`, "color: #4CAF50; font-weight: bold;");
                    handleConfirmBuildStructure({ playerId: playerNumber, r: location.r, c: location.c, structureType: 'Fortaleza' });
                    await new Promise(resolve => setTimeout(resolve, 20)); // Pequeña pausa
                    
                    AiGameplayManager.planRoadProject(playerNumber, location);
                }
            }
        } else {
            console.log("[DIAGNÓSTICO] Fin: Aún no tiene la tecnología de fortificaciones tras la fase de investigación (probablemente por falta de puntos).");
        }
    },

    _runCommercialCorridorController: async function(playerNumber, nodoCorredor) {
        if (!nodoCorredor) return null;
        if (!gameState.ai_corridor_controller) gameState.ai_corridor_controller = {};

        // Derivar origen de la capital si el nodo no lo incluye (IaNodoValor.crearNodo no copia campos extra).
        const capitalCity = (gameState.cities || []).find(c => c.isCapital && c.owner === playerNumber);
        const nodeOrigen = nodoCorredor.origen || (capitalCity ? { r: capitalCity.r, c: capitalCity.c } : { r: nodoCorredor.r, c: nodoCorredor.c });

        const networkPlan = this._getCommercialNetworkPlan(playerNumber);
        if (!networkPlan.connections.length) {
            console.warn(`[IA CORREDOR] sin_ruta jugador=${playerNumber} turn=${gameState.turnNumber} nodes=${networkPlan.nodes.length} (bank=${networkPlan.nodes.some(n => n?.isBank)})`);
            AiGameplayManager._trace('corridor_no_route', {
                playerNumber,
                turnNumber: gameState.turnNumber,
                nodeCount: networkPlan.nodes.length,
                hasBankNode: networkPlan.nodes.some(n => n?.isBank)
            });
            this._assignFallbackEconomicMission(playerNumber, nodeOrigen, 'SIN_RED_COMERCIAL');
            gameState.ai_corridor_controller[playerNumber] = { phase: 'sin_ruta', turnNumber: gameState.turnNumber };
            return null;
        }

        const pendingCaptureConnections = networkPlan.connections
            .filter(conn => (conn.pendingCaptureSegments?.length || 0) > 0)
            .sort((a, b) => {
                const bankDiff = Number(b.hasBank) - Number(a.hasBank);
                if (bankDiff !== 0) return bankDiff;
                const capDiff = a.pendingCaptureSegments.length - b.pendingCaptureSegments.length;
                if (capDiff !== 0) return capDiff;
                return a.path.length - b.path.length;
            });

        const roadworkConnections = networkPlan.connections
            .filter(conn => (conn.pendingCaptureSegments?.length || 0) === 0 && (conn.missingOwnedSegments?.length || 0) > 0)
            .sort((a, b) => {
                const bankDiff = Number(b.hasBank) - Number(a.hasBank);
                if (bankDiff !== 0) return bankDiff;
                const roadDiff = a.missingOwnedSegments.length - b.missingOwnedSegments.length;
                if (roadDiff !== 0) return roadDiff;
                return a.path.length - b.path.length;
            });

        const activeConnection = pendingCaptureConnections[0] || roadworkConnections[0] || networkPlan.connections[0];
        const corridorNode = {
            ...nodoCorredor,
            origen: { r: activeConnection.from.r, c: activeConnection.from.c },
            destino: { r: activeConnection.to.r, c: activeConnection.to.c },
            destino_tipo: activeConnection.hasBank ? 'banca' : 'ciudad'
        };
        let corridorStatus = this._updateCommercialCorridorState(playerNumber, corridorNode, activeConnection.path);
        const corridorDebug = this._describeCommercialCorridor(playerNumber, activeConnection.path);

        console.log(`[IA CORREDOR TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} red_nodos=${networkPlan.nodes.length} conexiones=${networkPlan.connections.length} enlace=${activeConnection.from.name || `${activeConnection.from.r},${activeConnection.from.c}`}→${activeConnection.to.name || `${activeConnection.to.r},${activeConnection.to.c}`} bank=${activeConnection.hasBank} path=${activeConnection.path.length} oper=${corridorStatus.operational} faltantes=${corridorDebug.missingCount} sin_camino=${corridorDebug.roadMissingCount || 0} bloqueados=${corridorDebug.blockedCount}`);

        if (pendingCaptureConnections.length > 0) {
            const pendingCapture = activeConnection.pendingCaptureSegments;
            const availableUnits = units
                .filter(u => u.player === playerNumber && u.currentHealth > 0 && !u.hasMoved)
                .filter(u => {
                    const mission = this.missionAssignments.get(u.id);
                    return !mission || ['IA_NODE', 'AXIS_ADVANCE'].includes(mission.type);
                });

            const assignedTargets = [];
            const assignedIds = new Set();
            pendingCapture.slice(0, Math.min(2, pendingCapture.length)).forEach(targetHex => {
                const chosen = availableUnits
                    .filter(u => !assignedIds.has(u.id))
                    .sort((a, b) => {
                        const aPioneer = (a.name || '').includes('Pionero') ? -1 : 0;
                        const bPioneer = (b.name || '').includes('Pionero') ? -1 : 0;
                        if (aPioneer !== bPioneer) return aPioneer - bPioneer;
                        return hexDistance(a.r, a.c, targetHex.r, targetHex.c) - hexDistance(b.r, b.c, targetHex.r, targetHex.c);
                    })[0];

                if (!chosen) return;
                assignedIds.add(chosen.id);
                assignedTargets.push({ unitId: chosen.id, target: { r: targetHex.r, c: targetHex.c } });
                this.missionAssignments.set(chosen.id, {
                    type: 'OCCUPY_THEN_BUILD',
                    objective: { r: targetHex.r, c: targetHex.c },
                    structureType: 'Camino',
                    nodoRazon: 'CORREDOR_COMERCIAL'
                });
            });

            gameState.ai_corridor_controller[playerNumber] = {
                phase: 'capture',
                turnNumber: gameState.turnNumber,
                pendingCount: pendingCapture.length,
                assignedTargets,
                connection: {
                    from: { r: activeConnection.from.r, c: activeConnection.from.c },
                    to: { r: activeConnection.to.r, c: activeConnection.to.c },
                    hasBank: activeConnection.hasBank
                }
            };
            AiGameplayManager._trace('corridor_capture_phase', {
                playerNumber,
                pendingCount: pendingCapture.length,
                assignedTargets,
                hasBank: activeConnection.hasBank
            });
            return gameState.ai_corridor_controller[playerNumber];
        }

        if (roadworkConnections.length > 0) {
            console.log(`[IA ROADWORK START] playerNumber=${playerNumber}, pathLength=${activeConnection.path.length}, unownedCount=${corridorStatus.unownedCount}, roadMissing=${corridorStatus.roadMissingCount}`);
            const roadwork = await this._ensureOwnedCorridorRoadwork(playerNumber, activeConnection.path);
            console.log(`[IA ROADWORK RESULT] playerNumber=${playerNumber}, built=${roadwork?.built}, reason=${roadwork?.reason}, at=${roadwork?.at ? `(${roadwork.at.r},${roadwork.at.c})` : 'N/A'}`);
            if (roadwork?.built) {
                corridorStatus = this._updateCommercialCorridorState(playerNumber, corridorNode, activeConnection.path);
                AiGameplayManager._trace('corridor_roadwork_built', {
                    playerNumber,
                    at: roadwork.at,
                    status: {
                        operational: corridorStatus.operational,
                        unownedCount: corridorStatus.unownedCount,
                        roadMissingCount: corridorStatus.roadMissingCount
                    },
                    hasBank: activeConnection.hasBank
                });
            }

            gameState.ai_corridor_controller[playerNumber] = {
                phase: roadwork?.reason === 'desalojo_asignado' ? 'vacate' : 'roadwork',
                turnNumber: gameState.turnNumber,
                roadMissingCount: corridorStatus.roadMissingCount,
                connection: {
                    from: { r: activeConnection.from.r, c: activeConnection.from.c },
                    to: { r: activeConnection.to.r, c: activeConnection.to.c },
                    hasBank: activeConnection.hasBank
                }
            };
            AiGameplayManager._trace('corridor_infrastructure_phase', {
                playerNumber,
                operational: corridorStatus.operational,
                unownedCount: corridorStatus.unownedCount,
                roadMissingCount: corridorStatus.roadMissingCount,
                phase: gameState.ai_corridor_controller[playerNumber].phase,
                hasBank: activeConnection.hasBank
            });
            return gameState.ai_corridor_controller[playerNumber];
        }

        const tradeCandidate = this._pickNextCommercialTradeRoutePair(playerNumber, networkPlan);
        if (tradeCandidate) {
            gameState.ai_corridor_controller[playerNumber] = {
                phase: 'trade',
                turnNumber: gameState.turnNumber,
                connection: {
                    from: { r: tradeCandidate.from.r, c: tradeCandidate.from.c },
                    to: { r: tradeCandidate.to.r, c: tradeCandidate.to.c },
                    hasBank: tradeCandidate.hasBank
                }
            };
            const established = this._tryEstablishTradeRouteBetweenCities(playerNumber, tradeCandidate.from, tradeCandidate.to, tradeCandidate.infraPath);
            AiGameplayManager._trace('corridor_trade_phase', {
                playerNumber,
                established,
                from: { r: tradeCandidate.from.r, c: tradeCandidate.from.c },
                to: { r: tradeCandidate.to.r, c: tradeCandidate.to.c },
                hasBank: tradeCandidate.hasBank
            });
            if (established) return gameState.ai_corridor_controller[playerNumber];
        }

        gameState.ai_corridor_controller[playerNumber] = { phase: 'idle', turnNumber: gameState.turnNumber };
        return gameState.ai_corridor_controller[playerNumber];
    },

    _buildCommercialCorridorPath: function(playerNumber, origen, destino) {
        const startHex = board[origen.r]?.[origen.c];
        const endHex = board[destino.r]?.[destino.c];
        if (!startHex || !endHex) return [];

        const startKey = `${origen.r},${origen.c}`;
        const goalKey = `${destino.r},${destino.c}`;
        const queue = [{ r: origen.r, c: origen.c }];
        const visited = new Set([startKey]);
        const prev = new Map();

        while (queue.length > 0) {
            const cur = queue.shift();
            const curKey = `${cur.r},${cur.c}`;
            if (curKey === goalKey) break;

            for (const next of getHexNeighbors(cur.r, cur.c)) {
                const key = `${next.r},${next.c}`;
                if (visited.has(key)) continue;
                const hex = board[next.r]?.[next.c];
                if (!hex) continue;
                const isGoal = key === goalKey;
                // Permitir llegar al objetivo aunque su hex no sea "construible" para camino.
                if (!isGoal && !this._canBuildRoadOnHex(hex)) continue;
                visited.add(key);
                prev.set(key, curKey);
                queue.push({ r: next.r, c: next.c });
            }
        }

        if (!visited.has(goalKey)) return [];

        const path = [];
        let walk = goalKey;
        while (walk) {
            const [r, c] = walk.split(',').map(Number);
            path.push({ r, c });
            walk = prev.get(walk);
        }
        path.reverse();
        return path;
    },

    _canBuildRoadOnHex: function(hex) {
        if (!hex) return false;
        if (hex.terrain === 'forest' || hex.terrain === 'water') return false;
        if (TERRAIN_TYPES[hex.terrain]?.isImpassableForLand) return false;
        return true;
    },

    _assignFallbackEconomicMission: function(playerNumber, origen, reason) {
        const candidates = [];

        const bancos = board.flat().filter(h => h && h.isBank && h.owner === 0);
        for (const b of bancos) {
            candidates.push({
                tipo: 'banca',
                r: b.r,
                c: b.c,
                score: 120
            });
        }

        const ciudadesLibres = (gameState.cities || []).filter(c => c.owner === null || c.owner === 0);
        for (const ciudad of ciudadesLibres) {
            candidates.push({
                tipo: 'ciudad_libre',
                r: ciudad.r,
                c: ciudad.c,
                score: 100
            });
        }

        if (candidates.length === 0) return false;

        const unidades = units.filter(u => u.player === playerNumber && u.currentHealth > 0);
        if (unidades.length === 0) return false;

        const evaluados = [];
        for (const cand of candidates) {
            const unit = unidades
                .slice()
                .sort((a, b) => hexDistance(a.r, a.c, cand.r, cand.c) - hexDistance(b.r, b.c, cand.r, cand.c))
                .find(u => {
                    const p = this.findPathToTarget(u, cand.r, cand.c);
                    return p && p.length > 1;
                });

            if (!unit) continue;

            const distOrigen = origen ? hexDistance(origen.r, origen.c, cand.r, cand.c) : 0;
            const distUnidad = hexDistance(unit.r, unit.c, cand.r, cand.c);
            const utilidad = cand.score - distOrigen * 3 - distUnidad * 2;
            evaluados.push({ cand, unit, utilidad });
        }

        if (evaluados.length === 0) return false;
        evaluados.sort((a, b) => b.utilidad - a.utilidad);
        const elegido = evaluados[0];

        AiGameplayManager.missionAssignments.set(elegido.unit.id, {
            type: 'IA_NODE',
            objective: { r: elegido.cand.r, c: elegido.cand.c },
            nodoRazon: `CORREDOR_FALLBACK_${reason}`,
            fallbackTipo: elegido.cand.tipo
        });

        console.log(`[IA CORREDOR] Fallback activado (${reason}): ${elegido.cand.tipo} en (${elegido.cand.r},${elegido.cand.c})`);
        return true;
    },

    _getCommercialCorridorProgress: function(path, playerNumber) {
        if (!Array.isArray(path) || path.length < 2) {
            return { unownedCount: 0, roadMissingCount: 0, blockedCount: 0 };
        }

        const roadReadyStructures = new Set(['Camino', 'Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli']);
        let unownedCount = 0;
        let roadMissingCount = 0;
        let blockedCount = 0;

        path.forEach((p, idx) => {
            const isEndpoint = idx === 0 || idx === path.length - 1;
            if (isEndpoint) return;

            const hex = board[p.r]?.[p.c];
            if (!hex) {
                blockedCount++;
                return;
            }
            if (!this._canBuildRoadOnHex(hex)) {
                blockedCount++;
                return;
            }
            if (hex.owner !== playerNumber) {
                unownedCount++;
                return;
            }

            const city = this._getCityAtHex(p.r, p.c);
            const hasRoadReadyStructure = roadReadyStructures.has(hex.structure);
            const isOwnCity = !!(city && city.owner === playerNumber);
            if (!hasRoadReadyStructure && !isOwnCity) {
                roadMissingCount++;
            }
        });

        return { unownedCount, roadMissingCount, blockedCount };
    },

    _getCommercialCorridorPendingHexes: function(playerNumber, destination) {
        const capital = gameState.cities?.find(c => c.owner === playerNumber && c.isCapital);
        if (!capital || !destination) return [];

        const path = this._buildCommercialCorridorPath(playerNumber, capital, destination);
        if (!Array.isArray(path) || path.length < 2) return [];

        return path
            .map((p, idx) => ({ ...p, idx }))
            .filter(p => {
                const hex = board[p.r]?.[p.c];
                const isEndpoint = p.idx === 0 || p.idx === path.length - 1;
                if (!hex || isEndpoint) return false;
                if (hex.isCity) return false;
                return hex.owner !== playerNumber && this._canBuildRoadOnHex(hex);
            })
            .sort((a, b) => a.idx - b.idx);
    },

    _selectCommercialCityTarget: function(playerNumber, originPoint, preferredPoint = null) {
        const cities = (gameState.cities || []).filter(c => c && (c.owner === playerNumber || c.owner === null || c.owner === 0));
        const originCity = originPoint ? cities.find(c => c.r === originPoint.r && c.c === originPoint.c) : null;
        const candidates = cities.filter(c => !originCity || c.r !== originCity.r || c.c !== originCity.c);
        if (!originCity || candidates.length === 0) return preferredPoint || null;

        const preferredCity = preferredPoint ? candidates.find(c => c.r === preferredPoint.r && c.c === preferredPoint.c) : null;
        let best = null;

        for (const city of candidates) {
            const path = this._buildCommercialCorridorPath(playerNumber, originCity, city);
            if (!Array.isArray(path) || path.length < 2) continue;

            const isBank = city.owner === 0 && !!city.isBank;
            const isOwn = city.owner === playerNumber;
            const isNeutral = city.owner === null || (city.owner === 0 && !city.isBank);
            const dist = hexDistance(originCity.r, originCity.c, city.r, city.c);
            let score = 0;

            if (isOwn) score += 220;
            if (isNeutral) score += 120;
            if (isBank) score -= 80;
            if (preferredCity && city.r === preferredCity.r && city.c === preferredCity.c) score += 40;

            score -= path.length * 10;
            score -= dist * 4;

            if (!best || score > best.score) {
                best = {
                    city,
                    path,
                    score,
                    destinationType: isBank ? 'banca' : (isOwn ? 'ciudad_propia' : 'ciudad_neutral')
                };
            }
        }

        if (!best) return preferredPoint || null;

        return {
            r: best.city.r,
            c: best.city.c,
            owner: best.city.owner,
            isBank: !!best.city.isBank,
            name: best.city.name,
            destinationType: best.destinationType,
            path: best.path
        };
    },

    _getBankCity: function() {
        const bankFromCities = (gameState.cities || []).find(c => c && c.owner === 0 && c.isBank);
        if (bankFromCities) return bankFromCities;

        // Fallback robusto: en algunos escenarios la Banca existe en board pero no en gameState.cities.
        const bankHex = board?.flat?.().find(h => h && h.owner === 0 && h.isBank);
        if (!bankHex) return null;

        return {
            id: `bank-${bankHex.r}-${bankHex.c}`,
            name: 'La Banca',
            owner: 0,
            isBank: true,
            isCapital: false,
            r: bankHex.r,
            c: bankHex.c
        };
    },

    _getCommercialNetworkNodes: function(playerNumber) {
        const ownCities = (gameState.cities || []).filter(c => c && c.owner === playerNumber);
        const bankCity = this._getBankCity();
        return bankCity ? ownCities.concat([bankCity]) : ownCities;
    },

    _getCommercialNetworkConnection: function(playerNumber, cityA, cityB) {
        if (!cityA || !cityB) return null;
        const path = this._buildCommercialCorridorPath(playerNumber, cityA, cityB);
        if (!Array.isArray(path) || path.length < 2) return null;

        const roadReadyStructures = new Set(['Camino', 'Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli']);
        const pendingCaptureSegments = [];
        const missingOwnedSegments = [];

        path.forEach((step, idx) => {
            const isEndpoint = idx === 0 || idx === path.length - 1;
            if (isEndpoint) return;
            const hex = board[step.r]?.[step.c];
            if (!hex || hex.isCity || !this._canBuildRoadOnHex(hex)) return;
            if (hex.owner !== playerNumber) {
                pendingCaptureSegments.push({ r: step.r, c: step.c, idx });
                return;
            }
            const city = this._getCityAtHex(step.r, step.c);
            const isOwnCity = !!(city && city.owner === playerNumber);
            if (!isOwnCity && !roadReadyStructures.has(hex.structure)) {
                missingOwnedSegments.push({ r: step.r, c: step.c, idx });
            }
        });

        return {
            from: cityA,
            to: cityB,
            path,
            pendingCaptureSegments,
            missingOwnedSegments,
            hasBank: !!(cityA.isBank || cityB.isBank)
        };
    },

    _getCommercialNetworkPlan: function(playerNumber) {
        const nodes = this._getCommercialNetworkNodes(playerNumber);
        const capital = nodes.find(c => c.owner === playerNumber && c.isCapital) || nodes.find(c => c.owner === playerNumber) || nodes[0] || null;
        if (!capital || nodes.length < 2) {
            return { nodes, connections: [] };
        }

        const connected = [capital];
        const remaining = nodes.filter(c => c !== capital);
        const connections = [];

        while (remaining.length > 0) {
            let best = null;
            let bestIndex = -1;

            for (let i = 0; i < remaining.length; i++) {
                const target = remaining[i];
                for (const source of connected) {
                    const conn = this._getCommercialNetworkConnection(playerNumber, source, target);
                    if (!conn) continue;
                    const connScore = conn.path.length - (conn.hasBank ? 1 : 0);
                    const bestScore = best ? (best.path.length - (best.hasBank ? 1 : 0)) : Number.POSITIVE_INFINITY;
                    if (!best || connScore < bestScore) {
                        best = conn;
                        bestIndex = i;
                    }
                }
            }

            if (!best) break;
            connections.push(best);
            connected.push(best.to);
            remaining.splice(bestIndex, 1);
        }

        return { nodes, connections };
    },

    _pickNextCommercialTradeRoutePair: function(playerNumber, networkPlan) {
        const existingPairs = this._getExistingTradeRoutePairs(playerNumber);
        let best = null;

        for (const connection of networkPlan.connections || []) {
            const pairKey = this._getTradePairKey(connection.from, connection.to);
            if (!pairKey || existingPairs.has(pairKey)) continue;
            const infraPath = findInfrastructurePath(connection.from, connection.to, { allowForeignInfrastructure: true });
            if (!infraPath || infraPath.length === 0) continue;

            const score = (connection.hasBank ? 200 : 120) - infraPath.length;
            if (!best || score > best.score) {
                best = { ...connection, infraPath, score };
            }
        }

        return best;
    },

    _updateCommercialCorridorState: function(playerNumber, nodoCorredor, path) {
        if (!gameState.ai_corridor_status) gameState.ai_corridor_status = {};
        const operational = this._isCommercialCorridorOperational(playerNumber, path);
        const progress = this._getCommercialCorridorProgress(path, playerNumber);
        const status = {
            operational,
            turnNumber: gameState.turnNumber,
            origen: nodoCorredor?.origen || null,
            destino: nodoCorredor?.destino || null,
            targetR: nodoCorredor?.r,
            targetC: nodoCorredor?.c,
            pathLength: path?.length || 0,
            unownedCount: progress.unownedCount,
            roadMissingCount: progress.roadMissingCount,
            blockedCount: progress.blockedCount
        };
        console.log(`[CORRIDOR STATUS UPDATE] player=${playerNumber}, operational=${operational}, unowned=${progress.unownedCount}, roadMissing=${progress.roadMissingCount}, blocked=${progress.blockedCount}`);
        gameState.ai_corridor_status[playerNumber] = status;
        return status;
    },

    _isCommercialCorridorOperational: function(playerNumber, path) {
        if (!Array.isArray(path) || path.length < 2) return false;

        return path.every((p, idx) => {
            const hex = board[p.r]?.[p.c];
            if (!hex) return false;

            const isEndpoint = idx === 0 || idx === path.length - 1;
            const city = this._getCityAtHex(p.r, p.c);

            if (isEndpoint) {
                if (city) return city.owner === playerNumber || city.owner === 0;
                return hex.owner === playerNumber || hex.owner === 0;
            }

            if (!this._canBuildRoadOnHex(hex)) return false;
            if (hex.owner !== playerNumber) return false;
            if (city && city.owner === playerNumber) return true;

            return ['Camino', 'Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli'].includes(hex.structure);
        });
    },

    _activateCommercialEconomy: function(playerNumber, corridorStatus) {
        if (this._tryEstablishTradeRouteForCorridor(playerNumber, corridorStatus)) {
            console.log('[IA CORREDOR] Corredor operativo: ruta comercial activada.');
            return true;
        }

        // Reintento inmediato: la primera llamada puede producir la columna y la segunda activar la ruta.
        if (this._tryEstablishTradeRouteForCorridor(playerNumber, corridorStatus)) {
            console.log('[IA CORREDOR] Corredor operativo: ruta comercial activada en reintento.');
            return true;
        }

        const ownCaravan = units.find(u => u.player === playerNumber && (u.tradeRoute || u.regiments?.some(r => r.type === 'Caravana')));
        if (!ownCaravan) return false;

        const escort = units
            .filter(u => u.player === playerNumber && u.id !== ownCaravan.id && !u.tradeRoute && u.currentHealth > 0)
            .sort((a, b) => hexDistance(a.r, a.c, ownCaravan.r, ownCaravan.c) - hexDistance(b.r, b.c, ownCaravan.r, ownCaravan.c))[0];

        if (!escort) return false;

        this.missionAssignments.set(escort.id, {
            type: 'IA_NODE',
            objective: { r: ownCaravan.r, c: ownCaravan.c },
            nodoRazon: 'ESCOLTAR_CARAVANA_CORREDOR'
        });
        return true;
    },

    _ensureOwnedCorridorRoadwork: async function(playerNumber, path) {
        console.log(`[ROADWORK DEBUG] START: playerNumber=${playerNumber}, pathLength=${path?.length}`);
        if (!Array.isArray(path) || path.length < 2) {
            console.log(`[ROADWORK DEBUG] FAIL: pathLength invalid (${path?.length})`);
            return { built: false, builtCount: 0, reason: 'sin_ruta' };
        }

        const roadReadyStructures = new Set(['Camino', 'Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli']);
        const pathSet = new Set(path.map(p => `${p.r},${p.c}`));
        const buildTargets = [];

        for (let idx = 1; idx < path.length - 1; idx++) {
            const p = path[idx];
            const hex = board[p.r]?.[p.c];
            if (!hex || !this._canBuildRoadOnHex(hex) || hex.owner !== playerNumber) continue;

            const city = this._getCityAtHex(p.r, p.c);
            const isOwnCity = !!(city && city.owner === playerNumber);
            if (isOwnCity || roadReadyStructures.has(hex.structure)) continue;

            buildTargets.push({ r: p.r, c: p.c });
        }

        if (buildTargets.length === 0) {
            console.log('[ROADWORK DEBUG] No hay tramos propios pendientes de Camino.');
            return { built: false, builtCount: 0, reason: 'sin_tramo_propio_sin_camino' };
        }

        // Paso 1: si el tramo está ocupado, asignar misión explícita de desalojo.
        let vacateAssignedCount = 0;
        for (const target of buildTargets) {
            const occupant = getUnitOnHex(target.r, target.c);
            if (!occupant || occupant.player !== playerNumber) continue;

            const bestVacate = getHexNeighbors(target.r, target.c)
                .filter(n => !pathSet.has(`${n.r},${n.c}`))
                .map(n => board[n.r]?.[n.c])
                .filter(h => h && !h.unit && h.owner === playerNumber && !TERRAIN_TYPES[h.terrain]?.isImpassableForLand)
                .sort((a, b) => {
                    const da = path.reduce((acc, p) => Math.min(acc, hexDistance(a.r, a.c, p.r, p.c)), Number.POSITIVE_INFINITY);
                    const db = path.reduce((acc, p) => Math.min(acc, hexDistance(b.r, b.c, p.r, p.c)), Number.POSITIVE_INFINITY);
                    return db - da;
                })[0];

            if (bestVacate && !occupant.hasMoved && (occupant.currentMovement || occupant.movement || 0) > 0) {
                console.log(`[ROADWORK DEBUG] Asignando desalojo a ${occupant.name} de (${target.r},${target.c}) hacia (${bestVacate.r},${bestVacate.c})`);
                AiGameplayManager.missionAssignments.set(occupant.id, {
                    type: 'VACATE_CORRIDOR_FOR_ROADWORK',
                    objective: { r: bestVacate.r, c: bestVacate.c },
                    corridorHex: { r: target.r, c: target.c },
                    nodoRazon: 'CORREDOR_COMERCIAL'
                });
                vacateAssignedCount++;
            }
        }

        // Paso 2: construir Camino en todos los tramos propios despejados.
        let builtCount = 0;
        let firstBuiltAt = null;
        for (const target of buildTargets) {
            const stillOccupied = getUnitOnHex(target.r, target.c);
            if (stillOccupied) {
                console.log(`[ROADWORK DEBUG] Skip build en (${target.r},${target.c}) por ocupación persistente.`);
                continue;
            }

            const built = this.attemptConstructionAtHex(playerNumber, target.r, target.c, 'Camino', 'CORREDOR_COMERCIAL');
            if (built) {
                builtCount++;
                if (!firstBuiltAt) firstBuiltAt = { r: target.r, c: target.c };
            }
        }

        console.log(`[ROADWORK DEBUG] END: vacateAssigned=${vacateAssignedCount}, built=${builtCount}`);
        return {
            built: builtCount > 0,
            builtCount,
            reason: builtCount > 0 ? 'camino_construido' : (vacateAssignedCount > 0 ? 'desalojo_asignado' : 'sin_construccion_efectiva'),
            at: firstBuiltAt
        };
    },

    _tryEstablishTradeRouteForCorridor: function(playerNumber, corridorStatus) {
        if (!corridorStatus?.operational) {
            console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=corredor_no_operativo`);
            return false;
        }
        const origin = this._resolveTradeCityForCorridor(playerNumber, corridorStatus.origen, true, true);
        const destination = this._selectTradeRouteDestination(playerNumber, origin, corridorStatus.destino);
        return this._tryEstablishTradeRouteBetweenCities(playerNumber, origin, destination);
    },

    _tryEstablishTradeRouteBetweenCities: function(playerNumber, originInput, destinationInput, forcedInfraPath = null) {
        if (typeof findInfrastructurePath !== 'function') {
            console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=findInfrastructurePath_no_disponible`);
            return false;
        }

        let origin = originInput;
        const destination = destinationInput;
        if (!origin || !destination) {
            console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=ciudad_origen_destino_invalida_o_sin_ruta_disponible`);
            return false;
        }

        const unitAtOrigin = getUnitOnHex(origin.r, origin.c);
        if (unitAtOrigin && unitAtOrigin.player === playerNumber && !unitAtOrigin.tradeRoute) {
            const relocated = this._tryRelocateUnitFromCityCenter(unitAtOrigin, origin);
            if (!relocated) {
                const altOrigin = this._resolveTradeCityForCorridor(playerNumber, null, true, true);
                if (altOrigin && (altOrigin.r !== origin.r || altOrigin.c !== origin.c)) {
                    origin = altOrigin;
                } else {
                    console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=origen_ocupado_sin_ciudad_libre unidad=${unitAtOrigin.name}`);
                    return false;
                }
            } else {
                console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=origen_despejado unidad=${unitAtOrigin.name}`);
            }
        }

        const infraPath = forcedInfraPath || findInfrastructurePath(origin, destination, { allowForeignInfrastructure: true });
        if (!infraPath || infraPath.length === 0) {
            console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=infraPath_vacio origen=(${origin.r},${origin.c}) destino=(${destination.r},${destination.c})`);
            return false;
        }

        let supplyUnit = units.find(u =>
            u.player === playerNumber &&
            !u.tradeRoute &&
            u.r === origin.r && u.c === origin.c &&
            u.regiments?.some(reg => (REGIMENT_TYPES[reg.type]?.abilities || []).includes('provide_supply'))
        );

        if (!supplyUnit) {
            supplyUnit = this.produceUnit(playerNumber, ['Columna de Suministro'], 'trader', 'Columna de Suministro', origin);
        }

        if (!supplyUnit) {
            supplyUnit = units.find(u =>
                u.player === playerNumber &&
                !u.tradeRoute &&
                u.currentHealth > 0 &&
                u.regiments?.some(reg => (REGIMENT_TYPES[reg.type]?.abilities || []).includes('provide_supply'))
            ) || null;
        }

        if (!supplyUnit) {
            console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=no_hay_columna_suministro`);
            return false;
        }

        const ok = this._requestEstablishTradeRoute(supplyUnit, origin, destination, infraPath);
        console.log(`[IA CARAVANA TRACE] turno=${gameState.turnNumber} jugador=${playerNumber} motivo=${ok ? 'ruta_solicitada' : 'fallo_request'} unidad=${supplyUnit.name} origen=${origin.name || `${origin.r},${origin.c}`} destino=${destination.name || `${destination.r},${destination.c}`} path=${infraPath.length}`);
        return ok;
    },

    _tryRelocateUnitFromCityCenter: function(blockingUnit, city) {
        if (!blockingUnit || !city) return false;
        const options = getHexNeighbors(city.r, city.c)
            .map(n => board[n.r]?.[n.c])
            .filter(h => h && !h.unit && h.owner === blockingUnit.player && !TERRAIN_TYPES[h.terrain]?.isImpassableForLand)
            .sort((a, b) => hexDistance(a.r, a.c, city.r, city.c) - hexDistance(b.r, b.c, city.r, city.c));

        const step = options[0];
        if (!step) return false;
        if (typeof _executeMoveUnit === 'function') {
            _executeMoveUnit(blockingUnit, step.r, step.c);
            return true;
        }
        return false;
    },

    _resolveTradeCityForCorridor: function(playerNumber, point, requireOwn, preferFreeCenter = false) {
        const cities = gameState.cities || [];
        const exact = point ? cities.find(c => c.r === point.r && c.c === point.c) : null;
        if (exact) {
            if (requireOwn && exact.owner === playerNumber) {
                if (!preferFreeCenter || !getUnitOnHex(exact.r, exact.c)) return exact;
            }
            if (!requireOwn && (exact.owner === playerNumber || exact.owner === 0)) return exact;
        }

        if (requireOwn) {
            const ownCities = cities.filter(c => c.owner === playerNumber);
            if (preferFreeCenter) {
                const freeCapital = ownCities.find(c => c.isCapital && !getUnitOnHex(c.r, c.c));
                if (freeCapital) return freeCapital;
                const anyFree = ownCities.find(c => !getUnitOnHex(c.r, c.c));
                if (anyFree) return anyFree;
            }
            return ownCities.find(c => c.isCapital) || ownCities[0] || null;
        }

        return cities.find(c => c.owner === 0) || cities.find(c => c.owner === playerNumber && (!point || (c.r !== point.r || c.c !== point.c))) || null;
    },

    _selectTradeRouteDestination: function(playerNumber, origin, preferredPoint) {
        if (!origin) return null;

        const existingPairs = this._getExistingTradeRoutePairs(playerNumber);
        const cities = (gameState.cities || []).filter(c => c && (c.owner === 0 || c.owner === playerNumber));
        const preferredCity = preferredPoint ? cities.find(c => c.r === preferredPoint.r && c.c === preferredPoint.c) : null;

        const orderedCandidates = [
            ...(preferredCity ? [preferredCity] : []),
            ...cities.filter(c => !preferredCity || c.r !== preferredCity.r || c.c !== preferredCity.c)
        ].filter(c => !(c.r === origin.r && c.c === origin.c));

        const rutasActivas = units.filter(u => u.player === playerNumber && !!u.tradeRoute).length;
        orderedCandidates.sort((a, b) => {
            const aIsBank = a.owner === 0 && !!a.isBank ? 1 : 0;
            const bIsBank = b.owner === 0 && !!b.isBank ? 1 : 0;
            const aOwnBias = a.owner === playerNumber ? 180 : 0;
            const bOwnBias = b.owner === playerNumber ? 180 : 0;
            const aNeutralBias = (a.owner === null || (a.owner === 0 && !a.isBank)) ? 80 : 0;
            const bNeutralBias = (b.owner === null || (b.owner === 0 && !b.isBank)) ? 80 : 0;
            const aBankBias = rutasActivas === 0 ? aIsBank * -60 : aIsBank * -120;
            const bBankBias = rutasActivas === 0 ? bIsBank * -60 : bIsBank * -120;
            const aDist = hexDistance(origin.r, origin.c, a.r, a.c);
            const bDist = hexDistance(origin.r, origin.c, b.r, b.c);
            return (bBankBias + bOwnBias + bNeutralBias - bDist * 8) - (aBankBias + aOwnBias + aNeutralBias - aDist * 8);
        });

        for (const city of orderedCandidates) {
            const pairKey = this._getTradePairKey(origin, city);
            if (!pairKey || existingPairs.has(pairKey)) continue;
            const infraPath = findInfrastructurePath(origin, city, { allowForeignInfrastructure: true });
            if (infraPath && infraPath.length > 0) {
                return city;
            }
        }

        return null;
    },

    _getExistingTradeRoutePairs: function(playerNumber) {
        const pairs = new Set();
        for (const unit of units) {
            if (unit.player !== playerNumber || !unit.tradeRoute?.origin || !unit.tradeRoute?.destination) continue;
            const key = this._getTradePairKey(unit.tradeRoute.origin, unit.tradeRoute.destination);
            if (key) pairs.add(key);
        }
        return pairs;
    },

    _getTradePairKey: function(a, b) {
        if (!a || !b) return null;
        const aKey = Number.isInteger(a.r) && Number.isInteger(a.c) ? `${a.r},${a.c}` : a.name;
        const bKey = Number.isInteger(b.r) && Number.isInteger(b.c) ? `${b.r},${b.c}` : b.name;
        if (!aKey || !bKey) return null;
        return [aKey, bKey].sort().join('|');
    },

    _requestEstablishTradeRoute: function(unit, origin, destination, path) {
        if (!unit) return false;
        const action = {
            type: 'establishTradeRoute',
            actionId: `trade_${unit.id}_${Date.now()}`,
            payload: { unitId: unit.id, origin, destination, path }
        };

        if (typeof isNetworkGame === 'function' && isNetworkGame()) {
            if (typeof NetworkManager !== 'undefined' && NetworkManager.esAnfitrion && typeof processActionRequest === 'function') {
                processActionRequest(action);
                return true;
            }
            if (typeof NetworkManager !== 'undefined' && NetworkManager.enviarDatos) {
                NetworkManager.enviarDatos({ type: 'actionRequest', action });
                return true;
            }
            return false;
        }

        if (typeof _executeEstablishTradeRoute === 'function') {
            return !!_executeEstablishTradeRoute(action.payload);
        }

        return false;
    },

    _getCityAtHex: function(r, c) {
        return (gameState.cities || []).find(city => city.r === r && city.c === c) || null;
    },

    _describeCommercialCorridor: function(playerNumber, path) {
        if (!Array.isArray(path) || path.length === 0) {
            return { missingCount: 0, blockedCount: 0, candidateCount: 0, roadMissingCount: 0, summary: 'sin_ruta' };
        }

        const missing = [];
        const blocked = [];
        const roadMissing = [];
        const candidates = [];
        const roadReadyStructures = new Set(['Camino', 'Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli']);

        path.forEach((p, idx) => {
            const isEndpoint = idx === 0 || idx === path.length - 1;
            if (isEndpoint) return;

            const hex = board[p.r]?.[p.c];
            if (!hex) {
                blocked.push(`${idx}:void(${p.r},${p.c})`);
                return;
            }
            if (!this._canBuildRoadOnHex(hex)) {
                blocked.push(`${idx}:${hex.terrain}(${p.r},${p.c})`);
                return;
            }
            if (hex.owner !== playerNumber) {
                missing.push(`${idx}:owner${hex.owner}(${p.r},${p.c})`);
                candidates.push({ r: p.r, c: p.c });
                return;
            }

            const city = this._getCityAtHex(p.r, p.c);
            const hasRoadReadyStructure = roadReadyStructures.has(hex.structure);
            const isOwnCity = !!(city && city.owner === playerNumber);
            if (!hasRoadReadyStructure && !isOwnCity) {
                roadMissing.push(`${idx}:no_road(${p.r},${p.c})`);
            }
        });

        const summaryParts = [];
        if (missing.length > 0) summaryParts.push(`faltan=${missing.slice(0, 4).join('|')}`);
        if (roadMissing.length > 0) summaryParts.push(`sin_camino=${roadMissing.slice(0, 4).join('|')}`);
        if (blocked.length > 0) summaryParts.push(`bloq=${blocked.slice(0, 4).join('|')}`);
        if (summaryParts.length === 0) summaryParts.push('ruta_lista');

        return {
            missingCount: missing.length,
            blockedCount: blocked.length,
            candidateCount: candidates.length,
            roadMissingCount: roadMissing.length,
            summary: summaryParts.join(' ; ')
        };
    },

    _handle_BOA_Production: async function(playerNumber) {
    const bases = board.flat().filter(h => h && h.owner === playerNumber && h.structure === 'Fortaleza');
    if (bases.length === 0) return;
    
    const primaryProductionBase = bases[0];
    
    if (this.ownedHexPercentage(playerNumber) < 0.7) {
        console.log(`%c[IA Empire] Creando unidades desde fortaleza en (${primaryProductionBase.r}, ${primaryProductionBase.c})...`, "color: #DAA520");
        for(let i = 0; i < 6; i++){
            
                // <<== Añadimos comprobación de terreno transitable ==>>
            const spot = getHexNeighbors(primaryProductionBase.r, primaryProductionBase.c).find(n => {
                const hexData = board[n.r]?.[n.c];
                return hexData && !hexData.unit && !TERRAIN_TYPES[hexData.terrain]?.isImpassableForLand;
            });

            if (spot) {
                // <<== CORRECCIÓN: La variable `newUnit` ahora se declara dentro del `if` ==>>
                const newUnit = this.produceUnit(playerNumber, ['Infantería Ligera'], 'explorer', 'Incursor', spot);
                
                // Si la unidad SE PUDO crear (produceUnit no devolvió null)...
                if(newUnit) {
                    console.log(`%c[IA Acción Inmediata] Moviendo la unidad recién creada de BOA: ${newUnit.name}`, "color: #DAA520; font-weight: bold;");
                    await AiGameplayManager.executeGeneralMovement(newUnit); // Ahora `newUnit` existe aquí
                    await new Promise(resolve => setTimeout(resolve, 50));
                } else {
                    break; // Salir si no hay recursos/espacio
                }
            } else {
                console.warn(`[IA BOA Production] No hay espacio libre y TERRESTRE alrededor de la fortaleza.`);
                break;
            }
        }
    }
},
    
    _findTechPath: function(targetTechId, playerTechs) {
        let path = [];
        let toProcess = [targetTechId];
        let processed = new Set();

        while (toProcess.length > 0) {
            const currentTechId = toProcess.shift();
            if (processed.has(currentTechId) || playerTechs.includes(currentTechId)) {
                continue;
            }
            
            const techData = TECHNOLOGY_TREE_DATA[currentTechId];
            if (!techData) return null;

            processed.add(currentTechId);
            path.unshift(currentTechId);

            if (techData.prerequisites) {
                toProcess = techData.prerequisites.concat(toProcess);
            }
        }
        
        return path.filter(tech => !playerTechs.includes(tech));
    },

    _findBestFortressLocation: function(playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
        const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        const existingForts = board.flat().filter(h => h && h.owner === playerNumber && h.structure === 'Fortaleza');

        let candidates = board.flat().filter(h => h && h.terrain === 'hills' && h.owner === playerNumber && !h.structure);
        if (candidates.length === 0) return null;

        let bestCandidate = null;
        let maxScore = -Infinity;

        candidates.forEach(hex => {
            let score = 0;
            if (aiCapital) score += hexDistance(aiCapital.r, aiCapital.c, hex.r, hex.c) * 2;
            if (enemyCapital) score += (100 - hexDistance(hex.r, hex.c, enemyCapital.r, enemyCapital.c));
            if (existingForts.length > 0) {
                const closestFortDist = existingForts.reduce((min, f) => Math.min(min, hexDistance(hex.r, hex.c, f.r, f.c)), Infinity);
                score += closestFortDist * 1.5;
            }
            if (score > maxScore) {
                maxScore = score;
                bestCandidate = hex;
            }
        });
        
        return bestCandidate;
    },

    fortressCount: function(playerNumber){
        return board.flat().filter(h => h && h.owner === playerNumber && h.structure === 'Fortaleza').length;
    },

    /**
     * Sistema orgánico de comercio (autónomo y sin ponderación).
     * Flujos:
     *   1. Creación de caminos: por cada par ciudad propia -> nodo válido, construye camino en tramos propios pendientes.
     *   2. Creación de caravanas: por cada par con ruta de infraestructura válida, crea/usa columna y solicita ruta.
     */
    _ensureTradeInfrastructureOrganic: function(playerNumber) {
        const pairs = AiGameplayManager._getOrganicTradePairs(playerNumber);
        if (pairs.length === 0) {
            console.log(`[IA ORG TRADE] J${playerNumber}: sin pares comerciales válidos.`);
            return;
        }

        console.log(`[IA ORG TRADE] J${playerNumber}: pares comerciales detectados=${pairs.length}`);

        AiGameplayManager._runOrganicRoadCreationFlow(playerNumber, pairs);
        AiGameplayManager._runOrganicCaravanCreationFlow(playerNumber, pairs);
    },

    _getOrganicTradePairs: function(playerNumber) {
        const ownCities = (gameState.cities || []).filter(c => c.owner === playerNumber);
        if (ownCities.length === 0) return [];

        // Destino por ciudad origen: la ciudad permitida más cercana.
        const bankCity = AiGameplayManager._getBankCity ? AiGameplayManager._getBankCity() : null;
        const allCities = (gameState.cities || []).slice();
        const bankAlreadyInCities = bankCity && allCities.some(c => c.r === bankCity.r && c.c === bankCity.c);
        const tradeNodes = bankCity && !bankAlreadyInCities ? [...allCities, bankCity] : [...allCities];

        const pairs = [];
        const seen = new Set();

        for (const origin of ownCities) {
            const candidates = tradeNodes
                .filter(dest => !(dest.r === origin.r && dest.c === origin.c))
                .filter(dest => AiGameplayManager._isOrganicTradeDestinationAllowed(playerNumber, dest))
                .map(dest => {
                    const rawPath = AiGameplayManager._buildCommercialCorridorPath(playerNumber, origin, dest);
                    if (!rawPath || rawPath.length < 2) return null;
                    return {
                        dest,
                        rawPath,
                        dist: hexDistance(origin.r, origin.c, dest.r, dest.c)
                    };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    const ownerA = a.dest.owner;
                    const ownerB = b.dest.owner;
                    const aBank = Number(ownerA === 0 && !!a.dest.isBank);
                    const bBank = Number(ownerB === 0 && !!b.dest.isBank);
                    const aOwn = Number(ownerA === playerNumber);
                    const bOwn = Number(ownerB === playerNumber);
                    const aBarb = Number(AiGameplayManager._isBarbarianOwner(ownerA));
                    const bBarb = Number(AiGameplayManager._isBarbarianOwner(ownerB));

                    // Preferencia: propia > bárbara > banca, y luego la más cercana.
                    const scoreA = (aOwn * 300) + (aBarb * 220) + (aBank * 120) - (a.dist * 10) - a.rawPath.length;
                    const scoreB = (bOwn * 300) + (bBarb * 220) + (bBank * 120) - (b.dist * 10) - b.rawPath.length;
                    return scoreB - scoreA;
                });

            if (candidates.length === 0) continue;
            const chosen = candidates[0];
            const key = `${origin.r},${origin.c}|${chosen.dest.r},${chosen.dest.c}`;
            if (seen.has(key)) continue;
            seen.add(key);
            pairs.push({ key, origin, dest: chosen.dest, rawPath: chosen.rawPath });
        }

        return pairs;
    },

    _isBarbarianOwner: function(owner) {
        if (owner === null || owner === undefined) return false;
        if (typeof BARBARIAN_PLAYER_ID !== 'undefined' && owner === BARBARIAN_PLAYER_ID) return true;
        return Number(owner) === 9;
    },

    _isOrganicTradeDestinationAllowed: function(playerNumber, destinationCity) {
        if (!destinationCity) return false;
        const owner = destinationCity.owner;

        // Regla pedida: destino válido = propia, bárbara o Banca.
        if (owner === playerNumber) return true;
        if (owner === 0) return true; // Banca
        if (AiGameplayManager._isBarbarianOwner(owner)) return true;

        // Opcional defensivo: algunos mapas marcan ciudades bárbaras sin owner fijo.
        if (destinationCity.isBarbarianCity) return true;

        // No abrir rutas orgánicas con otros jugadores aquí.
        return false;
    },

    _findFirstMissingOwnedRoadSegment: function(playerNumber, path) {
        const roadReady = new Set(['Camino', 'Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli']);

        for (let i = 1; i < path.length - 1; i++) {
            const p = path[i];
            const hex = board[p.r]?.[p.c];
            if (!hex || hex.isCity) continue;
            if (hex.owner !== playerNumber) continue;
            if (!AiGameplayManager._canBuildRoadOnHex(hex)) continue;
            if (!roadReady.has(hex.structure)) {
                return { r: p.r, c: p.c };
            }
        }
        return null;
    },

    _runOrganicRoadCreationFlow: function(playerNumber, pairs) {
        const roadReady = new Set(['Camino', 'Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli']);
        const playerRes = gameState.playerResources[playerNumber];
        if (!playerRes) return;

        const claimedTargets = new Set();
        const assignedUnitIds = new Set();
        const availableUnits = units
            .filter(u => u.player === playerNumber && u.currentHealth > 0 && !u.hasMoved)
            .filter(u => {
                const mission = AiGameplayManager.missionAssignments.get(u.id);
                return !mission || ['IA_NODE', 'AXIS_ADVANCE', 'DEFAULT'].includes(mission.type);
            });

        for (const { origin, dest, rawPath: prebuiltPath } of pairs) {
            const rawPath = prebuiltPath || AiGameplayManager._buildCommercialCorridorPath(playerNumber, origin, dest);
            if (!rawPath || rawPath.length < 2) continue;

            // PASO 1: ocupar primera casilla no propia del corredor para habilitar futuro camino.
            const unownedTarget = rawPath
                .map((p, idx) => ({ ...p, idx }))
                .find(p => {
                    const isEndpoint = p.idx === 0 || p.idx === rawPath.length - 1;
                    if (isEndpoint) return false;
                    const hex = board[p.r]?.[p.c];
                    if (!hex || hex.isCity) return false;
                    if (!AiGameplayManager._canBuildRoadOnHex(hex)) return false;
                    return hex.owner !== playerNumber;
                });

            if (unownedTarget) {
                const targetKey = `${unownedTarget.r},${unownedTarget.c}`;
                if (!claimedTargets.has(targetKey)) {
                    const chosenUnit = availableUnits
                        .slice()
                        .filter(u => !assignedUnitIds.has(u.id))
                        .sort((a, b) => hexDistance(a.r, a.c, unownedTarget.r, unownedTarget.c) - hexDistance(b.r, b.c, unownedTarget.r, unownedTarget.c))
                        .find(u => {
                            const pathToTarget = AiGameplayManager.findPathToTarget(u, unownedTarget.r, unownedTarget.c);
                            return !!(pathToTarget && pathToTarget.length > 1);
                        });

                    if (chosenUnit) {
                        AiGameplayManager.missionAssignments.set(chosenUnit.id, {
                            type: 'OCCUPY_THEN_BUILD',
                            objective: { r: unownedTarget.r, c: unownedTarget.c },
                            structureType: 'Camino',
                            nodoRazon: 'ORGANIC_CARAVAN_CORRIDOR'
                        });
                        assignedUnitIds.add(chosenUnit.id);
                        claimedTargets.add(targetKey);
                        console.log(`[IA ORG PASO1] J${playerNumber}: ${chosenUnit.name} ocupa (${unownedTarget.r},${unownedTarget.c}) para corredor ${origin.name || 'origen'}→${dest.name || 'destino'}`);
                    }
                }
                continue;
            }

            // PASO 2: corredor ya propio, construir siguiente tramo de Camino faltante.
            const missingRoad = AiGameplayManager._findFirstMissingOwnedRoadSegment(playerNumber, rawPath);
            if (!missingRoad) continue;

            const hex = board[missingRoad.r]?.[missingRoad.c];
            if (!hex || hex.owner !== playerNumber || hex.isCity || roadReady.has(hex.structure)) continue;
            if (getUnitOnHex(missingRoad.r, missingRoad.c)) continue;

            const cost = STRUCTURE_TYPES['Camino']?.cost || {};
            const canAfford = Object.keys(cost).every(r => r === 'Colono' || (playerRes[r] || 0) >= (cost[r] || 0));
            if (!canAfford) continue;

            console.log(`[IA ORG PASO2] J${playerNumber}: Camino en (${missingRoad.r},${missingRoad.c}) para ${origin.name || 'origen'}→${dest.name || 'destino'}`);
            handleConfirmBuildStructure({ playerId: playerNumber, r: missingRoad.r, c: missingRoad.c, structureType: 'Camino' });
        }
    },

    _runOrganicCaravanCreationFlow: function(playerNumber, pairs) {
        const existingPairs = AiGameplayManager._getExistingTradeRoutePairs(playerNumber);

        for (const { origin, dest } of pairs) {
            const pairKey = AiGameplayManager._getTradePairKey(origin, dest);
            if (!pairKey || existingPairs.has(pairKey)) continue;

            if (typeof findInfrastructurePath !== 'function') continue;
            const infraPath = findInfrastructurePath(origin, dest, { allowForeignInfrastructure: true, requireRoadCorridor: true });
            if (!infraPath || infraPath.length === 0) continue;

            let routed = false;
            if (typeof AiGameplayManager._tryEstablishTradeRouteBetweenCities === 'function') {
                routed = AiGameplayManager._tryEstablishTradeRouteBetweenCities(playerNumber, origin, dest, infraPath);
            }

            if (routed) {
                existingPairs.add(pairKey);
                console.log(`[IA ORG PASO3-4] J${playerNumber}: columna->caravana ${origin.name || `${origin.r},${origin.c}`}→${dest.name || `${dest.r},${dest.c}`}`);
            } else {
                console.log(`[IA ORG CARAVANA] J${playerNumber}: no se pudo crear ruta ${origin.name || `${origin.r},${origin.c}`}→${dest.name || `${dest.r},${dest.c}`}`);
            }
        }
    },

    _ensureCityExpansionOrganic: function(playerNumber) {
        const playerRes = gameState.playerResources[playerNumber];
        if (!playerRes) return;

        const hasFort = board.flat().some(h => h && h.owner === playerNumber && h.structure === 'Fortaleza');
        if (!hasFort) return;

        const hasResourceExcess =
            (playerRes.oro || 0) >= 6000 &&
            (playerRes.piedra || 0) >= 2000 &&
            (playerRes.madera || 0) >= 800 &&
            (playerRes.hierro || 0) >= 400 &&
            (playerRes.puntosReclutamiento || 0) >= 200;

        if (!hasResourceExcess) return;

        const fortifiedToUpgrade = board.flat().find(h =>
            h && h.owner === playerNumber && h.structure === 'Fortaleza' && !h.isCity && !getUnitOnHex(h.r, h.c)
        );

        if (fortifiedToUpgrade) {
            const costMuralla = STRUCTURE_TYPES['Fortaleza con Muralla']?.cost || {};
            const canUpgradeMuralla = Object.keys(costMuralla).every(r => r === 'Colono' || (playerRes[r] || 0) >= (costMuralla[r] || 0));
            if (canUpgradeMuralla) {
                console.log(`[IA ORG CIUDAD] J${playerNumber}: mejorando Fortaleza con Muralla en (${fortifiedToUpgrade.r},${fortifiedToUpgrade.c})`);
                handleConfirmBuildStructure({
                    playerId: playerNumber,
                    r: fortifiedToUpgrade.r,
                    c: fortifiedToUpgrade.c,
                    structureType: 'Fortaleza con Muralla'
                });
            }
        }

        const candidateAldeaHex = board.flat().find(h =>
            h && h.owner === playerNumber && h.structure === 'Fortaleza con Muralla' && !h.isCity
        );
        if (!candidateAldeaHex) return;

        let settlerUnit = getUnitOnHex(candidateAldeaHex.r, candidateAldeaHex.c);
        const hasSettlerOnHex = !!(settlerUnit && settlerUnit.player === playerNumber && settlerUnit.regiments?.some(reg => reg.type === 'Colono'));

        if (!hasSettlerOnHex) {
            settlerUnit = AiGameplayManager.produceUnit(playerNumber, ['Colono'], 'settler', 'Colono Fundador', candidateAldeaHex);
        }

        const nowSettler = getUnitOnHex(candidateAldeaHex.r, candidateAldeaHex.c);
        const canSettle = !!(nowSettler && nowSettler.player === playerNumber && nowSettler.regiments?.some(reg => reg.type === 'Colono'));
        if (!canSettle) return;

        const costAldea = STRUCTURE_TYPES['Aldea']?.cost || {};
        const canAffordAldea = Object.keys(costAldea).every(r => {
            if (r === 'Colono') return true;
            return (playerRes[r] || 0) >= (costAldea[r] || 0);
        });
        if (!canAffordAldea) return;

        console.log(`[IA ORG CIUDAD] J${playerNumber}: creando Aldea en (${candidateAldeaHex.r},${candidateAldeaHex.c})`);
        handleConfirmBuildStructure({
            playerId: playerNumber,
            r: candidateAldeaHex.r,
            c: candidateAldeaHex.c,
            structureType: 'Aldea'
        });
    },
    
    // PUNTO 2: Método helper para intentar construcción con trazabilidad enriquecida
    attemptConstructionAtHex: function(playerNumber, r, c, structureType, nodoRazon) {
        const hex = board[r]?.[c];
        if (!hex) {
            console.error(`[IA CONSTRUCCIÓN] Hex inválido: (${r},${c})`);
            return false;
        }
        
        // VALIDACIÓN: ¿La IA posee el hex?
        if (hex.owner !== playerNumber) {
            console.warn(`%c[IA BUILD DECISION - RECHAZADA] TURNO=${gameState.turnNumber} FASE=${gameState.currentPhase} JUGADOR=${playerNumber} ESTR=${structureType} (${r},${c}) DUENO=${hex.owner} RAZON=${nodoRazon} MOTIVO=No es propietario`, "color: #FF6B6B; background: #FFE5E5; padding: 5px;");
            return false;
        }
        
        const playerRes = gameState.playerResources[playerNumber];
        const structCost = STRUCTURE_TYPES[structureType].cost;
        
        // Verificar recursos por todas las claves del coste (ej: Camino = madera + piedra)
        const canPay = Object.keys(structCost || {}).every(res => {
            if (res === 'Colono') return true;
            return (playerRes[res] || 0) >= (structCost[res] || 0);
        });
        if (!canPay) {
            console.warn(`%c[IA BUILD DECISION - RECHAZADA] TURNO=${gameState.turnNumber} FASE=${gameState.currentPhase} JUGADOR=${playerNumber} ESTR=${structureType} (${r},${c}) DUENO=${playerNumber} RAZON=${nodoRazon} MOTIVO=Recursos insuficientes`, "color: #FFA500; background: #FFE0B2; padding: 5px;");
            return false;
        }
        
        // TRAZABILIDAD: Logging del éxito
        console.log(`%c[IA BUILD DECISION - EJECUTADA] TURNO=${gameState.turnNumber} FASE=${gameState.currentPhase} JUGADOR=${playerNumber} ESTR=${structureType} (${r},${c}) DUENO=${playerNumber} RAZON=${nodoRazon}`, "color: #4CAF50; font-weight: bold; background: #E8F5E9; padding: 5px;");
        console.log(`[BUILD BEFORE] hex.structure=${hex.structure}`);
        handleConfirmBuildStructure({ playerId: playerNumber, r: r, c: c, structureType: structureType });
        console.log(`[BUILD AFTER] hex.structure=${board[r][c].structure}`);

        if (structureType === 'Camino' && (nodoRazon === 'CORREDOR_COMERCIAL' || nodoRazon === 'BOA_CONSTRUCTION')) {
            this._checkAndActivateCorridorEconomy(playerNumber);
        }
        return true;
    },

    planRoadProject: function(playerNumber, newFortress) {
        const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        if (!capital || !newFortress) return;

        const path = findPath_A_Star({ player: playerNumber, regiments: [{ type: 'Ingenieros' }] }, { r: capital.r, c: capital.c }, { r: newFortress.r, c: newFortress.c });
        
        if (path) {
            console.log(`[IA Empire] Proyecto de carretera planificado con ${path.length} tramos.`);
            if (!AiGameplayManager.roadProjects) AiGameplayManager.roadProjects = [];
            AiGameplayManager.roadProjects.push(path);
        }
    },

    executeRoadProjects: function(playerNumber) {
        if (!AiGameplayManager.roadProjects || AiGameplayManager.roadProjects.length === 0) return;

        const roadCost = STRUCTURE_TYPES['Camino'].cost;
        const playerRes = gameState.playerResources[playerNumber];

        AiGameplayManager.roadProjects.forEach(path => {
            for(const hexCoords of path) {
                const hex = board[hexCoords.r]?.[hexCoords.c];
                if (hex && hex.owner === playerNumber && hex.structure !== 'Camino' && hex.structure !== 'Fortaleza') {
                    if (playerRes.oro >= roadCost.oro && playerRes.piedra >= roadCost.piedra) {
                        console.log(`%c[IA Empire] Construyendo tramo de carretera en (${hex.r}, ${hex.c})`, "color: #DAA520");
                        handleConfirmBuildStructure({ playerId: playerNumber, r: hex.r, c: hex.c, structureType: 'Camino' });
                        return; 
                    }
                }
            }
        });
    },

    planStrategicObjectives: function(playerNumber) {
        AiGameplayManager.strategicAxes = [];
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
        const mapRows = board.length;
        const mapCols = board[0].length;

        const quadrants = {
            'Frontal': { r_min: 0, r_max: mapRows, c_min: 0, c_max: mapCols },
            'SuperiorIzquierdo': { r_min: 0, r_max: Math.floor(mapRows / 2), c_min: 0, c_max: Math.floor(mapCols / 2) },
            'LateralIzquierdo': { r_min: Math.floor(mapRows/2), r_max: mapRows, c_min: 0, c_max: Math.floor(mapCols / 2) },
            'SuperiorDerecho': { r_min: 0, r_max: Math.floor(mapRows / 2), c_min: Math.floor(mapCols / 2), c_max: mapCols }
        };
        
        if (enemyCapital) {
            AiGameplayManager.strategicAxes.push({ name: 'Asalto Frontal', target: enemyCapital });
        }

        for (const quadName in quadrants) {
            if (quadName === 'Frontal') continue;
            const quad = quadrants[quadName];
            
            const neutralHexesInQuad = board.flat().filter(h => 
                h && h.owner === null && !h.unit && !TERRAIN_TYPES[h.terrain].isImpassableForLand &&
                h.r >= quad.r_min && h.r < quad.r_max && h.c >= quad.c_min && h.c < quad.c_max
            );

            if (neutralHexesInQuad.length > 5) {
                const avgR = Math.round(neutralHexesInQuad.reduce((sum, h) => sum + h.r, 0) / neutralHexesInQuad.length);
                const avgC = Math.round(neutralHexesInQuad.reduce((sum, h) => sum + h.c, 0) / neutralHexesInQuad.length);
                AiGameplayManager.strategicAxes.push({ name: quadName, target: { r: avgR, c: avgC }, prioridad: 0 });
            }
        }

        // Inyectar nodos prioritarios del motor de decisiones como ejes reales
        // FIXED: Usar AiGameplayManager._currentMotorDecision en lugar de IaIntegration.currentDecision
        const motorDecision = AiGameplayManager._currentMotorDecision || (typeof IaIntegration !== 'undefined' ? IaIntegration.currentDecision : null);
        if (motorDecision?.prioritarios?.length > 0) {
            const nodosMotor = motorDecision.prioritarios.slice(0, 4);
            console.log(`[IA DEBUG] Inyectando ${nodosMotor.length} nodos del motor`);
            for (const nodo of nodosMotor) {
                if (nodo.r === undefined || nodo.c === undefined) continue;
                const yaExiste = AiGameplayManager.strategicAxes.some(
                    a => a.target.r === nodo.r && a.target.c === nodo.c
                );
                if (!yaExiste) {
                    AiGameplayManager.strategicAxes.push({
                        name: nodo.tipo,
                        target: { r: nodo.r, c: nodo.c },
                        nodoTipo: nodo.tipo,
                        destinoTipo: nodo.destino_tipo || null,
                        prioridad: nodo.peso || 0
                    });
                }
            }

            // Si no entró en top-4, inyectar al menos un objetivo de sabotaje económico.
            const sabotageNode = (motorDecision.nodos || []).find(n => n.tipo === 'camino_enemigo_critico');
            if (sabotageNode && sabotageNode.r !== undefined && sabotageNode.c !== undefined) {
                const yaExisteSabotaje = AiGameplayManager.strategicAxes.some(a => a.nodoTipo === 'camino_enemigo_critico' && a.target.r === sabotageNode.r && a.target.c === sabotageNode.c);
                if (!yaExisteSabotaje) {
                    const prioSabotaje = (typeof IaNodoValor !== 'undefined' && typeof IaNodoValor.calcularPesoNodo === 'function')
                        ? IaNodoValor.calcularPesoNodo(sabotageNode, { playerNumber, gameState, config: IaConfigManager.get() }, IaConfigManager.get())
                        : 200;
                    AiGameplayManager.strategicAxes.push({
                        name: 'camino_enemigo_critico',
                        target: { r: sabotageNode.r, c: sabotageNode.c },
                        nodoTipo: 'camino_enemigo_critico',
                        prioridad: prioSabotaje
                    });
                    console.log(`[IA SABOTAJE TRACE] objetivo agregado en (${sabotageNode.r},${sabotageNode.c}) prio=${Math.round(prioSabotaje)}`);
                }
            }

            const hayNodosFuertes = AiGameplayManager.strategicAxes.some(a => a.nodoTipo && (a.prioridad || 0) >= 150);
            if (hayNodosFuertes) {
                AiGameplayManager.strategicAxes = AiGameplayManager.strategicAxes.filter(a => a.nodoTipo || (a.prioridad || 0) > 0);
            }
            AiGameplayManager.strategicAxes.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
            console.log(`[IA PLANNER] Ejes activos: ${AiGameplayManager.strategicAxes.map(a => `${a.name}(${a.prioridad||0})`).join(', ')}`);
        } else {
            console.warn(`[IA DEBUG] Sin nodos del motor`);
        }
    },

    assignUnitsToAxes: function(playerNumber, unitsToAssign) {
        const corridorControllerState = gameState.ai_corridor_controller?.[playerNumber] || null;
        const sabotageAxis = AiGameplayManager.strategicAxes
            .filter(a => a.nodoTipo === 'camino_enemigo_critico')
            .sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0))[0];
        console.log(`[ASSIGN DEBUG] corridorControllerState=${JSON.stringify(corridorControllerState)}`);

        let reservedSaboteurId = null;
        if (sabotageAxis && unitsToAssign.length >= 2) {
            const sortedForSabotage = unitsToAssign
                .slice()
                .sort((a, b) => {
                    const da = hexDistance(a.r, a.c, sabotageAxis.target.r, sabotageAxis.target.c);
                    const db = hexDistance(b.r, b.c, sabotageAxis.target.r, sabotageAxis.target.c);
                    return da - db;
                });
            const saboteur = sortedForSabotage[0];
            if (saboteur) {
                reservedSaboteurId = saboteur.id;
                AiGameplayManager.missionAssignments.set(saboteur.id, {
                    type: 'IA_NODE',
                    objective: sabotageAxis.target,
                    nodoTipo: 'camino_enemigo_critico',
                    axisName: 'FORCED_SABOTAGE_CORRIDOR_OPENING'
                });
                AiGameplayManager._trace('assign_unit_axis_forced_sabotage', {
                    playerNumber,
                    unitId: saboteur.id,
                    unitName: saboteur.name,
                    objective: { r: sabotageAxis.target.r, c: sabotageAxis.target.c },
                    nodoTipo: 'camino_enemigo_critico',
                    reason: 'sabotear_camino_humano_en_paralelo'
                });
            }
        }

        // FIXED: Asignar TODOS los tipos de unidad, no solo exploradores
        const explorers = unitsToAssign.filter(u => AiGameplayManager.unitRoles.get(u.id) === 'explorer');
        const others = unitsToAssign.filter(u => !AiGameplayManager.unitRoles.has(u.id) || AiGameplayManager.unitRoles.get(u.id) !== 'explorer');
        
        console.log(`[IA DEBUG] assignUnitsToAxes: ${explorers.length} explorers, ${others.length} otros (total ${unitsToAssign.length}). Ejes: ${AiGameplayManager.strategicAxes.length}`);

        const assignUnit = (unit, preferDistant) => {
            const existingMission = AiGameplayManager.missionAssignments.get(unit.id);
            if (existingMission && ['OCCUPY_THEN_BUILD', 'VACATE_CORRIDOR_FOR_ROADWORK', 'URGENT_DEFENSE', 'CONSOLIDATE_FORCES', 'AWAIT_REINFORCEMENTS'].includes(existingMission.type)) {
                return;
            }

            if (reservedSaboteurId && unit.id === reservedSaboteurId) {
                return;
            }

            let bestAxis = null;
            let bestScore = -Infinity;
            const axisScores = [];
            
            for (const axis of AiGameplayManager.strategicAxes) {
                if (axis.nodoTipo === 'corredor_comercial') {
                    continue;
                }
                const dist = hexDistance(unit.r, unit.c, axis.target.r, axis.target.c);
                const score = this._scoreAxisForUnit(axis, unit, dist, preferDistant);
                axisScores.push({
                    name: axis.name,
                    nodoTipo: axis.nodoTipo || 'GENERIC',
                    dist,
                    priority: axis.prioridad || 0,
                    score
                });
                if (score > bestScore) {
                    bestScore = score;
                    bestAxis = axis;
                }
            }

            axisScores.sort((a, b) => b.score - a.score);
            console.log(`[IA AXIS TRACE] unidad=${unit.name} preferDistant=${preferDistant} top=${axisScores.slice(0, 4).map(a => `${a.nodoTipo}@${a.name}:score=${Math.round(a.score)}:dist=${a.dist}:prio=${Math.round(a.priority)}`).join(' ; ')}`);
            
            if(bestAxis) {
                AiGameplayManager.missionAssignments.set(unit.id, {
                    type: bestAxis.nodoTipo ? 'IA_NODE' : 'AXIS_ADVANCE',
                    objective: { r: bestAxis.target.r, c: bestAxis.target.c },
                    nodoTipo: bestAxis.nodoTipo || null,
                    axisName: bestAxis.name
                });
                AiGameplayManager._trace('assign_unit_axis', {
                    playerNumber,
                    unitId: unit.id,
                    unitName: unit.name,
                    missionType: bestAxis.nodoTipo ? 'IA_NODE' : 'AXIS_ADVANCE',
                    preferDistant,
                    axisScore: bestScore,
                    objective: { r: bestAxis.target.r, c: bestAxis.target.c },
                    axisName: bestAxis.name,
                    nodoTipo: bestAxis.nodoTipo || null
                });
            }
        };

        for(const unit of explorers) {
            assignUnit(unit, true);
        }
        for(const unit of others) {
            assignUnit(unit, false);
        }
    },

    _scoreAxisForUnit: function(axis, unit, dist, preferDistant) {
        const priority = axis.prioridad || 0;
        const isNodeAxis = !!axis.nodoTipo;
        let score = priority;

        if (isNodeAxis) {
            score += 120;
            score -= dist * 18;
        } else {
            score -= dist * (preferDistant ? 4 : 10);
        }

        if (preferDistant && !isNodeAxis) {
            score += Math.min(dist, 8) * 5;
        }

        if (axis.nodoTipo === 'corredor_comercial') {
            score += 260;
            score -= dist * 6;
        }

        if (axis.nodoTipo === 'crear_caravana') {
            score += 220;
            score -= dist * 8;
        }

        if (axis.nodoTipo === 'ciudad_libre' || axis.nodoTipo === 'banca') {
            score += 90;
        }

        if (axis.nodoTipo === 'ciudad_natal_propia' && (axis.prioridad || 0) < 500) {
            score -= 120;
        }

        return score;
    },

    _executeGrandOpening_v20: async function(playerNumber) {
        console.log(`%c[IA STRATEGY] Ejecutando Gran Apertura (Plan v22.0 - Objetivo-Primero).`, "color: #FFA500; font-weight: bold;");
        const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        if (!capital) return;

        // --- Función de apoyo interna para una oleada ---
        const executeWave = async (unitType, moveCost, maxUnitsToCreate) => {
            let createdInWave = 0;
            
            while(createdInWave < maxUnitsToCreate) {
                // 1. Encontrar todos los puntos de creación disponibles AHORA MISMO
                const creationSpots = getHexNeighbors(capital.r, capital.c)
                    .filter(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit);

                // 2. Para CADA punto de creación, encontrar todos los destinos válidos
                let allPossibleManiobras = [];
                for (const spot of creationSpots) {
                    const pathOptions = AiGameplayManager._findAllPathsWithCost(spot, moveCost, unitType, playerNumber);
                    for (const path of pathOptions) {
                        const destination = path[path.length-1];
                        // El objetivo debe ser neutral
                        if(board[destination.r][destination.c].owner === null) {
                            allPossibleManiobras.push({ inicio: spot, fin: destination, path: path });
                        }
                    }
                }

                if (allPossibleManiobras.length === 0) {
                    console.log(`   -> No se encontraron más maniobras válidas para esta oleada.`);
                    return false; // Termina esta oleada
                }

                // 3. Elegir la MEJOR maniobra de todas las posibles (la que llega más lejos)
                allPossibleManiobras.sort((a,b) => hexDistance(capital.r, capital.c, b.fin.r, b.fin.c) - hexDistance(capital.r, capital.c, a.fin.r, a.fin.c));
                const bestManiobra = allPossibleManiobras[0];

                // 4. Ejecutar la mejor maniobra
                const newUnit = AiGameplayManager.produceUnit(playerNumber, [unitType], 'explorer', `Incursor`, bestManiobra.inicio);
                if (newUnit) {
                    await _executeMoveUnit(newUnit, bestManiobra.fin.r, bestManiobra.fin.c);
                    createdInWave++;
                    await new Promise(resolve => setTimeout(resolve, 100)); // Pausa
                } else {
                    console.log(`   -> Fin de oleada por falta de recursos.`);
                    return false; // Termina TODA la apertura
                }
            }
            return true; // Oleada completada con éxito
        };

        // --- Ejecución de las Oleadas según tus especificaciones ---
        let canContinue = true;
        console.log("--- OLEADA 1: Infantería (Anillo Exterior, coste 2) ---");
        canContinue = await executeWave('Infantería Ligera', 2, 18);
        
        if (canContinue) {
            console.log("--- OLEADA 2: Infantería (Anillo Interior, coste 1) ---");
            const infantryCount = units.filter(u=>u.player === playerNumber && u.regiments.some(r => r.type === 'Infantería Ligera')).length;
            canContinue = await executeWave('Infantería Ligera', 1, 24 - infantryCount);
        }
        
        if (canContinue) {
            console.log("--- OLEADA 3: Caballería de Salto ---");
            const cavalryMove = REGIMENT_TYPES['Caballería Ligera'].movement;
            canContinue = await executeWave('Caballería Ligera', REGIMENT_TYPES['Caballería Ligera'].movement, 6);
        }

        console.log(`[IA STRATEGY] Gran Apertura finalizada.`);
    },
    
    _findAllPathsWithCost: function(startCoords, maxCost, unitType, playerNumber) {
        const hasJumpAbility = REGIMENT_TYPES[unitType]?.abilities?.includes("Jump");

        let validPaths = [];
        let queue = [{ r: startCoords.r, c: startCoords.c, path: [startCoords], cost: 0 }];
        let visited = new Map();
        visited.set(`${startCoords.r},${startCoords.c}`, 0);

        while (queue.length > 0) {
            let current = queue.shift();
            
            if (current.cost >= maxCost) continue;

            for (const neighbor of getHexNeighbors(current.r, current.c)) {
                const key = `${neighbor.r},${neighbor.c}`;
                const hex = board[neighbor.r]?.[neighbor.c];
                if (!hex || TERRAIN_TYPES[hex.terrain].isImpassableForLand) continue;
                
                const moveCost = TERRAIN_TYPES[hex.terrain]?.movementCostMultiplier || 1;
                const newCost = current.cost + moveCost;
                
                if (newCost > maxCost || (visited.has(key) && visited.get(key) <= newCost)) continue;
                
                const unitOnNeighbor = hex.unit;
                let canPassThrough = !unitOnNeighbor || (unitOnNeighbor.player === playerNumber && hasJumpAbility);

                if (canPassThrough) {
                    visited.set(key, newCost);
                    let newPath = [...current.path, neighbor];
                    if (newCost <= maxCost && !unitOnNeighbor) {
                        validPaths.push(newPath);
                    }
                    queue.push({ ...neighbor, path: newPath, cost: newCost });
                }
            }
        }
        return validPaths.filter(path => {
            let totalCost = 0;
            for(let i=0; i<path.length-1; i++){
                totalCost += TERRAIN_TYPES[board[path[i+1].r][path[i+1].c].terrain]?.movementCostMultiplier || 1;
            }
            return totalCost <= maxCost;
        });
    },    

    decideAndExecuteUnitAction: async function(unit) {
        const mission = AiGameplayManager.missionAssignments.get(unit.id) || { type: 'DEFAULT' };
        // --- INYECCIÓN razon_texto (FASE 2c) ---
        let razonAccion = "Acción estratégica";
        if (typeof IaIntegration !== 'undefined' && mission.target) {
            razonAccion = IaIntegration.obtenerRazonAccion(mission.target.r, mission.target.c);
        }
        
        console.groupCollapsed(`Decidiendo para ${unit.name} (Misión: ${mission.type}) - ${razonAccion}`);
        AiGameplayManager._trace('unit_decision_start', {
            unitId: unit.id,
            unitName: unit.name,
            from: { r: unit.r, c: unit.c },
            missionType: mission.type,
            missionObjective: mission.objective ? { r: mission.objective.r, c: mission.objective.c } : null,
            reason: razonAccion
        });
        try {
            // PUNTO 2: Manejar OCCUPY_THEN_BUILD
            if (mission.type === 'OCCUPY_THEN_BUILD') {
                const tgt = mission.objective;
                const hex = board[tgt.r]?.[tgt.c];
                
                if (hex && hex.owner === unit.player) {
                    // El hex ya es nuestro. Si la unidad está encima, liberar la casilla para permitir construcción.
                    const occupant = getUnitOnHex(tgt.r, tgt.c);
                    if (occupant && occupant.id === unit.id) {
                        const freeAdj = getHexNeighbors(unit.r, unit.c)
                            .map(n => board[n.r]?.[n.c])
                            .filter(h => h && !h.unit && h.owner === unit.player && this._canBuildRoadOnHex(h))
                            .sort((a, b) => hexDistance(a.r, a.c, tgt.r, tgt.c) - hexDistance(b.r, b.c, tgt.r, tgt.c))[0];

                        if (freeAdj && (unit.currentMovement || unit.movement || 0) > 0) {
                            await _executeMoveUnit(unit, freeAdj.r, freeAdj.c);
                            AiGameplayManager._trace('occupy_then_build_vacated_target', {
                                unitId: unit.id,
                                from: { r: tgt.r, c: tgt.c },
                                to: { r: freeAdj.r, c: freeAdj.c },
                                target: { r: tgt.r, c: tgt.c }
                            });
                        }
                    }

                    console.log(`[IA OCCUPY_THEN_BUILD] ${unit.name} en (${tgt.r},${tgt.c}) listo para construir. Estructura: ${mission.structureType}`);
                    if (typeof AiGameplayManager.attemptConstructionAtHex === 'function') {
                        AiGameplayManager.attemptConstructionAtHex(unit.player, tgt.r, tgt.c, mission.structureType, mission.nodoRazon);
                    }
                    AiGameplayManager._occupyThenBuildMissions.delete(unit.id);
                    AiGameplayManager._trace('unit_decision_result', {
                        unitId: unit.id,
                        unitName: unit.name,
                        missionType: mission.type,
                        result: 'build_attempted',
                        target: { r: tgt.r, c: tgt.c },
                        structureType: mission.structureType
                    });
                    return;
                } else {
                    // El hex NO es nuestro → ocupar primero
                    console.log(`[IA OCCUPY_THEN_BUILD] ${unit.name} → ocupa (${tgt.r},${tgt.c}) ANTES de construir ${mission.structureType}`);
                    // Intentar avance relay (fusión con aliado adyacente) antes de mover solo
                    const relayDone = await this._attemptCorridorRelayAdvance(unit, tgt);
                    if (relayDone) {
                        AiGameplayManager.missionAssignments.set(unit.id, mission);
                        return;
                    }
                    const pathToOccupy = AiGameplayManager.findPathToTarget(unit, tgt.r, tgt.c);
                    if (pathToOccupy && pathToOccupy.length > 1) {
                        const steps = unit.currentMovement || unit.movement || 1;
                        const moveHex = pathToOccupy[Math.min(steps, pathToOccupy.length - 1)];
                        if (!getUnitOnHex(moveHex.r, moveHex.c)) {
                            await _executeMoveUnit(unit, moveHex.r, moveHex.c);
                            // Mantener la misión para próximo turno
                            AiGameplayManager.missionAssignments.set(unit.id, mission);
                            AiGameplayManager._trace('unit_decision_result', {
                                unitId: unit.id,
                                unitName: unit.name,
                                missionType: mission.type,
                                result: 'moved_to_occupy',
                                to: { r: moveHex.r, c: moveHex.c },
                                target: { r: tgt.r, c: tgt.c }
                            });
                            return;
                        }
                    }
                }
            }
            
            if (mission.type === 'VACATE_CORRIDOR_FOR_ROADWORK') {
                const tgt = mission.objective;
                if (tgt && !getUnitOnHex(tgt.r, tgt.c) && (unit.currentMovement || unit.movement || 0) > 0) {
                    console.log(`[IA VACATE_CORRIDOR] ${unit.name} despeja corredor hacia (${tgt.r},${tgt.c})`);
                    await _executeMoveUnit(unit, tgt.r, tgt.c);
                    AiGameplayManager._trace('unit_decision_result', {
                        unitId: unit.id,
                        unitName: unit.name,
                        missionType: mission.type,
                        result: 'corridor_vacated',
                        to: { r: tgt.r, c: tgt.c },
                        corridorHex: mission.corridorHex || null
                    });
                    return;
                }

                AiGameplayManager._trace('unit_decision_result', {
                    unitId: unit.id,
                    unitName: unit.name,
                    missionType: mission.type,
                    result: 'corridor_vacate_blocked',
                    target: tgt ? { r: tgt.r, c: tgt.c } : null,
                    corridorHex: mission.corridorHex || null
                });
                return;
            }

            if (mission.type === 'URGENT_DEFENSE') {
                const threat = getUnitById(mission.objective.id);
                const validThreat = threat && threat.currentHealth > 0;
                if (validThreat) {
                    console.log(`[IA URGENT DEFENSE] ${unit.name} tiene orden de atacar a ${threat.name}.`);
                    await this._executeCombatLogic(unit, [threat]);
                    AiGameplayManager._trace('unit_decision_result', {
                        unitId: unit.id,
                        unitName: unit.name,
                        missionType: mission.type,
                        result: 'urgent_defense_combat',
                        targetUnitId: threat.id,
                        targetName: threat.name
                    });
                    return;
                }
            }

            // Misión del motor de decisiones: nodo prioritario específico
            if (mission.type === 'IA_NODE' && mission.objective) {
                const tgt = mission.objective;

                if (mission.nodoTipo === 'corredor_comercial') {
                    const relayAdvanced = await this._attemptCorridorRelayAdvance(unit, tgt);
                    if (relayAdvanced) {
                        return;
                    }
                }

                const unitEnTgt = getUnitOnHex(tgt.r, tgt.c);
                if (unitEnTgt && unitEnTgt.player !== unit.player) {
                    // Hay enemigo en el objetivo (sabotaje, defensa): atacar
                    console.log(`[IA NODE] ${unit.name} → ataca en (${tgt.r},${tgt.c}) nodo:${mission.nodoTipo}`);
                    await this._executeCombatLogic(unit, [unitEnTgt]);
                    AiGameplayManager._trace('unit_decision_result', {
                        unitId: unit.id,
                        unitName: unit.name,
                        missionType: mission.type,
                        result: 'node_combat',
                        target: { r: tgt.r, c: tgt.c },
                        nodoTipo: mission.nodoTipo || null
                    });
                    return;
                }
                // Moverse hacia el objetivo (económico, posición estratégica, etc.)
                const pathToNode = (mission.nodoTipo === 'corredor_comercial')
                    ? this._findCorridorBuildablePath(unit.r, unit.c, tgt.r, tgt.c)
                    : this.findPathToTarget(unit, tgt.r, tgt.c);
                if (pathToNode && pathToNode.length > 1) {
                    const steps = unit.currentMovement || unit.movement || 1;
                    const moveHex = pathToNode[Math.min(steps, pathToNode.length - 1)];
                    if (!getUnitOnHex(moveHex.r, moveHex.c)) {
                        console.log(`[IA NODE] ${unit.name} → mueve a (${moveHex.r},${moveHex.c}) nodo:${mission.nodoTipo}`);
                        await _executeMoveUnit(unit, moveHex.r, moveHex.c);
                        AiGameplayManager._trace('unit_decision_result', {
                            unitId: unit.id,
                            unitName: unit.name,
                            missionType: mission.type,
                            result: 'node_move',
                            to: { r: moveHex.r, c: moveHex.c },
                            target: { r: tgt.r, c: tgt.c },
                            nodoTipo: mission.nodoTipo || null
                        });
                        return;
                    }
                }
                // Sin camino libre en misión de corredor: no forzar combate, reposicionar.
                if (mission.nodoTipo === 'corredor_comercial') {
                    const repositioned = await this._attemptCorridorBuildableStep(unit, tgt);
                    AiGameplayManager._trace('unit_decision_result', {
                        unitId: unit.id,
                        unitName: unit.name,
                        missionType: mission.type,
                        result: repositioned ? 'corridor_reposition_buildable' : 'corridor_hold_no_buildable_step',
                        target: { r: tgt.r, c: tgt.c },
                        nodoTipo: mission.nodoTipo || null
                    });
                    return;
                }
                // Sin camino libre: caer al comportamiento general
            }

            if (AiGameplayManager.codeRed_rallyPoint && unit.id !== AiGameplayManager.codeRed_rallyPoint.anchorId) { await AiGameplayManager.moveToRallyPoint(unit); return; }
            if (unit.regiments.length < 5 && await AiGameplayManager.findAndExecuteMerge_Proactive(unit)) { return; }

            const enemyPlayer = unit.player === 1 ? 2 : 1;
            const enemies = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
            if (enemies.length > 0) {
                await AiGameplayManager._executeCombatLogic(unit, enemies);
                AiGameplayManager._trace('unit_decision_result', {
                    unitId: unit.id,
                    unitName: unit.name,
                    missionType: mission.type,
                    result: 'fallback_combat'
                });
            } else {
                await AiGameplayManager.executeGeneralMovement(unit);
                AiGameplayManager._trace('unit_decision_result', {
                    unitId: unit.id,
                    unitName: unit.name,
                    missionType: mission.type,
                    result: 'fallback_move'
                });
            }
        } catch(e) {
            console.error(`Error procesando ${unit.name}:`, e);
            AiGameplayManager._trace('unit_decision_error', {
                unitId: unit.id,
                unitName: unit.name,
                missionType: mission.type,
                error: e.message
            });
        } 
        finally { console.groupEnd(); }
    },

    _attemptCorridorRelayAdvance: async function(unit, tgt) {
        if (!unit || !tgt) return false;
        if (gameState.currentPhase !== 'play') return false;
        if (unit.hasMoved || (unit.currentMovement || 0) <= 0) return false;

        const adjacentMovedAllies = units
            .filter(a =>
                a.player === unit.player &&
                a.id !== unit.id &&
                a.currentHealth > 0 &&
                a.hasMoved === true &&
                hexDistance(a.r, a.c, unit.r, unit.c) <= 1
            )
            .filter(a => ((a.regiments?.length || 0) + (unit.regiments?.length || 0)) <= MAX_REGIMENTS_PER_DIVISION)
            .sort((a, b) => {
                const da = hexDistance(a.r, a.c, tgt.r, tgt.c);
                const db = hexDistance(b.r, b.c, tgt.r, tgt.c);
                return da - db;
            });

        const adjacentFreshAllies = units
            .filter(a =>
                a.player === unit.player &&
                a.id !== unit.id &&
                a.currentHealth > 0 &&
                a.hasMoved === false &&
                hexDistance(a.r, a.c, unit.r, unit.c) <= 1
            )
            .filter(a => ((a.regiments?.length || 0) + (unit.regiments?.length || 0)) <= MAX_REGIMENTS_PER_DIVISION)
            .sort((a, b) => {
                const da = hexDistance(a.r, a.c, tgt.r, tgt.c);
                const db = hexDistance(b.r, b.c, tgt.r, tgt.c);
                return da - db;
            });

        const mergeTarget = adjacentMovedAllies[0] || adjacentFreshAllies[0];
        if (!mergeTarget) {
            AiGameplayManager._trace('corridor_relay_skip_no_adjacent', {
                unitId: unit.id,
                unitName: unit.name,
                at: { r: unit.r, c: unit.c },
                target: { r: tgt.r, c: tgt.c }
            });
            return false;
        }

        AiGameplayManager._trace('corridor_relay_merge_target', {
            unitId: unit.id,
            unitName: unit.name,
            mergeTargetId: mergeTarget.id,
            mergeTargetName: mergeTarget.name,
            mergeTargetHasMoved: !!mergeTarget.hasMoved,
            target: { r: tgt.r, c: tgt.c }
        });

        if (typeof RequestMergeUnits !== 'function') return false;
        // Capture positions BEFORE merge so we can build roads on vacated hexes
        const _vacR = unit.r;
        const _vacC = unit.c;
        const _relayPlayer = unit.player;

        await RequestMergeUnits(unit, mergeTarget, true);

        // Build Camino on vacated corridor hexes after relay transitions
        const _tryBuildRoadOnVacated = (r, c, playerId) => {
            const h = board[r]?.[c];
            if (!h || h.owner !== playerId || h.unit || h.structure) return;
            if (!AiGameplayManager._canBuildRoadOnHex(h)) return;
            const roadCost = STRUCTURE_TYPES['Camino']?.cost || {};
            const res = gameState.playerResources[playerId] || {};
            if (Object.keys(roadCost).every(k => (res[k] || 0) >= (roadCost[k] || 0))) {
                handleConfirmBuildStructure({ playerId, r, c, structureType: 'Camino' });
                AiGameplayManager._trace('corridor_relay_road_built', { r, c, playerId });
                this._checkAndActivateCorridorEconomy(playerId);
            }
        };
        _tryBuildRoadOnVacated(_vacR, _vacC, _relayPlayer);

        const merged = getUnitById(mergeTarget.id);
        if (!merged || merged.currentHealth <= 0) {
            AiGameplayManager._trace('corridor_relay_skip_merge_failed', {
                unitId: unit.id,
                mergeTargetId: mergeTarget.id,
                target: { r: tgt.r, c: tgt.c }
            });
            return false;
        }

        const path = this._findCorridorBuildablePath(merged.r, merged.c, tgt.r, tgt.c);
        if (path && path.length > 1) {
            const steps = merged.currentMovement || merged.movement || 1;
            const moveHex = path[Math.min(steps, path.length - 1)];
            if (!getUnitOnHex(moveHex.r, moveHex.c)) {
                // Capture merge-target position before move so we can build road on it
                const _beforeMoveR = merged.r;
                const _beforeMoveC = merged.c;
                await _executeMoveUnit(merged, moveHex.r, moveHex.c);
                // Merge-target hex is now vacated — build Camino if it was a corridor hex
                _tryBuildRoadOnVacated(_beforeMoveR, _beforeMoveC, _relayPlayer);
            }
        }

        if (typeof buildAutomaticSplitPlan !== 'function' || typeof prepareSplitAction !== 'function' || typeof RequestSplitUnit !== 'function') {
            AiGameplayManager._trace('corridor_relay_merge_only', {
                unitId: unit.id,
                mergedUnitId: merged.id,
                mergedName: merged.name,
                target: { r: tgt.r, c: tgt.c }
            });
            return true;
        }

        const splitPlan = buildAutomaticSplitPlan(merged, 'average');
        if (!splitPlan) {
            AiGameplayManager._trace('corridor_relay_no_split_plan', {
                unitId: unit.id,
                mergedUnitId: merged.id,
                mergedName: merged.name,
                target: { r: tgt.r, c: tgt.c }
            });
            return true;
        }

        const splitCandidates = getHexNeighbors(merged.r, merged.c)
            .map(n => board[n.r]?.[n.c])
            .filter(h => h && !h.unit && !h.isCity && this._canBuildRoadOnHex(h))
            .filter(h => hexDistance(h.r, h.c, tgt.r, tgt.c) < hexDistance(merged.r, merged.c, tgt.r, tgt.c))
            .sort((a, b) => hexDistance(a.r, a.c, tgt.r, tgt.c) - hexDistance(b.r, b.c, tgt.r, tgt.c));

        const splitHex = splitCandidates[0];
        if (!splitHex) {
            AiGameplayManager._trace('corridor_relay_no_split_hex', {
                unitId: unit.id,
                mergedUnitId: merged.id,
                mergedName: merged.name,
                at: { r: merged.r, c: merged.c },
                target: { r: tgt.r, c: tgt.c }
            });
            return true;
        }

        if (!prepareSplitAction(merged, splitPlan)) return true;
        RequestSplitUnit(merged, splitHex.r, splitHex.c);
        gameState.preparingAction = null;

        const newForwardUnit = getUnitOnHex(splitHex.r, splitHex.c);
        if (newForwardUnit && newForwardUnit.player === unit.player) {
            AiGameplayManager.missionAssignments.set(newForwardUnit.id, {
                type: 'IA_NODE',
                objective: { r: tgt.r, c: tgt.c },
                nodoTipo: 'corredor_comercial',
                axisName: 'corredor_comercial_RELAY_SPLIT'
            });
        }

        AiGameplayManager._trace('corridor_relay_executed', {
            originalUnitId: unit.id,
            mergeTargetId: mergeTarget.id,
            mergedUnitId: merged.id,
            splitTo: { r: splitHex.r, c: splitHex.c },
            target: { r: tgt.r, c: tgt.c }
        });

        // After relay, check if the corridor is now fully operational and activate economy
        this._checkAndActivateCorridorEconomy(_relayPlayer);

        return true;
    },

    _checkAndActivateCorridorEconomy: function(playerNumber) {
        const corridorAxis = (AiGameplayManager.strategicAxes || [])
            .filter(a => a.nodoTipo === 'corredor_comercial' && a.target)
            .sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0))[0];
        if (!corridorAxis) return;

        const capital = gameState.cities?.find(c => c.owner === playerNumber && c.isCapital);
        if (!capital) return;

        const corridorPath = this._buildCommercialCorridorPath(playerNumber, capital, corridorAxis.target);
        if (!corridorPath || corridorPath.length < 2) return;

        const corridorStatus = this._updateCommercialCorridorState(playerNumber, corridorAxis, corridorPath);
        if (corridorStatus.operational) {
            console.log(`[IA CORREDOR] ¡Corredor operativo en turno ${gameState.turnNumber}! Activando economía.`);
            this._activateCommercialEconomy(playerNumber, corridorStatus);
        }
    },

    _findCorridorBuildablePath: function(startR, startC, targetR, targetC) {
        const startKey = `${startR},${startC}`;
        const goalKey = `${targetR},${targetC}`;
        const queue = [{ r: startR, c: startC }];
        const visited = new Set([startKey]);
        const prev = new Map();
        let guard = 0;

        while (queue.length > 0 && guard < 3500) {
            guard++;
            const cur = queue.shift();
            const curKey = `${cur.r},${cur.c}`;
            if (curKey === goalKey) break;

            for (const next of getHexNeighbors(cur.r, cur.c)) {
                const key = `${next.r},${next.c}`;
                if (visited.has(key)) continue;
                const hex = board[next.r]?.[next.c];
                if (!hex) continue;
                if (TERRAIN_TYPES[hex.terrain]?.isImpassableForLand) continue;

                const isGoal = key === goalKey;
                if (!isGoal) {
                    if (!this._canBuildRoadOnHex(hex)) continue;
                    if (hex.isCity) continue;
                }

                visited.add(key);
                prev.set(key, curKey);
                queue.push({ r: next.r, c: next.c });
            }
        }

        if (!visited.has(goalKey)) return null;

        const path = [];
        let walk = goalKey;
        while (walk) {
            const [r, c] = walk.split(',').map(Number);
            path.push({ r, c });
            walk = prev.get(walk);
        }
        path.reverse();
        return path;
    },

    _attemptCorridorBuildableStep: async function(unit, tgt) {
        const currentDist = hexDistance(unit.r, unit.c, tgt.r, tgt.c);
        const candidates = getHexNeighbors(unit.r, unit.c)
            .map(n => board[n.r]?.[n.c])
            .filter(h => h && !h.unit && !h.isCity && this._canBuildRoadOnHex(h))
            .filter(h => hexDistance(h.r, h.c, tgt.r, tgt.c) < currentDist)
            .sort((a, b) => hexDistance(a.r, a.c, tgt.r, tgt.c) - hexDistance(b.r, b.c, tgt.r, tgt.c));

        const step = candidates[0];
        if (!step) return false;
        await _executeMoveUnit(unit, step.r, step.c);
        return true;
    },

    _executeCombatLogic: async function(unit, enemies) {
        // NUEVO: Verificar si es unidad naval y usar lógica especializada
        const isNaval = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.type === 'Naval');
        if (isNaval && this._executeNavalCombat) {
            const handled = await this._executeNavalCombat(unit, enemies);
            if (handled) return;
        }

        // Si la salud es muy baja, la retirada es la única opción.
        const healthPercentage = unit.currentHealth / unit.maxHealth;
        if (healthPercentage < 0.35) {
            console.log(`[IA Combat] ${unit.name} tiene salud crítica. Intentando retirada.`);
            await AiGameplayManager.executeRetreat(unit, enemies);
            return;
        }

        // NUEVO: Considerar cortar líneas de suministro si la unidad está profundamente en territorio enemigo
        if (this._attemptSupplyLineCut && await this._attemptSupplyLineCut(unit)) {
            console.log(`[IA Combat] ${unit.name} cortó línea enemiga`);
            return;
        }

        // Encontrar el mejor ataque posible desde la posición actual y las alcanzables
        const bestAttack = AiGameplayManager.findBestOverallAttack(unit, enemies);
        
        // Si no hay ningún ataque posible, moverse a una posición estratégica
        if (!bestAttack) {
            console.log(`[IA Combat] ${unit.name} no encontró objetivos de ataque. Procediendo a movimiento de expansión.`);
            await AiGameplayManager._executeExpansionLogic(unit);
            return;
        }

        // NUEVO: Considerar split táctico antes de atacar
        if (this._considerTacticalSplit && await this._considerTacticalSplit(unit, bestAttack.target)) {
            console.log(`[IA Combat] ${unit.name} ejecutó split táctico`);
            return;
        }

        // Antes de atacar, si el combate NO es favorable, evaluar una fusión
        if (!bestAttack.isFavorable) {
            console.log(`[IA Combat] El mejor ataque para ${unit.name} no es favorable. Evaluando fusión...`);
            const mergePlan = await AiGameplayManager.findAndExecuteMerge_Reactive(unit, bestAttack.target);
            
            // Si se encontró una fusión y se ejecutó...
            if (mergePlan && mergePlan.merged) {
                console.log(`[IA Combat] ¡Fusión reactiva exitosa! ${unit.name} se unió a otra división.`);
                // La nueva super-división ahora re-evalúa el ataque.
                const unitAfterMerge = getUnitById(mergePlan.targetUnitId);
                if (unitAfterMerge && !unitAfterMerge.hasAttacked) {
                    console.log(`[IA Combat] La nueva división "${unitAfterMerge.name}" ahora intenta el ataque.`);
                    // Atacamos desde la posición actual de la nueva unidad, sin movernos.
                    if(isValidAttack(unitAfterMerge, bestAttack.target)) {
                        await attackUnit(unitAfterMerge, bestAttack.target);
                    }
                }
                return; // La acción del turno ya está hecha (fusionar y quizás atacar).
            }
        }
        
        // Si el ataque es favorable O si no se pudo fusionar
        console.log(`[IA Combat] ${unit.name} procede con el plan de ataque original.`);
        if (bestAttack.isSuicidal) {
            await AiGameplayManager.executeRetreat(unit, enemies);
        } else {
            await AiGameplayManager._executeMoveAndAttack(unit, bestAttack.moveHex, bestAttack.target);
        }
    },

    findPathToTarget: function(unit, targetR, targetC) {
        if (!unit || typeof targetR === 'undefined' || typeof targetC === 'undefined') return null;
        if (unit.r === targetR && unit.c === targetC) return [{ r: unit.r, c: unit.c }];
        const hasJumpAbility = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.abilities?.includes("Jump"));

        let queue = [{ r: unit.r, c: unit.c, path: [{ r: unit.r, c: unit.c }], f: hexDistance(unit.r, unit.c, targetR, targetC) }];
        let visited = new Set([`${unit.r},${unit.c}`]);

        while (queue.length > 0) {
            queue.sort((a, b) => a.f - b.f);
            let current = queue.shift();

            for (const neighbor of getHexNeighbors(current.r, current.c)) {
                const key = `${neighbor.r},${neighbor.c}`;
                if (visited.has(key)) continue;

                const hex = board[neighbor.r]?.[neighbor.c];
                if (!hex || TERRAIN_TYPES[hex.terrain].isImpassableForLand) continue;

                const unitOnNeighbor = hex.unit;
                let canPassThrough = !unitOnNeighbor || (unitOnNeighbor.player === unit.player && hasJumpAbility);
                
                if (neighbor.r === targetR && neighbor.c === targetC && unitOnNeighbor) canPassThrough = false;
                
                if (canPassThrough) {
                    visited.add(key);
                    let newPath = [...current.path, neighbor];
                    if (neighbor.r === targetR && neighbor.c === targetC) return newPath;
                    
                    const g = current.path.length;
                    const h = hexDistance(neighbor.r, neighbor.c, targetR, targetC);
                    const f = g + h;
                    queue.push({ ...neighbor, path: newPath, f: f });
                }
            }
        }
        return null;
    },

    ownedHexPercentage: function(playerNumber) {
        const allHexes = board.flat().filter(h => h);
        if(allHexes.length === 0) return 0;
        const ownedHexes = allHexes.filter(h => h.owner === playerNumber).length;
        return ownedHexes / allHexes.length;    
    },

    produceUnit: function(playerNumber, compositionTypes, role, name, specificSpot = null) {
        // El 'spot' es el CENTRO de producción (capital/ciudad/fortaleza), y tambien el lugar final.
        const isValidProductionCenter = (spot) => {
            if (!spot) return false;
            const hex = board[spot.r]?.[spot.c];
            if (!hex || hex.owner !== playerNumber) return false;
            if (hex.isCapital || hex.isCity) return true;
            return ['Aldea', 'Ciudad', 'Metrópoli', 'Fortaleza', 'Fortaleza con Muralla'].includes(hex.structure);
        };

        const isEmptyCenter = (spot) => {
            if (!spot) return false;
            return !getUnitOnHex(spot.r, spot.c);
        };

        let productionCenter = (isValidProductionCenter(specificSpot) && isEmptyCenter(specificSpot)) ? specificSpot : null;

        // Si no hay centro valido y vacio, usar cualquier ciudad/fortaleza propia vacia.
        if (!productionCenter) {
            const cityCenters = (gameState.cities || []).filter(c => c.owner === playerNumber);
            const structureCenters = board.flat().filter(h => h && h.owner === playerNumber && ['Aldea', 'Ciudad', 'Metrópoli', 'Fortaleza', 'Fortaleza con Muralla'].includes(h.structure));
            const candidates = [...cityCenters, ...structureCenters];
            productionCenter = candidates.find(c => isValidProductionCenter(c) && isEmptyCenter(c));
            if (!productionCenter) {
                console.warn("[IA Produce] BLOQUEADO: No hay ciudad/fortaleza propia vacia para reclutar.");
                return null;
            }
        }

        const placementSpot = productionCenter;

        // El resto de la funcion original se mantiene, pero ahora usa 'placementSpot' en lugar de 'spot'.
        const playerRes = gameState.playerResources[playerNumber];
        const fullRegiments = compositionTypes.map(type => ({...REGIMENT_TYPES[type], type}));
        const totalCost = { oro: 0, puntosReclutamiento: 0 };
        fullRegiments.forEach(reg => {
            totalCost.oro += reg.cost.oro || 0;
            totalCost.puntosReclutamiento += reg.cost.puntosReclutamiento || 0;
        });
        
        if (playerRes.oro < totalCost.oro || playerRes.puntosReclutamiento < totalCost.puntosReclutamiento) {
            return null;
        }

        playerRes.oro -= totalCost.oro;
        playerRes.puntosReclutamiento -= totalCost.puntosReclutamiento;
        
            // Se crea la unidad en la casilla vacía que encontramos.
        const newUnit = AiGameplayManager.createUnitObject({ regiments: fullRegiments, cost: totalCost, role, name }, playerNumber, placementSpot);
        placeFinalizedDivision(newUnit, placementSpot.r, placementSpot.c);
        AiGameplayManager.unitRoles.set(newUnit.id, role);
        
        console.log(`%c[IA Produce] Unidad ${newUnit.name} creada en la casilla válida (${placementSpot.r}, ${placementSpot.c}).`, "color: #28a745;");
        return newUnit;
    },

    handlePressureProduction: async function(playerNumber) {
        // === NUEVA LÓGICA: Si la IA está sin oro, considera comerciar con la Banca ===
        const playerRes = gameState.playerResources[playerNumber];
        if (playerRes.oro < 300 && playerRes.oro > 0) {
            // Intentar comerciar con la Banca para recuperar oro
            await AiGameplayManager.considerBankTrade(playerNumber);
            // Re-evaluar recursos después del intento de comercio
        }
        
        if (AiGameplayManager.ownedHexPercentage(playerNumber) < 0.6 && units.filter(u => u.player === playerNumber).length < 25) {
            
            const unitsOfType = (type) => units.filter(u => u.player === playerNumber && u.regiments.some(r => r.type === type)).length;
            let unitToProduce = null;

            if (unitsOfType('Caballería Ligera') < 4) {
                unitToProduce = ['Caballería Ligera'];
            } else {
                unitToProduce = ['Infantería Ligera'];
            }
            
            const newUnit = AiGameplayManager.produceUnit(playerNumber, unitToProduce, 'explorer', 'Incursor');
            
            // <<== LÓGICA CLAVE: Si se creó una unidad, la movemos AHORA MISMO ==>>
            if (newUnit) {
                console.log(`%c[IA Acción Inmediata] Moviendo la unidad recién creada: ${newUnit.name}`, "color: #DAA520; font-weight: bold;");
                await AiGameplayManager.executeGeneralMovement(newUnit);
            }
        }
    },

    /**
     * Nueva función: Considera si la IA debe comerciar con la Banca
     * para obtener recursos necesarios (especialmente ORO)
     */
    considerBankTrade: async function(playerNumber) {
        try {
            console.log(`%c[IA Commerce] Jugador ${playerNumber} evalúa comerciar con La Banca...`, "color: #FFD700; font-weight: bold;");
            
            const playerRes = gameState.playerResources[playerNumber];
            const bankCity = gameState.cities.find(c => c.owner === 0); // Banca es Player 0
            
            if (!bankCity) {
                console.log("[IA Commerce] No se encontró ciudad de La Banca.");
                return false;
            }
            
            // Verificar que haya una ruta de comercio disponible
            const pathToBank = findInfrastructurePath(
                gameState.cities.find(c => c.owner === playerNumber),
                bankCity
            );
            
            if (!pathToBank) {
                console.log("[IA Commerce] No hay ruta de infraestructura hacia La Banca.");
                return false;
            }
            
            // Recomen daciones de intercambio
            // Cambiar 2 de madera y piedra por 500 oro (ejemplo)
            if (playerRes.madera >= 2 && playerRes.piedra >= 2) {
                playerRes.madera -= 2;
                playerRes.piedra -= 2;
                playerRes.oro += 500;
                
                console.log(`%c[IA Commerce] ✓ Comercio exitoso: -2 Madera, -2 Piedra, +500 Oro`, "color: #90EE90; font-weight: bold;");
                logMessage(`La IA (Jugador ${playerNumber}) ha comerciado con La Banca.`, "event");
                return true;
            }
            
            // Alternativa: Cambiar hierro por oro
            if (playerRes.hierro >= 3) {
                playerRes.hierro -= 3;
                playerRes.oro += 400;
                
                console.log(`%c[IA Commerce] ✓ Comercio exitoso: -3 Hierro, +400 Oro`, "color: #90EE90; font-weight: bold;");
                logMessage(`La IA (Jugador ${playerNumber}) ha comerciado con La Banca.`, "event");
                return true;
            }
            
            console.log("[IA Commerce] No hay recursos suficientes para comerciar.");
            return false;
        } catch (error) {
            console.error("[IA Commerce] Error en considerBankTrade:", error);
            return false;
        }
    },

    createUnitObject: function(definition, playerNumber, spot) {
        // PASO 1: Se crea el objeto base de la unidad.
        const unit = {
            id: `u${unitIdCounter++}`,
            player: playerNumber,
            name: definition.name,
            commander: null,
            regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})),
            r: spot.r,
            c: spot.c,
            hasMoved: false,
            hasAttacked: false,
            level: 0,
            experience: 0,
            morale: 50,
            maxMorale: 125,
            isSettler: definition.regiments.some(r => REGIMENT_TYPES[r.type]?.isSettler === true),
        };
        
        // PASO 2: Se calculan los stats MÁXIMOS (attack, defense, maxHealth...)
        calculateRegimentStats(unit);
        
        // PASO 3: Se usa la información recién añadida para establecer los valores iniciales.
        unit.currentHealth = unit.regiments.reduce((sum, reg) => sum + (reg.health || 0), 0);
        unit.currentMovement = unit.movement;
        
        // Log de diagnóstico para confirma 
        console.log(`[IA createUnitObject] Unidad ${unit.name} creada. Salud Máxima: ${unit.maxHealth}, Salud Actual: ${unit.currentHealth}`);
        
        return unit;
    },
    
    endAiTurn: function(playerNumber) {
        if (gameState.currentPhase !== "gameOver" && gameState.currentPlayer === playerNumber) {
            if (domElements.endTurnBtn && !domElements.endTurnBtn.disabled) {
                setTimeout(() => { if(domElements.endTurnBtn) domElements.endTurnBtn.click(); }, 500);
            }
        }
    },

    // Aquí pegamos las implementaciones completas de las funciones auxiliares que no han cambiado
    assessThreatLevel: function(playerNumber) { const enemyPlayer = playerNumber===1?2:1; const aiUnits=units.filter(u=>u.player===playerNumber); const enemyUnits=units.filter(u=>u.player===enemyPlayer); if(enemyUnits.length===0||aiUnits.length===0)return; const biggestEnemyFormation=enemyUnits.reduce((max,unit)=>(unit.regiments.length>max?unit.regiments.length:max),0); if(biggestEnemyFormation>10){aiUnits.sort((a,b)=>b.regiments.length-a.regiments.length);const anchorUnit=aiUnits[0];AiGameplayManager.codeRed_rallyPoint={r:anchorUnit.r,c:anchorUnit.c,anchorId:anchorUnit.id};console.log(`%c[IA] CÓDIGO ROJO! Amenaza masiva detectada (${biggestEnemyFormation} reg.). Punto de reunión en ${anchorUnit.name} (${anchorUnit.r},${anchorUnit.c})`,"color: red; font-weight: bold;");}},
    moveToRallyPoint: async function(unit) { const rallyR=AiGameplayManager.codeRed_rallyPoint.r;const rallyC=AiGameplayManager.codeRed_rallyPoint.c; if(hexDistance(unit.r,unit.c,rallyR,rallyC)<=1){const anchorUnit=units.find(u=>u.id===AiGameplayManager.codeRed_rallyPoint.anchorId);if(anchorUnit&&(anchorUnit.regiments.length+unit.regiments.length<=MAX_REGIMENTS_PER_DIVISION)){await _executeMoveUnit(unit,rallyR,rallyC,true);const unitOnTarget=units.find(u=>u.id===anchorUnit.id);if(unitOnTarget){mergeUnits(unit,unitOnTarget);}}}else{const path=AiGameplayManager.findPathToTarget(unit,rallyR,rallyC);if(path&&path.length>1){const moveHex=path[Math.min(path.length-1,unit.currentMovement||unit.movement)];await _executeMoveUnit(unit,moveHex.r,moveHex.c);}}},
    _executeExpansionLogic: async function(unit) { const canSplit=unit.regiments.length>2&&unit.regiments.length<8;const freeNeighbor=getHexNeighbors(unit.r,unit.c).find(n=>board[n.r]?.[n.c]&&!board[n.r][n.c].unit&&!TERRAIN_TYPES[board[n.r][n.c].terrain].isImpassableForLand);if(canSplit&&freeNeighbor){const splitCount=Math.ceil(unit.regiments.length/2);const newUnitRegs=unit.regiments.slice(0,splitCount);const originalUnitRegs=unit.regiments.slice(splitCount);gameState.preparingAction={newUnitRegiments:newUnitRegs,remainingOriginalRegiments:originalUnitRegs};splitUnit(unit,freeNeighbor.r,freeNeighbor.c);}else{await AiGameplayManager.executeGeneralMovement(unit);}},
    _executeMoveAndAttack: async function(unit,moveHex,target){if(moveHex){await _executeMoveUnit(unit,moveHex.r,moveHex.c);} const unitAfterMove=units.find(u=>u.id===unit.id);if(unitAfterMove?.currentHealth>0&&!unitAfterMove.hasAttacked&&isValidAttack(unitAfterMove,target)){await attackUnit(unitAfterMove,target);}},
    findAndExecuteMerge_Proactive: async function(unit){const potentialAllies=units.filter(u=>u.player===unit.player&&u.id!==unit.id&&!u.hasMoved&&(unit.regiments.length+u.regiments.length)<=MAX_REGIMENTS_PER_DIVISION);if(potentialAllies.length===0)return false;potentialAllies.sort((a,b)=>{const strengthDiff=b.regiments.length-a.regiments.length;if(strengthDiff!==0)return strengthDiff;return hexDistance(unit.r,unit.c,a.r,a.c)-hexDistance(unit.r,unit.c,b.r,b.c);});const bestAllyToMergeWith=potentialAllies[0];const path=AiGameplayManager.findPathToTarget(unit,bestAllyToMergeWith.r,bestAllyToMergeWith.c);if(path&&(path.length-1)<=(unit.currentMovement||unit.movement)){await _executeMoveUnit(unit,bestAllyToMergeWith.r,bestAllyToMergeWith.c,true);const remainingAlly=units.find(u=>u.id===bestAllyToMergeWith.id);const movedUnit=units.find(u=>u.id===unit.id);if(remainingAlly&&movedUnit){mergeUnits(movedUnit,remainingAlly);return true;}} return false;},
    findAndExecuteMerge_Reactive: async function(unit,attackTarget){const allies=units.filter(u=>u.player===unit.player&&u.id!==unit.id&&!u.hasMoved&&(unit.regiments.length+u.regiments.length)<=MAX_REGIMENTS_PER_DIVISION);let bestMergePartner=null;let bestPostMergeScore=-Infinity;const currentOutcome=predictCombatOutcome(unit,attackTarget);let currentScore=(currentOutcome.damageToDefender*2)-(currentOutcome.damageToAttacker*1.5);for(const ally of allies){if(hexDistance(unit.r,unit.c,ally.r,ally.c)<=(ally.currentMovement||ally.movement)){const combinedRegs=[...unit.regiments,...ally.regiments];const tempSuperUnit=JSON.parse(JSON.stringify(unit));tempSuperUnit.regiments=combinedRegs;recalculateUnitStats(tempSuperUnit);tempSuperUnit.currentHealth=unit.currentHealth+ally.currentHealth;const outcome=predictCombatOutcome(tempSuperUnit,attackTarget);let score=(outcome.damageToDefender*2)-(outcome.damageToAttacker*1.5);if(score>currentScore&&score>bestPostMergeScore){bestPostMergeScore=score;bestMergePartner=ally;}}} if(bestMergePartner){await _executeMoveUnit(bestMergePartner,unit.r,unit.c,true);const unitOnTarget=units.find(u=>u.id===unit.id);if(unitOnTarget){mergeUnits(bestMergePartner,unitOnTarget);return{merged:true,allyId:bestMergePartner.id};}} return null;},
    handleStrategicReinforcements:function(playerNumber){const{frentes,necesitaRefuerzos}=AiGameplayManager.analyzeFrontera(playerNumber);if(!gameState.ai_reaction_forces)gameState.ai_reaction_forces={};if(necesitaRefuerzos){for(const zona in frentes){const frente=frentes[zona];if(frente.aiPower<frente.enemyPower){const fuerzaAsignada=gameState.ai_reaction_forces[zona]?units.find(u=>u.id===gameState.ai_reaction_forces[zona].unitId&&u.currentHealth>0):null;if(!fuerzaAsignada){const capital=gameState.cities.find(c=>c.isCapital&&c.owner===playerNumber);if(!capital)continue;const neededPower=(frente.enemyPower-frente.aiPower)*1.2;let composition=[];let currentPower=0;while(currentPower<neededPower){composition.push('Infantería Pesada');const regHeavy=REGIMENT_TYPES['Infantería Pesada'];currentPower+=(regHeavy.attack+regHeavy.defense)/2;if(currentPower>=neededPower)break;composition.push('Arqueros');const regArcher=REGIMENT_TYPES['Arqueros'];currentPower+=(regArcher.attack+regArcher.defense)/2;} const newUnit=AiGameplayManager.produceUnit(playerNumber,composition,'defender',`Defensa-${zona}`);if(newUnit)gameState.ai_reaction_forces[zona]={unitId:newUnit.id,targetCoords:frente.enemyCenter};}}}}},
    analyzeFrontera:function(playerNumber){const enemyPlayer=playerNumber===1?2:1;const cols=board[0].length;const zonaWidth=Math.floor(cols/3);const zonas={'Flanco-Izquierdo':{minCol:0,maxCol:zonaWidth,aiPower:0,enemyPower:0,enemyUnits:[]},'Centro':{minCol:zonaWidth+1,maxCol:zonaWidth*2,aiPower:0,enemyPower:0,enemyUnits:[]},'Flanco-Derecho':{minCol:(zonaWidth*2)+1,maxCol:cols,aiPower:0,enemyPower:0,enemyUnits:[]}};const getZona=(c)=>{if(c<=zonas['Flanco-Izquierdo'].maxCol)return 'Flanco-Izquierdo';if(c<=zonas['Centro'].maxCol)return 'Centro';return 'Flanco-Derecho';};units.forEach(unit=>{if(unit.currentHealth>0){const zona=getZona(unit.c);if(!zonas[zona])return;const power=(unit.attack+unit.defense)/2;if(unit.player===playerNumber){zonas[zona].aiPower+=power;}else if(unit.player===enemyPlayer){zonas[zona].enemyPower+=power;zonas[zona].enemyUnits.push(unit);}}});for(const zona in zonas){const frente=zonas[zona];if(frente.enemyUnits.length>0){const avgR=Math.round(frente.enemyUnits.reduce((sum,u)=>sum+u.r,0)/frente.enemyUnits.length);const avgC=Math.round(frente.enemyUnits.reduce((sum,u)=>sum+u.c,0)/frente.enemyUnits.length);frente.enemyCenter={r:avgR,c:avgC};}}const necesitaRefuerzos=Object.values(zonas).some(z=>z.aiPower<z.enemyPower);return{frentes:zonas,necesitaRefuerzos};},
    
    findBestOverallAttack: function(unit, enemies) { 
        let bestAction = null; 
        let bestScore = -Infinity; 
        const reachableHexes = AiGameplayManager.getReachableHexes(unit); 
        
        // Incluimos la posición actual como opción de ataque
        reachableHexes.push({r: unit.r, c: unit.c, cost: 0}); 

        for (const movePos of reachableHexes) { 
            const tempAttacker = {...unit, r: movePos.r, c: movePos.c}; 

            for (const enemy of enemies) { 
                if (isValidAttack(tempAttacker, enemy)) { 
                    const outcome = predictCombatOutcome(tempAttacker, enemy); 

                    // --- Lógica Inteligente de Balance de Amenaza ---
                    // 1. Beneficio: Capacidad de daño que le quitamos al enemigo
                    const enemyAtkLoss = enemy.attack * (outcome.damageToDefender / enemy.maxHealth);
                    
                    // 2. Coste: Capacidad de daño que perdemos nosotros por el contraataque
                    const myAtkLoss = unit.attack * (outcome.damageToAttacker / unit.maxHealth);

                    // 3. Puntuación base: Valoramos un 50% más nuestra supervivencia que su daño
                    let score = enemyAtkLoss - (myAtkLoss * 1.5);

                    // 4. Filtro anti-suicidio: Penalización masiva si morimos y el enemigo sigue vivo
                    if (outcome.attackerDies && !outcome.defenderDies) {
                        score -= 5000;
                    }

                    // 5. Bonus estratégico: Rematar solo si es una unidad crítica (Héroe o Suministros)
                    const isCritical = enemy.commander || enemy.regiments.some(r => r.type === "Columna de Suministro");
                    if (outcome.defenderDies && isCritical) {
                        score += 500;
                    }

                    // 6. Penalización por coste de movimiento (preferir atacar desde cerca)
                    score -= (movePos.cost || 0) * 2;

                    if (score > bestScore) { 
                        bestScore = score; 
                        bestAction = { 
                            score, 
                            target: enemy, 
                            moveHex: (movePos.r !== unit.r || movePos.c !== unit.c) ? movePos : null, 
                            // Actualizamos los flags para que la IA sepa qué tipo de combate ha elegido
                            isFavorable: !outcome.attackerDies && (enemyAtkLoss > myAtkLoss),
                            isSuicidal: outcome.attackerDies && !outcome.defenderDies
                        }; 
                    } 
                } 
            } 
        } 
        return bestAction; 
    },
    
    /**
     * Implementa la retirada táctica de una unidad amenazada
     */
    executeRetreat: async function(unit, enemies) {
        console.log(`[IA Retreat] ${unit.name} está en retirada táctica...`);
        
        // Buscar hexágonos seguros (lejos de enemigos, cerca de aliados)
        const safeHexes = [];
        const reachableHexes = this.getReachableHexes(unit);
        const allies = units.filter(u => u.player === unit.player && u.id !== unit.id && u.currentHealth > 0);
        
        for (const hex of reachableHexes) {
            // Calcular distancia mínima a enemigos
            const minEnemyDist = Math.min(...enemies.map(e => hexDistance(hex.r, hex.c, e.r, e.c)));
            
            // Calcular distancia mínima a aliados
            const minAllyDist = allies.length > 0 ? Math.min(...allies.map(a => hexDistance(hex.r, hex.c, a.r, a.c))) : 999;
            
            // Bonus por terreno defensivo
            const hexData = board[hex.r]?.[hex.c];
            const terrainBonus = (hexData?.terrain === 'forest' || hexData?.terrain === 'hills') ? 3 : 0;
            
            // Score: alejarse de enemigos, acercarse a aliados, preferir terreno defensivo
            const score = (minEnemyDist * 10) - (minAllyDist * 2) + terrainBonus;
            safeHexes.push({ ...hex, score, minEnemyDist });
        }
        
        // Ordenar por seguridad
        safeHexes.sort((a, b) => b.score - a.score);
        
        // Intentar retirarse al mejor hexágono
        if (safeHexes.length > 0 && safeHexes[0].minEnemyDist > 1) {
            await _executeMoveUnit(unit, safeHexes[0].r, safeHexes[0].c);
            console.log(`[IA Retreat] ${unit.name} se retiró a (${safeHexes[0].r}, ${safeHexes[0].c})`);
        } else {
            // Si no hay hexágonos seguros, intentar fusionarse con aliado cercano
            const nearbyAlly = allies.find(a => hexDistance(unit.r, unit.c, a.r, a.c) <= (unit.currentMovement || unit.movement));
            if (nearbyAlly && (unit.regiments.length + nearbyAlly.regiments.length) <= MAX_REGIMENTS_PER_DIVISION) {
                console.log(`[IA Retreat] ${unit.name} no encontró hexágono seguro, fusionándose con aliado...`);
                await _executeMoveUnit(unit, nearbyAlly.r, nearbyAlly.c, true);
                mergeUnits(unit, nearbyAlly);
            } else {
                console.log(`[IA Retreat] ${unit.name} no tiene opciones de retirada, se mantiene en posición.`);
                unit.hasMoved = true;
            }
        }
    },

    getReachableHexes: function(unit) { let reachable=[];let queue=[{r:unit.r,c:unit.c,cost:0}];let visited=new Set([`${unit.r},${unit.c}`]);const maxMove=unit.currentMovement||unit.movement;while(queue.length>0){let curr=queue.shift();for(const n of getHexNeighbors(curr.r,curr.c)){const key=`${n.r},${n.c}`;if(!visited.has(key)){visited.add(key);const neighborHex=board[n.r]?.[n.c];if(neighborHex&&!neighborHex.unit&&!TERRAIN_TYPES[neighborHex.terrain].isImpassableForLand){const moveCost=TERRAIN_TYPES[neighborHex.terrain]?.movementCostMultiplier||1;const newCost=curr.cost+moveCost;if(newCost<=maxMove){reachable.push({r:n.r,c:n.c,cost:newCost});queue.push({r:n.r,c:n.c,cost:newCost});}}}}}return reachable;},
    executeGeneralMovement: async function(unit) { const mission = AiGameplayManager.missionAssignments.get(unit.id); if (mission?.type === 'AXIS_ADVANCE') { const potentialTargets = AiGameplayManager.findBestStrategicObjective(unit, 'expansion', mission.objective); if (potentialTargets.length > 0) { const targetHex = potentialTargets[0]; const path = AiGameplayManager.findPathToTarget(unit, targetHex.r, targetHex.c); if (path && path.length > 1) { const moveHex = path[Math.min(path.length - 1, unit.currentMovement || unit.movement)]; if (!getUnitOnHex(moveHex.r, moveHex.c)) { await _executeMoveUnit(unit, moveHex.r, moveHex.c); return true; } } } } const localTarget = AiGameplayManager._findBestLocalMove(unit); if (localTarget) { await _executeMoveUnit(unit, localTarget.r, localTarget.c); return true; } return false; },
    
    findBestStrategicObjective: function(unit, objectiveType = 'expansion', axisTarget = null) {
        const objectives = [];
        if (!unit) return [];

        const enemyPlayer = unit.player === 1 ? 2 : 1;
        const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);

        board.flat().forEach(hex => {
            if (!hex || hex.owner === unit.player || hex.unit || TERRAIN_TYPES[hex.terrain].isImpassableForLand) return;

            let score = 0;

            // 1. Prioridad de Eje (Seguir el plan maestro)
            if (axisTarget) {
                const distToAxisTarget = hexDistance(hex.r, hex.c, axisTarget.r, axisTarget.c);
                score = 1000 - distToAxisTarget;
            } else {
                score = 100 - hexDistance(unit.r, unit.c, hex.r, hex.c);
            }

            // 2. Bonus por importancia económica (Aumentado)
            if (hex.resourceNode) score += 150; 
            if (hex.isCity) score += 300;

            // 3. LÓGICA DE NEGACIÓN (Punto clave): 
            // Si la casilla está cerca del humano, es mucho más valiosa para la IA (quiere quitártela).
            if (enemyCapital) {
                const distToHuman = hexDistance(hex.r, hex.c, enemyCapital.r, enemyCapital.c);
                // Cuanto más cerca esté de tu casa, más puntos recibe para que la IA "empuje" hacia ti.
                score += (25 - distToHuman) * 15; 
            }

            if (score > 0) objectives.push({ hex, score });
        });

        objectives.sort((a, b) => b.score - a.score);
        return objectives.map(o => o.hex);
    },

    _findBestLocalMove: function(unit) { const reachableHexes = AiGameplayManager.getReachableHexes(unit); if (reachableHexes.length === 0) return null; const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === unit.player); if (!aiCapital) return null; let bestLocalTarget = null; let maxScore = -Infinity; for (const hexCoords of reachableHexes) { const hexData = board[hexCoords.r]?.[hexCoords.c]; if (hexData && hexData.owner === null) { const score = hexDistance(aiCapital.r, aiCapital.c, hexCoords.r, hexCoords.c); if (score > maxScore) { maxScore = score; bestLocalTarget = hexCoords; } } } return bestLocalTarget; },

    /**
     * (NUEVO) Protocolo de emergencia para defender la capital a toda costa.
     * @param {number} playerNumber - El número del jugador IA.
     * @returns {boolean} - Devuelve true si el protocolo se activó y se crearon unidades.
     */
    _executeCapitalDefenseProtocol: function(playerNumber) {
        const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
         if (!capital) {
            console.error(`[IA CAPITAL DEFENSE - DIAGNÓSTICO] No se encontró capital para Jugador ${playerNumber}. El protocolo no puede activarse.`);
            return false;
        }
        console.log(`[IA CAPITAL DEFENSE - DIAGNÓSTICO] Capital de J${playerNumber} encontrada en (${capital.r}, ${capital.c}). Buscando amenazas...`);
      

        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        // Amenaza = enemigo a 2 hexágonos o menos de la capital.
        const threats = units.filter(u => u.player === enemyPlayer && hexDistance(u.r, u.c, capital.r, capital.c) <= 2);

        if (threats.length === 0) {
            return false; // No hay amenaza, no se activa el protocolo.
        }

        console.log(`%c[IA CAPITAL DEFENSE] ¡PROTOCOLO DE EMERGENCIA ACTIVADO! ${threats.length} amenaza(s) detectada(s).`, "color: red; font-size: 1.2em; font-weight: bold;");
        
        const playerRes = gameState.playerResources[playerNumber];
        let unitsCreated = false;

        // Analizar la amenaza para decidir qué construir
        let totalThreatAttack = 0;
        let hasRangedThreat = false;
        threats.forEach(threat => {
                           console.log(`  -> Amenaza detectada: ${threat.name} en (${threat.r}, ${threat.c}). Distancia: ${hexDistance(threat.r, threat.c, capital.r, capital.c)}`);
            totalThreatAttack += threat.attack || 0;
            if ((threat.attackRange || 1) > 1) {
                hasRangedThreat = true;
            }
        });

        // Bucle de producción en masa hasta agotar recursos o espacio
        while (true) {
            let unitToProduceType = null;
            
            // Decisión de contramedida:
            // Si hay amenaza a distancia o el poder de ataque enemigo es alto, priorizar Infantería Pesada por su defensa.
            if (hasRangedThreat || totalThreatAttack > 500) {
                if (playerRes.oro >= (REGIMENT_TYPES["Infantería Pesada"]?.cost.oro || 9999)) {
                    unitToProduceType = "Infantería Pesada";
                }
            }
            // Si no, o si no alcanza para la pesada, crear Arqueros para desgastar al enemigo.
            if (!unitToProduceType && playerRes.oro >= (REGIMENT_TYPES["Arqueros"]?.cost.oro || 9999)) {
                unitToProduceType = "Arqueros";
            }
            // Como última opción, la unidad más barata y versátil.
            if (!unitToProduceType && playerRes.oro >= (REGIMENT_TYPES["Infantería Ligera"]?.cost.oro || 9999)) {
                unitToProduceType = "Infantería Ligera";
            }
            
            // Si no se puede permitir ninguna unidad, o no hay ninguna que producir, salir del bucle.
            if (!unitToProduceType) {
                console.log("[IA CAPITAL DEFENSE] Recursos insuficientes para continuar la producción.");
                break;
            }

            // Intentar producir la unidad (la función produceUnit ya busca un spot adyacente)
            const newUnit = this.produceUnit(playerNumber, [unitToProduceType], 'defender', `Guardia de la Capital`, capital);
            
            if (newUnit) {
                unitsCreated = true;
                logMessage(`¡La IA refuerza su capital con ${unitToProduceType}!`);

                // Asignar misión inmediata de ataque a la nueva unidad
                this.missionAssignments.set(newUnit.id, {
                    type: 'URGENT_DEFENSE',
                    objective: threats[0] // Atacar a la primera amenaza de la lista
                });
            } else {
                // Si produceUnit devuelve null, es porque no hay más recursos o espacio.
                 console.log(`[IA CAPITAL DEFENSE - DIAGNÓSTICO] No se encontraron amenazas en un radio de 2 hexágonos.`);
                break;
            }
        }

        return unitsCreated;
    },

    /**
     * (NUEVO) Protocolo que se activa cuando la IA está en clara desventaja.
     * Designa a la unidad más fuerte como "ancla" y ordena a las demás que se agrupen con ella.
     * @param {number} playerNumber - El número del jugador IA.
     * @returns {boolean} - Devuelve true si el protocolo de consolidación se activó.
     */
    _checkForConsolidationProtocol: function(playerNumber) {
        // Early game: evitar secuestrar expansión económica por consolidación prematura.
        if (gameState.turnNumber <= 2) {
            console.log(`[IA CONSOLIDATION] SKIP turno ${gameState.turnNumber}: early-game, priorizar expansión.`);
            return false;
        }

        const aiUnits = units.filter(u => u.player === playerNumber && u.currentHealth > 0);
        if (aiUnits.length < 2) return false; // No se puede consolidar con menos de 2 unidades

        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const enemyUnits = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
        if (enemyUnits.length === 0) return false; // No hay enemigos, no hay necesidad de consolidar

        // Encontrar la división más grande de cada bando
        const biggestAiUnit = aiUnits.reduce((prev, current) => (prev.regiments.length > current.regiments.length) ? prev : current);
        const biggestEnemyUnit = enemyUnits.reduce((prev, current) => (prev.regiments.length > current.regiments.length) ? prev : current);

        // CONDICIÓN DE ACTIVACIÓN: Si la unidad más grande del enemigo es significativamente más grande
        // que la unidad más grande de la IA (ej: más del doble de regimientos).
        const enemyNearCapital = (() => {
            const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
            if (!aiCapital) return false;
            return enemyUnits.some(e => hexDistance(e.r, e.c, aiCapital.r, aiCapital.c) <= 4);
        })();

        if (biggestEnemyUnit.regiments.length > biggestAiUnit.regiments.length * 2 && enemyNearCapital) {
            console.log(`%c[IA CONSOLIDATION] ¡PROTOCOLO DE CONSOLIDACIÓN ACTIVADO! Amenaza principal: ${biggestEnemyUnit.name} (${biggestEnemyUnit.regiments.length} regs).`, "color: orange; font-size: 1.2em; font-weight: bold;");
            
            // Designar a la unidad más fuerte de la IA como el punto de reunión (ancla)
            const rallyPointUnit = biggestAiUnit;

            // Asignar una misión de "AGRUPARSE" a todas las demás unidades de la IA
            aiUnits.forEach(unit => {
                if (unit.id !== rallyPointUnit.id) {
                    this.missionAssignments.set(unit.id, {
                        type: 'CONSOLIDATE_FORCES',
                        objective: { r: rallyPointUnit.r, c: rallyPointUnit.c },
                        targetUnitId: rallyPointUnit.id
                    });
                } else {
                    // La unidad ancla recibe una misión de "ESPERAR REFUERZOS" (mantenerse a la defensiva)
                    this.missionAssignments.set(unit.id, { type: 'AWAIT_REINFORCEMENTS' });
                }
            });
            return true; // Protocolo activado
        }

        if (biggestEnemyUnit.regiments.length > biggestAiUnit.regiments.length * 2 && !enemyNearCapital) {
            console.log(`[IA CONSOLIDATION] SKIP: superioridad enemiga detectada pero sin amenaza cercana a capital.`);
        }

        return false; // No se necesita consolidación
    },

    /**
     * (NUEVO) Mueve una unidad hacia otra con la intención de fusionarse.
     * @param {object} movingUnit - La unidad que se va a mover.
     * @param {object} targetUnit - La unidad ancla con la que se quiere fusionar.
     */
    _executeMoveAndMerge: async function(movingUnit, targetUnit) {
        const distance = hexDistance(movingUnit.r, movingUnit.c, targetUnit.r, targetUnit.c);
        
        // Si ya está adyacente, intenta fusionarse.
        if (distance <= (movingUnit.currentMovement || movingUnit.movement)) {
             // Comprobar si la fusión es posible (límite de regimientos)
             if ((movingUnit.regiments.length + targetUnit.regiments.length) <= MAX_REGIMENTS_PER_DIVISION) {
                await _executeMoveUnit(movingUnit, targetUnit.r, targetUnit.c, true);
                const unitOnTarget = getUnitOnHex(targetUnit.r, targetUnit.c);
                if (unitOnTarget && unitOnTarget.id === targetUnit.id) {
                     mergeUnits(movingUnit, targetUnit);
                }
             } else {
                 console.log(`[IA CONSOLIDATION] ${movingUnit.name} está cerca pero la fusión con ${targetUnit.name} excedería el límite de regimientos.`);
                 // Se queda quieta esperando.
                 movingUnit.hasMoved = true;
                 movingUnit.hasAttacked = true;
             }
        } else {
            // Si está lejos, se acerca.
            const path = this.findPathToTarget(movingUnit, targetUnit.r, targetUnit.c);
            if (path && path.length > 1) {
                const moveHex = path[Math.min(path.length - 1, (movingUnit.currentMovement || movingUnit.movement))];
                if (!getUnitOnHex(moveHex.r, moveHex.c)) {
                    await _executeMoveUnit(movingUnit, moveHex.r, moveHex.c);
                }
            }
        }
    },
};