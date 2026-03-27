/**
 * legacyManager.js
 * Gestor de "La Crónica" (Legacy) - se muestra al terminar la partida
 * Genera gráficos, línea de tiempo narrativa, análisis de combate
 */

const LegacyManager = {
    isOpen: false,
    currentTab: 'timeline', // timeline, heatmap, narrative, combat
    lastNarrative: null,

    /**
     * Abre la Crónica al terminar la partida
     */
    open: function(winnerPlayerId) {
        console.log('[LegacyManager.open] Abriendo Crónica. Ganador:', winnerPlayerId);
        console.log('[LegacyManager.open] LegacyUI disponible?', typeof LegacyUI !== 'undefined');
        
        this.isOpen = true;
        
        if (typeof LegacyUI !== 'undefined') {
            console.log('[LegacyManager.open] Mostrando modal...');
            LegacyUI.showModal();
            console.log('[LegacyManager.open] Modal mostrado, actualizando displays...');
            this.updateAllDisplays(winnerPlayerId);
            console.log('[LegacyManager.open] Displays actualizados');
        } else {
            console.error('[LegacyManager.open] LegacyUI no está definido');
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
        console.log('[LegacyManager._updateTimeline] Iniciando...', winnerPlayerId);

        const stats = (typeof StatTracker !== 'undefined' && StatTracker.gameStats)
            ? StatTracker.gameStats
            : null;
        console.log('[LegacyManager._updateTimeline] Stats:', stats);

        if (!stats) {
            console.error('[LegacyManager._updateTimeline] No hay estadísticas disponibles');
            // Mostrar una versión por defecto
            LegacyUI.displayTimeline({
                turns: [1, 2, 3],
                series: [{
                    name: 'Sin datos',
                    color: '#999',
                    data: [0, 0, 0],
                    isWinner: false
                }]
            });
            return;
        }

        let players = stats.players ? Object.values(stats.players) : [];

        // Fallback: reconstruir jugadores desde gameState cuando StatTracker quedó incompleto
        if (!Array.isArray(players) || players.length === 0) {
            const fallbackIds = new Set();
            Object.keys(gameState?.playerCivilizations || {}).forEach(key => {
                const id = Number(String(key).replace('player', ''));
                if (Number.isFinite(id) && id > 0 && id !== BankManager.PLAYER_ID && id !== 9) {
                    fallbackIds.add(id);
                }
            });

            players = Array.from(fallbackIds).sort((a, b) => a - b).map(id => ({
                playerId: id,
                civilization: CIVILIZATIONS[gameState.playerCivilizations?.[id]]?.name || `Jugador ${id}`,
                score: gameState.playerResources?.[id]?.oro || 0,
                cities: gameState.cities?.filter(c => c.owner === id).length || 0,
                territory: this._estimateTerritory(id),
                militaryPower: this._estimateMilitaryPower(id),
                navyPower: 0,
                population: 0,
                unitsDestroyed: 0,
                buildingsConstructed: 0,
                technologiesDiscovered: 0,
                importantEvents: []
            }));
        }

        console.log('[LegacyManager._updateTimeline] Jugadores encontrados:', players.length);

        // Preparar datos para gráfico (timeline por turno)
        const graphData = {
            turns: [],
            series: []
        };

        // Eje X: turnos
        const totalTurns = Math.max(1, Number(stats.currentTurn || gameState.turnNumber || 1));
        for (let t = 1; t <= totalTurns; t++) {
            graphData.turns.push(t);
        }
        console.log('[LegacyManager._updateTimeline] Turnos totales:', totalTurns);

        // Eje Y: puntuación por jugador (se podría cambiar a military, economy, etc.)
        players.forEach(player => {
            const series = {
                name: player.civilization || `Jugador ${player.playerId}`,
                color: this._getPlayerColor(player.playerId),
                data: this._buildTimelineSeries(player, totalTurns),
                isWinner: player.playerId === winnerPlayerId
            };
            graphData.series.push(series);
            console.log('[LegacyManager._updateTimeline] Serie agregada:', series.name, 'Ganador?', series.isWinner);
        });

        // Desglose por categoría: una entrada por jugador con subseries de métricas
        graphData.breakdown = players.map(player => ({
            playerId: player.playerId,
            name: player.civilization || `Jugador ${player.playerId}`,
            color: this._getPlayerColor(player.playerId),
            subSeries: this._buildBreakdownSeries(player, totalTurns)
        }));

        console.log('[LegacyManager._updateTimeline] GraphData completo:', graphData);
        LegacyUI.displayTimeline(graphData);
    },

    _estimateTerritory: function(playerId) {
        if (!Array.isArray(board)) return 0;
        let count = 0;
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < (board[r]?.length || 0); c++) {
                if (board[r]?.[c]?.owner === playerId) count++;
            }
        }
        return count;
    },

    _estimateMilitaryPower: function(playerId) {
        if (!Array.isArray(units)) return 0;
        return units
            .filter(unit => (unit.player ?? unit.playerId) === playerId)
            .reduce((sum, unit) => {
                const regiments = Array.isArray(unit.regiments) ? unit.regiments : [];
                const regPower = regiments.reduce((acc, reg) => {
                    const def = REGIMENT_TYPES?.[reg.type]?.defense || reg.defense || 0;
                    const atk = REGIMENT_TYPES?.[reg.type]?.attack || reg.attack || 0;
                    return acc + atk + def;
                }, 0);
                return sum + regPower;
            }, 0);
    },

    _buildTimelineSeries: function(player, totalTurns) {
        // 1) Prioridad: serie histórica real por turno (capturada en StatTracker).
        if (Array.isArray(player.timelineHistory) && player.timelineHistory.length > 0) {
            const pointsByTurn = new Map();
            player.timelineHistory.forEach(point => {
                const t = Number(point.turn);
                if (!Number.isFinite(t)) return;
                pointsByTurn.set(t, Number(point.totalPower || 0));
            });

            let carry = 0;
            return Array.from({ length: totalTurns }, (_, index) => {
                const turn = index + 1;
                if (pointsByTurn.has(turn)) {
                    carry = pointsByTurn.get(turn) || 0;
                }
                return Math.round(Math.max(0, carry));
            });
        }

        // 2) Fallback: reconstrucción aproximada si no hay histórico.
        const finalScore = this._calculateLegacyEmpireScore(player);
        const eventWeights = {
            build: 50,
            research: 70,
            conquer: 120,
            battle: 60,
            discovery: 40,
            trade: 35,
            event: 20
        };
        const weightedEvents = Array.isArray(player.importantEvents) ? player.importantEvents : [];

        return Array.from({ length: totalTurns }, (_, index) => {
            const turn = index + 1;
            const progressBase = finalScore * (turn / Math.max(1, totalTurns));
            const eventScore = weightedEvents.reduce((sum, event) => {
                if ((event.turn || 0) > turn) return sum;
                return sum + (eventWeights[event.type] || 15);
            }, 0);
            return Math.round(progressBase * 0.8 + eventScore);
        });
    },

    /**
     * Construye series de desglose por categoría para un jugador.
     * Usa la misma timeline del StatTracker que ya se captura cada turno.
     * Las escalas aproximan cada métrica a unidades comparables con el poder militar.
     */
    _buildBreakdownSeries: function(player, totalTurns) {
        if (!Array.isArray(player.timelineHistory) || player.timelineHistory.length === 0) {
            return [];
        }

        const byTurn = new Map();
        player.timelineHistory.forEach(p => {
            const t = Number(p.turn);
            if (Number.isFinite(t)) byTurn.set(t, p);
        });

        const CATEGORIES = [
            { key: 'militaryPower', label: '⚔️ Ejército (tierra)', color: '#e57373',  scale: 1   },
            { key: 'navyPower',     label: '⚓ Armada',             color: '#64b5f6',  scale: 1   },
            { key: 'gold',          label: '💰 Oro ÷10',            color: '#ffd54f',  scale: 0.1 },
            { key: 'cities',        label: '🏰 Ciudades ×30',       color: '#81c784',  scale: 30  },
            { key: 'territory',     label: '🗺️ Territorio ×5',      color: '#ce93d8',  scale: 5   },
        ];

        return CATEGORIES.map(cat => {
            let carry = 0;
            const data = Array.from({ length: totalTurns }, (_, i) => {
                const turn = i + 1;
                const pt = byTurn.get(turn);
                if (pt) carry = Number(pt[cat.key] || 0) * cat.scale;
                return Math.round(Math.max(0, carry));
            });
            return { label: cat.label, color: cat.color, data };
        });
    },

    _calculateLegacyEmpireScore: function(player) {
        const cities = player.cities || 0;
        const territory = player.territory || 0;
        const militaryPower = (player.militaryPower || 0) + (player.navyPower || 0);
        const population = player.population || 0;
        const kills = player.unitsDestroyed || 0;
        const builds = player.buildingsConstructed || 0;
        const techs = player.technologiesDiscovered || 0;

        return (cities * 220) + (territory * 25) + (militaryPower * 4) + (population * 70) + (kills * 90) + (builds * 50) + (techs * 80);
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
        let narrativeEvents = (typeof StatTracker !== 'undefined' && StatTracker.getNarrativeEvents)
            ? StatTracker.getNarrativeEvents()
            : [];
        let battles = (typeof StatTracker !== 'undefined' && StatTracker.getRecentBattles)
            ? StatTracker.getRecentBattles(15)
            : [];

        const logs = (typeof Chronicle !== 'undefined')
            ? (Chronicle.getLogs ? Chronicle.getLogs() : (Chronicle.currentMatchLogs || []))
            : [];

        if (Array.isArray(logs) && logs.length > 0) {
            narrativeEvents = logs
                .filter(log => log && log.message && !['turn_start'].includes(log.type))
                .map(log => ({
                    type: log.type === 'battle_start' ? 'battle' : 'event',
                    text: log.message,
                    turn: log.turn || 0,
                    sourceType: log.type
                }));
            if (!battles || battles.length === 0) {
                battles = this._buildCombatAnalysisFromChronicle(logs);
            }
        }

        // Combinar eventos y batallas en orden cronológico
        const narrativeEventObjects = Array.isArray(narrativeEvents)
            ? narrativeEvents.map(event => {
                if (typeof event === 'string') {
                    return { type: 'event', text: event, turn: 0 };
                }
                return event;
            })
            : [];

        const allEvents = [
            ...narrativeEventObjects,
            ...battles.map(b => {
                const locationText = typeof b.location === 'string'
                    ? b.location
                    : `(${b.location?.r ?? '?'},${b.location?.c ?? '?'})`;
                const winnerName = b.winnerName || (typeof StatTracker !== 'undefined'
                    ? (StatTracker.gameStats?.players?.[b.winner]?.civilization || (b.winner ? `Jugador ${b.winner}` : 'Desconocido'))
                    : (b.winner ? `Jugador ${b.winner}` : 'Desconocido'));
                return {
                    type: 'battle',
                    text: `T${b.turn}: Batalla en ${locationText} - Ganador: ${winnerName}`,
                    turn: b.turn
                };
            })
        ]
            .sort((a, b) => a.turn - b.turn)
            .filter((event, index, array) => {
                if (!event?.text) return false;
                return array.findIndex(other => other.turn === event.turn && other.text === event.text) === index;
            });

        const totalTurns = (typeof StatTracker !== 'undefined' && StatTracker.gameStats?.currentTurn)
            ? StatTracker.gameStats.currentTurn
            : (gameState.turnNumber || 1);
        const narrative = {
            events: allEvents,
            totalTurns: totalTurns,
            summary: this._buildNarrativeSummary(allEvents, battles),
            winnerName: this._getWinnerEmpireName(),
            highlightedEvents: this._buildNarrativeHighlights(allEvents)
        };

        this.lastNarrative = narrative;
        LegacyUI.displayNarrative(narrative);
    },

    _buildNarrativeSummary: function(allEvents, battles) {
        const winner = this._getWinnerEmpireName();
        const battleCount = Array.isArray(battles) ? battles.length : 0;
        const eventCount = Array.isArray(allEvents) ? allEvents.length : 0;
        const conquestCount = allEvents.filter(event => /conquista|fronteras|ciudad/i.test(event.text || '')).length;
        const foundationCount = allEvents.filter(event => /funda|levantan|ruta de comercio/i.test(event.text || '')).length;

        if (battleCount === 0 && eventCount === 0) {
            return `${winner} consolidó su dominio en silencio, sin dejar suficientes hitos registrados para el cronista.`;
        }

        return `${winner} cerró la campaña tras ${gameState.turnNumber || 0} turnos. La guerra dejó ${battleCount} batallas memorables, ${conquestCount} avances territoriales y ${foundationCount} hitos de crecimiento que definieron el destino del imperio.`;
    },

    _buildNarrativeHighlights: function(allEvents) {
        return (allEvents || [])
            .filter(event => event && event.text)
            .filter(event => /⚔️|💥|☠️|🏛️|🛤️|👑|conquista|batalla|ciudad|ruta/i.test(event.text))
            .slice(0, 6);
    },

    _getWinnerEmpireName: function() {
        const winnerId = gameState?.winner;
        const civKey = gameState?.playerCivilizations?.[winnerId];
        return CIVILIZATIONS?.[civKey]?.name || (winnerId ? `Jugador ${winnerId}` : 'Imperio vencedor');
    },

    exportNarrativePoster: function() {
        const narrative = this.lastNarrative || { events: [], summary: 'Sin resumen disponible.', totalTurns: gameState?.turnNumber || 0, highlightedEvents: [] };
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const winnerName = narrative.winnerName || this._getWinnerEmpireName();
        const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bg.addColorStop(0, '#24170e');
        bg.addColorStop(0.45, '#3a2718');
        bg.addColorStop(1, '#16100a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 6;
        ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

        ctx.fillStyle = '#f2d3ac';
        ctx.font = 'bold 54px Georgia';
        ctx.fillText('La Cronica del Imperio', 70, 95);
        ctx.font = '28px Georgia';
        ctx.fillStyle = '#d4a574';
        ctx.fillText(`${winnerName} • ${narrative.totalTurns || 0} turnos`, 72, 138);

        // Panel del mapa final
        const mapX = 70;
        const mapY = 180;
        const mapW = 620;
        const mapH = 520;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(mapX, mapY, mapW, mapH);
        ctx.strokeStyle = 'rgba(212,165,116,0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY, mapW, mapH);
        ctx.fillStyle = '#f2d3ac';
        ctx.font = 'bold 24px Georgia';
        ctx.fillText('Mapa Final del Reino', mapX + 20, mapY + 36);

        const rows = board?.length || 0;
        const cols = board?.[0]?.length || 0;
        const cellSize = Math.max(8, Math.min(18, Math.floor(Math.min((mapW - 40) / Math.max(1, cols), (mapH - 80) / Math.max(1, rows)))));
        const gridX = mapX + 20;
        const gridY = mapY + 60;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hex = board[r]?.[c];
                const owner = hex?.owner;
                let color = '#3a332c';
                if (owner) color = this._getPlayerColor(owner);
                if (hex?.terrain === 'water') color = '#2c5d8a';
                if (owner === BARBARIAN_PLAYER_ID) color = '#8a6a43';
                ctx.fillStyle = color;
                ctx.fillRect(gridX + c * cellSize, gridY + r * cellSize, cellSize - 1, cellSize - 1);
                if (hex?.isCity) {
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.fillRect(gridX + c * cellSize + Math.max(1, cellSize / 4), gridY + r * cellSize + Math.max(1, cellSize / 4), Math.max(2, cellSize / 2), Math.max(2, cellSize / 2));
                }
            }
        }

        // Resumen y hitos
        const textX = 760;
        const textY = 190;
        const textW = 760;
        ctx.fillStyle = '#f2d3ac';
        ctx.font = 'bold 26px Georgia';
        ctx.fillText('Resumen de la Campana', textX, textY);
        ctx.font = '22px Georgia';
        this._wrapCanvasText(ctx, narrative.summary || 'Sin resumen disponible.', textX, textY + 50, textW, 34);

        ctx.font = 'bold 24px Georgia';
        ctx.fillText('Hitos Epicos', textX, 430);
        ctx.font = '20px Georgia';
        const highlights = (narrative.highlightedEvents || []).length > 0 ? narrative.highlightedEvents : (narrative.events || []).slice(0, 6);
        highlights.forEach((event, index) => {
            this._wrapCanvasText(ctx, `${index + 1}. ${event.text}`, textX, 475 + index * 58, textW, 28);
        });

        ctx.font = '18px Georgia';
        ctx.fillStyle = '#d4a574';
        ctx.fillText(`Exportado desde Iberion • ${new Date().toLocaleDateString()}`, textX, 840);

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `cronica_final_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (typeof logMessage === 'function') {
            logMessage('La Foto del Mapa Final ha sido exportada.', 'success');
        }
    },

    _wrapCanvasText: function(ctx, text, x, y, maxWidth, lineHeight) {
        const words = String(text || '').split(/\s+/);
        let line = '';
        let currentY = y;
        words.forEach(word => {
            const testLine = line ? `${line} ${word}` : word;
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line, x, currentY);
                line = word;
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        });
        if (line) ctx.fillText(line, x, currentY);
        return currentY;
    },

    /**
     * PESTAÑA 4: ANÁLISIS DE COMBATE
     */
    _updateCombatLog: function() {
        let battles = (typeof StatTracker !== 'undefined' && StatTracker.getRecentBattles)
            ? StatTracker.getRecentBattles(10)
            : [];
        let combatAnalysis = [];

        if (battles && battles.length > 0) {
            combatAnalysis = battles.map(b => ({
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
        } else if (typeof Chronicle !== 'undefined') {
            const logs = Chronicle.getLogs ? Chronicle.getLogs() : (Chronicle.currentMatchLogs || []);
            combatAnalysis = this._buildCombatAnalysisFromChronicle(logs).slice(0, 10);
        }

        LegacyUI.displayCombatLog(combatAnalysis);
    },

    _buildCombatAnalysisFromChronicle: function(logs) {
        if (!Array.isArray(logs)) return [];
        return logs
            .filter(log => log && log.type === 'battle_start')
            .map(log => {
                const attacker = log.data?.attacker || {};
                const defender = log.data?.defender || {};
                const location = { r: defender.r ?? log.data?.toR, c: defender.c ?? log.data?.toC };
                const terrainType = board?.[location.r]?.[location.c]?.terrain?.type || board?.[location.r]?.[location.c]?.terrain || 'Desconocido';

                return {
                    turn: log.turn || 0,
                    attackerId: attacker.player,
                    attackerName: attacker.name || (attacker.player ? `Jugador ${attacker.player}` : 'Desconocido'),
                    defenderId: defender.player,
                    defenderName: defender.name || (defender.player ? `Jugador ${defender.player}` : 'Desconocido'),
                    location: `(${location.r ?? '?'}, ${location.c ?? '?'})`,
                    terrain: terrainType,
                    winner: null,
                    winnerName: 'Desconocido',
                    attackerLosses: 0,
                    defenderLosses: 0,
                    terrainBonus: this._calculateTerrainBonus(terrainType)
                };
            });
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
