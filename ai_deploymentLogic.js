// Archivo: ai_deploymentLogic.js(20250827)
console.log("ai_deploymentLogic.js CARGADO - Módulo de IA para la Fase de Despliegue.");

const AiDeploymentManager = {
    
    deployUnitsAI: async function(playerNumber) {
        console.group(`%c[IA DEPLOY] Proceso de Despliegue para Jugador ${playerNumber}`, "background: #333; color: #ffa500; font-size: 1.2em;");
        try {
            if (gameState.currentPhase !== "deployment") { console.groupEnd(); return; }
            const playerResources = gameState.playerResources[playerNumber];
            let limit;
            if (gameState.deploymentUnitLimitByPlayer && typeof gameState.deploymentUnitLimitByPlayer === 'object') {
                limit = gameState.deploymentUnitLimitByPlayer[playerNumber];
            }
            if (limit === undefined || limit === null) {
                limit = gameState.deploymentUnitLimit;
            }
            let unitsToPlaceCount = (limit === Infinity) ? 5 : (limit - (gameState.unitsPlacedByPlayer?.[playerNumber] || 0));
            if (unitsToPlaceCount <= 0) { console.log("Límite de unidades para desplegar ya alcanzado."); console.groupEnd(); return; }

            const analysis = this.analyzeEnvironment(playerNumber);
            const strategy = this.determineDeploymentStrategy(analysis);
            const missionList = this.generateMissionList(strategy, analysis);
            if (missionList.length === 0) { console.warn("No se generaron misiones. Finalizando despliegue."); console.groupEnd(); return; }

            let deployedCount = 0;
            let tempOccupiedSpots = new Set();
            
            // GARANTIZAR al menos 1 unidad para evitar derrota inmediata
            for (const mission of missionList) {
                if (deployedCount >= unitsToPlaceCount) break;
                
                // Si ya tenemos 1+ unidades, verificar oro mínimo (80 = costo Pueblo)
                if (deployedCount > 0 && playerResources.oro < 80) break;
                
                const unitDefinition = this.defineUnitForMission(mission, analysis.humanThreats, playerResources);
                if (!unitDefinition) continue;
                
                // Si no tenemos oro para esta unidad pero NO hemos desplegado nada, usar fallback
                if (playerResources.oro < unitDefinition.cost) {
                    if (deployedCount === 0) {
                        console.warn(`[IA DEPLOY] ⚠️ Oro insuficiente (${playerResources.oro}). Usando unidad de emergencia (Pueblo).`);
                        const fallbackUnit = this.createFallbackUnit(playerResources);
                        if (!fallbackUnit || playerResources.oro < fallbackUnit.cost) {
                            console.error(`[IA DEPLOY] 🚨 CRÍTICO: No hay oro ni para Pueblo. Fin de despliegue.`);
                            break;
                        }
                        // Reemplazar definición con fallback
                        Object.assign(unitDefinition, fallbackUnit);
                    } else {
                        continue; // No crear esta unidad costosa
                    }
                }
                
                const currentAvailableSpots = analysis.availableSpots.filter(spot => !tempOccupiedSpots.has(`${spot.r},${spot.c}`));
                const placementSpot = this.findBestSpotForMission(mission, currentAvailableSpots, unitDefinition, playerNumber);
                if (!placementSpot) continue;

                playerResources.oro -= unitDefinition.cost;
                const newUnitData = this.createUnitObject(unitDefinition, playerNumber, placementSpot);
                placeFinalizedDivision(newUnitData, placementSpot.r, placementSpot.c);
                
                // <<== Se asegura que llama a AiGameplayManager ==>>
                if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.unitRoles) {
                    AiGameplayManager.unitRoles.set(newUnitData.id, unitDefinition.role);
                }

                tempOccupiedSpots.add(`${placementSpot.r},${placementSpot.c}`);
                deployedCount++;
            }
        } finally {
            console.groupEnd();

            // Después de que toda la lógica de despliegue ha terminado, pasa el turno.
            console.log(`[IA DEPLOY] Despliegue completado. Finalizando turno de la IA en 1 segundo...`);

            
            setTimeout(() => {
                if (gameState.currentPlayer === playerNumber && gameState.currentPhase === 'deployment') {
                    if (typeof handleEndTurn === "function") {
                        handleEndTurn();
                    } else {
                        console.error("CRÍTICO: handleEndTurn no disponible para que la IA termine su despliegue.");
                    }
                }
            }, 1000); // 1 segundo de espera.
            
        }
    },

    analyzeEnvironment: function(playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const valuableResources = [], defensivePoints = [], availableSpots = [];
        const humanThreats = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
        
        board.forEach(row => row.forEach(hex => {
            if (!hex.unit && hex.terrain !== 'water') availableSpots.push(hex);
            if (hex.resourceNode && hex.owner !== playerNumber) valuableResources.push({ hex, priority: (AI_RESOURCE_PRIORITY[hex.resourceNode.replace('_mina','')] || 50) * (hex.owner === enemyPlayer ? 1.5 : 1) });
            if ((hex.terrain === 'hills' || hex.terrain === 'forest') && getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.terrain === 'plains')) defensivePoints.push({ hex, priority: 30 + (15 - Math.abs(hex.r - Math.floor(board.length / 2))) });
        }));
        valuableResources.sort((a, b) => b.priority - a.priority);
        defensivePoints.sort((a, b) => b.priority - a.priority);

        return { valuableResources, defensivePoints, humanThreats, availableSpots };
    },
    
    determineDeploymentStrategy: function(analysis) {
        const { humanThreats, valuableResources, defensivePoints } = analysis;
        if (humanThreats.length === 0) return 'proactive_expansion';
        const isTargetingPois = humanThreats.some(threat => [...valuableResources, ...defensivePoints].some(poi => hexDistance(threat.r, threat.c, poi.hex.r, poi.hex.c) <= 2));
        if (isTargetingPois) return 'compete_expansionist';
        return 'max_expansion';
    },

    generateMissionList: function(strategy, analysis) {
        const { valuableResources, defensivePoints } = analysis;
        let missionList = [];
        switch (strategy) {
            case 'proactive_expansion': case 'max_expansion': case 'compete_expansionist':
                missionList = valuableResources.map(res => ({ type: 'CAPTURAR_RECURSO', objectiveHex: res.hex, priority: res.priority })).slice(0, 5);
                break;
            case 'counter_aggressor':
                missionList = defensivePoints.map(def => ({ type: 'OCUPAR_POSICION_DEFENSIVA', objectiveHex: def.hex, priority: def.priority }));
                break;
        }
        if (missionList.length === 0 && valuableResources.length > 0) {
            missionList = valuableResources.map(res => ({ type: 'CAPTURAR_RECURSO', objectiveHex: res.hex, priority: res.priority })).slice(0, 5);
        }
        return missionList;
    },

    /**
     * CREAR UNIDAD DE EMERGENCIA (Pueblo)
     * Cuando no hay oro para unidades normales
     */
    createFallbackUnit: function(playerResources) {
        if (playerResources.oro < 80) return null; // Ni siquiera para Pueblo
        
        const puebloType = REGIMENT_TYPES['Pueblo'];
        if (!puebloType) {
            console.error(`[IA DEPLOY] 🚨 REGIMENT_TYPES['Pueblo'] no existe. Usando Infantería Ligera.`);
            return {
                regiments: [{...REGIMENT_TYPES['Infantería Ligera'], type: 'Infantería Ligera'}],
                cost: REGIMENT_TYPES['Infantería Ligera'].cost?.oro || 150,
                role: 'defender',
                name: 'Guardia de Emergencia'
            };
        }
        
        return {
            regiments: [{...puebloType, type: 'Pueblo'}],
            cost: 80,
            role: 'defender',
            name: 'Asentamiento Defensivo'
        };
    },

    defineUnitForMission: function(mission, humanThreats, playerResources) {
        let compositionTypes = [], role = 'explorer', name = 'Tropa';
        const enemyRegimentsNearTarget = humanThreats.filter(threat => hexDistance(threat.r, threat.c, mission.objectiveHex.r, mission.objectiveHex.c) <= 3).reduce((sum, unit) => sum + (unit.regiments?.length || 1), 0);
        const isContested = enemyRegimentsNearTarget > 0;
        const objectiveTerrain = board[mission.objectiveHex.r]?.[mission.objectiveHex.c]?.terrain;

        if (isContested) {
            role = 'conqueror'; name = 'Grupo de Asalto'; const divisionSize = enemyRegimentsNearTarget + 1;
            if (objectiveTerrain === 'hills' || objectiveTerrain === 'forest') {
                const halfSize = Math.ceil(divisionSize / 2);
                for(let i=0; i<halfSize; i++) compositionTypes.push('Infantería Ligera');
                for(let i=0; i<Math.floor(divisionSize / 2); i++) compositionTypes.push('Arqueros');
            } else {
                const thirdSize = Math.ceil(divisionSize / 3);
                for(let i=0; i<thirdSize; i++) compositionTypes.push('Infantería Pesada');
                for(let i=0; i<thirdSize; i++) compositionTypes.push('Infantería Ligera');
                while(compositionTypes.length < divisionSize) compositionTypes.push('Arqueros');
            }
        } else {
            // Si hay poco oro, usar Pueblo
            if (playerResources.oro < 150) {
                console.log(`[IA DEPLOY] Oro bajo (${playerResources.oro}). Usando Pueblo para esta misión.`);
                compositionTypes.push('Pueblo');
                role = 'defender';
                name = 'Asentamiento';
            } else {
                compositionTypes.push('Infantería Ligera');
                if (objectiveTerrain === 'plains') {
                    const difficultNeighbors = getHexNeighbors(mission.objectiveHex.r, mission.objectiveHex.c).filter(n => ['hills','forest','water'].includes(board[n.r]?.[n.c]?.terrain)).length;
                    if(difficultNeighbors <= 2) { name = 'Grupo de Captura Rápido'; compositionTypes = ['Caballería Ligera']; } 
                    else { name = 'Grupo de Exploración'; }
                } else { name = 'Explorador Todoterreno'; }
            }
        }
        
        const fullRegiments = compositionTypes.map(type => ({...REGIMENT_TYPES[type], type}));
        const cost = fullRegiments.reduce((sum, reg) => sum + (reg.cost?.oro || 0), 0);
        
        // VALIDACIÓN: Si aún no podemos pagar, intentar con Pueblo
        if (cost > playerResources.oro && playerResources.oro >= 80) {
            console.warn(`[IA DEPLOY] No se puede pagar ${cost} oro. Downgrade a Pueblo (80 oro).`);
            return {
                regiments: [{...REGIMENT_TYPES['Pueblo'], type: 'Pueblo'}],
                cost: 80,
                role: 'defender',
                name: 'Asentamiento de Emergencia'
            };
        }
        
        return { regiments: fullRegiments, cost, role, name };
    },

    findBestSpotForMission: function(mission, availableSpots, unitDefinition, playerNumber) {
        const targetHex = mission.objectiveHex;
        const adjacentHexes = getHexNeighbors(targetHex.r, targetHex.c);
        let validAdjacentSpots = [];
        
        // <<== VALIDACIÓN DE DEPLOYMENT_RADIUS EN MODO INVASIÓN ==>>
        let deploymentBase = null;
        let deploymentRadius = Infinity; // Sin restricción por defecto
        
        if (gameState.gameMode === 'invasion' && gameState.currentPhase === 'deployment') {
            const playerCities = gameState.cities.filter(c => c.owner === playerNumber);
            const isAttacker = playerCities.length === 1;
            
            if (isAttacker && playerCities[0]) {
                deploymentBase = playerCities[0];
                deploymentRadius = INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS;
                console.log(`[IA DEPLOY] Modo Invasión detectado - ATACANTE restringido a radio ${deploymentRadius} desde base (${deploymentBase.r},${deploymentBase.c})`);
            } else if (!isAttacker) {
                deploymentBase = null; // Defensor puede desplegar en cualquier ciudad
                deploymentRadius = INVASION_MODE_CONFIG.DEFENDER_DEPLOYMENT_RADIUS;
                console.log(`[IA DEPLOY] Modo Invasión detectado - DEFENSOR con radio ${deploymentRadius}`);
            }
        }
        
        for (const spot of availableSpots) {
            // 1. Comprobar si está adyacente al objetivo
            if (!adjacentHexes.some(adj => adj.r === spot.r && adj.c === spot.c)) {
                continue;
            }
            
            // 2. Comprobar terreno transitable
            const spotTerrain = board[spot.r]?.[spot.c]?.terrain;
            const category = unitDefinition.regiments[0]?.category;
            const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(spotTerrain) || TERRAIN_TYPES[spotTerrain]?.isImpassableForLand;
            if (isImpassable) continue;
            
            // 3. CRÍTICO: Comprobar restricciones de deployment en modo invasión
            if (deploymentBase) {
                const distanceFromBase = hexDistance(deploymentBase.r, deploymentBase.c, spot.r, spot.c);
                if (distanceFromBase > deploymentRadius) {
                    console.log(`[IA DEPLOY] Spot (${spot.r},${spot.c}) rechazado - fuera de radio de deployment (distancia: ${distanceFromBase}, radio: ${deploymentRadius})`);
                    continue;
                }
            }
            
            validAdjacentSpots.push(spot);
        }

        if (validAdjacentSpots.length === 0) {
            console.warn(`-> No se encontró ningún spot de despliegue VÁLIDO para la misión en (${targetHex.r},${targetHex.c}). Deployment restrictivo en modo invasión.`);
            return null;
        }

        // Ordenar por el mejor terreno defensivo (colinas > bosque > llanura)
        validAdjacentSpots.sort((a, b) => {
            const scoreA = (a.terrain === 'hills') ? 3 : (a.terrain === 'forest') ? 2 : 1;
            const scoreB = (b.terrain === 'hills') ? 3 : (b.terrain === 'forest') ? 2 : 1;
            return scoreB - scoreA;
        });
        
        return validAdjacentSpots[0];
    },

    // EN: ai_deploymentLogic.js
// --- REEMPLAZA TU FUNCIÓN CON ESTA ---

    createUnitObject: function(definition, playerNumber, spot) {
        const newUnit = {
            id: `u${unitIdCounter++}`,
            player: playerNumber,
             name: definition.name,
            regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})),
            r: spot.r, c: spot.c,
            hasMoved: false, hasAttacked: false, level: 0,
            experience: 0, morale: 50, maxMorale: 125
        };

        // Llama a la nueva función central para añadir los stats
        calculateRegimentStats(newUnit);

        // Asigna la vida y movimiento usando los stats recién añadidos
        newUnit.currentHealth = newUnit.maxHealth;
        newUnit.currentMovement = newUnit.movement;
        
        console.log(`[IA DEPLOY] Unidad ${newUnit.name} creada con stats: Atk=${newUnit.attack}, Def=${newUnit.defense}`);
        return newUnit;
    },

    findChokepointsNear: function(capital) {
        const defensiveSpots = [];
        if (!capital) return defensiveSpots;
        for (const n of getHexNeighbors(capital.r, capital.c, 3)) {
            const hex = board[n.r]?.[n.c];
            if (hex && (hex.terrain === 'hills' || hex.terrain === 'forest')) defensiveSpots.push({ hex, priority: 100 - hexDistance(n.r, n.c, capital.r, capital.c) });
        }
        if (defensiveSpots.length === 0) {
            for(const n of getHexNeighbors(capital.r, capital.c, 1)) {
                const hex = board[n.r]?.[n.c];
                if (hex && !hex.unit && hex.terrain !== 'water') defensiveSpots.push({ hex, priority: 10 });
            }
        }
        defensiveSpots.sort((a,b) => b.priority.priority - a.priority.priority);
        return defensiveSpots.map(d => d.hex);
    },
};