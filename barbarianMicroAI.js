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
            const mergedBeforeActions = await this._mergeAllBarbarianDivisions();
            
            // 2. Crear/reforzar divisiones solo en ciudades que J9 posee AHORA
            await this._ensureMainDivisionPerCity();
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

            // 5. FUSIÓN FINAL: unir divisiones que quedaron adyacentes tras movimientos/creaciones.
            const mergedAfterActions = await this._mergeAllBarbarianDivisions();
            mergedDivisions = mergedBeforeActions + mergedAfterActions;
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
        // Fusión por pares cercanos + movimiento de aproximación cuando no hay parejas adyacentes.
        let mergeCount = 0;

        const liveDivs = () => (units || [])
            .filter(u =>
                u.player === this.BARBARIAN_ID &&
                (u.currentHealth || 0) > 0 &&
                !u.tradeRoute
            )
            .sort((a, b) => (b.regiments?.length || 0) - (a.regiments?.length || 0));

        const canMergeBySize = (a, b) => ((a.regiments?.length || 0) + (b.regiments?.length || 0)) <= MAX_REGIMENTS_PER_DIVISION;

        // 1) Fusionar todas las parejas adyacentes posibles (no solo contra un núcleo).
        let mergedInPass = true;
        while (mergedInPass) {
            mergedInPass = false;
            const snapshot = liveDivs();
            if (snapshot.length < 2) break;

            for (let i = 0; i < snapshot.length; i++) {
                const a = getUnitById(snapshot[i].id);
                if (!a) continue;

                const neighbors = snapshot
                    .slice(i + 1)
                    .map(s => getUnitById(s.id))
                    .filter(Boolean)
                    .filter(b => hexDistance(a.r, a.c, b.r, b.c) <= 1)
                    .sort((x, y) => (x.regiments?.length || 0) - (y.regiments?.length || 0));

                if (neighbors.length === 0) continue;

                const b = neighbors[0];
                if (!canMergeBySize(a, b)) {
                    console.log(`[BarbarianAI] No fusionan ${a.id}+${b.id}: limite de regimientos.`);
                    continue;
                }

                const larger = (a.regiments?.length || 0) >= (b.regiments?.length || 0) ? a : b;
                const smaller = larger === a ? b : a;
                const merged = await mergeUnits(smaller, larger);
                if (merged) {
                    mergeCount++;
                    mergedInPass = true;
                    console.log(`[BarbarianAI] Fusion local: ${smaller.id} -> ${larger.id}`);
                    break;
                }
            }
        }

        // 2) Si quedan varias divisiones, acercarlas hacia la mayor que aun pueda absorberlas.
        const current = liveDivs();
        if (current.length < 2) return mergeCount;

        for (let i = 1; i < current.length; i++) {
            const source = getUnitById(current[i].id);
            if (!source || source.hasMoved) continue;

            const targets = liveDivs()
                .filter(t => t.id !== source.id)
                .filter(t => canMergeBySize(source, t))
                .sort((a, b) => {
                    const da = hexDistance(source.r, source.c, a.r, a.c);
                    const db = hexDistance(source.r, source.c, b.r, b.c);
                    if (da !== db) return da - db;
                    return (b.regiments?.length || 0) - (a.regiments?.length || 0);
                });

            if (targets.length === 0) {
                console.log(`[BarbarianAI] ${source.id} sin objetivo de fusion por limite.`);
                continue;
            }

            const target = getUnitById(targets[0].id);
            if (!target) continue;

            const dist = hexDistance(source.r, source.c, target.r, target.c);
            if (dist <= 1) {
                const larger = (target.regiments?.length || 0) >= (source.regiments?.length || 0) ? target : source;
                const smaller = larger === target ? source : target;
                const merged = await mergeUnits(smaller, larger);
                if (merged) {
                    mergeCount++;
                    console.log(`[BarbarianAI] Fusion directa: ${smaller.id} -> ${larger.id}`);
                }
            } else {
                await this._moveOneStepToward(source, target);
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

    _ensureMainDivisionPerCity: async function() {
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
            await this._tryImmediateMergeForUnit(unit);
        }
    },

    _tryImmediateMergeForUnit: async function(newUnit) {
        const source = getUnitById(newUnit?.id);
        if (!source || source.player !== this.BARBARIAN_ID) return false;
        if ((source.currentHealth || 0) <= 0 || source.tradeRoute) return false;

        const candidates = (units || [])
            .filter(u =>
                u.player === this.BARBARIAN_ID &&
                u.id !== source.id &&
                (u.currentHealth || 0) > 0 &&
                !u.tradeRoute &&
                ((u.regiments?.length || 0) + (source.regiments?.length || 0)) <= MAX_REGIMENTS_PER_DIVISION
            )
            .sort((a, b) => {
                const da = hexDistance(source.r, source.c, a.r, a.c);
                const db = hexDistance(source.r, source.c, b.r, b.c);
                if (da !== db) return da - db;
                return (b.regiments?.length || 0) - (a.regiments?.length || 0);
            });

        if (candidates.length === 0) return false;

        let target = getUnitById(candidates[0].id);
        let sourceLive = getUnitById(source.id);
        if (!target || !sourceLive) return false;

        if (hexDistance(sourceLive.r, sourceLive.c, target.r, target.c) > 1) {
            if (!sourceLive.hasMoved && (sourceLive.currentMovement || 0) > 0) {
                await this._moveOneStepToward(sourceLive, target);
            }
            sourceLive = getUnitById(source.id);
            target = getUnitById(target.id);
            if (!sourceLive || !target) return false;
        }

        if (hexDistance(sourceLive.r, sourceLive.c, target.r, target.c) > 1) return false;

        const larger = (target.regiments?.length || 0) >= (sourceLive.regiments?.length || 0) ? target : sourceLive;
        const smaller = larger.id === sourceLive.id ? target : sourceLive;
        return await mergeUnits(smaller, larger);
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
            await this._tryImmediateMergeForUnit(defender);
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
