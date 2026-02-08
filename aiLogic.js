// aiLogic.js (20250827 - Lógica de Despliegue y Turno Unificada)
const AiManager = {

    // =======================================================================
    // === MÓDULO 1: DESPLIEGUE ESTRATÉGICO =================================
    // =======================================================================

    deployUnitsAI: function(playerNumber) {
        // === ETAPA 0: PREPARACIÓN ===
        if (gameState.currentPhase !== "deployment") { return; }
        const playerResources = gameState.playerResources[playerNumber];
        let limit;
        if (gameState.deploymentUnitLimitByPlayer && typeof gameState.deploymentUnitLimitByPlayer === 'object') {
            limit = gameState.deploymentUnitLimitByPlayer[playerNumber];
        }
        if (limit === undefined || limit === null) {
            limit = gameState.deploymentUnitLimit;
        }
        let unitsToPlaceCount = (limit === Infinity) ? 5 : (limit - (gameState.unitsPlacedByPlayer?.[playerNumber] || 0));

        // 1. ANÁLISIS DEL ENTORNO
        const analysis = this.analyzeEnvironment(playerNumber);

        // 2. DECISIÓN ESTRATÉGICA
        const strategy = this.determineDeploymentStrategy(analysis);

        // 3. PLAN DE BATALLA
        const missionList = this.generateMissionList(strategy, analysis);
        
        if (missionList.length === 0) { console.warn("No se generaron misiones. Finalizando despliegue."); return; }

        // 4. FASE DE DESPLIEGUE
        let deployedCount = 0;
        let tempOccupiedSpots = new Set();
        
        for (const mission of missionList) {
            if (deployedCount >= unitsToPlaceCount || playerResources.oro < 200) break;
            
            const unitDefinition = this.defineUnitForMission(mission, analysis.humanThreats, playerResources);
            if (!unitDefinition || playerResources.oro < unitDefinition.cost) continue;
            
            const currentAvailableSpots = analysis.availableSpots.filter(spot => !tempOccupiedSpots.has(`${spot.r},${spot.c}`));
            const placementSpot = this.findBestSpotForMission(mission, currentAvailableSpots, unitDefinition);

            if (!placementSpot) {
                continue;
            }
            
            playerResources.oro -= unitDefinition.cost;
            const newUnitData = this.createUnitObject(unitDefinition, playerNumber, placementSpot);
            placeFinalizedDivision(newUnitData, placementSpot.r, placementSpot.c);
            this.unitRoles.set(newUnitData.id, unitDefinition.role);
            tempOccupiedSpots.add(`${placementSpot.r},${placementSpot.c}`);
            deployedCount++;
        }
    },

    analyzeEnvironment: function(playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const valuableResources = [], defensivePoints = [], availableSpots = [];
        const humanThreats = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
        
        board.forEach(row => row.forEach(hex => {
            if (!hex.unit && hex.terrain !== 'water') availableSpots.push(hex);
            if (hex.resourceNode && hex.owner !== playerNumber) {
                valuableResources.push({ hex, priority: (AI_RESOURCE_PRIORITY[hex.resourceNode.replace('_mina','')] || 50) * (hex.owner === enemyPlayer ? 1.5 : 1) });
            }
            if ((hex.terrain === 'hills' || hex.terrain === 'forest') && getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.terrain === 'plains')) {
                defensivePoints.push({ hex, priority: 30 + (15 - Math.abs(hex.r - Math.floor(board.length / 2))) });
            }
        }));
        valuableResources.sort((a, b) => b.priority - a.priority);
        defensivePoints.sort((a, b) => b.priority - a.priority);

        return { valuableResources, defensivePoints, humanThreats, availableSpots };
    },
    
    logAnalysis: function(analysis) {
        const { valuableResources, defensivePoints, humanThreats, availableSpots } = analysis;
        const terrain = (h) => TERRAIN_TYPES[h.terrain]?.name.substring(0,3) || '???';
    },

    determineDeploymentStrategy: function(analysis) {
        const { humanThreats, valuableResources, defensivePoints } = analysis;
        if (humanThreats.length === 0) {
            return 'proactive_expansion';
        }
        
        const isTargetingPois = humanThreats.some(threat => 
            [...valuableResources, ...defensivePoints].some(poi => hexDistance(threat.r, threat.c, poi.hex.r, poi.hex.c) <= 2)
        );

        if (isTargetingPois) {
            return 'compete_expansionist';
        }
        return 'max_expansion';
    },

    generateMissionList: function(strategy, analysis) {
        const { valuableResources, defensivePoints } = analysis;
        let missionList = [];
        switch (strategy) {
            case 'proactive_expansion':
            case 'max_expansion':
            case 'compete_expansionist':
                missionList = valuableResources.map(res => ({ type: 'CAPTURAR_RECURSO', objectiveHex: res.hex, priority: res.priority })).slice(0, 5);
                break;
            case 'counter_aggressor': // Aunque no se use, se mantiene por robustez
                missionList = defensivePoints.map(def => ({ type: 'OCUPAR_POSICION_DEFENSIVA', objectiveHex: def.hex, priority: def.priority }));
                break;
        }
        
        return missionList;
    },

    defineUnitForMission: function(mission, humanThreats, playerResources) {
        let compositionTypes = [], role = 'explorer', name = 'Tropa';
        const enemyRegimentsNearTarget = humanThreats.filter(threat => 
            hexDistance(threat.r, threat.c, mission.objectiveHex.r, mission.objectiveHex.c) <= 3
        ).reduce((sum, unit) => sum + (unit.regiments?.length || 1), 0);
        
        const isContested = enemyRegimentsNearTarget > 0;
        const objectiveTerrain = board[mission.objectiveHex.r]?.[mission.objectiveHex.c]?.terrain;

        if (isContested) {
            role = 'conqueror'; name = 'Grupo de Asalto';
            const divisionSize = enemyRegimentsNearTarget + 1;
            
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
            compositionTypes.push('Infantería Ligera'); // Default
            if (objectiveTerrain === 'plains') {
                const neighbors = getHexNeighbors(mission.objectiveHex.r, mission.objectiveHex.c);
                const difficultNeighbors = neighbors.filter(n => ['hills','forest','water'].includes(board[n.r]?.[n.c]?.terrain)).length;
                if(difficultNeighbors <= 2) {
                     name = 'Grupo de Captura Rápido';
                     compositionTypes = ['Caballería Ligera'];
                } else {
                    name = 'Grupo de Exploración';
                }
            } else {
                 name = 'Explorador Todoterreno';
            }
        }
        
        const fullRegiments = compositionTypes.map(type => ({...REGIMENT_TYPES[type], type}));
        const totalCost = fullRegiments.reduce((sum, reg) => sum + (reg.cost?.oro || 0), 0);
        
        return { regiments: fullRegiments, cost: totalCost, role, name };
    },

    findBestSpotForMission: function(mission, availableSpots, unitDefinition) {
        const targetHex = mission.objectiveHex;
        const adjacentHexes = getHexNeighbors(targetHex.r, targetHex.c);
        let validAdjacentSpots = [];
        
        for (const spot of availableSpots) {
            if (adjacentHexes.some(adj => adj.r === spot.r && adj.c === spot.c)) {
                const spotTerrain = board[spot.r]?.[spot.c]?.terrain;
                const category = unitDefinition.regiments[0]?.category;
                const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(spotTerrain);

                if (!isImpassable) validAdjacentSpots.push(spot);
            }
        }

        if (validAdjacentSpots.length === 0) {
            console.warn(`-> No se encontró ningún spot de despliegue ADYACENTE y válido para la misión en (${targetHex.r},${targetHex.c}).`);
            return null; // Si no hay adyacentes, aborta esta misión por ahora
        }

        validAdjacentSpots.sort((a, b) => {
            const scoreA = (a.terrain === 'hills') ? 3 : (a.terrain === 'forest') ? 2 : 1;
            const scoreB = (b.terrain === 'hills') ? 3 : (b.terrain === 'forest') ? 2 : 1;
            return scoreB - scoreA;
        });
        
        return validAdjacentSpots[0];
    },

    createUnitObject: function(definition, playerNumber, spot) {
        // (No necesita logs, ya que es una función de creación de datos)
        const stats = calculateRegimentStats(definition.regiments, playerNumber);
        return {
            id: `u${unitIdCounter++}`, player: playerNumber, name: `${definition.name} IA`,
            regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})),
            ...stats, currentHealth: stats.maxHealth, currentMovement: stats.movement,
            r: spot.r, c: spot.c, hasMoved: false, hasAttacked: false, level: 0,
            experience: 0, morale: 50, maxMorale: 125,
        };
    },
    
    findChokepointsNear: function(capital) {
        const defensiveSpots = [];
        if (!capital) return defensiveSpots;
        const neighbors = getHexNeighbors(capital.r, capital.c, 3);
        for(const n of neighbors) {
            const hex = board[n.r]?.[n.c];
            if (hex && (hex.terrain === 'hills' || hex.terrain === 'forest')) {
                defensiveSpots.push({ r: n.r, c: n.c, priority: 100 - hexDistance(n.r, n.c, capital.r, capital.c) });
            }
        }
        if (defensiveSpots.length === 0) {
            for(const n of getHexNeighbors(capital.r, capital.c, 1)) {
                const hex = board[n.r]?.[n.c];
                if (hex && !hex.unit && hex.terrain !== 'water') defensiveSpots.push({ r: n.r, c: n.c, priority: 10 });
            }
        }
        defensiveSpots.sort((a,b) => b.priority - a.priority);
        return defensiveSpots;
    },

    // =============================================================
    // === MÓDULO 2: LÓGICA DE TURNO (COMPLETA Y FUNCIONAL) ========
    // =============================================================
    
    config: {
        actionProbability: 0.9, 
        combatRiskAversion: 0.4,
    },
    
    unitRoles: new Map(),

    executeTurn: function(aiPlayerNumber, aiLevel) {
        try {
            
            this.manageEmpire(aiPlayerNumber, aiLevel);
            const activeAiUnits = units.filter(u => u.player === aiPlayerNumber && u.currentHealth > 0 && u.r !== -1);
            if (activeAiUnits.length === 0) { this.endAiTurn(aiPlayerNumber); return; }
            
            let unitIndex = 0;
            const processNextUnit = async () => {
                if (gameState.currentPhase === "gameOver" || unitIndex >= activeAiUnits.length) { this.endAiTurn(aiPlayerNumber); return; }
                const unit = activeAiUnits[unitIndex++];
                if (unit.currentHealth > 0 && (!unit.hasMoved || !unit.hasAttacked)) {
                    await this.decideAndExecuteUnitAction(unit, aiPlayerNumber, aiLevel);
                }
                if (gameState.currentPhase !== "gameOver") setTimeout(processNextUnit, 300);
            };
            processNextUnit();
        } catch (error) {
            console.error(`ERROR CRÍTICO en AiManager.executeTurn:`, error);
            this.endAiTurn(aiPlayerNumber);
        }
    },
    
    manageEmpire: function(aiPlayerNumber, aiLevel) {
        // Lógica de investigación
        const playerState = gameState.playerResources[aiPlayerNumber];
        const availableTechs = getAvailableTechnologies(playerState.researchedTechnologies || []);
        if (availableTechs.length > 0 && playerState.researchPoints > 40) {
            const chosenTech = availableTechs.find(tech => playerState.researchPoints >= (tech.cost?.researchPoints || 0));
            if (chosenTech) attemptToResearch(chosenTech.id);
        }

        // Lógica de producción de unidades durante la partida
        const validRecruitmentHexes = gameState.cities.filter(c => c.owner === aiPlayerNumber && !getUnitOnHex(c.r, c.c));
        if (validRecruitmentHexes.length > 0 && playerState.oro > 800) { // Umbral de oro para producir
             const unitDef = { regiments: [{...REGIMENT_TYPES["Infantería Pesada"], type: "Infantería Pesada"}], cost: 300, role: 'defender', name: 'Refuerzos'};
             const spot = validRecruitmentHexes[0];
             playerState.oro -= unitDef.cost;
             const newUnit = this.createUnitObject(unitDef, aiPlayerNumber, spot);
             placeFinalizedDivision(newUnit, spot.r, spot.c);
        }
    },

    decideAndExecuteUnitAction: async function(unit, aiPlayerNumber, aiLevel) {
        const enemyPlayer = aiPlayerNumber === 1 ? 2 : 1;
        let actionPerformed = await this.attemptOpportunisticAttack(unit, enemyPlayer);
        if (!actionPerformed && !unit.hasMoved) {
            await this.executeGeneralMovement(unit, enemyPlayer);
        }
    },
    
    attemptOpportunisticAttack: async function(unit, enemyPlayer) {
        if (!unit.hasAttacked) {
            const immediateTarget = this.findBestImmediateAttackTarget(unit, enemyPlayer);
            if (immediateTarget) { await attackUnit(unit, immediateTarget); return true; }
        }
        if (!unit.hasMoved && !unit.hasAttacked) {
            const moveAttackPlan = this.findBestMoveAndAttackAction(unit, enemyPlayer);
            if (moveAttackPlan) {
                await moveUnit(unit, moveAttackPlan.moveCoords.r, moveAttackPlan.moveCoords.c);
                if (unit.currentHealth > 0 && !unit.hasAttacked && isValidAttack(unit, moveAttackPlan.targetUnit)) {
                    await attackUnit(unit, moveAttackPlan.targetUnit);
                }
                return true;
            }
        }
        return false;
    },
    
    findBestImmediateAttackTarget: function(unit, enemyPlayer) {
        let bestTarget = null, bestScore = -Infinity;
        units.filter(e => e.player === enemyPlayer && e.currentHealth > 0 && isValidAttack(unit, e))
             .forEach(enemy => {
                const outcome = predictCombatOutcome(unit, enemy);
                let score = outcome.defenderDies ? 200 : (outcome.damageToDefender * 2);
                score -= (outcome.damageToAttacker * 1.5);
                if (outcome.attackerDiesInRetaliation) score -= 1000;
                if (score > bestScore) { bestScore = score; bestTarget = enemy; }
            });
        return (bestScore > 0) ? bestTarget : null;
    },
    
    findBestMoveAndAttackAction: function(unit, enemyPlayer) {
        let bestAction = null, bestScore = -Infinity;
        const reachableHexes = this.getReachableHexes(unit);

        for (const enemy of units.filter(e => e.player === enemyPlayer && e.currentHealth > 0)) {
            for (const movePos of reachableHexes) {
                const tempAttacker = { ...unit, r: movePos.r, c: movePos.c };
                if (isValidAttack(tempAttacker, enemy)) {
                    const outcome = predictCombatOutcome(tempAttacker, enemy);
                    let score = outcome.defenderDies ? 200 : (outcome.damageToDefender*2);
                    score -= (outcome.damageToAttacker * 1.5);
                    score -= movePos.cost; // Penalizar por coste de movimiento
                    if (outcome.attackerDiesInRetaliation) score -= 1000;
                    if (score > bestScore) { bestScore = score; bestAction = { moveCoords: movePos, targetUnit: enemy };}
                }
            }
        }
        return (bestScore > 0) ? bestAction : null;
    },
    
    getReachableHexes: function(unit) {
        let reachable = [{ r: unit.r, c: unit.c, cost: 0 }];
        let queue = [{ r: unit.r, c: unit.c, cost: 0 }];
        let visited = new Set([`${unit.r},${unit.c}`]);
        const maxMove = unit.currentMovement || 0;
        while(queue.length > 0) {
            let curr = queue.shift();
            if (curr.cost >= maxMove) continue;
            for (const n of getHexNeighbors(curr.r, curr.c)) {
                const key = `${n.r},${n.c}`;
                if (!visited.has(key) && !getUnitOnHex(n.r, n.c)) {
                    const moveCost = TERRAIN_TYPES[board[n.r][n.c].terrain]?.movementCostMultiplier || 1;
                    const newCost = curr.cost + moveCost;
                    if (newCost <= maxMove) {
                        visited.add(key);
                        reachable.push({r: n.r, c: n.c, cost: newCost});
                        queue.push({r: n.r, c: n.c, cost: newCost});
                    }
                }
            }
        }
        return reachable;
    },

    executeGeneralMovement: async function(unit, enemyPlayer) {
        const targetHex = this.findBestStrategicObjective(unit, enemyPlayer);
        if(targetHex){
             const path = this.findPathToTarget(unit, targetHex.r, targetHex.c);
             if(path && path.length > 1){ // Path[0] es la posición actual
                 await moveUnit(unit, path[1].r, path[1].c); // Mover al primer paso del camino
                 return true;
             }
        }
        return false;
    },

    findBestStrategicObjective: function(unit, enemyPlayer) {
        const objectives = [];
        board.forEach(row => row.forEach(hex => {
            if ((hex.resourceNode && hex.owner !== unit.player) || (hex.isCapital && hex.owner === enemyPlayer)) {
                objectives.push(hex);
            }
        }));
        if(objectives.length === 0) return null;
        objectives.sort((a,b) => {
            const scoreA = (a.isCapital ? 1000 : 100) - hexDistance(unit.r, unit.c, a.r, a.c);
            const scoreB = (b.isCapital ? 1000 : 100) - hexDistance(unit.r, unit.c, b.r, b.c);
            return scoreB - scoreA;
        });
        return objectives[0];
    },

    findPathToTarget: function(unit, targetR, targetC){
        const startKey = `${unit.r},${unit.c}`;
        const endKey = `${targetR},${targetC}`;
        let queue = [{ key: startKey, path: [{r: unit.r, c: unit.c}] }];
        let visited = new Set([startKey]);

        while(queue.length > 0){
            let curr = queue.shift();
            if(curr.key === endKey) return curr.path;

            const coords = curr.key.split(',').map(Number);
            for(const neighbor of getHexNeighbors(coords[0], coords[1])){
                const key = `${neighbor.r},${neighbor.c}`;
                if(!visited.has(key) && !getUnitOnHex(neighbor.r, neighbor.c) && !TERRAIN_TYPES[board[neighbor.r][neighbor.c].terrain].isImpassableForLand){
                    visited.add(key);
                    const newPath = [...curr.path, {r: neighbor.r, c: neighbor.c}];
                    queue.push({key: key, path: newPath});
                }
            }
        }
        return null;
    },

    endAiTurn: function(aiPlayerNumber) {
        if (gameState.currentPhase !== "gameOver" && gameState.currentPlayer === aiPlayerNumber) {
            if (domElements.endTurnBtn && !domElements.endTurnBtn.disabled) {
                setTimeout(() => {
                    if(domElements.endTurnBtn) domElements.endTurnBtn.click();
                }, 250);
            }
        }
    }
};