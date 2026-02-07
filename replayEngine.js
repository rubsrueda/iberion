/**
 * replayEngine.js
 * Motor de captura y almacenamiento de eventos de replay
 * Registra todos los eventos que ocurren durante la partida sin afectar la lógica de juego
 */

const ReplayEngine = {
    isEnabled: false,
    matchId: null,
    mapSeed: null,
    players: [],
    timeline: [], // Array de eventos por turno
    currentTurnEvents: [],
    startTime: null,
    boardInfo: null, // NUEVO: Información básica del board para reconstrucción

    /**
     * Inicializa el motor de replay al comenzar una partida
     */
    initialize: function(matchId, mapSeed, playersInfo) {
        console.log('[ReplayEngine] initialize() llamado con matchId:', matchId);
        
        let safeMatchId = matchId;
        if (!safeMatchId || typeof safeMatchId !== 'string') {
            try {
                safeMatchId = `match_${crypto.randomUUID().substring(0, 8)}`;
            } catch (e) {
                safeMatchId = `match_${Date.now()}`;
            }
        }
        
        this.matchId = safeMatchId;
        this.mapSeed = mapSeed;
        this.players = playersInfo || [];
        this.timeline = [];
        this.currentTurnEvents = [];
        this.isEnabled = true;
        this.startTime = Date.now();
        
        // ⭐ NUEVO: Capturar información básica del board para poder reconstruirlo
        if (typeof board !== 'undefined' && board && board.length > 0) {
            this.boardInfo = {
                rows: board.length,
                cols: board[0]?.length || 0,
                seed: mapSeed
            };
            console.log('[ReplayEngine] BoardInfo capturado:', this.boardInfo);
        } else {
            this.boardInfo = { rows: 20, cols: 20, seed: null }; // Defaults
            console.warn('[ReplayEngine] Board no disponible, usando dimensiones por defecto');
        }
        
        console.log(`[ReplayEngine] ✅ Inicializado. isEnabled=${this.isEnabled}, matchId=${safeMatchId}, players=${this.players.length}`);
    },

    /**
     * Registra un evento de movimiento
     */
    recordMove: function(unitId, unitName, playerId, fromR, fromC, toR, toC) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'MOVE',
            unitId: unitId,
            unitName: unitName,
            playerId: playerId,
            from: [fromR, fromC],
            to: [toR, toC],
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de construcción
     */
    recordBuild: function(structureType, r, c, playerId, playerId_name) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'BUILD',
            structureType: structureType,
            location: [r, c],
            playerId: playerId,
            playerName: playerId_name,
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de batalla
     */
    recordBattle: function(attackerId, attackerName, defenderId, defenderName, location, winner, terrain, casualties) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'BATTLE',
            attackerId: attackerId,
            attackerName: attackerName,
            defenderId: defenderId,
            defenderName: defenderName,
            location: location,
            winner: winner,
            terrain: terrain,
            casualties: casualties || {},
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de muerte de unidad
     */
    recordUnitDeath: function(unitId, unitName, playerId, location) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'UNIT_DEATH',
            unitId: unitId,
            unitName: unitName,
            playerId: playerId,
            location: location,
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de conquista de territorio
     */
    recordConquest: function(r, c, playerId, playerId_name) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'CONQUEST',
            location: [r, c],
            playerId: playerId,
            playerName: playerId_name,
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de fin de turno
     */
    recordTurnEnd: function(turnNumber, currentPlayer) {
        if (!this.isEnabled) return;
        
        // ⭐ NUEVO: Capturar snapshot del board al final de cada turno
        const boardSnapshot = this._captureBoardSnapshot();
        
        // Si hay eventos en el turno actual, guardarlos
        if (this.currentTurnEvents.length > 0 || turnNumber === 1) {
            this.timeline.push({
                turn: turnNumber,
                currentPlayer: currentPlayer,
                events: [...this.currentTurnEvents],
                boardState: boardSnapshot, // ⭐ NUEVO: Estado del tablero
                timestamp: Date.now()
            });
            
            this.currentTurnEvents = [];
        }
    },

    /**
     * ⭐ NUEVO: Captura el estado actual del tablero de forma compacta
     * Solo guarda información esencial: owner, structure, isCity
     */
    _captureBoardSnapshot: function() {
        if (typeof board === 'undefined' || !board || board.length === 0) {
            return null;
        }

        const snapshot = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                if (!hex) continue;
                
                // Solo guardamos hexágonos con información relevante (optimización)
                if (hex.owner !== null || hex.structure || hex.isCity) {
                    snapshot.push({
                        r: r,
                        c: c,
                        o: hex.owner,              // owner (compacto)
                        s: hex.structure,          // structure
                        iC: hex.isCity || false,   // isCity
                        iCa: hex.isCapital || false // isCapital
                    });
                }
            }
        }
        
        return snapshot;
    },

    /**
     * Finaliza el registro al terminar la partida
     */
    finalize: function(winner, totalTurns) {
        console.log('[ReplayEngine] finalize() llamado con:', { winner, totalTurns, isEnabled: this.isEnabled });
        
        if (!this.isEnabled) {
            console.warn('[ReplayEngine] ReplayEngine NO ESTÁ HABILITADO');
            return null;
        }
        
        // ⭐ NUEVO: Capturar información de jugadores con colores
        const playersData = this._capturePlayersInfo();
        
        // Crear metadata ULTRA-MINIMALISTA para caber en VARCHAR(255)
        const metadataObj = {
            w: winner,                                          // winner_id (muy corto)
            t: totalTurns,                                      // total_turns
            d: new Date().toISOString().substring(0, 10),      // date (YYYY-MM-DD)
            m: Math.round((Date.now() - this.startTime) / 60000), // duration_minutes
            b: this.boardInfo || { rows: 20, cols: 20, seed: null }, // ⭐ boardInfo para reconstrucción
            players: playersData                                // ⭐ NUEVO: Info de jugadores
        };
        
        // Serializar metadata a string
        const metadataStr = JSON.stringify(metadataObj);
        
        console.log(`[ReplayEngine] Tamaño de metadata: ${metadataStr.length} bytes`);
        console.log(`[ReplayEngine] matchId: ${this.matchId}, timeline.length: ${this.timeline.length}`);
        
        // Incluir logs de la crónica si están disponibles
        const chronicleLogs = (typeof Chronicle !== 'undefined' && Chronicle.getLogs) ? Chronicle.getLogs() : [];
        
        const replayData = {
            match_id: this.matchId,
            metadata: metadataStr,  // Guardar como STRING, no como objeto
            timeline: this.timeline,
            chronicle_logs: chronicleLogs  // Incluir crónica para referencia
        };
        
        console.log(`[ReplayEngine] ✅ Replay finalizado: ${this.timeline.length} turnos registrados, ${chronicleLogs.length} eventos en crónica`);
        console.log('[ReplayEngine] replayData completo:', replayData);
        
        this.isEnabled = false;
        return replayData;
    },

    /**
     * ⭐ NUEVO: Captura información de jugadores (nombre, color, civilización)
     */
    _capturePlayersInfo: function() {
        if (typeof gameState === 'undefined' || !gameState) {
            return [];
        }

        const playersInfo = [];
        const numPlayers = gameState.numPlayers || 2;
        
        for (let i = 1; i <= numPlayers; i++) {
            const civilizationKey = gameState.playerCivilizations?.[`player${i}`];
            const civilization = typeof CIVILIZATIONS !== 'undefined' && civilizationKey
                ? CIVILIZATIONS[civilizationKey]
                : null;
            
            playersInfo.push({
                id: i,
                player_number: i,
                name: `Jugador ${i}`,
                civilization: civilizationKey || 'Unknown',
                color: this._getPlayerColor(i) // Helper para obtener color
            });
        }
        
        return playersInfo;
    },

    /**
     * ⭐ NUEVO: Obtiene el color de un jugador
     */
    _getPlayerColor: function(playerNumber) {
        // Colores por defecto del juego
        const defaultColors = {
            1: '#ff6b6b',  // Rojo
            2: '#4ecdc4',  // Cian
            3: '#45b7d1',  // Azul
            4: '#f9ca24',  // Amarillo
            5: '#ff9ff3',  // Rosa
            6: '#95e1d3',  // Verde agua
            7: '#feca57',  // Naranja
            8: '#a29bfe'   // Violeta
        };
        
        return defaultColors[playerNumber] || '#ffffff';
    },

    /**
     * Obtiene el estado actual del replay
     */
    getState: function() {
        return {
            matchId: this.matchId,
            turnsRecorded: this.timeline.length,
            eventsInCurrentTurn: this.currentTurnEvents.length,
            isEnabled: this.isEnabled
        };
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ReplayEngine = ReplayEngine;
}
