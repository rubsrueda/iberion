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
    
    executeTurn: async function(playerNumber) {
        AiGameplayManager.missionAssignments = new Map();
        console.group(`%c[IA Turn] INICIO para Jugador IA ${playerNumber}`, "background: #333; color: #98fb98; font-size: 1.1em;");

            // --- FASE 1: CREACIÓN DE UNIDADES (APERTURA) ---
            
            // Si es el turno 1, se ejecuta la Gran Apertura primero. El 'await' asegura que termine
            // antes de que el código continúe. No hay 'return'.
        if (gameState.turnNumber === 1 && AiGameplayManager.ownedHexPercentage(playerNumber) < 0.2) {
                console.log(`[IA STRATEGY] Ejecutando Gran Apertura...`);
            await AiGameplayManager._executeGrandOpening_v20(playerNumber);
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

            // 1. Primero, se intenta activar el protocolo de consolidación.
            //    Esta función "marca" a las unidades necesarias con misiones de CONSOLIDATE/AWAIT.
        this._checkForConsolidationProtocol(playerNumber);

            // 2. A continuación, se planifican los ejes estratégicos de expansión.
        this.planStrategicObjectives(playerNumber);

            // 3. Finalmente, se asignan misiones de expansión (AXIS_ADVANCE)
            //    SOLAMENTE a aquellas unidades que AÚN NO tienen una misión asignada.
        const unassignedUnits = unitsToAction.filter(u => !this.missionAssignments.has(u.id));
        this.assignUnitsToAxes(playerNumber, unassignedUnits);
        
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
        // <<== CORRECCIÓN #1: La condición correcta es '>= 6' para que se ejecute EN el turno 6.
        if (gameState.turnNumber < 6 || AiGameplayManager.fortressCount(playerNumber) >= 2) {
            return;
        }

        console.log("[DIAGNÓSTICO] Entrando en _handle_BOA_Construction (v5 All-in-One).");

        const playerRes = gameState.playerResources[playerNumber];
        const playerTechs = playerRes.researchedTechnologies || [];

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
                    handleConfirmBuildStructure({ playerId: playerNumber, r: location.r, c: location.c, structureType: 'Fortaleza' });
                    await new Promise(resolve => setTimeout(resolve, 20)); // Pequeña pausa
                    
                    AiGameplayManager.planRoadProject(playerNumber, location);
                }
            }
        } else {
            console.log("[DIAGNÓSTICO] Fin: Aún no tiene la tecnología de fortificaciones tras la fase de investigación (probablemente por falta de puntos).");
        }
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
                AiGameplayManager.strategicAxes.push({ name: quadName, target: { r: avgR, c: avgC } });
            }
        }
    },

    assignUnitsToAxes: function(playerNumber, unitsToAssign) {
        const explorers = unitsToAssign.filter(u => (AiGameplayManager.unitRoles.get(u.id) === 'explorer' || !AiGameplayManager.unitRoles.has(u.id)) );
        
        for(const unit of explorers) {
            let bestAxis = null;
            let minDistance = Infinity;
            
            for (const axis of AiGameplayManager.strategicAxes) {
                const dist = hexDistance(unit.r, unit.c, axis.target.r, axis.target.c);
                if(dist < minDistance) {
                    minDistance = dist;
                    bestAxis = axis;
                }
            }
            
            if(bestAxis) {
                AiGameplayManager.missionAssignments.set(unit.id, { type: 'AXIS_ADVANCE', objective: bestAxis.target });
            }
        }
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
        console.groupCollapsed(`Decidiendo para ${unit.name} (Misión: ${mission.type})`);
        try {
            if (mission.type === 'URGENT_DEFENSE') {
                const threat = getUnitById(mission.objective.id);
                const validThreat = threat && threat.currentHealth > 0;
                if (validThreat) {
                    console.log(`[IA URGENT DEFENSE] ${unit.name} tiene orden de atacar a ${threat.name}.`);
                    await this._executeCombatLogic(unit, [threat]); // Forzar combate solo contra esa amenaza
                    return; // Acción completada
                }
            }

            if (AiGameplayManager.codeRed_rallyPoint && unit.id !== AiGameplayManager.codeRed_rallyPoint.anchorId) { await AiGameplayManager.moveToRallyPoint(unit); return; }
            if (unit.regiments.length < 5 && await AiGameplayManager.findAndExecuteMerge_Proactive(unit)) { return; }

            const enemyPlayer = unit.player === 1 ? 2 : 1;
            const enemies = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
            if (enemies.length > 0) { await AiGameplayManager._executeCombatLogic(unit, enemies); } 
            else { await AiGameplayManager.executeGeneralMovement(unit); }
        } catch(e) { console.error(`Error procesando ${unit.name}:`, e); } 
        finally { console.groupEnd(); }
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
        if (biggestEnemyUnit.regiments.length > biggestAiUnit.regiments.length * 2) {
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