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
            
            console.log(`[ReplayStorage] Tamaño del timeline comprimido: ${compressedTimeline.length} bytes`);
            
            // Asegurar que metadata es un string compacto
            const metadataStr = typeof replayData.metadata === 'string' 
                ? replayData.metadata 
                : JSON.stringify(replayData.metadata);

            // Truncar a 255 caracteres si es necesario
            const truncatedMetadata = metadataStr.substring(0, 255);
            
            console.log(`[ReplayStorage] Tamaño de metadata: ${truncatedMetadata.length} bytes`);

            const { data, error } = await supabaseClient
                .from('game_replays')
                .insert([{
                    match_id: replayData.match_id,
                    user_id: PlayerDataManager.currentPlayer.auth_id,
                    metadata: truncatedMetadata,
                    timeline_compressed: compressedTimeline,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error('[ReplayStorage] Error guardando replay:', error);
                console.error('[ReplayStorage] Detalles:', error.details, error.message);
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
     * Comprime timeline de forma muy eficiente
     * Usa representación minimalista para reducir tamaño al máximo
     */
    compressTimeline: function(timeline) {
        try {
            // Crear representación ultra-compacta del timeline
            // Usar solo los datos absolutamente necesarios
            const compact = timeline.map(event => [
                event.turn,                    // 0: turn
                event.action,                  // 1: action
                event.player,                  // 2: player
                event.data ? [                 // 3: data (array compacto)
                    event.data.from_r,
                    event.data.from_c,
                    event.data.to_r,
                    event.data.to_c,
                    event.data.unit_id,
                    event.data.damage_dealt
                ] : null
            ]);
            
            // Serializar a JSON lo más compacto posible
            const json = JSON.stringify(compact);
            
            // Si sigue siendo muy largo, dividir en fragmentos
            if (json.length > 240) {
                // Limitar a un máximo de eventos
                const maxEvents = Math.min(timeline.length, Math.floor(240 / 15)); // ~15 bytes por evento
                const limited = timeline.slice(0, maxEvents);
                const limitedCompact = limited.map(event => [
                    event.turn,
                    event.action,
                    event.player
                ]);
                
                console.warn(`[ReplayStorage] Timeline muy grande (${json.length} bytes), limitando a ${maxEvents} eventos`);
                return JSON.stringify(limitedCompact);
            }
            
            return json;
        } catch (err) {
            console.error('[ReplayStorage] Error comprimiendo timeline:', err);
            return '[]';
        }
    },

    /**
     * Descomprime timeline
     */
    decompressTimeline: function(compressed) {
        try {
            const compact = JSON.parse(compressed);
            
            // Expandir de vuelta a formato normal
            return compact.map(e => ({
                turn: e[0],
                action: e[1],
                player: e[2],
                data: e[3] ? {
                    from_r: e[3][0],
                    from_c: e[3][1],
                    to_r: e[3][2],
                    to_c: e[3][3],
                    unit_id: e[3][4],
                    damage_dealt: e[3][5]
                } : null
            }));
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
