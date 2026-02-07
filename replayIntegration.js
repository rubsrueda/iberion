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
        const normalizedMatchId = this._normalizeMatchId(matchId);
        console.log('[ReplayIntegration] startGameRecording llamado con:', { matchId: normalizedMatchId, mapSeed, playersInfoLength: playersInfo?.length });
        
        if (typeof ReplayEngine !== 'undefined') {
            ReplayEngine.initialize(normalizedMatchId, mapSeed, playersInfo);
            console.log('[ReplayIntegration] ✅ ReplayEngine.initialize() ejecutado. isEnabled:', ReplayEngine.isEnabled);
        } else {
            console.error('[ReplayIntegration] ❌ ReplayEngine NO ESTÁ DEFINIDO');
        }
    },

    /**
     * ⭐ NUEVO: Captura el estado inicial de la fase de despliegue
     * Debe llamarse cuando la fase de deployment termina y pasa a 'play'
     */
    recordDeploymentPhaseEnd: function() {
        console.log('[ReplayIntegration] recordDeploymentPhaseEnd llamado');
        
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            ReplayEngine.recordDeploymentSnapshot();
            console.log('[ReplayIntegration] ✅ Snapshot de despliegue capturado');
        } else {
            console.warn('[ReplayIntegration] ReplayEngine no está habilitado');
        }
    },

    _normalizeMatchId: function(matchId) {
        if (!matchId) return `match_${crypto.randomUUID().substring(0, 8)}`;
        if (typeof matchId === 'string') return matchId;
        if (typeof matchId === 'object') {
            if (matchId.match_id) return String(matchId.match_id);
            if (matchId.id) return String(matchId.id);
            if (matchId.value) return String(matchId.value);
            try {
                return `match_${crypto.randomUUID().substring(0, 8)}`;
            } catch (e) {
                return `match_${Date.now()}`;
            }
        }
        return String(matchId);
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
        console.log('[ReplayIntegration] finishGameRecording llamado con:', { winner, totalTurns, replayEnabled: ReplayEngine?.isEnabled });
        
        if (typeof ReplayEngine !== 'undefined' && ReplayEngine.isEnabled) {
            const replayData = ReplayEngine.finalize(winner, totalTurns);
            console.log('[ReplayIntegration] ReplayEngine finalizado. replayData:', replayData);
            
            // Guardar en Supabase
            if (typeof ReplayStorage !== 'undefined') {
                console.log('[ReplayIntegration] Llamando a ReplayStorage.saveReplay...');
                const saved = await ReplayStorage.saveReplay(replayData);
                console.log('[ReplayIntegration] saveReplay retornó:', saved);
                
                if (saved) {
                    console.log('[ReplayIntegration] ✅ Replay guardado exitosamente en Supabase');
                    return replayData;
                } else {
                    console.error('[ReplayIntegration] ❌ saveReplay retornó false');
                }
            } else {
                console.error('[ReplayIntegration] ❌ ReplayStorage NO está definido');
            }
        } else {
            console.warn('[ReplayIntegration] ReplayEngine no está habilitado o no definido');
        }
        return null;
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ReplayIntegration = ReplayIntegration;
}
