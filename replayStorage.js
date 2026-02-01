/**
 * replayStorage.js
 * Gestor de almacenamiento de replays en Supabase
 * Maneja guardado, carga y sincronización con BD
 */

const ReplayStorage = {

    _getByteLength: function(str) {
        try {
            return new TextEncoder().encode(str).length;
        } catch (err) {
            return (str || '').length;
        }
    },

    _clampJsonToMax: function(json, maxBytes, fallbackJson) {
        if (this._getByteLength(json) <= maxBytes) return json;
        return fallbackJson;
    },

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
            let compressedTimeline = this.compressTimeline(replayData.timeline);
            
            console.log(`[ReplayStorage] Tamaño del timeline comprimido: ${this._getByteLength(compressedTimeline)} bytes`);
            
            // Metadata ya viene como string desde replayEngine.js
            let finalMetadata = replayData.metadata;
            if (typeof finalMetadata !== 'string') {
                finalMetadata = JSON.stringify(finalMetadata);
            }
            
            // Asegurar metadata <= 250 bytes (UTF-8)
            if (this._getByteLength(finalMetadata) > 250) {
                finalMetadata = JSON.stringify({ t: Date.now() });
            }
            
            console.log(`[ReplayStorage] Tamaño de metadata: ${finalMetadata.length} bytes`);
            
            // Validar tamaños antes de insertar
            if (this._getByteLength(compressedTimeline) > 250) {
                compressedTimeline = JSON.stringify({ t: replayData.timeline?.length || 0 });
            }
            
            const { data, error } = await supabaseClient
                .from('game_replays')
                .insert([{
                    match_id: replayData.match_id,
                    user_id: PlayerDataManager.currentPlayer.auth_id,
                    metadata: finalMetadata,
                    timeline_compressed: compressedTimeline,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error('[ReplayStorage] Error guardando replay:', error);
                console.error('[ReplayStorage] Detalles:', error.details, error.message);
                
                if (error.code === '22001') {
                    console.error('[ReplayStorage] Error por tamaño de datos. Revisa los campos de la tabla.');
                }
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
     * Obtiene una versión ultra-compacta del timeline
     * Solo guarda información crítica mínima
     */
    getUltraCompactTimeline: function(timeline) {
        try {
            // Incluir solo metadatos básicos de la partida
            const summary = {
                t: timeline.length,           // total events
                ts: Math.floor(Date.now()/1000), // timestamp
                e: timeline.slice(-5).map(e => [e.turn, e.action]) // últimos 5 eventos
            };
            return JSON.stringify(summary);
        } catch (err) {
            console.error('[ReplayStorage] Error creando ultra-compacto:', err);
            return '{}';
        }
    },

    /**
     * Comprime timeline de forma muy eficiente
     * Usa representación minimalista para reducir tamaño al máximo
     */
    compressTimeline: function(timeline) {
        try {
            const MAX_VARCHAR_LEN = 250;
            // Limitar a máximo 100 eventos para reducir tamaño
            const limited = timeline.slice(0, 100);
            
            // Crear representación ultra-compacta del timeline
            // Usar solo los datos absolutamente necesarios
            const compact = limited.map(event => [
                event.turn || 0,                    // 0: turn
                event.action || '',                 // 1: action
                event.player || 0,                  // 2: player
                event.data ? [                      // 3: data (array compacto)
                    event.data.from_r || 0,
                    event.data.from_c || 0,
                    event.data.to_r || 0,
                    event.data.to_c || 0,
                    event.data.unit_id || '',
                    event.data.damage_dealt || 0
                ] : null
            ]);
            
            // Serializar a JSON lo más compacto posible
            let json = JSON.stringify(compact);

            // Si sigue siendo muy largo después de limitar, reducir más
            if (this._getByteLength(json) > MAX_VARCHAR_LEN) {
                // Usar solo turn, action, player (sin data)
                const minimal = limited.map(event => [
                    event.turn || 0,
                    event.action || '',
                    event.player || 0
                ]);
                json = JSON.stringify(minimal);
            }

            // Si aún no cabe en VARCHAR(255), usar resumen ultra-compacto
            if (this._getByteLength(json) > MAX_VARCHAR_LEN) {
                json = this.getUltraCompactTimeline(timeline);
            }

            // Fallback extremo: solo contar eventos
            if (this._getByteLength(json) > MAX_VARCHAR_LEN) {
                json = JSON.stringify({ t: timeline.length });
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
            const data = JSON.parse(compressed);
            
            // Si es un resumen ultra-compacto (tiene 't', 'ts', 'e')
            if (data.t && data.e && !Array.isArray(data[0])) {
                // Es un resumen, retornar como está
                return data.e.map((e, i) => ({
                    turn: e[0],
                    action: e[1],
                    player: 1,
                    data: null
                }));
            }
            
            // Si el primer elemento es un array (formato compacto)
            if (Array.isArray(data[0])) {
                return data.map(e => {
                    // Si tiene 4 elementos, incluye data
                    if (e.length >= 4 && e[3]) {
                        return {
                            turn: e[0],
                            action: e[1],
                            player: e[2],
                            data: {
                                from_r: e[3][0],
                                from_c: e[3][1],
                                to_r: e[3][2],
                                to_c: e[3][3],
                                unit_id: e[3][4],
                                damage_dealt: e[3][5]
                            }
                        };
                    } else {
                        // Solo turn, action, player
                        return {
                            turn: e[0],
                            action: e[1],
                            player: e[2],
                            data: null
                        };
                    }
                });
            }
            
            // Fallback
            return [];
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
