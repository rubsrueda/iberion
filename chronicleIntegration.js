/**
 * chronicleIntegration.js
 * Integración entre replays (game_replays) y crónicas históricas (match_history)
 * Proporciona una vista unificada de todas las partidas del jugador
 */

const ChronicleIntegration = {
    
    /**
     * Carga replays de la base de datos y los muestra en el códice
     */
    async loadReplaysIntoCodex() {
        const player = PlayerDataManager.currentPlayer;
        if (!player || !player.auth_id) {
            console.warn('[ChronicleIntegration] No hay jugador autenticado');
            return [];
        }

        try {
            // Cargar replays desde game_replays
            const replays = await ReplayStorage.getUserReplays();
            console.log('[ChronicleIntegration] Replays cargados:', replays.length);
            
            return replays;
        } catch (error) {
            console.error('[ChronicleIntegration] Error cargando replays:', error);
            return [];
        }
    },

    /**
     * Muestra replays en el modal de Crónicas Históricas
     */
    async showReplaysInCodexModal() {
        const modal = document.getElementById('fullCodexModal');
        const listContainer = document.getElementById('fullCodexList');

        if (!modal || !listContainer) {
            console.error('[ChronicleIntegration] Elementos del modal no encontrados');
            return;
        }

        modal.style.display = 'flex';
        listContainer.innerHTML = '<p style="text-align:center; color:#ffd700;">📜 Cargando crónicas de batalla...</p>';

        // Cargar datos
        const replays = await this.loadReplaysIntoCodex();
        console.log('[ChronicleIntegration] showReplaysInCodexModal - Replays cargados:', replays.length);

        if (!replays || replays.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; opacity:0.7; padding: 20px;">
                    <p>📜 No hay crónicas registradas aún.</p>
                    <p style="font-size: 12px; opacity: 0.6;">Completa una batalla para generar tu primera crónica.</p>
                    <p style="font-size: 11px; opacity: 0.4;">Debug: Buscar en localStorage...</p>
                    <script>
                        try {
                            const local = JSON.parse(localStorage.getItem('localReplays') || '[]');
                            console.log('LocalReplays encontrados:', local.length);
                        } catch(e) {
                            console.error('Error accediendo localStorage:', e);
                        }
                    </script>
                </div>
            `;
            return;
        }

        // Renderizar lista
        listContainer.innerHTML = replays.map((replay, index) => {
            const metadata = typeof replay.metadata === 'string' ? JSON.parse(replay.metadata) : replay.metadata;
            const date = new Date(replay.created_at);
            const winner = metadata.w || metadata.winner || '?';
            const numTurns = metadata.t || metadata.numTurns || '?';
            const shareToken = replay.share_token || '';
            
            return `
                <div style="
                    background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2));
                    margin-bottom: 12px;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #00f3ff;
                    transition: all 0.2s;
                ">
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong style="color: #00f3ff; font-size: 14px;">
                            🎖️ Batalla #${replay.match_id.substring(0, 8)}
                        </strong>
                        <span style="color: #aaa; font-size: 11px;">
                            ${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #ccc; margin-bottom: 8px;">
                        <span>⚔️ Ganador: J${winner}</span>
                        <span>🔄 Turnos: ${numTurns}</span>
                    </div>

                    <div style="display: flex; gap: 8px; font-size: 11px;">
                        <button onclick="event.stopPropagation(); ChronicleIntegration.openReplay('${replay.match_id}')" 
                            style="flex: 1; padding: 6px; background: #00897b; color: #fff; border: 1px solid #00897b; border-radius: 4px; cursor: pointer;">
                            ▶️ VER
                        </button>
                        ${shareToken ? `
                        <button onclick="event.stopPropagation(); ChronicleIntegration.copyShareLink('${shareToken}')" 
                            style="flex: 1; padding: 6px; background: #ff6f00; color: #fff; border: 1px solid #ff6f00; border-radius: 4px; cursor: pointer;">
                            🔗 COMPARTIR
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Abre el visor de replay para una partida específica
     */
    async openReplay(matchId) {
        console.log('[ChronicleIntegration] Abriendo replay:', matchId);
        
        try {
            // Cargar datos del replay
            const replayData = await ReplayStorage.loadReplay(matchId);
            
            if (!replayData) {
                alert('No se pudo cargar la crónica de batalla.');
                return;
            }

            // Asegurar que tiene share_token (en caso de ser local)
            if (!replayData.share_token) {
                replayData.share_token = `replay_${replayData.match_id}_${crypto.getRandomValues(new Uint8Array(8)).join('')}`;
                console.log('[ChronicleIntegration] Share token generado dinámicamente:', replayData.share_token);
            }

            console.log('[ChronicleIntegration] ReplayData:', {
                match_id: replayData.match_id,
                share_token: replayData.share_token,
                timeline_events: replayData.timeline?.length,
                chronicle_logs: replayData.chronicle_logs?.length
            });

            // Cerrar modal de códice
            const codeModal = document.getElementById('fullCodexModal');
            if (codeModal) codeModal.style.display = 'none';

            // Abrir visor de replay
            if (typeof ReplayUI !== 'undefined') {
                // TODO: Necesitamos boardData para renderizar
                // Por ahora, solo abrimos el modal con los eventos
                ReplayUI.openReplayModal(replayData, null);
            } else {
                alert('Sistema de visualización de replays no disponible.');
            }

        } catch (error) {
            console.error('[ChronicleIntegration] Error abriendo replay:', error);
            alert('Error al abrir la crónica.');
        }
    },

    /**
     * Guarda link de replay al finalizar partida
     */
    async saveReplayLink(matchId, replayData) {
        console.log('[ChronicleIntegration] Guardando link de replay:', matchId);
        
        // Guardar en match_history también (para compatibilidad)
        if (PlayerDataManager.currentPlayer && supabaseClient) {
            try {
                const metadata = typeof replayData.metadata === 'string' 
                    ? JSON.parse(replayData.metadata) 
                    : replayData.metadata;

                await supabaseClient
                    .from('match_history')
                    .insert({
                        player_id: PlayerDataManager.currentPlayer.auth_id,
                        match_id: matchId,
                        outcome: metadata.winner === gameState.myPlayerNumber ? 'victoria' : 'derrota',
                        turns_played: metadata.numTurns || gameState.turnNumber,
                        xp_gained: 100, // Calcular según resultado
                        created_at: new Date().toISOString()
                    });

                console.log('[ChronicleIntegration] Link guardado en match_history');
            } catch (error) {
                console.warn('[ChronicleIntegration] Error guardando en match_history:', error);
            }
        }
    },

    /**
     * Muestra notificación con link al replay después de terminar partida
     */
    showReplayNotification(matchId) {
        console.log('[ChronicleIntegration] Mostrando notificación de replay:', matchId);
        // TODO: Mostrar toast/notificación
    },

    /**
     * Copia el link de compartir al portapapeles
     */
    async copyShareLink(shareToken) {
        if (!shareToken) {
            logMessage('No hay link disponible para compartir.', 'error');
            return;
        }

        try {
            const baseUrl = window.location.origin;
            const pathName = window.location.pathname.split('/').filter(p => p).slice(0, -1).join('/');
            const shareUrl = `${baseUrl}/${pathName}/?replay=${shareToken}`;

            await navigator.clipboard.writeText(shareUrl);
            logMessage('🔗 Link copiado al portapapeles. ¡Comparte la batalla con tus amigos!', 'success');
            console.log('[ChronicleIntegration] Link copiado:', shareUrl);
        } catch (err) {
            console.error('[ChronicleIntegration] Error al copiar link:', err);
            logMessage('Error al copiar el link. Inténtalo de nuevo.', 'error');
        }
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ChronicleIntegration = ChronicleIntegration;
}
