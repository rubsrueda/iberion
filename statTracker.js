/**
 * statTracker.js
 * Rastreador de estadísticas en tiempo real durante la partida
 * Captura eventos clave sin afectar la lógica de juego existente
 */

const StatTracker = {
    /**
     * Estado actual del rastreador
     */
    gameStats: {},
    turnEvents: [],
    battleLog: [],
    isEnabled: false,

    /**
     * Inicializa el rastreador al comenzar una partida
     */
    initialize: function(numPlayers) {
        console.log('[StatTracker] Inicializando para', numPlayers, 'jugadores');
        
        this.gameStats = {
            startTime: Date.now(),
            numPlayers: numPlayers,
            currentTurn: 1,
            players: {}
        };

        // Inicializar estadísticas por jugador
        for (let i = 1; i <= numPlayers; i++) {
            this.gameStats.players[i] = {
                playerId: i,
                civilization: gameState.playerCivilizations?.[i] || `Jugador ${i}`,
                score: 0,
                gold: gameState.playerResources?.[i]?.oro || 0,
                militaryPower: 0,
                navyPower: 0,
                population: 0,
                territory: 0,
                cities: 0,
                militaryUnits: 0,
                unitsDestroyed: 0,
                buildingsConstructed: 0,
                technologiesDiscovered: 0,
                tradingRoutesActive: 0,
                
                // Sub-estadísticas
                income: 0,
                expenses: 0,
                stability: 100,
                corruptionLevel: 0,
                supplyCapacity: 0,
                activeRegiments: 0,
                
                // Timeline
                timelineHistory: [],
                importantEvents: [],
                battles: []
            };
        }

        this.turnEvents = [];
        this.battleLog = [];
        this.isEnabled = true;
    },

    /**
     * Actualiza estadísticas al finalizar cada turno
     */
    recordTurnStats: function(turnNumber, currentPlayerId) {
        if (!this.isEnabled) return;
        
        this.gameStats.currentTurn = turnNumber;

        // Capturar snapshot real para TODOS los jugadores en cada turno.
        // Esto permite una serie histórica precisa en la pantalla de victoria.
        Object.keys(this.gameStats.players).forEach((playerKey) => {
            const playerId = Number(playerKey);
            if (!Number.isFinite(playerId)) return;

            const player = this.gameStats.players[playerId];
            if (!player) return;

            this._refreshPlayerStats(playerId, player);
            this._saveTimelinePoint(player, turnNumber);
        });
    },

    _refreshPlayerStats: function(playerId, player) {
        // Oro actual
        player.gold = gameState.playerResources?.[playerId]?.oro || 0;

        // Contar ciudades, población y territorio
        let cityCount = 0;
        let totalPopulation = 0;
        let territoryCount = 0;

        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                if (hex?.owner === playerId) {
                    territoryCount++;
                    if (hex.isCity) {
                        cityCount++;
                        totalPopulation += this._getCityPopulationFromHex(hex);
                    }
                }
            }
        }

        player.cities = cityCount;
        player.population = totalPopulation;
        player.territory = territoryCount;

        // Contar unidades y poder militar
        let unitCount = 0;
        let militaryPowerLand = 0;
        let militaryPowerNaval = 0;

        units.forEach(unit => {
            const unitOwner = unit.player ?? unit.playerId;
            if (unitOwner !== playerId || unit.isDefeated) return;

            unitCount++;
            const attack = unit.regiments?.reduce((sum, r) => {
                const baseAtk = REGIMENT_TYPES?.[r.type]?.attack;
                return sum + (Number.isFinite(baseAtk) ? baseAtk : (r.attack || 0));
            }, 0) || 0;
            const defense = unit.regiments?.reduce((sum, r) => {
                const baseDef = REGIMENT_TYPES?.[r.type]?.defense;
                return sum + (Number.isFinite(baseDef) ? baseDef : (r.defense || 0));
            }, 0) || 0;
            const power = attack + defense;

            const isNaval = unit.regiments?.some(reg => REGIMENT_TYPES?.[reg.type]?.is_naval) || unit.type === 'naval';
            if (isNaval) militaryPowerNaval += power;
            else militaryPowerLand += power;
        });

        player.militaryUnits = unitCount;
        player.militaryPower = militaryPowerLand;
        player.navyPower = militaryPowerNaval;

        // Puntuación compuesta (para ranking)
        player.score = this._calculateScore(player);
    },

    _saveTimelinePoint: function(player, turnNumber) {
        if (!Array.isArray(player.timelineHistory)) player.timelineHistory = [];
        const turn = Math.max(1, Number(turnNumber || 1));
        const totalPower = (player.militaryPower || 0) + (player.navyPower || 0);

        const snapshot = {
            turn: turn,
            totalPower: totalPower,
            militaryPower: player.militaryPower || 0,
            navyPower: player.navyPower || 0,
            score: player.score || 0,
            gold: player.gold || 0,
            cities: player.cities || 0,
            territory: player.territory || 0
        };

        // Si ya existe snapshot para este turno, se actualiza (evita duplicados)
        const existingIdx = player.timelineHistory.findIndex(p => p.turn === turn);
        if (existingIdx >= 0) player.timelineHistory[existingIdx] = snapshot;
        else player.timelineHistory.push(snapshot);

        player.timelineHistory.sort((a, b) => a.turn - b.turn);
    },

    /**
     * Calcula puntuación para un jugador
     */
    _getCityPopulationFromHex: function(hex) {
        const structure = hex?.structure;
        if (structure === 'Metrópoli') return 3;
        if (structure === 'Ciudad') return 2;
        if (structure === 'Aldea') return 1;
        return 1;
    },

    _calculateScore: function(playerStats) {
        const cityBonus = playerStats.cities * 180;
        const territoryBonus = playerStats.territory * 20;
        const militaryBonus = (playerStats.militaryPower + playerStats.navyPower) * 4;
        const populationBonus = playerStats.population * 60;
        const conquestBonus = (playerStats.unitsDestroyed || 0) * 80;
        const infrastructureBonus = (playerStats.buildingsConstructed || 0) * 50;
        const researchBonus = (playerStats.technologiesDiscovered || 0) * 70;

        return cityBonus + territoryBonus + militaryBonus + populationBonus + conquestBonus + infrastructureBonus + researchBonus;
    },

    /**
     * Registra un evento importante (construcción, investigación, etc.)
     */
    recordEvent: function(turnNumber, eventType, playerId, description, data = {}) {
        if (!this.isEnabled) return;
        
        const event = {
            turn: turnNumber,
            type: eventType, // 'build', 'research', 'battle', 'conquer', 'trade', 'discovery'
            playerId: playerId,
            description: description,
            timestamp: Date.now(),
            data: data
        };
        
        this.turnEvents.push(event);
        
        if (this.gameStats.players[playerId]) {
            this.gameStats.players[playerId].importantEvents.push(event);
        }
        
        console.log(`[StatTracker] Evento T${turnNumber}: ${description}`);
    },

    /**
     * Registra una batalla
     */
    recordBattle: function(turnNumber, attackerId, defenderId, location, winner, casualties) {
        if (!this.isEnabled) return;
        
        const battle = {
            turn: turnNumber,
            attackerId: attackerId,
            defenderId: defenderId,
            location: location,
            winner: winner,
            casualties: casualties, // { attackerLosses: X, defenderLosses: Y }
            timestamp: Date.now()
        };
        
        this.battleLog.push(battle);
        
        // Registrar en estadísticas del jugador
        if (this.gameStats.players[attackerId]) {
            this.gameStats.players[attackerId].battles.push(battle);
        }
        if (this.gameStats.players[defenderId]) {
            this.gameStats.players[defenderId].battles.push(battle);
        }
        
        console.log(`[StatTracker] Batalla T${turnNumber}: ${attackerId} vs ${defenderId} en ${location.r},${location.c}`);
    },

    /**
     * Obtiene estado actual para el cuaderno
     */
    getCurrentState: function() {
        return {
            gameStats: this.gameStats,
            turnEvents: this.turnEvents,
            battleLog: this.battleLog,
            isEnabled: this.isEnabled
        };
    },

    /**
     * Obtiene estadísticas agregadas por jugador
     */
    getPlayerStats: function(playerId) {
        return this.gameStats.players[playerId] || null;
    },

    /**
     * Obtiene ranking de jugadores por criterio
     */
    getRanking: function(criterion = 'score') {
        const players = Object.values(this.gameStats.players);
        
        const sortMap = {
            'score': p => p.score,
            'military': p => p.militaryPower + p.navyPower,
            'gold': p => p.gold,
            'territory': p => p.territory,
            'cities': p => p.cities,
            'population': p => p.population
        };
        
        const sortFn = sortMap[criterion] || sortMap['score'];
        return players.sort((a, b) => sortFn(b) - sortFn(a));
    },

    /**
     * Obtiene últimas N batallas
     */
    getRecentBattles: function(count = 10) {
        return this.battleLog.slice(-count).reverse();
    },

    /**
     * Obtiene eventos narrativos (formateados para crónica)
     */
    getNarrativeEvents: function() {
        return this.turnEvents.map(event => {
            const playerName = this.gameStats.players[event.playerId]?.civilization || `Jugador ${event.playerId}`;
            
            switch(event.type) {
                case 'research':
                    return `T${event.turn}: La Casa de ${playerName} descubrió ${event.data.technology}`;
                case 'build':
                    return `T${event.turn}: ${playerName} construyó una ${event.data.buildingType}`;
                case 'conquer':
                    return `T${event.turn}: ${playerName} conquistó nuevos territorios`;
                case 'battle':
                    return `T${event.turn}: Gran batalla en ${event.data.location}`;
                case 'discovery':
                    return `T${event.turn}: ${playerName} realizó un descubrimiento importante`;
                default:
                    return `T${event.turn}: ${event.description}`;
            }
        });
    },

    /**
     * Finaliza el rastreador al terminar la partida
     */
    finalize: function(winnerPlayerId) {
        if (!this.isEnabled) return;
        
        console.log('[StatTracker] Rastreador finalizado. Ganador:', winnerPlayerId);
        this.isEnabled = false;
        
        return this.getCurrentState();
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.StatTracker = StatTracker;
}
