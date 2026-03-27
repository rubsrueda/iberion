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
    abandonmentStorageKey: 'iberion_abandonment_events_v1',
    _abandonmentHooked: false,
    _abandonmentRecordedThisSession: false,
    _matchCompleted: false,

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
        this._matchCompleted = false;
        this._abandonmentRecordedThisSession = false;
        this.ensureAbandonmentHooks();
    },

    /**
     * Asegura listeners únicos para detectar salida/cierre de pestaña durante partida.
     */
    ensureAbandonmentHooks: function() {
        if (this._abandonmentHooked) return;
        this._abandonmentHooked = true;

        window.addEventListener('pagehide', () => {
            this.recordAbandonment('pagehide');
        });

        window.addEventListener('beforeunload', () => {
            this.recordAbandonment('beforeunload');
        });
    },

    /**
     * Marca que la partida ya terminó de forma normal (evita falsos positivos de abandono).
     */
    markGameCompleted: function(reason = 'game_over') {
        this._matchCompleted = true;
        this._abandonmentRecordedThisSession = true;
        console.log('[StatTracker] Partida completada, abandono desactivado:', reason);
    },

    /**
     * Registra una salida prematura para análisis de abandono.
     */
    recordAbandonment: function(reason = 'close') {
        try {
            if (this._abandonmentRecordedThisSession) return;
            if (this._matchCompleted) return;
            if (!this._isPlayableMatchActive()) return;

            const myPlayerId = this._getMyPlayerId();
            const myGold = Number(gameState?.playerResources?.[myPlayerId]?.oro || 0);
            const scoreGap = this._getScoreGap(myPlayerId);

            const event = {
                id: `abandon_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                timestamp: Date.now(),
                reason: reason,
                turn: Number(gameState?.turnNumber || 1),
                phase: gameState?.currentPhase || 'unknown',
                myPlayerId: myPlayerId,
                myGold: myGold,
                isGoldNegative: myGold < 0,
                scoreGap: scoreGap,
                isLosingHard: scoreGap >= 1200,
                gameMode: gameState?.currentGameMode || (gameState?.isCampaignBattle ? 'campaign' : 'skirmish'),
                isTutorial: !!gameState?.isTutorialActive,
                isNetwork: !!(typeof isNetworkGame === 'function' && isNetworkGame())
            };

            const events = this._getLocalAbandonmentEvents();
            events.push(event);
            const capped = events.slice(-300);
            localStorage.setItem(this.abandonmentStorageKey, JSON.stringify(capped));

            this._abandonmentRecordedThisSession = true;
            this._syncAbandonmentToSupabase(event);
            console.log('[StatTracker] Evento de abandono registrado:', event);
        } catch (err) {
            console.warn('[StatTracker] Error registrando abandono:', err);
        }
    },

    _isPlayableMatchActive: function() {
        if (!gameState) return false;
        if (gameState.currentPhase === 'gameOver') return false;
        if (!gameState.currentPhase) return false;
        if (gameState.turnNumber < 1) return false;
        if (!Array.isArray(board) || board.length === 0) return false;
        return true;
    },

    _getMyPlayerId: function() {
        if (Number.isFinite(Number(gameState?.myPlayerNumber))) return Number(gameState.myPlayerNumber);
        if (Number.isFinite(Number(gameState?.currentPlayer))) return Number(gameState.currentPlayer);
        return 1;
    },

    _getScoreGap: function(myPlayerId) {
        try {
            if (!this.gameStats?.players) return 0;
            const players = Object.values(this.gameStats.players);
            if (!Array.isArray(players) || players.length === 0) return 0;

            const myStats = this.gameStats.players[myPlayerId];
            if (!myStats) return 0;

            const myScore = Number(myStats.score || 0);
            const bestRival = players
                .filter(p => Number(p.playerId) !== Number(myPlayerId))
                .reduce((max, p) => Math.max(max, Number(p.score || 0)), 0);

            return Math.max(0, bestRival - myScore);
        } catch (err) {
            return 0;
        }
    },

    _getLocalAbandonmentEvents: function() {
        try {
            const raw = localStorage.getItem(this.abandonmentStorageKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    },

    _syncAbandonmentToSupabase: async function(event) {
        try {
            if (typeof supabaseClient === 'undefined') return;
            if (!PlayerDataManager?.currentPlayer?.auth_id) return;

            await supabaseClient
                .from('analytics_abandonment')
                .insert([{
                    player_id: PlayerDataManager.currentPlayer.auth_id,
                    payload: event,
                    created_at: new Date(event.timestamp).toISOString()
                }]);
        } catch (err) {
            // Tabla opcional: si no existe, no romper flujo
        }
    },

    getAbandonmentHeatmapData: function() {
        const events = this._getLocalAbandonmentEvents();
        const byTurn = {};
        let negativeGoldCount = 0;
        let losingHardCount = 0;

        events.forEach(ev => {
            const turn = Math.max(1, Number(ev.turn || 1));
            byTurn[turn] = (byTurn[turn] || 0) + 1;
            if (ev.isGoldNegative) negativeGoldCount++;
            if (ev.isLosingHard) losingHardCount++;
        });

        const points = Object.entries(byTurn)
            .map(([turn, count]) => ({ turn: Number(turn), count: Number(count) }))
            .sort((a, b) => a.turn - b.turn);

        return {
            total: events.length,
            points,
            negativeGoldCount,
            losingHardCount,
            negativeGoldPct: events.length ? Math.round((negativeGoldCount / events.length) * 100) : 0,
            losingHardPct: events.length ? Math.round((losingHardCount / events.length) * 100) : 0,
            rawEvents: events
        };
    },

    openAbandonmentHeatmap: function() {
        const existing = document.getElementById('abandonmentHeatmapModal');
        if (existing) existing.remove();

        const data = this.getAbandonmentHeatmapData();
        const maxCount = Math.max(1, ...data.points.map(p => p.count));

        const rows = data.points.length
            ? data.points.map(p => {
                const widthPct = Math.max(4, Math.round((p.count / maxCount) * 100));
                const color = p.count >= Math.ceil(maxCount * 0.8)
                    ? '#e74c3c'
                    : p.count >= Math.ceil(maxCount * 0.5)
                        ? '#f39c12'
                        : '#2ecc71';
                return `
                    <div style="display:grid; grid-template-columns: 52px 1fr 34px; gap:8px; align-items:center; margin-bottom:6px;">
                        <div style="color:#bbb; font-size:12px;">T${p.turn}</div>
                        <div style="height:14px; background:rgba(255,255,255,0.06); border-radius:999px; overflow:hidden;">
                            <div style="height:100%; width:${widthPct}%; background:${color}; border-radius:999px;"></div>
                        </div>
                        <div style="text-align:right; color:#fff; font-size:12px;">${p.count}</div>
                    </div>
                `;
            }).join('')
            : '<div style="color:#888; padding: 14px 0;">Sin eventos de abandono aún.</div>';

        const modal = document.createElement('div');
        modal.id = 'abandonmentHeatmapModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:21000;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `
            <div style="width:min(700px,95vw);max-height:88vh;overflow:auto;background:#121212;border:1px solid #333;border-radius:12px;padding:18px 18px 14px;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <h3 style="margin:0;color:#00f3ff;">📊 Heatmap de Abandono</h3>
                    <button id="closeAbandonmentHeatmapBtn" style="border:none;background:#2b2b2b;color:#ddd;border-radius:6px;padding:6px 10px;cursor:pointer;">Cerrar</button>
                </div>
                <p style="margin:8px 0 14px;color:#999;font-size:12px;">Eventos capturados al cerrar/recargar durante una partida activa.</p>
                <div style="display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:10px;margin-bottom:14px;">
                    <div style="background:rgba(255,255,255,0.03);border:1px solid #2f2f2f;border-radius:8px;padding:10px;">
                        <div style="color:#888;font-size:11px;">Total abandonos</div>
                        <div style="color:#fff;font-size:20px;font-weight:bold;">${data.total}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03);border:1px solid #2f2f2f;border-radius:8px;padding:10px;">
                        <div style="color:#888;font-size:11px;">Con oro negativo</div>
                        <div style="color:#fff;font-size:20px;font-weight:bold;">${data.negativeGoldPct}%</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03);border:1px solid #2f2f2f;border-radius:8px;padding:10px;">
                        <div style="color:#888;font-size:11px;">Perdiendo por mucho</div>
                        <div style="color:#fff;font-size:20px;font-weight:bold;">${data.losingHardPct}%</div>
                    </div>
                </div>
                <div style="border:1px solid #2a2a2a;border-radius:10px;padding:12px;background:rgba(0,0,0,0.25);">
                    ${rows}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => {
            if (modal.parentNode) modal.remove();
        };
        const closeBtn = document.getElementById('closeAbandonmentHeatmapBtn');
        if (closeBtn) closeBtn.addEventListener('click', close);
        modal.addEventListener('click', (ev) => {
            if (ev.target === modal) close();
        });
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
