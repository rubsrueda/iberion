/**
 * replayApi.js
 * API endpoints y helpers para el sistema de replay/crónicas
 * Gestiona la sincronización con Supabase
 */

const ReplayAPI = {
    
    /**
     * Obtiene un replay compartido por token
     */
    getSharedReplay: async function(shareToken) {
        if (!shareToken) return null;
        
        try {
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('*')
                .eq('share_token', shareToken)
                .single();

            if (error || !data) {
                console.error('[ReplayAPI] Error obteniendo replay compartido:', error);
                return null;
            }

            // Descomprimir timeline
            const timeline = JSON.parse(data.timeline_compressed);

            return {
                match_id: data.match_id,
                metadata: data.metadata,
                timeline: timeline,
                share_token: data.share_token
            };
        } catch (err) {
            console.error('[ReplayAPI] Excepción:', err);
            return null;
        }
    },

    /**
     * Genera un token de compartir para un replay
     */
    generateShareToken: async function(matchId, replayId) {
        if (!PlayerDataManager.currentPlayer) return null;

        try {
            // Generar token único y seguro
            const token = `replay_${replayId}_${crypto.getRandomValues(new Uint8Array(8)).join('')}_${Date.now()}`;

            const { data, error } = await supabaseClient
                .from('game_replays')
                .update({ 
                    share_token: token,
                    updated_at: new Date().toISOString()
                })
                .eq('match_id', matchId)
                .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
                .select('share_token');

            if (error) {
                console.error('[ReplayAPI] Error generando token:', error);
                return null;
            }

            console.log('[ReplayAPI] Token generado:', token);
            return token;
        } catch (err) {
            console.error('[ReplayAPI] Excepción:', err);
            return null;
        }
    },

    /**
     * Obtiene el URL de compartir para un replay
     */
    getShareUrl: function(shareToken) {
        if (!shareToken) return null;
        const baseUrl = window.location.origin;
        return `${baseUrl}/?replay=${shareToken}`;
    },

    /**
     * Copia el enlace de compartir al portapapeles
     */
    copyShareLink: async function(shareToken) {
        const url = this.getShareUrl(shareToken);
        if (!url) return false;

        try {
            await navigator.clipboard.writeText(url);
            console.log('[ReplayAPI] Enlace copiado al portapapeles');
            return true;
        } catch (err) {
            console.error('[ReplayAPI] Error al copiar:', err);
            return false;
        }
    },

    /**
     * Obtiene la lista de replays públicos (últimos 10)
     */
    getPublicReplays: async function(limit = 10) {
        try {
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('match_id, metadata, created_at, share_token')
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[ReplayAPI] Error obteniendo replays públicos:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[ReplayAPI] Excepción:', err);
            return [];
        }
    },

    /**
     * Marca un replay como público para que otros lo puedan ver
     */
    makeReplayPublic: async function(matchId) {
        if (!PlayerDataManager.currentPlayer) return false;

        try {
            const { error } = await supabaseClient
                .from('game_replays')
                .update({ is_public: true })
                .eq('match_id', matchId)
                .eq('user_id', PlayerDataManager.currentPlayer.auth_id);

            if (error) {
                console.error('[ReplayAPI] Error haciendo replay público:', error);
                return false;
            }

            console.log('[ReplayAPI] Replay marcado como público');
            return true;
        } catch (err) {
            console.error('[ReplayAPI] Excepción:', err);
            return false;
        }
    },

    /**
     * Obtiene la lista de replays del usuario actual
     */
    getUserReplays: async function(limit = 20) {
        if (!PlayerDataManager.currentPlayer) return [];

        try {
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('match_id, metadata, created_at, share_token, is_public')
                .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[ReplayAPI] Error obteniendo replays del usuario:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[ReplayAPI] Excepción:', err);
            return [];
        }
    },

    /**
     * Elimina un replay
     */
    deleteReplay: async function(matchId) {
        if (!PlayerDataManager.currentPlayer) return false;

        try {
            const { error } = await supabaseClient
                .from('game_replays')
                .delete()
                .eq('match_id', matchId)
                .eq('user_id', PlayerDataManager.currentPlayer.auth_id);

            if (error) {
                console.error('[ReplayAPI] Error eliminando replay:', error);
                return false;
            }

            console.log('[ReplayAPI] Replay eliminado');
            return true;
        } catch (err) {
            console.error('[ReplayAPI] Excepción:', err);
            return false;
        }
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ReplayAPI = ReplayAPI;
}
