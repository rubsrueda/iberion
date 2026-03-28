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
            const missionList = this.generateMissionList(strategy, analysis, playerNumber);
            if (missionList.length === 0) { console.warn("No se generaron misiones. Finalizando despliegue."); console.groupEnd(); return; }

            const hasDeterministicBootstrap = missionList.some(m => m?.deterministicBootstrap);

            let deployedCount = 0;
            let tempOccupiedSpots = new Set();
            const isFreeDeployment = gameState.currentPhase === 'deployment';
            
            // GARANTIZAR al menos 1 unidad para evitar derrota inmediata
            if (missionList.length > 0) {
                let missionIdx = 0;
                let safetyGuard = 0;
                while (deployedCount < unitsToPlaceCount && safetyGuard < 30) {
                    safetyGuard++;
                    let mission = null;
                    if (hasDeterministicBootstrap) {
                        // Recalcular misión en cada iteración para seguir pipeline stage 1->2->3.
                        const dynamicList = this.generateMissionList(strategy, analysis, playerNumber);
                        mission = dynamicList?.[0] || null;
                    } else {
                        mission = missionList[missionIdx % missionList.length];
                        missionIdx++;
                    }

                    if (!mission) {
                        console.warn(`[IA DEPLOY][PIPELINE] J${playerNumber} iter=${safetyGuard} NO_MISSION deployed=${deployedCount}/${unitsToPlaceCount}`);
                        break;
                    }
                    if (mission?.deterministicBootstrap) {
                        console.log(`[IA DEPLOY][PIPELINE] J${playerNumber} iter=${safetyGuard} etapa=${(mission.stageIndex || 0) + 1} deployed=${deployedCount}/${unitsToPlaceCount}`);
                    }
                
                const unitDefinition = this.defineUnitForMission(mission, analysis.humanThreats, playerResources);
                if (!unitDefinition) {
                    if (mission?.deterministicBootstrap) {
                        console.warn(`[IA DEPLOY][PIPELINE] J${playerNumber} NO_UNIT_DEF etapa=${(mission.stageIndex || 0) + 1}`);
                    }
                    continue;
                }
                
                // Si no tenemos oro para esta unidad pero NO hemos desplegado nada, usar fallback
                if (!isFreeDeployment && playerResources.oro < unitDefinition.cost) {
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
                
                // Recalcular spots en vivo para no depender del snapshot inicial del turno.
                const currentAvailableSpots = board
                    .flat()
                    .filter(spot => spot && !spot.unit && spot.terrain !== 'water')
                    .filter(spot => !tempOccupiedSpots.has(`${spot.r},${spot.c}`));
                const isFirstUnit = deployedCount === 0;
                let placementSpot = this.findBestSpotForMission(mission, currentAvailableSpots, unitDefinition, playerNumber, isFirstUnit, analysis.humanThreats);
                if (!placementSpot && mission?.deterministicBootstrap) {
                    placementSpot = this._findDeterministicBootstrapFallbackSpot(mission, currentAvailableSpots, unitDefinition, playerNumber);
                    if (!placementSpot) {
                        // Último recurso: cualquier spot transitable disponible para no romper pipeline 1->2->3.
                        const category = unitDefinition?.regiments?.[0]?.category;
                        placementSpot = currentAvailableSpots.find(s => {
                            const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(s.terrain) || TERRAIN_TYPES[s.terrain]?.isImpassableForLand;
                            return !isImpassable;
                        }) || null;
                        if (placementSpot) {
                            console.warn(`[IA DEPLOY][PIPELINE] J${playerNumber} etapa=${(mission.stageIndex || 0) + 1} usando fallback duro en (${placementSpot.r},${placementSpot.c})`);
                        }
                    }
                }
                if (!placementSpot) {
                    if (mission?.deterministicBootstrap) {
                        console.warn(`[IA DEPLOY][PIPELINE] J${playerNumber} NO_SPOT etapa=${(mission.stageIndex || 0) + 1} objetivo=(${mission.objectiveHex?.r},${mission.objectiveHex?.c})`);
                    }
                    continue;
                }

                if (!isFreeDeployment) {
                    playerResources.oro -= unitDefinition.cost;
                }
                const newUnitData = this.createUnitObject(unitDefinition, playerNumber, placementSpot);
                if (mission?.deterministicBootstrap) {
                    newUnitData.iaBootstrapObjective = {
                        r: mission.objectiveHex?.r,
                        c: mission.objectiveHex?.c,
                        stageIndex: mission.stageIndex,
                        stageLabel: mission.stageLabel,
                        fromNode: mission.fromNode,
                        toNode: mission.toNode
                    };
                    this._markDeterministicBootstrapStageCreated(playerNumber, mission);
                    this._completeDeterministicBootstrapStageFromDeployment(playerNumber, mission, placementSpot);
                    if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.missionAssignments?.set) {
                        AiGameplayManager.missionAssignments.set(newUnitData.id, {
                            type: 'IA_NODE',
                            objective: { r: mission.objectiveHex?.r, c: mission.objectiveHex?.c },
                            nodoTipo: 'corredor_comercial',
                            axisName: `bootstrap_stage_${mission.stageIndex || 0}`,
                            bootstrapStageLabel: mission.stageLabel || null
                        });
                    }
                    console.log(`[IA DEPLOY][PIPELINE] J${playerNumber} etapa=${mission.stageIndex + 1}/3 ${mission.stageLabel} unidad=${newUnitData.name} regs=${newUnitData.regiments?.length || 0} objetivo=(${mission.objectiveHex?.r},${mission.objectiveHex?.c})`);
                }
                placeFinalizedDivision(newUnitData, placementSpot.r, placementSpot.c);
                
                // <<== Se asegura que llama a AiGameplayManager ==>>
                if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.unitRoles) {
                    AiGameplayManager.unitRoles.set(newUnitData.id, unitDefinition.role);
                }

                tempOccupiedSpots.add(`${placementSpot.r},${placementSpot.c}`);
                deployedCount++;
                }

                if (hasDeterministicBootstrap) {
                    console.log(`[IA DEPLOY][PIPELINE] J${playerNumber} fin_iteraciones deployed=${deployedCount}/${unitsToPlaceCount} guard=${safetyGuard}`);
                }
            }
        } finally {
            console.groupEnd();

            // Después de que toda la lógica de despliegue ha terminado, pasa el turno.
            console.log(`[IA DEPLOY] Despliegue completado. Finalizando turno de la IA en 1 segundo...`);

            
            setTimeout(() => {
                if (gameState.currentPlayer === playerNumber && gameState.currentPhase === 'deployment') {
                    // VALIDACIÓN CRÍTICA: Si la IA no ha desplegado ninguna unidad, crear una de emergencia
                    const playerUnits = units.filter(u => u.player === playerNumber);
                    if (playerUnits.length === 0) {
                        console.warn(`[IA DEPLOY] 🚨 CRÍTICO: La IA ${playerNumber} NO ha desplegado NINGUNA UNIDAD. Creando unidad de emergencia...`);
                        const capital = gameState.cities.find(c => c.owner === playerNumber && c.isCapital);
                        if (capital) {
                            const emergencyUnit = AiDeploymentManager.createUnitObject({
                                regiments: [{...REGIMENT_TYPES['Pueblo'], type: 'Pueblo'}],
                                cost: 80,
                                role: 'defender',
                                name: 'Asentamiento de Emergencia'
                            }, playerNumber, capital);
                            placeFinalizedDivision(emergencyUnit, capital.r, capital.c);
                            console.log(`[IA DEPLOY] ✅ Unidad de emergencia creada en la capital (${capital.r},${capital.c})`);
                            gameState.playerResources[playerNumber].oro -= 80;
                        } else {
                            console.error(`[IA DEPLOY] 🚨 No se pudo crear unidad de emergencia: capital no encontrada`);
                        }
                    }
                    
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
        const capital = gameState.cities?.find(c => c.owner === playerNumber && c.isCapital) || null;
        const bankCity = gameState.cities?.find(c =>
            c && (
                c.isBank === true ||
                c.owner === (typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : 0) ||
                (typeof c.name === 'string' && c.name.toLowerCase().includes('banca'))
            )
        ) || null;
        const bankHex = board.flat().find(h => h && h.isBank) || (bankCity ? board[bankCity.r]?.[bankCity.c] : null) || null;
        const barbarianCities = gameState.cities?.filter(c => c.owner === 0 && c.hasBarbarianGarrison) || [];
        const citySites = board.flat().filter(h => h && h.owner === null && h.terrain === 'plains' && !h.unit && !h.structure).slice(0, 8);
        
        board.forEach(row => row.forEach(hex => {
            if (!hex.unit && hex.terrain !== 'water') availableSpots.push(hex);
            if (hex.resourceNode && hex.owner !== playerNumber) valuableResources.push({ hex, priority: (AI_RESOURCE_PRIORITY[hex.resourceNode.replace('_mina','')] || 50) * (hex.owner === enemyPlayer ? 1.5 : 1) });
            if ((hex.terrain === 'hills' || hex.terrain === 'forest') && getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.terrain === 'plains')) defensivePoints.push({ hex, priority: 30 + (15 - Math.abs(hex.r - Math.floor(board.length / 2))) });
        }));
        valuableResources.sort((a, b) => b.priority - a.priority);
        defensivePoints.sort((a, b) => b.priority - a.priority);

        return { valuableResources, defensivePoints, humanThreats, availableSpots, capital, bankHex, barbarianCities, citySites };
    },
    
    determineDeploymentStrategy: function(analysis) {
        if (gameState.turnNumber <= 2) return 'economic_network_bootstrap';
        const { humanThreats, valuableResources, defensivePoints } = analysis;
        if (humanThreats.length === 0) return 'proactive_expansion';
        const isTargetingPois = humanThreats.some(threat => [...valuableResources, ...defensivePoints].some(poi => hexDistance(threat.r, threat.c, poi.hex.r, poi.hex.c) <= 2));
        if (isTargetingPois) return 'compete_expansionist';
        return 'max_expansion';
    },

    generateMissionList: function(strategy, analysis, playerNumber = null) {
        const { valuableResources, defensivePoints, capital, bankHex, barbarianCities, citySites } = analysis;
        let missionList = [];
        
        // EN DEPLOYMENT: SOLO OCUPAR HACIA BANCA. NADA MAS.
        const isDeploymentPhase = gameState.currentPhase === 'deployment';
        
        if (isDeploymentPhase && strategy === 'economic_network_bootstrap' && playerNumber != null) {
            const stagedMissions = this._getDeterministicBootstrapMissions(playerNumber, analysis);
            if (stagedMissions.length > 0) {
                return stagedMissions;
            }

            // ÚNICA MISIÓN EN DEPLOYMENT: ocupar casillas de la ruta corta capital->banca
            if (capital && bankHex) {
                const roadPath = this._computeShortestRoadPath(capital, bankHex);
                const buildableRoadTerrains = new Set(STRUCTURE_TYPES?.Camino?.buildableOn || ['plains', 'hills']);
                const deployPathHexes = (roadPath || [])
                    .slice(1, -1) // excluir capital y banca
                    .filter(p => {
                        const hex = board[p.r]?.[p.c];
                        return hex && !hex.isCity && buildableRoadTerrains.has(hex.terrain);
                    });

                // Patrón de relevo: evitar línea 1-2-3 consecutiva.
                const relayOrderedHexes = [];
                const used = new Set();
                const preferredRelayOrder = [0, 2, 1, 4, 3, 5];
                for (const idx of preferredRelayOrder) {
                    const hex = deployPathHexes[idx];
                    if (!hex) continue;
                    const key = `${hex.r},${hex.c}`;
                    if (used.has(key)) continue;
                    used.add(key);
                    relayOrderedHexes.push(hex);
                    if (relayOrderedHexes.length >= 3) break;
                }
                if (relayOrderedHexes.length < 3) {
                    for (const hex of deployPathHexes) {
                        const key = `${hex.r},${hex.c}`;
                        if (used.has(key)) continue;
                        used.add(key);
                        relayOrderedHexes.push(hex);
                        if (relayOrderedHexes.length >= 3) break;
                    }
                }

                if (relayOrderedHexes.length > 0) {
                    missionList = relayOrderedHexes.map((hex, idx) => ({
                        type: 'BOOTSTRAP_BANK_CORRIDOR',
                        objectiveHex: hex,
                        priority: 1000 - (idx * 10)
                    }));

                    while (missionList.length < 3) {
                        missionList.push({
                            type: 'BOOTSTRAP_BANK_CORRIDOR',
                            objectiveHex: relayOrderedHexes[relayOrderedHexes.length - 1],
                            priority: 1000 - (missionList.length * 10)
                        });
                    }
                    return missionList;
                }
            }

            // Fallback: si no hay path elegible, apuntar al entorno de banca pero nunca a la ciudad
            if (bankHex) {
                const buildableRoadTerrains = new Set(STRUCTURE_TYPES?.Camino?.buildableOn || ['plains', 'hills']);
                const nearBank = getHexNeighbors(bankHex.r, bankHex.c)
                    .map(n => board[n.r]?.[n.c])
                    .filter(h => h && !h.isCity && buildableRoadTerrains.has(h.terrain));

                if (nearBank.length > 0) {
                    missionList = [0, 1, 2].map(i => ({
                        type: 'BOOTSTRAP_BANK_CORRIDOR',
                        objectiveHex: nearBank[i % nearBank.length],
                        priority: 1000 - (i * 10)
                    }));
                    return missionList;
                }
            }
        }
        
        // Para gameplay (después de deployment), otras estrategias
        switch (strategy) {
            case 'economic_network_bootstrap': {
                const bankBuildable = capital && bankHex && this._isRoadPathConstructible(capital, bankHex);
                
                if (bankBuildable) {
                    missionList = [
                        { type: 'BOOTSTRAP_BANK_CORRIDOR', objectiveHex: bankHex, priority: 1000 },
                        { type: 'BOOTSTRAP_BANK_CORRIDOR', objectiveHex: bankHex, priority: 990 },
                        { type: 'BOOTSTRAP_BANK_CORRIDOR', objectiveHex: bankHex, priority: 980 }
                    ];
                    break;
                }

                if (barbarianCities.length > 0) {
                    const objetivoBarbaro = barbarianCities.slice().sort((a, b) => {
                        const da = capital ? hexDistance(capital.r, capital.c, a.r, a.c) : 0;
                        const db = capital ? hexDistance(capital.r, capital.c, b.r, b.c) : 0;
                        return da - db;
                    })[0];
                    missionList = [
                        { type: 'CONQUISTAR_BARBARA', objectiveHex: board[objetivoBarbaro.r]?.[objetivoBarbaro.c] || objetivoBarbaro, priority: 920 },
                        { type: 'CONQUISTAR_BARBARA', objectiveHex: board[objetivoBarbaro.r]?.[objetivoBarbaro.c] || objetivoBarbaro, priority: 910 }
                    ];
                    break;
                }

                missionList = valuableResources.map(res => ({ type: 'CAPTURAR_RECURSO', objectiveHex: res.hex, priority: res.priority })).slice(0, 5);
                break;
            }
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

    _findDeterministicBootstrapFallbackSpot: function(mission, availableSpots, unitDefinition, playerNumber) {
        const objective = mission?.objectiveHex;
        if (!objective) return null;

        const objectiveHex = board[objective.r]?.[objective.c];
        const category = unitDefinition?.regiments?.[0]?.category;
        const canPass = (hex) => {
            if (!hex) return false;
            if (hex.unit) return false;
            if (hex.terrain === 'water') return false;
            const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(hex.terrain) || TERRAIN_TYPES[hex.terrain]?.isImpassableForLand;
            return !isImpassable;
        };

        // 1) Si el objetivo es desplegable, usarlo directamente.
        if (canPass(objectiveHex)) {
            return objectiveHex;
        }

        // 2) Si no, usar vecino más cercano al objetivo.
        const near = getHexNeighbors(objective.r, objective.c)
            .map(n => board[n.r]?.[n.c])
            .filter(h => canPass(h))
            .sort((a, b) => hexDistance(a.r, a.c, objective.r, objective.c) - hexDistance(b.r, b.c, objective.r, objective.c))[0];
        if (near) return near;

        // 3) Último recurso: mejor spot disponible más cercano al objetivo.
        return (availableSpots || [])
            .filter(h => canPass(h))
            .sort((a, b) => hexDistance(a.r, a.c, objective.r, objective.c) - hexDistance(b.r, b.c, objective.r, objective.c))[0] || null;
    },

    _getDeterministicBootstrapMissions: function(playerNumber, analysis) {
        const stages = this._buildDeterministicBootstrapStages(analysis);
        if (!stages.length) return [];

        if (!gameState.aiDeterministicBootstrap) gameState.aiDeterministicBootstrap = {};
        if (!gameState.aiDeterministicBootstrap[playerNumber]) {
            gameState.aiDeterministicBootstrap[playerNumber] = { stageIndex: 0, completed: [], createdStages: [] };
        }

        const state = gameState.aiDeterministicBootstrap[playerNumber];
        const stageIndex = Math.max(0, Math.min(state.stageIndex || 0, stages.length - 1));
        const active = stages[stageIndex];

        console.log(
            `[IA DEPLOY][PIPELINE] J${playerNumber} stage=${stageIndex + 1}/${stages.length} ` +
            `${active.label} from=(${active.fromNode.r},${active.fromNode.c}) to=(${active.toNode.r},${active.toNode.c}) ` +
            `objective=(${active.objectiveHex.r},${active.objectiveHex.c})`
        );

        return [{
            type: 'BOOTSTRAP_BANK_CORRIDOR',
            objectiveHex: active.objectiveHex,
            priority: 1200,
            deterministicBootstrap: true,
            stageIndex,
            stageLabel: active.label,
            fromNode: active.fromNode,
            toNode: active.toNode
        }];
    },

    _markDeterministicBootstrapStageCreated: function(playerNumber, mission) {
        if (!mission?.deterministicBootstrap) return;
        if (!gameState.aiDeterministicBootstrap) gameState.aiDeterministicBootstrap = {};
        if (!gameState.aiDeterministicBootstrap[playerNumber]) {
            gameState.aiDeterministicBootstrap[playerNumber] = { stageIndex: 0, completed: [], createdStages: [] };
        }

        const state = gameState.aiDeterministicBootstrap[playerNumber];
        state.createdStages = Array.isArray(state.createdStages) ? state.createdStages : [];
        const stageIndex = Number(mission.stageIndex || 0);
        if (!state.createdStages.includes(stageIndex)) {
            state.createdStages.push(stageIndex);
        }

        const createdEntry = {
            stageIndex: mission.stageIndex,
            stageLabel: mission.stageLabel,
            objectiveHex: mission.objectiveHex,
            turn: gameState.turnNumber
        };
        state.completed = Array.isArray(state.completed) ? state.completed : [];
        state.completed.push({ ...createdEntry, createdOnly: true });
    },

    _completeDeterministicBootstrapStageFromDeployment: function(playerNumber, mission, placementSpot) {
        if (!mission?.deterministicBootstrap || !placementSpot) return;
        if (!gameState.aiDeterministicBootstrap) gameState.aiDeterministicBootstrap = {};
        if (!gameState.aiDeterministicBootstrap[playerNumber]) {
            gameState.aiDeterministicBootstrap[playerNumber] = { stageIndex: 0, completed: [], createdStages: [] };
        }

        const state = gameState.aiDeterministicBootstrap[playerNumber];
        const objective = mission.objectiveHex || null;
        const reachedByPlacement = !!(
            objective &&
            placementSpot.r === objective.r &&
            placementSpot.c === objective.c
        );

        if (!reachedByPlacement) return;

        state.completed = Array.isArray(state.completed) ? state.completed : [];
        const alreadyReached = state.completed.some(c =>
            c && c.stageIndex === Number(mission.stageIndex || 0) && c.reached === true
        );
        if (!alreadyReached) {
            state.completed.push({
                stageIndex: Number(mission.stageIndex || 0),
                stageLabel: mission.stageLabel || null,
                objectiveHex: objective,
                turn: gameState.turnNumber,
                reached: true,
                reachedInDeployment: true
            });
        }

        const next = Math.max(0, Number(mission.stageIndex || 0) + 1);
        state.stageIndex = Math.min(next, 2);
        console.log(`[IA DEPLOY][PIPELINE] J${playerNumber} etapa=${Number(mission.stageIndex || 0) + 1}/3 completada en despliegue. Siguiente etapa=${state.stageIndex + 1}`);
    },

    _buildDeterministicBootstrapStages: function(analysis) {
        const { capital, bankHex, citySites } = analysis || {};
        if (!capital || !bankHex) return [];

        const pickObjectiveFromPath = (path, fallback) => {
            const buildableRoadTerrains = new Set(STRUCTURE_TYPES?.Camino?.buildableOn || ['plains', 'hills']);
            const interior = (path || [])
                .slice(1, -1)
                .filter(p => {
                    const hex = board[p.r]?.[p.c];
                    return !!(hex && !hex.isCity && buildableRoadTerrains.has(hex.terrain));
                });
            return interior[0] || fallback;
        };

        const nearestTo = (origin, excluded = new Set()) => {
            const sites = (citySites || []).filter(s => s && !excluded.has(`${s.r},${s.c}`));
            if (!sites.length || !origin) return null;
            return sites.slice().sort((a, b) => hexDistance(origin.r, origin.c, a.r, a.c) - hexDistance(origin.r, origin.c, b.r, b.c))[0];
        };

        const stages = [];

        const pathPrimary = this._computeShortestRoadPath(capital, bankHex);
        const objPrimary = pickObjectiveFromPath(pathPrimary, bankHex);
        stages.push({
            label: 'PRIMARIO capital->banca',
            fromNode: { r: capital.r, c: capital.c },
            toNode: { r: bankHex.r, c: bankHex.c },
            objectiveHex: { r: objPrimary.r, c: objPrimary.c }
        });

        const cityX = nearestTo(bankHex);
        if (!cityX) return stages;

        const pathSecondary = this._computeShortestRoadPath(bankHex, cityX);
        const objSecondary = pickObjectiveFromPath(pathSecondary, cityX);
        stages.push({
            label: 'SECUNDARIO banca->ciudad_libre_X',
            fromNode: { r: bankHex.r, c: bankHex.c },
            toNode: { r: cityX.r, c: cityX.c },
            objectiveHex: { r: objSecondary.r, c: objSecondary.c }
        });

        const excluded = new Set([`${cityX.r},${cityX.c}`]);
        const cityY = nearestTo(cityX, excluded);
        if (!cityY) return stages;

        const pathTertiary = this._computeShortestRoadPath(cityX, cityY);
        const objTertiary = pickObjectiveFromPath(pathTertiary, cityY);
        stages.push({
            label: 'TERCIARIO ciudad_libre_X->ciudad_libre_Y',
            fromNode: { r: cityX.r, c: cityX.c },
            toNode: { r: cityY.r, c: cityY.c },
            objectiveHex: { r: objTertiary.r, c: objTertiary.c }
        });

        return stages.slice(0, 3);
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
        const isFreeDeployment = gameState.currentPhase === 'deployment';
        if (mission.type === 'BOOTSTRAP_BANK_CORRIDOR') {
            // División determinista de 2 regimientos para activar bucle fusión-split (gusano).
            const lightCost = (REGIMENT_TYPES['Infantería Ligera']?.cost?.oro) || 150;
            if (isFreeDeployment || playerResources.oro >= (lightCost * 2)) {
                compositionTypes = ['Infantería Ligera', 'Infantería Ligera'];
            } else if (playerResources.oro >= lightCost) {
                compositionTypes = ['Infantería Ligera', 'Pueblo'];
            } else {
                compositionTypes = ['Pueblo', 'Pueblo'];
            }
            role = 'builder';
            name = 'Pionero de Corredor';
        }
        if (mission.type === 'CONQUISTAR_BARBARA') {
            compositionTypes = ['Infantería Pesada', 'Arqueros'];
            role = 'conqueror';
            name = 'Expedición Bárbara';
        }
        if (mission.type === 'FUNDAR_CIUDAD') {
            compositionTypes = ['Pueblo'];
            role = 'defender';
            name = 'Núcleo de Fundación';
        }

        if (compositionTypes.length > 0) {
            const budgetFitFast = this.fitCompositionToBudget(compositionTypes, isFreeDeployment ? Number.POSITIVE_INFINITY : playerResources.oro, ['Infantería Ligera', 'Pueblo']);
            if (budgetFitFast) {
                const fullRegiments = budgetFitFast.compositionTypes.map(type => ({...REGIMENT_TYPES[type], type}));
                return { regiments: fullRegiments, cost: budgetFitFast.cost, role, name };
            }
        }

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
        
        const preferredFallbacks = isContested
            ? ['Infantería Ligera', 'Arqueros', 'Pueblo']
            : ['Ingenieros', 'Columna de Suministro', 'Explorador', 'Pueblo'];

        const budgetFit = this.fitCompositionToBudget(compositionTypes, isFreeDeployment ? Number.POSITIVE_INFINITY : playerResources.oro, preferredFallbacks);
        if (!budgetFit) {
            console.warn(`[IA DEPLOY] No hay oro suficiente para ninguna unidad. Oro actual: ${playerResources.oro}.`);
            return null;
        }

        compositionTypes = budgetFit.compositionTypes;
        if (budgetFit.downgraded) {
            console.warn(`[IA DEPLOY] Presupuesto ${playerResources.oro} oro. Ajustando composición a ${compositionTypes.join(', ')} (coste ${budgetFit.cost}).`);
        }

        if (compositionTypes.length === 1) {
            const loneType = compositionTypes[0];
            if (loneType === 'Ingenieros') { role = 'builder'; name = 'Ingenieros'; }
            if (loneType === 'Columna de Suministro') { role = 'support'; name = 'Columna de Suministro'; }
            if (loneType === 'Explorador') { role = 'explorer'; name = 'Explorador'; }
            if (loneType === 'Pueblo') { role = 'defender'; name = 'Asentamiento'; }
        }

        const fullRegiments = compositionTypes.map(type => ({...REGIMENT_TYPES[type], type}));
        return { regiments: fullRegiments, cost: budgetFit.cost, role, name };
    },

    fitCompositionToBudget: function(compositionTypes, budgetOro, preferredFallbacks = []) {
        const costOf = (type) => REGIMENT_TYPES[type]?.cost?.oro ?? Infinity;
        const sumCost = (types) => types.reduce((sum, type) => sum + costOf(type), 0);

        let current = compositionTypes.filter(type => REGIMENT_TYPES[type]);
        let currentCost = sumCost(current);

        if (currentCost <= budgetOro) {
            return { compositionTypes: current, cost: currentCost, downgraded: false };
        }

        const preferredAffordable = preferredFallbacks.find(type => costOf(type) <= budgetOro);
        if (preferredAffordable) {
            return { compositionTypes: [preferredAffordable], cost: costOf(preferredAffordable), downgraded: true };
        }

        current = [...current].sort((a, b) => costOf(b) - costOf(a));
        while (current.length > 1 && sumCost(current) > budgetOro) {
            current.shift();
        }

        currentCost = sumCost(current);
        if (currentCost <= budgetOro) {
            return { compositionTypes: current, cost: currentCost, downgraded: true };
        }

        const affordableTypes = Object.keys(REGIMENT_TYPES)
            .filter(type => costOf(type) <= budgetOro)
            .sort((a, b) => costOf(a) - costOf(b));

        if (affordableTypes.length === 0) return null;
        return { compositionTypes: [affordableTypes[0]], cost: costOf(affordableTypes[0]), downgraded: true };
    },

    findBestSpotForMission: function(mission, availableSpots, unitDefinition, playerNumber, isFirstUnit = false, humanThreats = []) {
        const targetHex = mission.objectiveHex;
        const economicBootstrap = ['BOOTSTRAP_BANK_CORRIDOR', 'CONQUISTAR_BARBARA', 'FUNDAR_CIUDAD'].includes(mission.type);
        
        // SALVAGUARDA CRÍTICA: Primera unidad debe estar ALEJADA del frente
        if (isFirstUnit && !economicBootstrap) {
            console.log(`[IA DEPLOY] 🛡️ PRIMERA UNIDAD - Buscando posición DEFENSIVA LEJANA del enemigo`);
            return this.findSafeDefensiveSpot(availableSpots, unitDefinition, playerNumber, humanThreats);
        }

        if (economicBootstrap && gameState.turnNumber <= 2) {
            // Si el objetivo ya es una casilla válida de despliegue, ocuparla directamente.
            if (mission.type === 'BOOTSTRAP_BANK_CORRIDOR') {
                const exactSpot = availableSpots.find(s => s.r === targetHex.r && s.c === targetHex.c);
                if (exactSpot) {
                    const terrain = board[exactSpot.r]?.[exactSpot.c]?.terrain;
                    const buildableRoadTerrains = new Set(STRUCTURE_TYPES?.Camino?.buildableOn || ['plains', 'hills']);
                    if (buildableRoadTerrains.has(terrain)) {
                        return exactSpot;
                    }
                }
            }

            // En apertura económica, desplegar todo orientado al objetivo comercial.
            const capital = gameState.cities?.find(c => c.owner === playerNumber && c.isCapital);
            const sorted = availableSpots
                .filter(spot => {
                    const t = board[spot.r]?.[spot.c]?.terrain;
                    const buildableRoadTerrains = new Set(STRUCTURE_TYPES?.Camino?.buildableOn || ['plains', 'hills']);
                    return t && buildableRoadTerrains.has(t) && !spot.isCity;
                })
                .sort((a, b) => {
                    const da = hexDistance(a.r, a.c, targetHex.r, targetHex.c) + (capital ? hexDistance(a.r, a.c, capital.r, capital.c) * 0.15 : 0);
                    const db = hexDistance(b.r, b.c, targetHex.r, targetHex.c) + (capital ? hexDistance(b.r, b.c, capital.r, capital.c) * 0.15 : 0);
                    return da - db;
                });
            if (sorted.length > 0) return sorted[0];
        }
        
        // Para otras unidades: comportamiento normal (adyacente al objetivo)
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

    _isRoadPathConstructible: function(origen, destino) {
        if (!origen || !destino) return false;
        const queue = [{ r: origen.r, c: origen.c }];
        const visited = new Set([`${origen.r},${origen.c}`]);
        let guard = 0;

        while (queue.length > 0 && guard < 1200) {
            guard++;
            const cur = queue.shift();
            if (cur.r === destino.r && cur.c === destino.c) return true;

            for (const n of getHexNeighbors(cur.r, cur.c)) {
                const key = `${n.r},${n.c}`;
                if (visited.has(key)) continue;
                const hex = board[n.r]?.[n.c];
                if (!hex) continue;
                if (hex.terrain === 'water' || hex.terrain === 'forest') continue;
                if (TERRAIN_TYPES[hex.terrain]?.isImpassableForLand) continue;
                visited.add(key);
                queue.push({ r: n.r, c: n.c });
            }
        }

        return false;
    },

    _computeShortestRoadPath: function(origen, destino) {
        if (!origen || !destino) return null;

        const buildableRoadTerrains = new Set(STRUCTURE_TYPES?.Camino?.buildableOn || ['plains', 'hills']);
        const startKey = `${origen.r},${origen.c}`;
        const targetKey = `${destino.r},${destino.c}`;

        const queue = [{ r: origen.r, c: origen.c }];
        const visited = new Set([startKey]);
        const prev = new Map();
        let guard = 0;

        while (queue.length > 0 && guard < 3000) {
            guard++;
            const cur = queue.shift();
            const curKey = `${cur.r},${cur.c}`;
            if (curKey === targetKey) break;

            for (const n of getHexNeighbors(cur.r, cur.c)) {
                const key = `${n.r},${n.c}`;
                if (visited.has(key)) continue;
                const hex = board[n.r]?.[n.c];
                if (!hex) continue;

                // Permitimos entrar en origen/destino aunque sean ciudad; el resto debe ser apto para camino.
                const isEndpoint = key === startKey || key === targetKey;
                if (!isEndpoint && (!buildableRoadTerrains.has(hex.terrain) || hex.isCity)) continue;
                if (TERRAIN_TYPES[hex.terrain]?.isImpassableForLand) continue;

                visited.add(key);
                prev.set(key, curKey);
                queue.push({ r: n.r, c: n.c });
            }
        }

        if (!visited.has(targetKey)) return null;

        const path = [];
        let walk = targetKey;
        while (walk) {
            const [r, c] = walk.split(',').map(Number);
            path.push({ r, c });
            walk = prev.get(walk);
        }
        path.reverse();
        return path;
    },

    /**
     * ENCONTRAR POSICIÓN DEFENSIVA SEGURA PARA PRIMERA UNIDAD
     * La primera unidad DEBE estar alejada del frente para sobrevivir
     */
    findSafeDefensiveSpot: function(availableSpots, unitDefinition, playerNumber, humanThreats = []) {
        const capital = gameState.cities.find(c => c.owner === playerNumber && c.isCapital);
        const candidateSpots = [];
        
        for (const spot of availableSpots) {
            const spotTerrain = board[spot.r]?.[spot.c]?.terrain;
            
            // 1. Solo terreno transitable
            const category = unitDefinition.regiments[0]?.category;
            const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(spotTerrain) || 
                                TERRAIN_TYPES[spotTerrain]?.isImpassableForLand;
            if (isImpassable) continue;
            
            // 2. CRÍTICO: Debe estar ALEJADO del enemigo
            const minDistToEnemy = Math.min(...humanThreats.map(threat => 
                hexDistance(threat.r, threat.c, spot.r, spot.c)
            ), Infinity);
            
            if (minDistToEnemy < 5) continue; // Debe estar a distancia 5+ del enemigo más cercano
            
            // 3. Preferencia: cercano a la capital
            const distToCapital = capital ? hexDistance(capital.r, capital.c, spot.r, spot.c) : Infinity;
            
            // 4. Bonificación por terreno defensivo
            const defensiveScore = (spotTerrain === 'hills') ? 3 : (spotTerrain === 'forest') ? 2 : 1;
            
            candidateSpots.push({
                spot,
                distToEnemy: minDistToEnemy,
                distToCapital,
                defensiveScore
            });
        }
        
        if (candidateSpots.length === 0) {
            console.warn(`[IA DEPLOY] ⚠️ No hay posición segura a 5+ de distancia del enemigo. Usando la más lejana disponible.`);
            
            // Fallback: buscar la más lejana del enemigo sin importar distancia mínima
            let safestSpot = null;
            let maxDistance = -1;
            
            for (const spot of availableSpots) {
                const spotTerrain = board[spot.r]?.[spot.c]?.terrain;
                const category = unitDefinition.regiments[0]?.category;
                const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(spotTerrain) || 
                                    TERRAIN_TYPES[spotTerrain]?.isImpassableForLand;
                if (isImpassable) continue;
                
                const minDist = Math.min(...humanThreats.map(threat => 
                    hexDistance(threat.r, threat.c, spot.r, spot.c)
                ), Infinity);
                
                if (minDist > maxDistance) {
                    maxDistance = minDist;
                    safestSpot = spot;
                }
            }
            
            if (safestSpot) {
                console.log(`[IA DEPLOY] Usando posición a distancia ${maxDistance} del enemigo.`);
                return safestSpot;
            }
            
            console.error(`[IA DEPLOY] 🚨 No hay ningún spot disponible seguro. Usando cualquier spot.`);
            return availableSpots[0] || null;
        }
        
        // Ordenar por: 1) Defensa del terreno, 2) Distancia al capital, 3) Lejanía del enemigo
        candidateSpots.sort((a, b) => {
            if (a.defensiveScore !== b.defensiveScore) {
                return b.defensiveScore - a.defensiveScore; // Mayor defensa primero
            }
            if (Math.abs(a.distToCapital - b.distToCapital) > 1) {
                return a.distToCapital - b.distToCapital; // Más cercano a capital
            }
            return b.distToEnemy - a.distToEnemy; // Más lejano del enemigo
        });
        
        console.log(`[IA DEPLOY] ✓ Primera unidad: Posición segura en (${candidateSpots[0].spot.r},${candidateSpots[0].spot.c}), distancia enemigo: ${candidateSpots[0].distToEnemy}, terreno: ${board[candidateSpots[0].spot.r]?.[candidateSpots[0].spot.c]?.terrain}`);
        
        return candidateSpots[0].spot;
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