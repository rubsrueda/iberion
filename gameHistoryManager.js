/**
 * gameHistoryManager.js
 * Gestor del Historial de Partidas Guardadas
 * Permite listar, ver detalles y acceder a crónicas/replays
 */

const GameHistoryManager = {
    isOpen: false,
    selectedGame: null,
    games: [],

    /**
     * Carga el historial de partidas del jugador
     */
    async loadHistory() {
        if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
            console.warn('[GameHistoryManager] No autenticado');
            return [];
        }

        try {
            // Obtener replays guardados
            const replays = await ReplayStorage.getUserReplays();
            
            // Procesar y enriquecer datos
            this.games = replays.map((replay, idx) => {
                let metadata = {};
                try {
                    metadata = JSON.parse(replay.metadata);
                } catch (e) {
                    metadata = { w: '?', t: '?', d: '?', m: '?' };
                }

                return {
                    id: replay.match_id,
                    matchId: replay.match_id,
                    winner: metadata.w,
                    totalTurns: metadata.t,
                    date: metadata.d || replay.created_at?.substring(0, 10),
                    duration: `${metadata.m || '?'} min`,
                    createdAt: replay.created_at,
                    hasReplay: true,
                    index: idx
                };
            });

            return this.games;

        } catch (err) {
            console.error('[GameHistoryManager] Error cargando historial:', err);
            return [];
        }
    },

    /**
     * Abre el modal de historial
     */
    open: async function() {
        this.isOpen = true;
        
        if (typeof GameHistoryUI !== 'undefined') {
            GameHistoryUI.showModal();
            
            // Cargar datos
            await this.loadHistory();
            GameHistoryUI.displayGamesList(this.games);
        }
    },

    /**
     * Cierra el modal
     */
    close: function() {
        this.isOpen = false;
        if (typeof GameHistoryUI !== 'undefined' && GameHistoryUI.modalElement) {
            GameHistoryUI.modalElement.style.display = 'none';
            GameHistoryUI.isVisible = false;
        }
    },

    /**
     * Obtiene detalles de una partida
     */
    getGameDetails: function(gameIndex) {
        if (gameIndex < 0 || gameIndex >= this.games.length) return null;
        return this.games[gameIndex];
    },

    /**
     * Abre la crónica de una partida
     */
    async openGameLegacy(gameIndex) {
        const game = this.getGameDetails(gameIndex);
        if (!game) return;

        if (typeof ChronicleIntegration !== 'undefined') {
            await ChronicleIntegration.openReplay(game.matchId);
            return;
        }

        if (typeof ReplayStorage !== 'undefined' && typeof ReplayUI !== 'undefined') {
            const replayData = await ReplayStorage.loadReplay(game.matchId);
            if (!replayData) {
                alert('No se pudo cargar la crónica de batalla.');
                return;
            }
            ReplayUI.openReplayModal(replayData, null);
            return;
        }

        if (typeof GameHistoryUI !== 'undefined') {
            GameHistoryUI.showGameDetails(game);
        }
    },

    /**
     * Descarga/Comparte un replay
     */
    async shareReplay(gameIndex) {
        const game = this.getGameDetails(gameIndex);
        if (!game) return;
        
        // Generar token de compartición
        if (typeof ReplayStorage !== 'undefined') {
            const token = await ReplayStorage.generateShareToken(game.matchId);
            if (token) {
                const baseUrl = window.location.origin;
                const pathName = window.location.pathname.split('/').filter(p => p).slice(0, -1).join('/');
                const normalizedPath = pathName ? `/${pathName}` : '';
                const shareUrl = `${baseUrl}${normalizedPath}/?replay=${token}`;
                return shareUrl;
            }
        }
    },

    /**
     * Elimina una partida del historial
     * CORREGIDO: Ahora elimina correctamente de localStorage y Supabase
     */
    async deleteGame(gameIndex) {
        const game = this.getGameDetails(gameIndex);
        if (!game) return false;

        if (!confirm(`¿Eliminar partida del ${game.date}?`)) return false;

        try {
            if (typeof ReplayStorage !== 'undefined' && ReplayStorage.deleteReplay) {
                // Usar la nueva función de eliminación
                const success = await ReplayStorage.deleteReplay(game.matchId);
                
                if (success) {
                    // Eliminar del array en memoria
                    this.games.splice(gameIndex, 1);
                    return true;
                } else {
                    console.error('[GameHistoryManager] No se pudo eliminar la partida');
                    alert('Error al eliminar la partida. Intenta de nuevo.');
                    return false;
                }
            } else {
                console.error('[GameHistoryManager] ReplayStorage.deleteReplay no disponible');
                alert('Error: Sistema de eliminación no disponible.');
                return false;
            }
        } catch (err) {
            console.error('[GameHistoryManager] Error eliminando:', err);
            alert('Error al eliminar: ' + err.message);
            return false;
        }
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.GameHistoryManager = GameHistoryManager;
}
