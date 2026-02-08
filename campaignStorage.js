// campaignStorage.js
// Manejo de persistencia de campañas (localStorage y Supabase)
console.log("campaignStorage.js CARGADO");

// ===================================================================
// ================= ALMACENAMIENTO DE CAMPAÑAS ======================
// ===================================================================

/**
 * CampaignStorage: Maneja guardar/cargar campañas en localStorage y Supabase
 */
const CampaignStorage = {
    
    /**
     * Guarda campaña en localStorage
     * @param {Object} campaignData - Datos de la campaña
     * @returns {string} ID de la campaña guardada
     */
    saveToLocalStorage(campaignData) {
        const campaignId = `CAMPAIGN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            localStorage.setItem(campaignId, JSON.stringify(campaignData));
            console.log('[CampaignStorage] Campaña guardada en localStorage:', campaignId);
            
            // Guardar también en índice de campañas
            this.addToIndex(campaignId, campaignData.meta);
            
            return campaignId;
        } catch (error) {
            console.error('[CampaignStorage] Error guardando en localStorage:', error);
            return null;
        }
    },
    
    /**
     * Carga campaña desde localStorage
     * @param {string} campaignId - ID de la campaña
     * @returns {Object|null} Datos de la campaña o null si no existe
     */
    loadFromLocalStorage(campaignId) {
        try {
            const data = localStorage.getItem(campaignId);
            if (!data) {
                console.warn('[CampaignStorage] Campaña no encontrada:', campaignId);
                return null;
            }
            
            const campaignData = JSON.parse(data);
            console.log('[CampaignStorage] Campaña cargada:', campaignId);
            return campaignData;
        } catch (error) {
            console.error('[CampaignStorage] Error cargando campaña:', error);
            return null;
        }
    },
    
    /**
     * Lista todas las campañas guardadas localmente
     * @returns {Array} Array de objetos con id y metadata
     */
    listLocalCampaigns() {
        const campaigns = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key.startsWith('CAMPAIGN_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    campaigns.push({
                        id: key,
                        title: data.meta.title,
                        author: data.meta.author,
                        scenarioCount: data.totalScenarios,
                        created_at: data.meta.created_at,
                        modified_at: data.meta.modified_at
                    });
                } catch (error) {
                    console.error('[CampaignStorage] Error leyendo campaña:', key, error);
                }
            }
        }
        
        // Ordenar por fecha de modificación (más reciente primero)
        campaigns.sort((a, b) => b.modified_at - a.modified_at);
        
        return campaigns;
    },
    
    /**
     * Elimina una campaña de localStorage
     * @param {string} campaignId - ID de la campaña
     */
    deleteFromLocalStorage(campaignId) {
        try {
            localStorage.removeItem(campaignId);
            this.removeFromIndex(campaignId);
            console.log('[CampaignStorage] Campaña eliminada:', campaignId);
            return true;
        } catch (error) {
            console.error('[CampaignStorage] Error eliminando campaña:', error);
            return false;
        }
    },
    
    /**
     * Añade campaña al índice
     * @param {string} campaignId - ID de la campaña
     * @param {Object} metadata - Metadatos de la campaña
     */
    addToIndex(campaignId, metadata) {
        try {
            const index = this.getIndex();
            index[campaignId] = {
                title: metadata.title,
                author: metadata.author,
                created_at: metadata.created_at,
                modified_at: metadata.modified_at
            };
            localStorage.setItem('CAMPAIGN_INDEX', JSON.stringify(index));
        } catch (error) {
            console.error('[CampaignStorage] Error actualizando índice:', error);
        }
    },
    
    /**
     * Obtiene el índice de campañas
     * @returns {Object} Índice de campañas
     */
    getIndex() {
        try {
            const data = localStorage.getItem('CAMPAIGN_INDEX');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            return {};
        }
    },
    
    /**
     * Remueve campaña del índice
     * @param {string} campaignId - ID de la campaña
     */
    removeFromIndex(campaignId) {
        try {
            const index = this.getIndex();
            delete index[campaignId];
            localStorage.setItem('CAMPAIGN_INDEX', JSON.stringify(index));
        } catch (error) {
            console.error('[CampaignStorage] Error actualizando índice:', error);
        }
    },
    
    // ===================================================================
    // ==================== INTEGRACIÓN SUPABASE =========================
    // ===================================================================
    
    /**
     * Guarda campaña en Supabase
     * @param {Object} campaignData - Datos de la campaña
     * @param {boolean} isPublic - Si la campaña es pública
     * @returns {Object|null} Datos de la campaña guardada o null si falla
     */
    async saveToSupabase(campaignData, isPublic = false) {
        if (typeof supabase === 'undefined') {
            console.warn('[CampaignStorage] Supabase no está disponible');
            return null;
        }
        
        if (typeof PlayerDataManager === 'undefined' || !PlayerDataManager.currentPlayer?.auth_id) {
            console.error('[CampaignStorage] Usuario no autenticado');
            return null;
        }
        
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .upsert({
                    author_id: PlayerDataManager.currentPlayer.auth_id,
                    title: campaignData.meta.title,
                    description: campaignData.meta.description || '',
                    campaign_data: campaignData,
                    is_public: isPublic,
                    updated_at: new Date().toISOString()
                })
                .select();
            
            if (error) {
                console.error('[CampaignStorage] Error guardando en Supabase:', error);
                return null;
            }
            
            console.log('[CampaignStorage] Campaña guardada en Supabase:', data[0].id);
            return data[0];
        } catch (error) {
            console.error('[CampaignStorage] Excepción guardando en Supabase:', error);
            return null;
        }
    },
    
    /**
     * Carga campañas del usuario desde Supabase
     * @returns {Array} Array de campañas del usuario
     */
    async loadUserCampaigns() {
        if (typeof supabase === 'undefined') {
            console.warn('[CampaignStorage] Supabase no está disponible');
            return [];
        }
        
        if (typeof PlayerDataManager === 'undefined' || !PlayerDataManager.currentPlayer?.auth_id) {
            console.warn('[CampaignStorage] Usuario no autenticado');
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('author_id', PlayerDataManager.currentPlayer.auth_id)
                .order('updated_at', { ascending: false });
            
            if (error) {
                console.error('[CampaignStorage] Error cargando campañas:', error);
                return [];
            }
            
            console.log(`[CampaignStorage] ${data.length} campañas cargadas desde Supabase`);
            return data;
        } catch (error) {
            console.error('[CampaignStorage] Excepción cargando campañas:', error);
            return [];
        }
    },
    
    /**
     * Busca campañas públicas en Supabase
     * @param {string} query - Término de búsqueda (opcional)
     * @returns {Array} Array de campañas públicas
     */
    async searchPublicCampaigns(query = '') {
        if (typeof supabase === 'undefined') {
            console.warn('[CampaignStorage] Supabase no está disponible');
            return [];
        }
        
        try {
            let queryBuilder = supabase
                .from('campaigns')
                .select('*')
                .eq('is_public', true);
            
            if (query) {
                queryBuilder = queryBuilder.ilike('title', `%${query}%`);
            }
            
            const { data, error } = await queryBuilder
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error('[CampaignStorage] Error buscando campañas:', error);
                return [];
            }
            
            console.log(`[CampaignStorage] ${data.length} campañas públicas encontradas`);
            return data;
        } catch (error) {
            console.error('[CampaignStorage] Excepción buscando campañas:', error);
            return [];
        }
    },
    
    /**
     * Carga una campaña específica desde Supabase
     * @param {string} campaignId - UUID de la campaña en Supabase
     * @returns {Object|null} Campaña o null si no existe
     */
    async loadFromSupabase(campaignId) {
        if (typeof supabase === 'undefined') {
            console.warn('[CampaignStorage] Supabase no está disponible');
            return null;
        }
        
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();
            
            if (error) {
                console.error('[CampaignStorage] Error cargando campaña:', error);
                return null;
            }
            
            console.log('[CampaignStorage] Campaña cargada desde Supabase:', campaignId);
            return data.campaign_data;
        } catch (error) {
            console.error('[CampaignStorage] Excepción cargando campaña:', error);
            return null;
        }
    },
    
    /**
     * Elimina una campaña de Supabase
     * @param {string} campaignId - UUID de la campaña
     * @returns {boolean} true si se eliminó correctamente
     */
    async deleteFromSupabase(campaignId) {
        if (typeof supabase === 'undefined') {
            console.warn('[CampaignStorage] Supabase no está disponible');
            return false;
        }
        
        if (typeof PlayerDataManager === 'undefined' || !PlayerDataManager.currentPlayer?.auth_id) {
            console.error('[CampaignStorage] Usuario no autenticado');
            return false;
        }
        
        try {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', campaignId)
                .eq('author_id', PlayerDataManager.currentPlayer.auth_id); // Seguridad: solo el autor puede eliminar
            
            if (error) {
                console.error('[CampaignStorage] Error eliminando campaña:', error);
                return false;
            }
            
            console.log('[CampaignStorage] Campaña eliminada de Supabase:', campaignId);
            return true;
        } catch (error) {
            console.error('[CampaignStorage] Excepción eliminando campaña:', error);
            return false;
        }
    }
};

console.log("campaignStorage.js: CampaignStorage listo");
