/**
 * replayStorage.js
 * Gestor de almacenamiento de replays en Supabase
 * Maneja guardado, carga y sincronización con BD
 */

const ReplayStorage = {

    /**
     * Guarda un replay completo en Supabase
     */
    saveReplay: async function(replayData) {
        if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
            console.warn('[ReplayStorage] No autenticado, no se guardará replay');
            return false;
        }

        try {
            // Comprimir datos antes de guardar
            const compressedTimeline = this.compressTimeline(replayData.timeline);

            const { data, error } = await supabaseClient
                .from('game_replays')
                .insert([{
                    match_id: replayData.match_id,
                    user_id: PlayerDataManager.currentPlayer.auth_id,
                    metadata: replayData.metadata,
                    timeline_compressed: compressedTimeline,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error('[ReplayStorage] Error guardando replay:', error);
                return false;
            }

            console.log(`[ReplayStorage] Replay ${replayData.match_id} guardado exitosamente`);
            return true;

        } catch (err) {
            console.error('[ReplayStorage] Excepción:', err);
            return false;
        }
    },

    /**
     * Carga un replay desde Supabase
     */
    loadReplay: async function(replayId) {
        try {
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('*')
                .eq('match_id', replayId)
                .single();

            if (error) {
                console.error('[ReplayStorage] Error cargando replay:', error);
                return null;
            }

            // Descomprimir timeline
            const timeline = this.decompressTimeline(data.timeline_compressed);

            return {
                match_id: data.match_id,
                metadata: data.metadata,
                timeline: timeline
            };

        } catch (err) {
            console.error('[ReplayStorage] Excepción:', err);
            return null;
        }
    },

    /**
     * Obtiene lista de replays del usuario actual
     */
    getUserReplays: async function() {
        if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
            return [];
        }

        try {
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('match_id, metadata, created_at')
                .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ReplayStorage] Error obteniendo replays:', error);
                return [];
            }

            return data || [];

        } catch (err) {
            console.error('[ReplayStorage] Excepción:', err);
            return [];
        }
    },

    /**
     * Genera un token único para compartir
     */
    generateShareToken: async function(replayId) {
        if (!PlayerDataManager.currentPlayer) return null;

        try {
            const token = `${replayId}_${crypto.getRandomValues(new Uint8Array(8)).join('')}`;

            const { error } = await supabaseClient
                .from('game_replays')
                .update({ share_token: token })
                .eq('match_id', replayId);

            if (error) {
                console.error('[ReplayStorage] Error generando token:', error);
                return null;
            }

            return token;

        } catch (err) {
            console.error('[ReplayStorage] Excepción:', err);
            return null;
        }
    },

    /**
     * Carga un replay compartido por token
     */
    loadSharedReplay: async function(token) {
        try {
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('*')
                .eq('share_token', token)
                .single();

            if (error || !data) {
                console.error('[ReplayStorage] Replay compartido no encontrado');
                return null;
            }

            const timeline = this.decompressTimeline(data.timeline_compressed);

            return {
                match_id: data.match_id,
                metadata: data.metadata,
                timeline: timeline
            };

        } catch (err) {
            console.error('[ReplayStorage] Excepción:', err);
            return null;
        }
    },

    /**
     * Comprime timeline con LZ (simple RLE para demostración)
     * En producción usar lz-string o similar
     */
    compressTimeline: function(timeline) {
        // Por ahora, guardar como JSON normal
        // TODO: Implementar compresión real con lz-string
        return JSON.stringify(timeline);
    },

    /**
     * Descomprime timeline
     */
    decompressTimeline: function(compressed) {
        try {
            return JSON.parse(compressed);
        } catch (err) {
            console.error('[ReplayStorage] Error descomprimiendo:', err);
            return [];
        }
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ReplayStorage = ReplayStorage;
}
