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
            // Serializar timeline (ya no comprimimos, el campo es TEXT)
            const timelineJson = JSON.stringify(replayData.timeline);
            
            console.log(`[ReplayStorage] Tamaño del timeline: ${this._getByteLength(timelineJson)} bytes`);
            
            // Metadata ya viene como string desde replayEngine.js
            let finalMetadata = replayData.metadata;
            if (typeof finalMetadata !== 'string') {
                finalMetadata = JSON.stringify(finalMetadata);
            }
            
            console.log(`[ReplayStorage] Tamaño de metadata: ${finalMetadata.length} bytes`);
            
            const safeMatchId = this._normalizeId(replayData.match_id, 'match');
            const userId = String(PlayerDataManager.currentPlayer.auth_id || '');
            const createdAt = new Date().toISOString();

            const fieldSizes = {
                match_id: this._getByteLength(safeMatchId),
                user_id: this._getByteLength(userId),
                metadata: this._getByteLength(finalMetadata),
                timeline_compressed: this._getByteLength(timelineJson),
                created_at: this._getByteLength(createdAt)
            };
            console.log('[ReplayStorage] Tamaños (bytes):', fieldSizes);

            const payload = {
                match_id: safeMatchId,
                user_id: userId,
                metadata: finalMetadata,
                timeline_compressed: timelineJson,  // Campo TEXT puede manejar tamaño grande
                created_at: createdAt
            };

            const { data, error } = await supabaseClient
                .from('game_replays')
                .insert([payload]);

            if (error) {
                console.error('[ReplayStorage] Error guardando replay:', error);
                console.error('[ReplayStorage] Detalles:', error.details, error.message);
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
     * CORREGIDO: Elimina duplicados por match_id
     */
    getUserReplays: async function() {
        let allReplays = [];
        const seenMatchIds = new Set();

        // 1. Cargar desde Supabase primero (prioridad)
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
                    data.forEach(replay => {
                        if (!seenMatchIds.has(replay.match_id)) {
                            seenMatchIds.add(replay.match_id);
                            allReplays.push(replay);
                        }
                    });
                }
            } catch (err) {
                console.error('[ReplayStorage] Excepción obteniendo replays:', err);
            }
        } else {
            console.log('[ReplayStorage] No autenticado, usando solo replays locales');
        }

        // 2. Cargar desde localStorage (fallback local, solo si no están ya en Supabase)
        try {
            const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
            if (localReplays.length > 0) {
                console.log('[ReplayStorage] Encontrados', localReplays.length, 'replays en localStorage');
                let addedCount = 0;
                localReplays.forEach(replay => {
                    if (!seenMatchIds.has(replay.match_id)) {
                        seenMatchIds.add(replay.match_id);
                        allReplays.push(replay);
                        addedCount++;
                    }
                });
                console.log(`[ReplayStorage] Agregados ${addedCount} replays únicos desde localStorage`);
            }
        } catch (err) {
            console.warn('[ReplayStorage] Error cargando replays locales:', err);
        }

        console.log(`[ReplayStorage] Total de replays únicos: ${allReplays.length}`);
        return allReplays || [];
    },

    /**
     * Elimina un replay del usuario (localStorage + Supabase)
     * NUEVA FUNCIÓN para arreglar el botón de borrar
     */
    deleteReplay: async function(matchId) {
        console.log('[ReplayStorage] ============================================');
        console.log('[ReplayStorage] Intentando eliminar replay:', matchId);
        console.log('[ReplayStorage] Tipo de matchId:', typeof matchId);
        
        let deletedFromLocal = false;
        let deletedFromSupabase = false;

        // 1. Eliminar de localStorage
        try {
            const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
            console.log('[ReplayStorage] Replays en localStorage antes:', localReplays.length);
            console.log('[ReplayStorage] IDs en localStorage:', localReplays.map(r => r.match_id));
            
            const filtered = localReplays.filter(r => {
                const matches = r.match_id !== matchId;
                if (!matches) {
                    console.log('[ReplayStorage] 🎯 Encontrado replay a eliminar:', r.match_id);
                }
                return matches;
            });
            
            console.log('[ReplayStorage] Replays después del filtro:', filtered.length);
            
            if (filtered.length < localReplays.length) {
                localStorage.setItem('localReplays', JSON.stringify(filtered));
                deletedFromLocal = true;
                console.log('[ReplayStorage] ✅ Eliminado de localStorage');
            } else {
                console.log('[ReplayStorage] ⚠️ No encontrado en localStorage (sin cambios)');
            }
        } catch (err) {
            console.error('[ReplayStorage] ❌ Error eliminando de localStorage:', err);
        }

        // 2. Eliminar de Supabase
        if (PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.auth_id) {
            try {
                console.log('[ReplayStorage] Intentando eliminar de Supabase...');
                console.log('[ReplayStorage] user_id:', PlayerDataManager.currentPlayer.auth_id);
                
                const { data, error } = await supabaseClient
                    .from('game_replays')
                    .delete()
                    .eq('match_id', matchId)
                    .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
                    .select(); // Agregar select() para ver qué se eliminó

                if (error) {
                    console.error('[ReplayStorage] ❌ Error eliminando de Supabase:', error);
                    console.error('[ReplayStorage] Error detalles:', error.message, error.details);
                } else {
                    console.log('[ReplayStorage] Respuesta de Supabase:', data);
                    if (data && data.length > 0) {
                        deletedFromSupabase = true;
                        console.log('[ReplayStorage] ✅ Eliminado de Supabase:', data.length, 'registro(s)');
                    } else {
                        console.log('[ReplayStorage] ⚠️ No se encontró el replay en Supabase (puede que no exista)');
                    }
                }
            } catch (err) {
                console.error('[ReplayStorage] ❌ Excepción eliminando de Supabase:', err);
            }
        } else {
            console.log('[ReplayStorage] ⚠️ No autenticado, no se puede eliminar de Supabase');
        }

        const success = deletedFromLocal || deletedFromSupabase;
        console.log('[ReplayStorage] ============================================');
        console.log('[ReplayStorage] Resultado:', success ? '✅ ELIMINADO' : '❌ NO SE PUDO ELIMINAR');
        console.log('[ReplayStorage] - localStorage:', deletedFromLocal ? '✅' : '❌');
        console.log('[ReplayStorage] - Supabase:', deletedFromSupabase ? '✅' : '❌');
        console.log('[ReplayStorage] ============================================');
        
        return success;
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
            // La timeline tiene estructura: [{ turn, currentPlayer, events: [...] }]
            // NO comprimir - guardar estructura completa para que el replay funcione
            // El campo en BD ya es JSONB así que puede manejar objetos complejos
            
            console.log('[ReplayStorage] Guardando timeline sin compresión (JSONB nativo)');
            return JSON.stringify(timeline);
        } catch (err) {
            console.error('[ReplayStorage] Error serializando timeline:', err);
            return '[]';
        }
    },

    /**
     * Descomprime timeline
     */
    decompressTimeline: function(compressed) {
        try {
            // Simplemente parsear el JSON
            let data = JSON.parse(compressed);
            
            // Validar que tenga la estructura correcta
            if (Array.isArray(data)) {
                // Validar que sea array de turnos (cada elemento debe tener 'events')
                let isValidTimeline = true;
                
                if (data.length > 0) {
                    const firstElement = data[0];
                    
                    // Si el primer elemento es un array simple (formato comprimido antiguo)
                    if (Array.isArray(firstElement) && !firstElement.events) {
                        console.warn('[ReplayStorage] Formato comprimido antiguo detectado, descartando');
                        isValidTimeline = false;
                    }
                    // Si es un objeto pero NO tiene 'events' (estructura corrupta)
                    else if (typeof firstElement === 'object' && !firstElement.events && !Array.isArray(firstElement)) {
                        console.warn('[ReplayStorage] Estructura de turno inválida:', firstElement);
                        isValidTimeline = false;
                    }
                }
                
                if (isValidTimeline) {
                    console.log(`[ReplayStorage] Timeline válida deserializada: ${data.length} turnos`);
                    return data;
                }
            }
            
            // Si llegó aquí, no es un array o está malformado
            console.warn('[ReplayStorage] Estructura no es un array de turnos válido. Devolviendo vacío.');
            console.warn('[ReplayStorage] Estructura recibida:', typeof data, Array.isArray(data) ? `array(${data.length})` : 'no-array');
            
            return [];
        } catch (err) {
            console.error('[ReplayStorage] Error parseando timeline JSON:', err);
            console.error('[ReplayStorage] Compressed value type:', typeof compressed, 'length:', compressed?.length);
            return [];
        }
    },

    /**
     * Función de diagnóstico para verificar estructura de replays
     * USO: await ReplayStorage.diagnoseReplay('match_id')
     */
    diagnoseReplay: async function(matchId) {
        console.log(`=== DIAGNÓSTICO REPLAY: ${matchId} ===`);
        
        try {
            const { data, error } = await supabaseClient
                .from('game_replays')
                .select('*')
                .eq('match_id', matchId)
                .single();
            
            if (error) {
                console.error('❌ Error cargando replay:', error);
                return;
            }
            
            if (!data) {
                console.error('❌ Replay no encontrado');
                return;
            }
            
            console.log('✅ Replay encontrado en BD');
            console.log('📊 Tamaños:', {
                metadata: this._getByteLength(data.metadata),
                timeline_compressed: this._getByteLength(data.timeline_compressed)
            });
            
            // Verificar timeline
            const timeline = this.decompressTimeline(data.timeline_compressed);
            console.log(`✅ Timeline deserializada: ${timeline.length} turnos`);
            
            // Verificar estructura de cada turno
            let totalEvents = 0;
            const eventTypes = {};
            
            for (let i = 0; i < timeline.length; i++) {
                const turn = timeline[i];
                
                if (!turn.turn || !turn.events || !Array.isArray(turn.events)) {
                    console.error(`❌ Turno ${i} tiene estructura incorrecta:`, turn);
                    continue;
                }
                
                totalEvents += turn.events.length;
                
                for (const event of turn.events) {
                    if (!event.type) {
                        console.error(`❌ Evento sin type en turno ${turn.turn}:`, event);
                    } else {
                        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
                    }
                }
            }
            
            console.log(`✅ Total eventos: ${totalEvents}`);
            console.log('📊 Tipos de evento:', eventTypes);
            
            // Verificar que los tipos sean reconocidos por replayUI
            const validTypes = ['MOVE', 'BATTLE', 'UNIT_DEATH', 'CONQUEST', 'BUILD'];
            const unknownTypes = Object.keys(eventTypes).filter(t => !validTypes.includes(t));
            
            if (unknownTypes.length > 0) {
                console.error('❌ Tipos de evento desconocidos:', unknownTypes);
            } else {
                console.log('✅ Todos los tipos de evento son válidos');
            }
            
            console.log('=== FIN DIAGNÓSTICO ===');
            
        } catch (err) {
            console.error('❌ Excepción en diagnóstico:', err);
        }
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ReplayStorage = ReplayStorage;
}
