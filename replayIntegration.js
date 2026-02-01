/**
 * replayIntegration.js
 * Integración no invasiva de ReplayEngine con el gameFlow existente
 * Inyecta llamadas de captura sin modificar el código principal
 */

const ReplayIntegration = {
    initialized: false,
    originalFunctions: {},

    /**
     * Inicializa los hooks de integración
     */
    initialize: function() {
        if (this.initialized) return;

        console.log('[ReplayIntegration] Inicializando hooks de captura...');

        // Guardar referencias a funciones originales
        this.originalFunctions = {
            handleEndTurn: window.handleEndTurn,
            endTacticalBattle: window.endTacticalBattle,
            simulateBattle: window.simulateBattle,
        };

        // No hacemos wrapper ya que es invasivo. En su lugar,
        // llamaremos a ReplayEngine directamente desde los puntos clave
        this.initialized = true;
    },

    /**
     * Inicia el registro de una partida
     */
    startGameRecording: function(matchId, mapSeed, playersInfo) {
        if (typeof ReplayEngine !== 'undefined') {
            ReplayEngine.initialize(matchId, mapSeed, playersInfo);
            console.log('[ReplayIntegration] Grabación iniciada para:', matchId);
        }
    },

    /**
     * Registra un movimiento de unidad
     */
    recordUnitMove: function(unitId, unitName, playerId, fromR, fromC, toR, toC) {
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            ReplayEngine.recordMove(unitId, unitName, playerId, fromR, fromC, toR, toC);
        }
    },

    /**
     * Registra un ataque/batalla
     */
    recordBattle: function(attackerId, attackerName, defenderId, defenderName, location, winner, terrain, casualties) {
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            ReplayEngine.recordBattle(attackerId, attackerName, defenderId, defenderName, location, winner, terrain, casualties);
        }
    },

    /**
     * Registra una construcción
     */
    recordBuild: function(structureType, r, c, playerId, playerName) {
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            ReplayEngine.recordBuild(structureType, r, c, playerId, playerName);
        }
    },

    /**
     * Registra una muerte de unidad
     */
    recordUnitDeath: function(unitId, unitName, playerId, location) {
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            ReplayEngine.recordUnitDeath(unitId, unitName, playerId, location);
        }
    },

    /**
     * Registra una conquista de territorio
     */
    recordConquest: function(r, c, playerId, playerName) {
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            ReplayEngine.recordConquest(r, c, playerId, playerName);
        }
    },

    /**
     * Registra el fin de turno
     */
    recordTurnEnd: function(turnNumber, currentPlayer) {
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            ReplayEngine.recordTurnEnd(turnNumber, currentPlayer);
        }
    },

    /**
     * Finaliza la grabación al terminar la partida
     */
    finishGameRecording: async function(winner, totalTurns) {
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            const replayData = ReplayEngine.finalize(winner, totalTurns);
            
            // Guardar en Supabase
            if (typeof ReplayStorage !== 'undefined') {
                const saved = await ReplayStorage.saveReplay(replayData);
                if (saved) {
                    console.log('[ReplayIntegration] Replay guardado en Supabase');
                    return replayData;
                }
            }
        }
        return null;
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ReplayIntegration = ReplayIntegration;
}
