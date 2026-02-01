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

    /**
     * Inicializa el motor de replay al comenzar una partida
     */
    initialize: function(matchId, mapSeed, playersInfo) {
        console.log('[ReplayEngine] initialize() llamado con matchId:', matchId);
        
        this.matchId = matchId;
        this.mapSeed = mapSeed;
        this.players = playersInfo || [];
        this.timeline = [];
        this.currentTurnEvents = [];
        this.isEnabled = true;
        this.startTime = Date.now();
        
        console.log(`[ReplayEngine] ✅ Inicializado. isEnabled=${this.isEnabled}, matchId=${matchId}, players=${this.players.length}`);
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
        
        // Si hay eventos en el turno actual, guardarlos
        if (this.currentTurnEvents.length > 0 || turnNumber === 1) {
            this.timeline.push({
                turn: turnNumber,
                currentPlayer: currentPlayer,
                events: [...this.currentTurnEvents],
                timestamp: Date.now()
            });
            
            this.currentTurnEvents = [];
        }
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
        
        // Crear metadata ULTRA-MINIMALISTA para caber en VARCHAR(255)
        const metadataObj = {
            w: winner,                                          // winner_id (muy corto)
            t: totalTurns,                                      // total_turns
            d: new Date().toISOString().substring(0, 10),      // date (YYYY-MM-DD)
            m: Math.round((Date.now() - this.startTime) / 60000) // duration_minutes
        };
        
        // Serializar metadata a string
        const metadataStr = JSON.stringify(metadataObj);
        
        console.log(`[ReplayEngine] Tamaño de metadata: ${metadataStr.length} bytes`);
        console.log(`[ReplayEngine] matchId: ${this.matchId}, timeline.length: ${this.timeline.length}`);
        
        const replayData = {
            match_id: this.matchId,
            metadata: metadataStr,  // Guardar como STRING, no como objeto
            timeline: this.timeline
        };
        
        console.log(`[ReplayEngine] ✅ Replay finalizado: ${this.timeline.length} turnos registrados`);
        console.log('[ReplayEngine] replayData completo:', replayData);
        
        this.isEnabled = false;
        return replayData;
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
