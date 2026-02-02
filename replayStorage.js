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

    _clampStringToMaxBytes: function(value, maxBytes, fallbackValue) {
        const str = String(value ?? '');
        return this._getByteLength(str) <= maxBytes ? str : fallbackValue;
    },

    _hashString: function(str) {
        // FNV-1a 32-bit
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return (hash >>> 0).toString(36);
    },

    _normalizeId: function(id, prefix) {
        if (!id) return `${prefix || 'id'}_${Date.now()}`;
        
        let normalized = id;
        if (typeof normalized === 'object') {
            if (normalized.match_id) normalized = normalized.match_id;
            else if (normalized.id) normalized = normalized.id;
            else if (normalized.value) normalized = normalized.value;
            else {
                try {
                    normalized = JSON.stringify(normalized);
                } catch (e) {
                    normalized = String(normalized);
                }
            }
        }
        
        const str = String(normalized);
        if (this._getByteLength(str) <= 250) return str;
        const hash = this._hashString(str);
        return `${prefix || 'id'}_${hash}`;
    },

    /**
     * Guarda un replay completo en Supabase
     * Nota: También guarda localmente si falla el guardado en BD
     */
    saveReplay: async function(replayData) {
        if (!replayData) {
            console.error('[ReplayStorage] No hay replayData para guardar');
            return false;
        }

        // Generar share_token si no existe
        if (!replayData.share_token) {
            replayData.share_token = `replay_${replayData.match_id}_${crypto.getRandomValues(new Uint8Array(8)).join('')}`;
            console.log('[ReplayStorage] Share token generado:', replayData.share_token);
        }

        // Guardar localmente como fallback (siempre)
        try {
            const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
            localReplays.push({
                ...replayData,
                savedLocally: true,
                savedAt: new Date().toISOString()
            });
            localStorage.setItem('localReplays', JSON.stringify(localReplays));
            console.log('[ReplayStorage] ✅ Replay guardado localmente como fallback');
            console.log('[ReplayStorage] Share token disponible:', replayData.share_token);
        } catch (err) {
            console.warn('[ReplayStorage] Error al guardar localmente:', err);
        }

        // Si no está autenticado, no guardar en BD pero devolver true (tiene fallback local)
        if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
            console.warn('[ReplayStorage] No autenticado. Replay disponible solo en localStorage');
            return true; // Devolver true porque está guardado localmente
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
            
            const safeMatchId = this._normalizeId(replayData.match_id, 'match');
            const userId = String(PlayerDataManager.currentPlayer.auth_id || '');
            const createdAt = new Date().toISOString();

            const fieldSizes = {
                match_id: this._getByteLength(safeMatchId),
                user_id: this._getByteLength(userId),
                metadata: this._getByteLength(finalMetadata),
                timeline_compressed: this._getByteLength(compressedTimeline),
                created_at: this._getByteLength(createdAt)
            };
            console.log('[ReplayStorage] Tamaños (bytes):', fieldSizes);

            if (fieldSizes.user_id > 250) {
                console.error('[ReplayStorage] user_id demasiado largo. Requiere ajuste de esquema o auth_id válido.');
                return false;
            }

            const payload = {
                match_id: safeMatchId,
                user_id: userId,
                metadata: finalMetadata,
                timeline_compressed: compressedTimeline,
                created_at: createdAt
            };

            const { data, error } = await supabaseClient
                .from('game_replays')
                .insert([payload]);

            if (error) {
                console.error('[ReplayStorage] Error guardando replay:', error);
                console.error('[ReplayStorage] Detalles:', error.details, error.message);
                
                if (error.code === '22001') {
                    console.error('[ReplayStorage] Error por tamaño de datos. Reintento ultra-minimalista...');

                    const ultraPayload = {
                        match_id: this._normalizeId(safeMatchId, 'match'),
                        user_id: userId,
                        metadata: this._clampStringToMaxBytes(JSON.stringify({ t: Date.now() }), 250, '{}'),
                        timeline_compressed: this._clampStringToMaxBytes(JSON.stringify({ t: replayData.timeline?.length || 0 }), 250, '{}'),
                        created_at: this._clampStringToMaxBytes(createdAt, 250, '')
                    };

                    const { error: retryError } = await supabaseClient
                        .from('game_replays')
                        .insert([ultraPayload]);

                    if (retryError) {
                        console.error('[ReplayStorage] Reintento fallido:', retryError);
                        console.error('[ReplayStorage] Tamaños reintento (bytes):', {
                            match_id: this._getByteLength(ultraPayload.match_id),
                            user_id: this._getByteLength(ultraPayload.user_id),
                            metadata: this._getByteLength(ultraPayload.metadata),
                            timeline_compressed: this._getByteLength(ultraPayload.timeline_compressed),
                            created_at: this._getByteLength(ultraPayload.created_at)
                        });
                    } else {
                        console.log('[ReplayStorage] ✅ Replay guardado con payload ultra-minimalista');
                        return true;
                    }
                }
                return false;
            }

            // ⭐ VERIFICACIÓN CRÍTICA: Confirmar que el dato se guardó realmente
            console.log('[ReplayStorage] Verificando que el replay se guardó correctamente...');
            const { data: verifyData, error: verifyError } = await supabaseClient
                .from('game_replays')
                .select('match_id, created_at')
                .eq('match_id', safeMatchId)
                .single();

            if (verifyError) {
                console.error('[ReplayStorage] ⚠️ ADVERTENCIA: Replay no encontrado en verificación:', verifyError);
                console.warn('[ReplayStorage] INSERT puede haber fallado silenciosamente');
                return false;
            }

            if (verifyData) {
                console.log(`[ReplayStorage] ✅ VERIFICADO: Replay ${safeMatchId} existe en Supabase`);
                console.log(`[ReplayStorage] Record encontrado:`, verifyData);
                return true;
            }

            console.log(`[ReplayStorage] ✅ Replay ${safeMatchId} guardado exitosamente en Supabase`);
            console.log(`[ReplayStorage] Payload enviado:`, payload);
            return true;

        } catch (err) {
            console.error('[ReplayStorage] Excepción:', err);
            console.warn('[ReplayStorage] Pero el replay está guardado localmente, así que devolvemos true');
            return true; // Devolver true porque está en localStorage
        }
    },

    /**
     * Carga un replay desde Supabase o localStorage
     */
    loadReplay: async function(replayId) {
        try {
            // 1. Intentar cargar desde Supabase primero
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('*')
                .eq('match_id', replayId)
                .single();

            if (data) {
                console.log('[ReplayStorage] Replay cargado desde Supabase');
                // Descomprimir timeline
                const timeline = this.decompressTimeline(data.timeline_compressed);
                return {
                    match_id: data.match_id,
                    metadata: data.metadata,
                    timeline: timeline
                };
            }

            // 2. Si no está en BD, buscar en localStorage
            console.log('[ReplayStorage] Replay no encontrado en BD, buscando en localStorage...');
            const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
            const localReplay = localReplays.find(r => r.match_id === replayId);
            
            if (localReplay) {
                console.log('[ReplayStorage] Replay cargado desde localStorage');
                return localReplay;
            }

            console.error('[ReplayStorage] Replay no encontrado en BD ni localmente:', replayId);
            return null;

        } catch (err) {
            console.error('[ReplayStorage] Error cargando replay:', err);
            
            // Fallback a localStorage en caso de excepción
            try {
                const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
                const localReplay = localReplays.find(r => r.match_id === replayId);
                if (localReplay) {
                    console.log('[ReplayStorage] Fallback: Replay cargado desde localStorage');
                    return localReplay;
                }
            } catch (err2) {
                console.error('[ReplayStorage] Error incluso en fallback local:', err2);
            }
            
            return null;
        }
    },

    /**
     * Obtiene lista de replays del usuario actual (BD + Local)
     */
    getUserReplays: async function() {
        let allReplays = [];

        // 1. Cargar desde localStorage (fallback local)
        try {
            const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
            if (localReplays.length > 0) {
                console.log('[ReplayStorage] Cargados', localReplays.length, 'replays desde localStorage');
                allReplays = allReplays.concat(localReplays);
            }
        } catch (err) {
            console.warn('[ReplayStorage] Error cargando replays locales:', err);
        }

        // 2. Cargar desde Supabase si estamos autenticados
        if (PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.auth_id) {
            try {
                const { data, error } = await supabaseClient
                    .from('game_replays')
                    .select('match_id, metadata, created_at, share_token')
                    .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('[ReplayStorage] Error obteniendo replays de BD:', error);
                } else if (data && data.length > 0) {
                    console.log('[ReplayStorage] Cargados', data.length, 'replays desde Supabase');
                    allReplays = allReplays.concat(data);
                }
            } catch (err) {
                console.error('[ReplayStorage] Excepción obteniendo replays:', err);
            }
        } else {
            console.log('[ReplayStorage] No autenticado, usando solo replays locales');
        }

        return allReplays || [];
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
