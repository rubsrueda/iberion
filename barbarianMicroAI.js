// barbarianMicroAI.js
// IA pasiva y territorial para J9 (Bárbaros).

const BarbarianMicroAI = {
    BARBARIAN_ID: (typeof BARBARIAN_PLAYER_ID !== 'undefined') ? BARBARIAN_PLAYER_ID : 9,
    MAX_TACTICAL_ACTIONS_PER_TURN: 2,

    executeTurn: async function(playerNumber) {
        if (playerNumber !== this.BARBARIAN_ID) {
            return;
        }

        if (gameState.currentPhase !== 'play') {
            this._finishTurn(playerNumber);
            return;
        }

        this._ensureTrackedBarbarianCities();

        try {
            await this._tryCreateCaravanFromRoadTouch();
            await this._tryIncreaseCityDefense();

            let actionsSpent = 0;
            actionsSpent += await this._tryRecoverLostBarbarianCities(this.MAX_TACTICAL_ACTIONS_PER_TURN - actionsSpent);

            if (actionsSpent < this.MAX_TACTICAL_ACTIONS_PER_TURN) {
                actionsSpent += await this._tryControlCityRing(this.MAX_TACTICAL_ACTIONS_PER_TURN - actionsSpent);
            }
        } catch (err) {
            console.error('[BarbarianMicroAI] Error durante turno:', err);
        }

        this._finishTurn(playerNumber);
    },

    _ensureTrackedBarbarianCities: function() {
        if (!Array.isArray(gameState.cities)) return;

        gameState.cities.forEach(city => {
            if (!city) return;

            const hex = board[city.r]?.[city.c];
            const belongsToBarbarians = city.owner === this.BARBARIAN_ID || hex?.owner === this.BARBARIAN_ID;
            const likelyBarbarianName = typeof city.name === 'string' && city.name.startsWith('Ciudad Libre');

            if (belongsToBarbarians || likelyBarbarianName) {
                city.isBarbarianCity = true;
                city.isBarbaric = true;
            }
        });
    },

    _getBarbarianCitiesOwned: function() {
        return (gameState.cities || []).filter(c => c.owner === this.BARBARIAN_ID);
    },

    _getLostBarbarianCities: function() {
        return (gameState.cities || []).filter(c => c.isBarbarianCity && c.owner !== this.BARBARIAN_ID);
    },

    _getMovableUnits: function() {
        return (units || []).filter(u =>
            u.player === this.BARBARIAN_ID &&
            u.currentHealth > 0 &&
            !u.isGuardian &&
            !u.hasMoved &&
            (u.currentMovement || 0) > 0
        );
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

        const hasRecruit = (res.puntosReclutamiento || 0) >= 120;
        const hasGold = (res.oro || 0) >= 250;

        if (!hasRecruit && !hasGold) {
            return false;
        }

        if (hasRecruit) res.puntosReclutamiento -= 120;
        if (hasGold) res.oro -= 250;

        return true;
    },

    _consumeCaravanResources: function() {
        const res = gameState.playerResources?.[this.BARBARIAN_ID];
        if (!res) return false;

        if ((res.madera || 0) < 1 || (res.comida || 0) < 1) {
            return false;
        }

        res.madera -= 1;
        res.comida -= 1;
        return true;
    },

    _tryCreateCaravanFromRoadTouch: async function() {
        const barbCities = this._getBarbarianCitiesOwned();
        if (barbCities.length < 1) return false;

        const activeCaravans = units.filter(u => u.player === this.BARBARIAN_ID && u.tradeRoute).length;
        if (activeCaravans >= 2) return false;

        const originCandidates = barbCities.filter(city => this._hasRoadTouchingCity(city));
        if (originCandidates.length === 0) return false;

        const allCities = (gameState.cities || []).filter(c => c.owner !== null && c.owner !== this.BARBARIAN_ID);
        if (allCities.length === 0) return false;

        const existingRoutes = new Set(
            units
                .filter(u => u.player === this.BARBARIAN_ID && u.tradeRoute?.origin && u.tradeRoute?.destination)
                .map(u => `${u.tradeRoute.origin.r},${u.tradeRoute.origin.c}|${u.tradeRoute.destination.r},${u.tradeRoute.destination.c}`)
        );

        for (const origin of originCandidates) {
            for (const target of allCities) {
                const routeKey = `${origin.r},${origin.c}|${target.r},${target.c}`;
                if (existingRoutes.has(routeKey)) continue;

                const path = findInfrastructurePath(origin, target, {
                    allowForeignInfrastructure: true,
                    requireRoadCorridor: true
                });

                if (!path || path.length < 2) continue;

                const deployHex = this._findFreeDeployHexNearCity(origin);
                if (!deployHex) continue;

                if (!this._consumeCaravanResources()) {
                    return false;
                }

                const caravanDef = {
                    name: `Caravana Barbarica: ${origin.name} -> ${target.name}`,
                    regiments: [
                        { ...REGIMENT_TYPES['Columna de Suministro'], type: 'Columna de Suministro', health: REGIMENT_TYPES['Columna de Suministro'].health },
                        { ...REGIMENT_TYPES['Arqueros a Caballo'], type: 'Arqueros a Caballo', health: REGIMENT_TYPES['Arqueros a Caballo'].health }
                    ]
                };

                const caravan = this._createUnitByDefinition(caravanDef, deployHex);
                if (!caravan) return false;

                caravan.tradeRoute = {
                    origin: { r: origin.r, c: origin.c, name: origin.name },
                    destination: { r: target.r, c: target.c, name: target.name },
                    path,
                    position: 0,
                    goldCarried: 0,
                    cargoCapacity: caravan.regiments.reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.goldValueOnDestroy || 0), 0),
                    forward: true
                };
                caravan.hasMoved = true;
                caravan.hasAttacked = true;

                placeFinalizedDivision(caravan, deployHex.r, deployHex.c);
                logMessage(`Los Barbaros envian una caravana desde ${origin.name}.`, 'event');
                return true;
            }
        }

        return false;
    },

    _tryIncreaseCityDefense: async function() {
        const barbCities = this._getBarbarianCitiesOwned();
        if (barbCities.length === 0) return false;

        for (const city of barbCities) {
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
        if (actionsAvailable <= 0) return 0;

        const lostCities = this._getLostBarbarianCities();
        if (lostCities.length === 0) return 0;

        let actionsDone = 0;
        const movable = this._getMovableUnits();

        movable.sort((a, b) => {
            const aDist = Math.min(...lostCities.map(c => hexDistance(a.r, a.c, c.r, c.c)));
            const bDist = Math.min(...lostCities.map(c => hexDistance(b.r, b.c, c.r, c.c)));
            return aDist - bDist;
        });

        for (const unit of movable) {
            if (actionsDone >= actionsAvailable) break;
            if (unit.hasMoved) continue;

            const targetCity = lostCities
                .slice()
                .sort((a, b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c))[0];
            if (!targetCity) continue;

            const defendingUnit = getUnitOnHex(targetCity.r, targetCity.c);
            const distance = hexDistance(unit.r, unit.c, targetCity.r, targetCity.c);

            if (defendingUnit && defendingUnit.player !== this.BARBARIAN_ID) {
                if (distance <= 1 && !unit.hasAttacked && typeof isValidAttack === 'function' && isValidAttack(unit, defendingUnit)) {
                    await RequestAttackUnit(unit, defendingUnit);
                    actionsDone++;
                    continue;
                }

                const moved = await this._moveOneStepToward(unit, targetCity);
                if (moved) actionsDone++;
                continue;
            }

            if (!defendingUnit) {
                if (distance <= 1 && !getUnitOnHex(targetCity.r, targetCity.c)) {
                    await RequestMoveUnit(unit, targetCity.r, targetCity.c);
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
                await RequestMoveUnit(unit, objective.r, objective.c);
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

        await RequestMoveUnit(unit, best.r, best.c);
        return true;
    },

    _finishTurn: function(playerNumber) {
        setTimeout(() => {
            if (gameState.currentPhase === 'play' && gameState.currentPlayer === playerNumber && typeof handleEndTurn === 'function') {
                handleEndTurn();
            }
        }, 700);
    }
};
