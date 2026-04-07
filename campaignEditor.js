// campaignEditor.js
// Sistema de edición de campañas - Secuencias de escenarios
console.log("campaignEditor.js CARGADO");

// ===================================================================
// ==================== ESTADO DE CAMPAÑA ============================
// ===================================================================

/**
 * CampaignState: Estado global del editor de campañas
 */
const CampaignState = {
    isEditingCampaign: false,
    
    // Metadata de la campaña
    campaignMeta: {
        title: 'Sin título',
        description: '',
        author: null,
        created_at: null,
        modified_at: null,
        version: '1.0'
    },
    
    // Array de escenarios en la campaña (ordenados)
    scenarios: [],
    
    // Configuración de la campaña
    settings: {
        allowSaveProgress: true,
        carryOverResources: false,
        carryOverCommanders: true,
        difficulty: 'normal'
    }
};

// ===================================================================
// ================ HERRAMIENTAS DEL EDITOR DE CAMPAÑAS ==============
// ===================================================================

/**
 * CampaignEditor: Herramientas para crear y editar campañas
 */
const CampaignEditor = {
    
    /**
     * Crea una nueva campaña vacía
     */
    createNewCampaign() {
        CampaignState.campaignMeta = {
            title: 'Nueva Campaña',
            description: '',
            author: (typeof PlayerDataManager !== 'undefined' && PlayerDataManager.currentPlayer?.displayName) 
                ? PlayerDataManager.currentPlayer.displayName 
                : 'Anónimo',
            created_at: Date.now(),
            modified_at: Date.now(),
            version: '1.0'
        };
        
        CampaignState.scenarios = [];
        CampaignState.isEditingCampaign = true;
        
        console.log('[CampaignEditor] Nueva campaña creada');
    },
    
    /**
     * Añade un escenario a la campaña
     * @param {Object} scenarioData - Datos del escenario (completos)
     * @param {number} order - Orden del escenario (opcional, añade al final si no se especifica)
     */
    addScenario(scenarioData, order = null) {
        if (!scenarioData || !scenarioData.meta) {
            console.error('[CampaignEditor] Escenario inválido');
            return false;
        }
        
        const targetOrder = order !== null ? order : CampaignState.scenarios.length + 1;
        
        const scenarioEntry = {
            order: targetOrder,
            scenarioId: scenarioData.meta.name || `Escenario ${targetOrder}`,
            scenarioData: scenarioData,
            unlockConditions: {
                previousScenarioCompleted: true
            },
            rewards: {
                unlockNext: true
            }
        };
        
        // Si se especifica un orden en medio, reordenar
        if (order !== null && order <= CampaignState.scenarios.length) {
            CampaignState.scenarios.splice(order - 1, 0, scenarioEntry);
            this.reorderScenarios();
        } else {
            CampaignState.scenarios.push(scenarioEntry);
        }
        
        console.log(`[CampaignEditor] Escenario "${scenarioData.meta.name}" añadido (orden ${targetOrder})`);
        return true;
    },

    /**
     * Actualiza un escenario existente por orden
     * @param {number} order - Orden del escenario
     * @param {Object} scenarioData - Datos actualizados del escenario
     */
    updateScenario(order, scenarioData) {
        const scenario = CampaignState.scenarios.find(s => s.order === order);
        if (!scenario || !scenarioData || !scenarioData.meta) {
            console.warn('[CampaignEditor] No se pudo actualizar escenario en orden:', order);
            return false;
        }

        scenario.scenarioData = scenarioData;
        scenario.scenarioId = scenarioData.meta.name || scenario.scenarioId;
        console.log(`[CampaignEditor] Escenario actualizado (orden ${order}): ${scenario.scenarioId}`);
        return true;
    },
    
    /**
     * Remueve un escenario de la campaña
     * @param {number} order - Orden del escenario a remover
     */
    removeScenario(order) {
        const index = CampaignState.scenarios.findIndex(s => s.order === order);
        
        if (index >= 0) {
            const removed = CampaignState.scenarios.splice(index, 1);
            this.reorderScenarios();
            console.log(`[CampaignEditor] Escenario removido: ${removed[0].scenarioId}`);
            return true;
        }
        
        console.warn('[CampaignEditor] Escenario no encontrado:', order);
        return false;
    },
    
    /**
     * Mueve un escenario a una nueva posición
     * @param {number} fromOrder - Orden actual
     * @param {number} toOrder - Nuevo orden
     */
    moveScenario(fromOrder, toOrder) {
        const fromIndex = CampaignState.scenarios.findIndex(s => s.order === fromOrder);
        
        if (fromIndex < 0) {
            console.warn('[CampaignEditor] Escenario no encontrado:', fromOrder);
            return false;
        }
        
        const [scenario] = CampaignState.scenarios.splice(fromIndex, 1);
        
        // Insertar en nueva posición
        const toIndex = toOrder - 1;
        CampaignState.scenarios.splice(toIndex, 0, scenario);
        
        this.reorderScenarios();
        console.log(`[CampaignEditor] Escenario movido de ${fromOrder} a ${toOrder}`);
        return true;
    },
    
    /**
     * Reordena los números de orden de todos los escenarios
     */
    reorderScenarios() {
        CampaignState.scenarios.forEach((scenario, index) => {
            scenario.order = index + 1;
        });
    },
    
    /**
     * Exporta la campaña como JSON
     * @returns {Object} Objeto JSON de la campaña
     */
    exportCampaign() {
        const campaignJSON = {
            campaignId: `CAMPAIGN_${Date.now()}`,
            meta: {
                ...CampaignState.campaignMeta,
                modified_at: Date.now()
            },
            settings: CampaignState.settings,
            scenarios: CampaignState.scenarios.map(s => ({
                order: s.order,
                scenarioId: s.scenarioId,
                scenarioData: s.scenarioData,
                unlockConditions: s.unlockConditions,
                rewards: s.rewards
            })),
            totalScenarios: CampaignState.scenarios.length
        };
        
        console.log('[CampaignEditor] Campaña exportada:', campaignJSON.meta.title);
        return campaignJSON;
    },
    
    /**
     * Importa una campaña desde JSON
     * @param {Object} campaignJSON - Objeto JSON de la campaña
     * @returns {boolean} true si se importó correctamente
     */
    importCampaign(campaignJSON) {
        if (!campaignJSON.meta || !campaignJSON.scenarios) {
            console.error('[CampaignEditor] JSON de campaña inválido');
            return false;
        }
        
        CampaignState.campaignMeta = campaignJSON.meta;
        CampaignState.settings = campaignJSON.settings || {
            allowSaveProgress: true,
            carryOverResources: false,
            carryOverCommanders: true,
            difficulty: 'normal'
        };
        CampaignState.scenarios = campaignJSON.scenarios;
        CampaignState.isEditingCampaign = true;
        
        console.log(`[CampaignEditor] Campaña "${campaignJSON.meta.title}" importada con ${campaignJSON.totalScenarios} escenarios`);
        return true;
    },
    
    /**
     * Valida que la campaña esté completa y lista para guardar
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validateCampaign() {
        const errors = [];
        
        if (!CampaignState.campaignMeta.title || CampaignState.campaignMeta.title === 'Sin título') {
            errors.push('La campaña necesita un título');
        }
        
        if (CampaignState.scenarios.length === 0) {
            errors.push('La campaña debe tener al menos 1 escenario');
        }
        
        // Verificar que todos los escenarios tengan datos válidos
        CampaignState.scenarios.forEach((scenario, index) => {
            if (!scenario.scenarioData || !scenario.scenarioData.meta) {
                errors.push(`Escenario ${index + 1} tiene datos inválidos`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};

// ===================================================================
// ==================== UI DEL EDITOR DE CAMPAÑAS ====================
// ===================================================================

/**
 * CampaignUI: Interfaz de usuario para el editor de campañas
 */
const CampaignUI = {
    
    /**
     * Abre el editor de campañas
     * @param {Object} existingCampaign - Campaña a editar (opcional)
     */
    openCampaignEditor(existingCampaign = null) {
        console.log('[CampaignUI] Abriendo editor de campañas');
        
        // Ocultar menú principal
        const mainMenu = document.getElementById('mainMenuScreen');
        if (mainMenu) mainMenu.style.display = 'none';
        
        // Mostrar UI del editor de campañas
        const editorContainer = document.getElementById('campaignEditorContainer');
        if (editorContainer) {
            editorContainer.style.display = 'flex';
        } else {
            console.error('[CampaignUI] #campaignEditorContainer no encontrado');
            return;
        }
        
        // Cargar campaña existente o crear nueva
        if (existingCampaign) {
            CampaignEditor.importCampaign(existingCampaign);
        } else {
            CampaignEditor.createNewCampaign();
        }
        
        // Renderizar lista de escenarios
        this.renderScenarioList();
        
        // Actualizar título
        this.updateCampaignTitle();
    },
    
    /**
     * Renderiza la lista de escenarios de la campaña
     */
    renderScenarioList() {
        const listContainer = document.getElementById('campaignScenarioList');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (CampaignState.scenarios.length === 0) {
            listContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No hay escenarios. Añade uno para empezar.</p>';
            return;
        }
        
        CampaignState.scenarios.forEach((scenario, index) => {
            const scenarioDiv = document.createElement('div');
            scenarioDiv.className = 'campaign-scenario-item';
            scenarioDiv.innerHTML = `
                <div class="scenario-order">${scenario.order}</div>
                <div class="scenario-info">
                    <strong>${scenario.scenarioData.meta.name}</strong>
                    <small>${scenario.scenarioData.meta.description || 'Sin descripción'}</small>
                </div>
                <div class="scenario-actions">
                    <button onclick="CampaignUI.moveScenarioUp(${scenario.order})" title="Mover arriba">▲</button>
                    <button onclick="CampaignUI.moveScenarioDown(${scenario.order})" title="Mover abajo">▼</button>
                    <button onclick="CampaignUI.editScenario(${scenario.order})" title="Editar">✏️</button>
                    <button onclick="CampaignUI.removeScenario(${scenario.order})" title="Eliminar">🗑️</button>
                </div>
            `;
            listContainer.appendChild(scenarioDiv);
        });
    },
    
    /**
     * Mueve un escenario una posición arriba
     * @param {number} order - Orden actual
     */
    moveScenarioUp(order) {
        if (order > 1) {
            CampaignEditor.moveScenario(order, order - 1);
            this.renderScenarioList();
        }
    },
    
    /**
     * Mueve un escenario una posición abajo
     * @param {number} order - Orden actual
     */
    moveScenarioDown(order) {
        if (order < CampaignState.scenarios.length) {
            CampaignEditor.moveScenario(order, order + 1);
            this.renderScenarioList();
        }
    },
    
    /**
     * Edita un escenario de la campaña
     * @param {number} order - Orden del escenario
     */
    editScenario(order) {
        const scenario = CampaignState.scenarios.find(s => s.order === order);
        if (!scenario) return;
        
        // Cerrar editor de campañas
        document.getElementById('campaignEditorContainer').style.display = 'none';
        
        // Abrir editor de escenarios con el escenario
        if (typeof EditorUI !== 'undefined') {
            EditorUI.openScenarioEditor(scenario.scenarioData, {
                returnToCampaignEditor: true,
                onScenarioSaved: (savedScenarioData) => {
                    CampaignEditor.updateScenario(order, savedScenarioData);
                    this.renderScenarioList();
                }
            });
        }
    },
    
    /**
     * Remueve un escenario de la campaña
     * @param {number} order - Orden del escenario
     */
    removeScenario(order) {
        if (!confirm('¿Eliminar este escenario de la campaña?')) return;
        
        CampaignEditor.removeScenario(order);
        this.renderScenarioList();
    },
    
    /**
     * Añade un escenario desde localStorage o crea uno nuevo
     */
    async addScenario() {
        // Mostrar modal de selección
        const choice = prompt('1: Seleccionar escenario guardado\n2: Crear nuevo escenario\n\nElige una opción:');
        
        if (choice === '1') {
            // Cargar escenarios guardados
            if (typeof ScenarioStorage === 'undefined' || !ScenarioStorage.listLocalScenarios) {
                alert('❌ ScenarioStorage no está disponible. Recarga la página e inténtalo de nuevo.');
                return;
            }
            const scenarios = ScenarioStorage.listLocalScenarios();
            
            if (scenarios.length === 0) {
                alert('No hay escenarios guardados. Crea uno primero en el Editor de Escenarios.');
                return;
            }
            
            // Mostrar lista (simplificado - idealmente usaría un modal)
            let listText = 'Selecciona un escenario:\n\n';
            scenarios.forEach((s, i) => {
                listText += `${i + 1}. ${s.name} (${s.author})\n`;
            });
            
            const selection = prompt(listText);
            const index = parseInt(selection, 10) - 1;
            
            if (index >= 0 && index < scenarios.length) {
                const scenarioData = ScenarioStorage.loadFromLocalStorage(scenarios[index].id);
                if (scenarioData) {
                    CampaignEditor.addScenario(scenarioData);
                    this.renderScenarioList();
                }
            }
        } else if (choice === '2') {
            // Crear nuevo escenario
            document.getElementById('campaignEditorContainer').style.display = 'none';
            
            if (typeof EditorUI !== 'undefined') {
                EditorUI.openScenarioEditor(null, {
                    returnToCampaignEditor: true,
                    onScenarioSaved: (savedScenarioData) => {
                        CampaignEditor.addScenario(savedScenarioData);
                        this.renderScenarioList();
                    }
                });
            }
        }
    },
    
    /**
     * Guarda la campaña
     */
    async saveCampaign() {
        console.log('[CampaignUI] Guardando campaña...');
        
        // Validar campaña
        const validation = CampaignEditor.validateCampaign();
        if (!validation.valid) {
            alert('❌ La campaña no es válida:\n\n' + validation.errors.join('\n'));
            return;
        }
        
        // Pedir título si no tiene
        if (CampaignState.campaignMeta.title === 'Sin título' || CampaignState.campaignMeta.title === 'Nueva Campaña') {
            const title = prompt('Título de la campaña:');
            if (!title) return;
            CampaignState.campaignMeta.title = title;
        }
        
        const campaignData = CampaignEditor.exportCampaign();
        
        // Guardar en localStorage
        if (typeof CampaignStorage !== 'undefined') {
            const campaignId = CampaignStorage.saveToLocalStorage(campaignData);
            
            if (campaignId) {
                console.log('[CampaignUI] Campaña guardada:', campaignId);
                
                // Guardar también en Supabase si está disponible
                await CampaignStorage.saveToSupabase(campaignData, false);
                
                alert('✅ Campaña guardada correctamente');
                this.updateCampaignTitle();
            } else {
                alert('❌ Error al guardar la campaña');
            }
        }
    },
    
    /**
     * Exporta la campaña como archivo JSON
     */
    exportCampaign() {
        console.log('[CampaignUI] Exportando campaña...');
        
        const campaignData = CampaignEditor.exportCampaign();
        const jsonStr = JSON.stringify(campaignData, null, 2);
        
        // Crear blob y descarga
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${campaignData.meta.title.replace(/\s+/g, '_')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('[CampaignUI] Campaña exportada');
    },
    
    /**
     * Cierra el editor de campañas
     */
    closeCampaignEditor() {
        if (!confirm('¿Salir del editor? Los cambios no guardados se perderán.')) return;
        
        console.log('[CampaignUI] Cerrando editor de campañas');
        
        CampaignState.isEditingCampaign = false;
        
        const editorContainer = document.getElementById('campaignEditorContainer');
        if (editorContainer) editorContainer.style.display = 'none';
        
        const mainMenu = document.getElementById('mainMenuScreen');
        if (mainMenu) mainMenu.style.display = 'flex';
    },
    
    /**
     * Actualiza el título de la campaña en la UI
     */
    updateCampaignTitle() {
        const titleElement = document.getElementById('campaignTitleDisplay');
        if (titleElement) {
            titleElement.textContent = CampaignState.campaignMeta.title;
        }
    }
};

console.log("campaignEditor.js: CampaignEditor y CampaignUI listos");
