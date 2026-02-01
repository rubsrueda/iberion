/**
 * legacyManager.js
 * Gestor de "La Crónica" (Legacy) - se muestra al terminar la partida
 * Genera gráficos, línea de tiempo narrativa, análisis de combate
 */

const LegacyManager = {
    isOpen: false,
    currentTab: 'timeline', // timeline, heatmap, narrative, combat

    /**
     * Abre la Crónica al terminar la partida
     */
    open: function(winnerPlayerId) {
        console.log('[LegacyManager] Abriendo Crónica. Ganador:', winnerPlayerId);
        
        this.isOpen = true;
        
        if (typeof LegacyUI !== 'undefined') {
            LegacyUI.showModal();
            this.updateAllDisplays(winnerPlayerId);
        }
    },

    /**
     * Cierra la Crónica
     */
    close: function() {
        this.isOpen = false;
        if (typeof LegacyUI !== 'undefined') {
            LegacyUI.hideModal();
        }
    },

    /**
     * Cambia de pestaña
     */
    switchTab: function(tabName) {
        if (['timeline', 'heatmap', 'narrative', 'combat'].includes(tabName)) {
            this.currentTab = tabName;
            this.updateAllDisplays();
        }
    },

    /**
     * Actualiza todas las vistas de la Crónica
     */
    updateAllDisplays: function(winnerPlayerId) {
        if (!this.isOpen || typeof LegacyUI === 'undefined') return;
        
        switch(this.currentTab) {
            case 'timeline':
                this._updateTimeline(winnerPlayerId);
                break;
            case 'heatmap':
                this._updateHeatmap();
                break;
            case 'narrative':
                this._updateNarrative();
                break;
            case 'combat':
                this._updateCombatLog();
                break;
        }
    },

    /**
     * PESTAÑA 1: LÍNEA DE TIEMPO (Gráfico XY)
     */
    _updateTimeline: function(winnerPlayerId) {
        const stats = StatTracker.gameStats;
        const players = Object.values(stats.players);

        // Preparar datos para gráfico (timeline por turno)
        const graphData = {
            turns: [],
            series: []
        };

        // Eje X: turnos
        for (let t = 1; t <= stats.currentTurn; t++) {
            graphData.turns.push(t);
        }

        // Eje Y: puntuación por jugador (se podría cambiar a military, economy, etc.)
        players.forEach(player => {
            graphData.series.push({
                name: player.civilization,
                color: this._getPlayerColor(player.playerId),
                data: Array(stats.currentTurn).fill(0).map((_, i) => {
                    // Aproximación: score = f(cities, territory, military)
                    // En producción, esto vendría del rastreador histórico
                    return Math.floor(player.score * (i / stats.currentTurn) * 0.8 + Math.random() * 1000);
                }),
                isWinner: player.playerId === winnerPlayerId
            });
        });

        LegacyUI.displayTimeline(graphData);
    },

    /**
     * PESTAÑA 2: MAPA DE CALOR (Timelapse)
     */
    _updateHeatmap: function() {
        // Generar visualización de expansión territorial
        const heatmapData = {
            width: board[0]?.length || 12,
            height: board?.length || 12,
            turns: StatTracker.gameStats.currentTurn,
            hexStates: this._generateHexTimelapseData()
        };

        LegacyUI.displayHeatmap(heatmapData);
    },

    /**
     * Genera datos de cambio de propietario por turno
     */
    _generateHexTimelapseData: function() {
        const data = [];
        
        // Simplificación: estado actual de cada hex
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c]?.owner) {
                    data.push({
                        r: r,
                        c: c,
                        owner: board[r][c].owner,
                        color: this._getPlayerColor(board[r][c].owner),
                        structure: board[r][c]?.structure?.type || null
                    });
                }
            }
        }

        return data;
    },

    /**
     * PESTAÑA 3: CRÓNICA NARRATIVA
     */
    _updateNarrative: function() {
        const narrativeEvents = StatTracker.getNarrativeEvents();
        const battles = StatTracker.getRecentBattles(15);

        // Combinar eventos y batallas en orden cronológico
        const allEvents = [
            ...narrativeEvents.map(text => ({ type: 'event', text, turn: 0 })),
            ...battles.map(b => ({
                type: 'battle',
                text: `T${b.turn}: Batalla en (${b.location.r},${b.location.c}) - Ganador: Jugador ${b.winner}`,
                turn: b.turn
            }))
        ].sort((a, b) => a.turn - b.turn);

        const narrative = {
            events: allEvents,
            totalTurns: StatTracker.gameStats.currentTurn
        };

        LegacyUI.displayNarrative(narrative);
    },

    /**
     * PESTAÑA 4: ANÁLISIS DE COMBATE
     */
    _updateCombatLog: function() {
        const battles = StatTracker.getRecentBattles(10);

        const combatAnalysis = battles.map(b => ({
            turn: b.turn,
            attackerId: b.attackerId,
            attackerName: StatTracker.gameStats.players[b.attackerId]?.civilization || `Jugador ${b.attackerId}`,
            defenderId: b.defenderId,
            defenderName: StatTracker.gameStats.players[b.defenderId]?.civilization || `Jugador ${b.defenderId}`,
            location: `(${b.location.r}, ${b.location.c})`,
            terrain: board[b.location.r]?.[b.location.c]?.terrain?.type || 'Llanura',
            winner: b.winner,
            winnerName: StatTracker.gameStats.players[b.winner]?.civilization || `Jugador ${b.winner}`,
            attackerLosses: b.casualties?.attackerLosses || 0,
            defenderLosses: b.casualties?.defenderLosses || 0,
            terrainBonus: this._calculateTerrainBonus(board[b.location.r]?.[b.location.c]?.terrain?.type)
        }));

        LegacyUI.displayCombatLog(combatAnalysis);
    },

    /**
     * Obtiene color asignado a un jugador
     */
    _getPlayerColor: function(playerId) {
        const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
        return colors[(playerId - 1) % colors.length];
    },

    /**
     * Calcula bonificador de terreno
     */
    _calculateTerrainBonus: function(terrainType) {
        const bonusMap = {
            'montaña': '+20%',
            'bosque': '+15%',
            'colina': '+10%',
            'río': '+5%',
            'llanura': '+0%',
            'desierto': '-5%'
        };
        return bonusMap[terrainType?.toLowerCase()] || '+0%';
    },

    /**
     * Genera resumen final de la partida
     */
    generateGameSummary: function(winnerPlayerId) {
        const stats = StatTracker.gameStats;
        const ranking = StatTracker.getRanking('score');

        const summary = {
            winner: {
                playerId: winnerPlayerId,
                name: stats.players[winnerPlayerId]?.civilization || `Jugador ${winnerPlayerId}`,
                finalScore: stats.players[winnerPlayerId]?.score || 0,
                cities: stats.players[winnerPlayerId]?.cities || 0,
                military: (stats.players[winnerPlayerId]?.militaryPower || 0) + (stats.players[winnerPlayerId]?.navyPower || 0),
                gold: stats.players[winnerPlayerId]?.gold || 0
            },
            totalTurns: stats.currentTurn,
            totalBattles: StatTracker.battleLog.length,
            ranking: ranking.map((p, i) => ({
                rank: i + 1,
                name: p.civilization,
                score: p.score,
                cities: p.cities
            })),
            gameDuration: this._formatGameDuration(Date.now() - stats.startTime)
        };

        return summary;
    },

    /**
     * Formatea duración de la partida
     */
    _formatGameDuration: function(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.LegacyManager = LegacyManager;
}
