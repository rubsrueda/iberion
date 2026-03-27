// barbarianMicroAI.js
// IA pasiva y territorial para J9 (Bárbaros).

const BarbarianMicroAI = {
    BARBARIAN_ID: (typeof BARBARIAN_PLAYER_ID !== 'undefined') ? BARBARIAN_PLAYER_ID : 9,
    MAX_TACTICAL_ACTIONS_PER_TURN: 4,

    executeRoundPass: async function() {
        if (gameState.currentPhase !== 'play') return;

        this._resetBarbarianUnitsForNewRound();
        const startGold = gameState.playerResources?.[this.BARBARIAN_ID]?.oro || 0;
        const startRecruit = gameState.playerResources?.[this.BARBARIAN_ID]?.puntosReclutamiento || 0;
        this._collectEconomyByInfrastructure();

        let caravanCreated = false;
        let reinforced = false;
        let mergedDivisions = 0;
        let recoveredActions = 0;
        let ringActions = 0;

        try {
            // 1. FUSIÓN PRIMERO: consolidar divisiones bárbaras en pocas grandes
            mergedDivisions = await this._mergeAllBarbarianDivisions();
            
            // 2. Crear/reforzar divisiones solo en ciudades que J9 posee AHORA
            this._ensureMainDivisionPerCity();
            reinforced = await this._tryIncreaseCityDefense();
            
            // 3. Caravanas (económico, bajo prioridad)
            caravanCreated = await this._tryCreateCaravanFromRoadTouch();

            // 4. Acciones tácticas: conquistar ciudades neutrales/enemigas, luego controlar anillo
            let actionsSpent = 0;
            recoveredActions = await this._tryRecoverLostBarbarianCities(this.MAX_TACTICAL_ACTIONS_PER_TURN - actionsSpent);
            actionsSpent += recoveredActions;
            if (actionsSpent < this.MAX_TACTICAL_ACTIONS_PER_TURN) {
                ringActions = await this._tryControlCityRing(this.MAX_TACTICAL_ACTIONS_PER_TURN - actionsSpent);
            }
        } catch (err) {
            console.error('[BarbarianMicroAI] Error durante pasada de ronda:', err);
        }

        this._logRoundSummary({
            startGold,
            startRecruit,
            caravanCreated,
            reinforced,
            mergedDivisions,
            recoveredActions,
            ringActions
        });
    },

    _logRoundSummary: function(data) {
        const endGold = gameState.playerResources?.[this.BARBARIAN_ID]?.oro || 0;
        const endRecruit = gameState.playerResources?.[this.BARBARIAN_ID]?.puntosReclutamiento || 0;
        const ownedCities = this._getBarbarianCitiesOwned().length;
        const targetCities = this._getConquerableTargets().length;

        const summary = `[BarbarianAI] Ronda ${gameState.turnNumber || 1} | ciudades=${ownedCities} objetivos=${targetCities} | oro ${data.startGold}->${endGold} | recluta ${data.startRecruit}->${endRecruit} | fusion=${data.mergedDivisions} caravana=${data.caravanCreated ? 1 : 0} refuerzo=${data.reinforced ? 1 : 0} conquistar=${data.recoveredActions} anillo=${data.ringActions}`;

        console.log(summary);
        if (typeof logMessage === 'function') {
            logMessage(summary, 'event');
        }
        if (typeof Chronicle !== 'undefined' && typeof Chronicle.logEvent === 'function') {
            Chronicle.logEvent('barbarian_round', {
                summary,
                ownedCities,
                targetCities,
                startGold: data.startGold,
                endGold,
                startRecruit: data.startRecruit,
                endRecruit,
                caravanCreated: data.caravanCreated,
                mergedDivisions: data.mergedDivisions || 0,
                reinforced: data.reinforced,
                recoveredActions: data.recoveredActions,
                ringActions: data.ringActions
            });
        }
    },

    _mergeAllBarbarianDivisions: async function() {
        // Fusionar TODAS las divisiones bárbaras entre sí para obtener pocas divisiones grandes.
        // Prioridad: guardianes se fusionan en divisiones normales; divisiones normales se fusionan entre sí.
        let mergeCount = 0;

        const barbDivisions = units.filter(u =>
            u.player === this.BARBARIAN_ID &&
            u.currentHealth > 0 &&
            !u.tradeRoute &&
            !u.isGuardian
        );

        const guardians = units.filter(u =>
            u.player === this.BARBARIAN_ID &&
            u.currentHealth > 0 &&
            !u.tradeRoute &&
            u.isGuardian
        );

        // 1. Fusionar guardianes en la división normal más cercana
        for (const guardian of guardians) {
            if (!getUnitById(guardian.id)) continue;

            const targets = barbDivisions
                .map(div => ({
                    unit: div,
                    dist: hexDistance(guardian.r, guardian.c, div.r, div.c)
                }))
                .filter(t => t.dist <= 2)
                .sort((a, b) => a.dist - b.dist);

            if (targets.length === 0) continue;

            const target = targets[0].unit;
            const targetLive = getUnitById(target.id);
            const guardianLive = getUnitById(guardian.id);
            if (!targetLive || !guardianLive) continue;

            const totalRegs = (targetLive.regiments?.length || 0) + (guardianLive.regiments?.length || 0);
            if (totalRegs > MAX_REGIMENTS_PER_DIVISION) continue;

            if (guardianLive.r !== targetLive.r || guardianLive.c !== targetLive.c) {
                if (typeof _executeMoveUnit === 'function') {
                    await _executeMoveUnit(guardianLive, targetLive.r, targetLive.c, true);
                }
            }

            const targetAfterMove = getUnitById(target.id);
            const guardianAfterMove = getUnitById(guardian.id);
            if (!targetAfterMove || !guardianAfterMove) continue;
            if (targetAfterMove.r !== guardianAfterMove.r || targetAfterMove.c !== guardianAfterMove.c) continue;

            const merged = await mergeUnits(guardianAfterMove, targetAfterMove);
            if (merged) {
                mergeCount++;
                barbDivisions.push(targetAfterMove);
            }
        }

        // 2. Fusionar divisiones bárbaras normales entre sí (mantener las más grandes)
        for (let i = 0; i < barbDivisions.length - 1; i++) {
            const division1 = getUnitById(barbDivisions[i].id);
            if (!division1 || !division1.currentHealth || division1.currentHealth <= 0) continue;

            for (let j = i + 1; j < barbDivisions.length; j++) {
                const division2 = getUnitById(barbDivisions[j].id);
                if (!division2 || !division2.currentHealth || division2.currentHealth <= 0) continue;

                const dist = hexDistance(division1.r, division1.c, division2.r, division2.c);
                if (dist > 2) continue;

                const totalRegs = (division1.regiments?.length || 0) + (division2.regiments?.length || 0);
                if (totalRegs > MAX_REGIMENTS_PER_DIVISION) continue;

                // Fusionar la más pequeña en la más grande
                const smaller = (division1.regiments?.length || 0) < (division2.regiments?.length || 0) ? division1 : division2;
                const larger = smaller === division1 ? division2 : division1;
                const largerLive = getUnitById(larger.id);
                const smallerLive = getUnitById(smaller.id);
                if (!largerLive || !smallerLive) continue;

                if (smallerLive.r !== largerLive.r || smallerLive.c !== largerLive.c) {
                    if (typeof _executeMoveUnit === 'function') {
                        await _executeMoveUnit(smallerLive, largerLive.r, largerLive.c, true);
                    }
                }

                const largerAfterMove = getUnitById(larger.id);
                const smallerAfterMove = getUnitById(smaller.id);
                if (!largerAfterMove || !smallerAfterMove) continue;
                if (largerAfterMove.r !== smallerAfterMove.r || largerAfterMove.c !== smallerAfterMove.c) continue;

                const merged = await mergeUnits(smallerAfterMove, largerAfterMove);
                if (merged) {
                    mergeCount++;
                    barbDivisions.splice(j, 1);
                    j--;
                }
            }
        }

        return mergeCount;
    },

    executeTurn: async function(playerNumber) {
        if (playerNumber !== this.BARBARIAN_ID) {
            return;
        }

        if (gameState.currentPhase !== 'play') {
            this._finishTurn(playerNumber);
            return;
        }

        await this.executeRoundPass();

        this._finishTurn(playerNumber);
    },

    _collectEconomyByInfrastructure: function() {
        if (typeof collectPlayerResources === 'function') {
            collectPlayerResources(this.BARBARIAN_ID);
        }

        if (typeof updateTradeRoutes === 'function') {
            updateTradeRoutes(this.BARBARIAN_ID);
        }

        if (typeof calculateTradeIncome === 'function') {
            const tradeGold = calculateTradeIncome(this.BARBARIAN_ID);
            if (tradeGold > 0 && gameState.playerResources?.[this.BARBARIAN_ID]) {
                gameState.playerResources[this.BARBARIAN_ID].oro += tradeGold;
            }
        }
    },

    _ensureMainDivisionPerCity: function() {
        const cities = this._getBarbarianCitiesOwned();
        for (const city of cities) {
            const hasMainDivision = units.some(u =>
                u.player === this.BARBARIAN_ID &&
                !u.isGuardian &&
                u.currentHealth > 0 &&
                hexDistance(u.r, u.c, city.r, city.c) <= 2
            );

            if (hasMainDivision) continue;

            const deployHex = this._findFreeDeployHexNearCity(city);
            if (!deployHex) continue;

            const res = gameState.playerResources?.[this.BARBARIAN_ID];
            const initialRegTypes = ['Infantería Ligera', 'Arqueros'];
            const initialCost = initialRegTypes.reduce((sum, t) => sum + (REGIMENT_TYPES[t]?.cost?.oro || 0), 0);
            if (!res || (res.oro || 0) < initialCost) continue;

            res.oro -= initialCost;
            const mainDef = {
                name: `Division Libre de ${city.name}`,
                regiments: [
                    { ...REGIMENT_TYPES['Infantería Ligera'], type: 'Infantería Ligera', health: REGIMENT_TYPES['Infantería Ligera'].health },
                    { ...REGIMENT_TYPES['Arqueros'], type: 'Arqueros', health: REGIMENT_TYPES['Arqueros'].health }
                ]
            };
            const unit = this._createUnitByDefinition(mainDef, deployHex);
            if (!unit) continue;

            placeFinalizedDivision(unit, deployHex.r, deployHex.c);
        }
    },

    _getBarbarianCitiesOwned: function() {
        return (gameState.cities || []).filter(c => c.owner === this.BARBARIAN_ID);
    },

    _getConquerableTargets: function() {
        // Ciudades que no son bárbaras (neutral o enemigas) y que J9 puede conquistar
        return (gameState.cities || []).filter(c => c.owner !== this.BARBARIAN_ID && c.owner !== null);
    },

    _getMovableUnits: function() {
        return (units || []).filter(u =>
            u.player === this.BARBARIAN_ID &&
            u.currentHealth > 0 &&
            (!u.isGuardian || (u.name || '').startsWith('Division Libre')) &&
            !u.hasMoved &&
            (u.currentMovement || 0) > 0
        );
    },

    _findMainDivisionNearCity: function(city) {
        const candidates = units.filter(u =>
            u.player === this.BARBARIAN_ID &&
            u.currentHealth > 0 &&
            !u.tradeRoute &&
            !u.isGuardian &&
            hexDistance(u.r, u.c, city.r, city.c) <= 2
        );

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => (b.regiments?.length || 0) - (a.regiments?.length || 0));
        return candidates[0];
    },

    _reinforceMainDivision: function(city) {
        const res = gameState.playerResources?.[this.BARBARIAN_ID];
        if (!res) return false;

        const mainDivision = this._findMainDivisionNearCity(city);
        if (!mainDivision) return false;

        if ((mainDivision.regiments?.length || 0) >= MAX_REGIMENTS_PER_DIVISION) return false;

        const preferredOrder = ['Infantería Pesada', 'Arqueros', 'Infantería Ligera'];
        const preferredType = preferredOrder.find(t => {
            const oroCost = REGIMENT_TYPES[t]?.cost?.oro || 0;
            return !!REGIMENT_TYPES[t] && (res.oro || 0) >= oroCost;
        });
        if (!preferredType) return false;

        const oroCost = REGIMENT_TYPES[preferredType]?.cost?.oro || 0;
        if ((res.oro || 0) < oroCost) return false;
        res.oro -= oroCost;

        mainDivision.regiments.push({
            ...REGIMENT_TYPES[preferredType],
            type: preferredType,
            health: REGIMENT_TYPES[preferredType].health,
            id: `r${Date.now()}${Math.floor(Math.random() * 1000)}`
        });

        calculateRegimentStats(mainDivision);
        mainDivision.currentHealth = Math.min(mainDivision.maxHealth, (mainDivision.currentHealth || 0) + REGIMENT_TYPES[preferredType].health);
        mainDivision.currentMovement = Math.max(mainDivision.currentMovement || 0, mainDivision.movement || 0);

        if (typeof UIManager !== 'undefined' && typeof UIManager.updateUnitStrengthDisplay === 'function') {
            UIManager.updateUnitStrengthDisplay(mainDivision);
        }

        return true;
    },

    _hasRoadTouchingCity: function(city) {
        const neighbors = getHexNeighbors(city.r, city.c) || [];
        return neighbors.some(n => board[n.r]?.[n.c]?.structure === 'Camino');
    },

    _findFreeDeployHexNearCity: function(city) {
        const isFree = (r, c) => !!(board[r]?.[c] && !board[r][c].unit);

        if (isFree(city.r, city.c)) {
            return { r: city.r, c: city.c };
        }

        const neighbors = getHexNeighbors(city.r, city.c) || [];
        return neighbors.find(n => isFree(n.r, n.c)) || null;
    },

    _createUnitByDefinition: function(definition, spot) {
        if (!definition || !spot) return null;

        if (typeof AiGameplayManager !== 'undefined' && typeof AiGameplayManager.createUnitObject === 'function') {
            return AiGameplayManager.createUnitObject(definition, this.BARBARIAN_ID, spot);
        }

        const unit = {
            id: `u${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            player: this.BARBARIAN_ID,
            name: definition.name,
            commander: null,
            regiments: definition.regiments.map(r => ({ ...r })),
            r: spot.r,
            c: spot.c,
            hasMoved: false,
            hasAttacked: false,
            level: 0,
            experience: 0,
            morale: 75,
            maxMorale: 125
        };

        if (typeof calculateRegimentStats === 'function') {
            calculateRegimentStats(unit);
            unit.currentHealth = unit.maxHealth;
            unit.currentMovement = unit.movement;
        }

        return unit;
    },

    _consumeDefenseResources: function() {
        const res = gameState.playerResources?.[this.BARBARIAN_ID];
        if (!res) return false;

        const defenseCost = 250;
        if ((res.oro || 0) < defenseCost) {
            return false;
        }

        res.oro -= defenseCost;

        return true;
    },

    _consumeCaravanResources: function() {
        const res = gameState.playerResources?.[this.BARBARIAN_ID];
        if (!res) return false;

        const supplyCost = REGIMENT_TYPES['Columna de Suministro']?.cost?.oro || 0;
        if ((res.oro || 0) < supplyCost) {
            return false;
        }

        res.oro -= supplyCost;
        return true;
    },

    _tryCreateCaravanFromRoadTouch: async function() {
        const barbCities = this._getBarbarianCitiesOwned();
        if (barbCities.length < 1) return false;

        const originCandidates = barbCities.filter(city => this._hasRoadTouchingCity(city));
        if (originCandidates.length === 0) return false;

        const allCities = (gameState.cities || []).filter(c => c.owner !== null);
        if (allCities.length === 0) return false;

        let createdOne = false;

        for (const origin of originCandidates) {
            for (const target of allCities) {
                if (origin.r === target.r && origin.c === target.c) continue;
                if (typeof isTradeBlockedBetweenPlayers === 'function' && target.owner !== this.BARBARIAN_ID) {
                    if (isTradeBlockedBetweenPlayers(this.BARBARIAN_ID, target.owner)) continue;
                }

                const path = findInfrastructurePath(origin, target, {
                    allowForeignInfrastructure: true,
                    requireRoadCorridor: true
                });

                if (!path || path.length < 2) continue;

                const deployHex = this._findFreeDeployHexNearCity(origin);
                if (!deployHex) continue;

                if (!this._consumeCaravanResources()) {
                    return createdOne;
                }

                const caravanDef = {
                    name: `Caravana Barbarica: ${origin.name} -> ${target.name}`,
                    regiments: [
                        { ...REGIMENT_TYPES['Columna de Suministro'], type: 'Columna de Suministro', health: REGIMENT_TYPES['Columna de Suministro'].health }
                    ]
                };

                const caravan = this._createUnitByDefinition(caravanDef, deployHex);
                if (!caravan) return false;

                placeFinalizedDivision(caravan, deployHex.r, deployHex.c);

                const established = (typeof _executeEstablishTradeRoute === 'function')
                    ? _executeEstablishTradeRoute({ unitId: caravan.id, origin, destination: target, path })
                    : false;

                if (!established) {
                    if (typeof _executeDisbandUnit === 'function') {
                        _executeDisbandUnit(caravan);
                    }
                    continue;
                }

                createdOne = true;
                logMessage(`Los Barbaros envian una caravana desde ${origin.name} hacia ${target.name}.`, 'event');
            }
        }

        return createdOne;
    },

    _tryIncreaseCityDefense: async function() {
        const barbCities = this._getBarbarianCitiesOwned();
        if (barbCities.length === 0) return false;

        for (const city of barbCities) {
            // Prioridad: reforzar la división principal de la ciudad con nuevos regimientos.
            if (this._reinforceMainDivision(city)) {
                logMessage(`Los Barbaros refuerzan su division en ${city.name}.`, 'event');
                return true;
            }

            const localDefenders = units.filter(u =>
                u.player === this.BARBARIAN_ID &&
                u.currentHealth > 0 &&
                hexDistance(u.r, u.c, city.r, city.c) <= 1
            );

            if (localDefenders.length >= 2) continue;

            const deployHex = this._findFreeDeployHexNearCity(city);
            if (!deployHex) continue;

            if (!this._consumeDefenseResources()) {
                return false;
            }

            const defenderDef = {
                name: `Guardia de ${city.name}`,
                regiments: [
                    { ...REGIMENT_TYPES['Infantería Pesada'], type: 'Infantería Pesada', health: REGIMENT_TYPES['Infantería Pesada'].health },
                    { ...REGIMENT_TYPES['Arqueros'], type: 'Arqueros', health: REGIMENT_TYPES['Arqueros'].health }
                ]
            };

            const defender = this._createUnitByDefinition(defenderDef, deployHex);
            if (!defender) return false;

            defender.isGuardian = true;
            defender.hasMoved = true;
            defender.hasAttacked = true;
            placeFinalizedDivision(defender, deployHex.r, deployHex.c);
            logMessage(`Los Barbaros refuerzan la defensa de ${city.name}.`, 'event');
            return true;
        }

        return false;
    },

    _tryRecoverLostBarbarianCities: async function(actionsAvailable) {
        // Conquistar ciudades que no son bárbaras (neutrales o enemigas)
        if (actionsAvailable <= 0) return 0;

        const targetCities = this._getConquerableTargets();
        if (targetCities.length === 0) return 0;

        let actionsDone = 0;
        const movable = this._getMovableUnits();

        movable.sort((a, b) => {
            const aDist = Math.min(...targetCities.map(c => hexDistance(a.r, a.c, c.r, c.c)));
            const bDist = Math.min(...targetCities.map(c => hexDistance(b.r, b.c, c.r, c.c)));
            return aDist - bDist;
        });

        for (const unit of movable) {
            if (actionsDone >= actionsAvailable) break;
            if (unit.hasMoved) continue;

            const targetCity = targetCities
                .slice()
                .sort((a, b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c))[0];
            if (!targetCity) continue;

            const defendingUnit = getUnitOnHex(targetCity.r, targetCity.c);
            const distance = hexDistance(unit.r, unit.c, targetCity.r, targetCity.c);

            if (defendingUnit && defendingUnit.player !== this.BARBARIAN_ID) {
                if (distance <= 1 && !unit.hasAttacked && typeof isValidAttack === 'function' && isValidAttack(unit, defendingUnit)) {
                    if (typeof attackUnit === 'function') {
                        await attackUnit(unit, defendingUnit);
                    } else {
                        await RequestAttackUnit(unit, defendingUnit);
                    }
                    actionsDone++;
                    continue;
                }

                const moved = await this._moveOneStepToward(unit, targetCity);
                if (moved) actionsDone++;
                continue;
            }

            if (!defendingUnit) {
                if (distance <= 1 && !getUnitOnHex(targetCity.r, targetCity.c)) {
                    if (typeof _executeMoveUnit === 'function') {
                        await _executeMoveUnit(unit, targetCity.r, targetCity.c);
                    } else {
                        await RequestMoveUnit(unit, targetCity.r, targetCity.c);
                    }
                    actionsDone++;
                    continue;
                }

                const moved = await this._moveOneStepToward(unit, targetCity);
                if (moved) actionsDone++;
            }
        }

        return actionsDone;
    },

    _tryControlCityRing: async function(actionsAvailable) {
        if (actionsAvailable <= 0) return 0;

        const barbCities = this._getBarbarianCitiesOwned();
        if (barbCities.length === 0) return 0;

        const objectives = [];
        for (const city of barbCities) {
            const neighbors = getHexNeighbors(city.r, city.c) || [];
            neighbors.forEach(n => {
                const hex = board[n.r]?.[n.c];
                if (!hex) return;
                if (hex.owner === this.BARBARIAN_ID) return;

                const blocker = getUnitOnHex(n.r, n.c);
                if (blocker && blocker.player !== this.BARBARIAN_ID) {
                    return;
                }

                objectives.push({ r: n.r, c: n.c, cityName: city.name });
            });
        }

        if (objectives.length === 0) return 0;

        let actionsDone = 0;
        const movable = this._getMovableUnits();

        for (const unit of movable) {
            if (actionsDone >= actionsAvailable) break;
            if (unit.hasMoved) continue;

            const objective = objectives
                .slice()
                .sort((a, b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c))[0];
            if (!objective) continue;

            if (unit.r === objective.r && unit.c === objective.c) continue;

            const dist = hexDistance(unit.r, unit.c, objective.r, objective.c);
            if (dist <= 1 && !getUnitOnHex(objective.r, objective.c)) {
                if (typeof _executeMoveUnit === 'function') {
                    await _executeMoveUnit(unit, objective.r, objective.c);
                } else {
                    await RequestMoveUnit(unit, objective.r, objective.c);
                }
                actionsDone++;
                continue;
            }

            const moved = await this._moveOneStepToward(unit, objective);
            if (moved) actionsDone++;
        }

        return actionsDone;
    },

    _moveOneStepToward: async function(unit, target) {
        if (!unit || !target || unit.hasMoved || (unit.currentMovement || 0) <= 0) return false;

        const currentDistance = hexDistance(unit.r, unit.c, target.r, target.c);
        const neighbors = getHexNeighbors(unit.r, unit.c) || [];

        const candidates = neighbors
            .filter(n => {
                const hex = board[n.r]?.[n.c];
                if (!hex) return false;
                if (getUnitOnHex(n.r, n.c)) return false;
                if (TERRAIN_TYPES[hex.terrain]?.isImpassableForLand) return false;

                const moveCost = getMovementCost(unit, unit.r, unit.c, n.r, n.c);
                if (moveCost === Infinity) return false;
                if (moveCost > (unit.currentMovement || 0)) return false;

                return true;
            })
            .sort((a, b) => {
                const da = hexDistance(a.r, a.c, target.r, target.c);
                const db = hexDistance(b.r, b.c, target.r, target.c);
                return da - db;
            });

        const best = candidates.find(c => hexDistance(c.r, c.c, target.r, target.c) < currentDistance) || candidates[0];
        if (!best) return false;

        if (typeof _executeMoveUnit === 'function') {
            await _executeMoveUnit(unit, best.r, best.c);
        } else {
            await RequestMoveUnit(unit, best.r, best.c);
        }
        return true;
    },

    _finishTurn: function(playerNumber) {
        setTimeout(() => {
            if (gameState.currentPhase === 'play' && gameState.currentPlayer === playerNumber && typeof handleEndTurn === 'function') {
                handleEndTurn();
            }
        }, 700);
    },

    _resetBarbarianUnitsForNewRound: function() {
        if (!Array.isArray(units)) return;
        units.forEach(u => {
            if (u.player !== this.BARBARIAN_ID || (u.currentHealth || 0) <= 0) return;
            if (u.tradeRoute) return;
            u.hasMoved = false;
            u.hasAttacked = false;
            u.currentMovement = u.movement || 2;
        });
    }
};
