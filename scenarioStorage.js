// scenarioStorage.js
// Manejo de persistencia de escenarios (localStorage y Supabase)
console.log("scenarioStorage.js CARGADO");

// ===================================================================
// ================= ALMACENAMIENTO DE ESCENARIOS ====================
// ===================================================================

/**
 * ScenarioStorage: Maneja guardar/cargar escenarios en localStorage y Supabase
 */
const ScenarioStorage = {
    
    /**
     * Guarda escenario en localStorage
     * @param {Object} scenarioData - Datos del escenario
     * @returns {string} ID del escenario guardado
     */
    saveToLocalStorage(scenarioData) {
        const scenarioId = `SCENARIO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            localStorage.setItem(scenarioId, JSON.stringify(scenarioData));
            console.log('[ScenarioStorage] Escenario guardado en localStorage:', scenarioId);
            
            // Guardar también en índice de escenarios
            this.addToIndex(scenarioId, scenarioData.meta);
            
            return scenarioId;
        } catch (error) {
            console.error('[ScenarioStorage] Error guardando en localStorage:', error);
            return null;
        }
    },
    
    /**
     * Carga escenario desde localStorage
     * @param {string} scenarioId - ID del escenario
     * @returns {Object|null} Datos del escenario o null si no existe
     */
    loadFromLocalStorage(scenarioId) {
        try {
            const data = localStorage.getItem(scenarioId);
            if (!data) {
                console.warn('[ScenarioStorage] Escenario no encontrado:', scenarioId);
                return null;
            }
            
            const scenarioData = JSON.parse(data);
            console.log('[ScenarioStorage] Escenario cargado:', scenarioId);
            return scenarioData;
        } catch (error) {
            console.error('[ScenarioStorage] Error cargando escenario:', error);
            return null;
        }
    },
    
    /**
     * Lista todos los escenarios guardados localmente
     * @returns {Array} Array de objetos con id y metadata
     */
    listLocalScenarios() {
        const scenarios = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key.startsWith('SCENARIO_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    scenarios.push({
                        id: key,
                        name: data.meta.name,
                        author: data.meta.author,
                        created_at: data.meta.created_at,
                        modified_at: data.meta.modified_at
                    });
                } catch (error) {
                    console.error('[ScenarioStorage] Error leyendo escenario:', key, error);
                }
            }
        }
        
        // Ordenar por fecha de modificación (más reciente primero)
        scenarios.sort((a, b) => b.modified_at - a.modified_at);
        
        return scenarios;
    },
    
    /**
     * Elimina un escenario de localStorage
     * @param {string} scenarioId - ID del escenario
     */
    deleteFromLocalStorage(scenarioId) {
        try {
            localStorage.removeItem(scenarioId);
            this.removeFromIndex(scenarioId);
            console.log('[ScenarioStorage] Escenario eliminado:', scenarioId);
            return true;
        } catch (error) {
            console.error('[ScenarioStorage] Error eliminando escenario:', error);
            return false;
        }
    },
    
    /**
     * Añade escenario al índice
     * @param {string} scenarioId - ID del escenario
     * @param {Object} metadata - Metadatos del escenario
     */
    addToIndex(scenarioId, metadata) {
        try {
            const index = this.getIndex();
            index[scenarioId] = {
                name: metadata.name,
                author: metadata.author,
                created_at: metadata.created_at,
                modified_at: metadata.modified_at
            };
            localStorage.setItem('SCENARIO_INDEX', JSON.stringify(index));
        } catch (error) {
            console.error('[ScenarioStorage] Error actualizando índice:', error);
        }
    },
    
    /**
     * Obtiene el índice de escenarios
     * @returns {Object} Índice de escenarios
     */
    getIndex() {
        try {
            const data = localStorage.getItem('SCENARIO_INDEX');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            return {};
        }
    },
    
    /**
     * Remueve escenario del índice
     * @param {string} scenarioId - ID del escenario
     */
    removeFromIndex(scenarioId) {
        try {
            const index = this.getIndex();
            delete index[scenarioId];
            localStorage.setItem('SCENARIO_INDEX', JSON.stringify(index));
        } catch (error) {
            console.error('[ScenarioStorage] Error actualizando índice:', error);
        }
    },
    
    // ===================================================================
    // ==================== INTEGRACIÓN SUPABASE =========================
    // ===================================================================
    
    /**
     * Guarda escenario en Supabase
     * @param {Object} scenarioData - Datos del escenario
     * @param {boolean} isPublic - Si el escenario es público
     * @returns {Object|null} Datos del escenario guardado o null si falla
     */
    async saveToSupabase(scenarioData, isPublic = false) {
        if (typeof supabase === 'undefined') {
            console.warn('[ScenarioStorage] Supabase no está disponible');
            return null;
        }
        
        if (typeof PlayerDataManager === 'undefined' || !PlayerDataManager.currentPlayer?.auth_id) {
            console.error('[ScenarioStorage] Usuario no autenticado');
            return null;
        }
        
        try {
            const { data, error } = await supabase
                .from('scenarios')
                .upsert({
                    author_id: PlayerDataManager.currentPlayer.auth_id,
                    name: scenarioData.meta.name,
                    description: scenarioData.meta.description || '',
                    scenario_data: scenarioData,
                    is_public: isPublic,
                    updated_at: new Date().toISOString()
                })
                .select();
            
            if (error) {
                console.error('[ScenarioStorage] Error guardando en Supabase:', error);
                return null;
            }
            
            console.log('[ScenarioStorage] Escenario guardado en Supabase:', data[0].id);
            return data[0];
        } catch (error) {
            console.error('[ScenarioStorage] Excepción guardando en Supabase:', error);
            return null;
        }
    },
    
    /**
     * Carga escenarios del usuario desde Supabase
     * @returns {Array} Array de escenarios del usuario
     */
    async loadUserScenarios() {
        if (typeof supabase === 'undefined') {
            console.warn('[ScenarioStorage] Supabase no está disponible');
            return [];
        }
        
        if (typeof PlayerDataManager === 'undefined' || !PlayerDataManager.currentPlayer?.auth_id) {
            console.warn('[ScenarioStorage] Usuario no autenticado');
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('scenarios')
                .select('*')
                .eq('author_id', PlayerDataManager.currentPlayer.auth_id)
                .order('updated_at', { ascending: false });
            
            if (error) {
                console.error('[ScenarioStorage] Error cargando escenarios:', error);
                return [];
            }
            
            console.log(`[ScenarioStorage] ${data.length} escenarios cargados desde Supabase`);
            return data;
        } catch (error) {
            console.error('[ScenarioStorage] Excepción cargando escenarios:', error);
            return [];
        }
    },
    
    /**
     * Busca escenarios públicos en Supabase
     * @param {string} query - Término de búsqueda (opcional)
     * @returns {Array} Array de escenarios públicos
     */
    async searchPublicScenarios(query = '') {
        if (typeof supabase === 'undefined') {
            console.warn('[ScenarioStorage] Supabase no está disponible');
            return [];
        }
        
        try {
            let queryBuilder = supabase
                .from('scenarios')
                .select('*')
                .eq('is_public', true);
            
            if (query) {
                queryBuilder = queryBuilder.ilike('name', `%${query}%`);
            }
            
            const { data, error } = await queryBuilder
                .order('downloads', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error('[ScenarioStorage] Error buscando escenarios:', error);
                return [];
            }
            
            console.log(`[ScenarioStorage] ${data.length} escenarios públicos encontrados`);
            return data;
        } catch (error) {
            console.error('[ScenarioStorage] Excepción buscando escenarios:', error);
            return [];
        }
    },
    
    /**
     * Carga un escenario específico desde Supabase
     * @param {string} scenarioId - UUID del escenario en Supabase
     * @returns {Object|null} Escenario o null si no existe
     */
    async loadFromSupabase(scenarioId) {
        if (typeof supabase === 'undefined') {
            console.warn('[ScenarioStorage] Supabase no está disponible');
            return null;
        }
        
        try {
            const { data, error } = await supabase
                .from('scenarios')
                .select('*')
                .eq('id', scenarioId)
                .single();
            
            if (error) {
                console.error('[ScenarioStorage] Error cargando escenario:', error);
                return null;
            }
            
            // Incrementar contador de descargas
            await this.incrementDownloads(scenarioId);
            
            console.log('[ScenarioStorage] Escenario cargado desde Supabase:', scenarioId);
            return data.scenario_data;
        } catch (error) {
            console.error('[ScenarioStorage] Excepción cargando escenario:', error);
            return null;
        }
    },
    
    /**
     * Incrementa el contador de descargas de un escenario
     * @param {string} scenarioId - UUID del escenario
     */
    async incrementDownloads(scenarioId) {
        if (typeof supabase === 'undefined') return;
        
        try {
            await supabase.rpc('increment_scenario_downloads', {
                scenario_id: scenarioId
            });
        } catch (error) {
            console.error('[ScenarioStorage] Error incrementando descargas:', error);
        }
    },
    
    /**
     * Elimina un escenario de Supabase
     * @param {string} scenarioId - UUID del escenario
     * @returns {boolean} true si se eliminó correctamente
     */
    async deleteFromSupabase(scenarioId) {
        if (typeof supabase === 'undefined') {
            console.warn('[ScenarioStorage] Supabase no está disponible');
            return false;
        }
        
        if (typeof PlayerDataManager === 'undefined' || !PlayerDataManager.currentPlayer?.auth_id) {
            console.error('[ScenarioStorage] Usuario no autenticado');
            return false;
        }
        
        try {
            const { error } = await supabase
                .from('scenarios')
                .delete()
                .eq('id', scenarioId)
                .eq('author_id', PlayerDataManager.currentPlayer.auth_id); // Seguridad: solo el autor puede eliminar
            
            if (error) {
                console.error('[ScenarioStorage] Error eliminando escenario:', error);
                return false;
            }
            
            console.log('[ScenarioStorage] Escenario eliminado de Supabase:', scenarioId);
            return true;
        } catch (error) {
            console.error('[ScenarioStorage] Excepción eliminando escenario:', error);
            return false;
        }
    }
};

console.log("scenarioStorage.js: ScenarioStorage listo");
