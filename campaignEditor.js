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
            registryKey: scenarioData.__registryKey || null,
            mapKey: scenarioData.__mapKey || null,
            sourceId: scenarioData.__sourceId || null,
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
    _scenarioPickerModalId: 'campaignScenarioPickerModal',
    
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

    _expandUnitRegiments(unitDef) {
        if (Array.isArray(unitDef.regiments) && unitDef.regiments.length > 0) {
            return unitDef.regiments.map(reg => {
                if (typeof reg === 'string') {
                    return { type: reg, health: REGIMENT_TYPES[reg]?.health || 200 };
                }
                const type = reg.type;
                return { type, health: reg.health || REGIMENT_TYPES[type]?.health || 200 };
            });
        }

        if (unitDef.regimentComposition && typeof unitDef.regimentComposition === 'object') {
            const expanded = [];
            Object.entries(unitDef.regimentComposition).forEach(([type, count]) => {
                const safeCount = Math.max(0, parseInt(count, 10) || 0);
                for (let i = 0; i < safeCount; i++) {
                    expanded.push({ type, health: REGIMENT_TYPES[type]?.health || 200 });
                }
            });
            if (expanded.length) return expanded;
        }

        if (Number.isInteger(unitDef.regimentCount) && unitDef.regimentCount > 1 && unitDef.type) {
            return Array(unitDef.regimentCount)
                .fill(null)
                .map(() => ({ type: unitDef.type, health: REGIMENT_TYPES[unitDef.type]?.health || 200 }));
        }

        const fallbackType = unitDef.type || 'Infantería Ligera';
        return [{ type: fallbackType, health: REGIMENT_TYPES[fallbackType]?.health || 200 }];
    },

    _convertRegistryScenarioToEditorScenario(registryKey, scenario) {
        const map = (typeof GAME_DATA_REGISTRY !== 'undefined' && GAME_DATA_REGISTRY.maps)
            ? GAME_DATA_REGISTRY.maps[scenario.mapFile]
            : null;

        const rows = map?.rows || 12;
        const cols = map?.cols || 15;
        const defaultTerrain = map?.hexesConfig?.defaultTerrain || 'plains';
        const boardData = [];

        (map?.hexesConfig?.specificHexes || []).forEach(hex => {
            boardData.push({
                r: hex.r,
                c: hex.c,
                terrain: hex.terrain || defaultTerrain,
                owner: null,
                structure: hex.structure || null,
                resourceNode: null,
                isCity: false,
                isCapital: false,
                hasRoad: hex.structure === 'Camino'
            });
        });

        const citiesData = [];
        if (map?.playerCapital) {
            citiesData.push({ r: map.playerCapital.r, c: map.playerCapital.c, name: map.playerCapital.name || 'Capital P1', owner: 1, type: 'Ciudad', isCapital: true });
        }
        if (map?.enemyCapital) {
            citiesData.push({ r: map.enemyCapital.r, c: map.enemyCapital.c, name: map.enemyCapital.name || 'Capital P2', owner: 2, type: 'Ciudad', isCapital: true });
        }

        (map?.cities || []).forEach(city => {
            let owner = null;
            if (city.owner === 'player') owner = 1;
            else if (city.owner === 'enemy') owner = 2;
            else if (city.owner === 'bank' || city.owner === 0 || city.owner === '0') owner = BankManager?.PLAYER_ID ?? 0;
            else if (city.owner === 'barbarian') owner = (typeof BARBARIAN_PLAYER_ID !== 'undefined') ? BARBARIAN_PLAYER_ID : null;
            else if (Number.isInteger(Number(city.owner))) owner = Number(city.owner);

            citiesData.push({
                r: city.r,
                c: city.c,
                name: city.name || 'Ciudad',
                owner,
                type: 'Ciudad',
                isCapital: false
            });
        });

        (map?.resourceNodes || []).forEach(node => {
            boardData.push({
                r: node.r,
                c: node.c,
                terrain: defaultTerrain,
                owner: null,
                structure: null,
                resourceNode: node.type,
                isCity: false,
                isCapital: false,
                hasRoad: false
            });
        });

        const unitsData = [];
        (scenario?.playerSetup?.initialUnits || []).forEach(unit => {
            const regiments = this._expandUnitRegiments(unit);
            unitsData.push({
                type: regiments[0]?.type || unit.type,
                player: 1,
                r: unit.r,
                c: unit.c,
                regiments,
                customName: unit.name || null,
                isVeteran: false,
                isNaval: regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval)
            });
        });
        (scenario?.enemySetup?.initialUnits || []).forEach(unit => {
            const regiments = this._expandUnitRegiments(unit);
            unitsData.push({
                type: regiments[0]?.type || unit.type,
                player: 2,
                r: unit.r,
                c: unit.c,
                regiments,
                customName: unit.name || null,
                isVeteran: false,
                isNaval: regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval)
            });
        });

        return {
            __registryKey: registryKey,
            __mapKey: scenario.mapFile || null,
            __sourceId: `registry-scenario:${registryKey}`,
            meta: {
                name: scenario.displayName || scenario.scenarioId || registryKey,
                author: 'GAME_DATA_REGISTRY',
                description: scenario.description || '',
                historicalTitle: scenario.meta?.historicalTitle || '',
                historicalPeriod: scenario.meta?.historicalPeriod || '',
                historicalDate: scenario.meta?.historicalDate || '',
                historicalLocation: scenario.meta?.historicalLocation || '',
                historicalSides: scenario.meta?.historicalSides || '',
                historicalContext: scenario.meta?.historicalContext || '',
                historicalObjectives: scenario.meta?.historicalObjectives || '',
                historicalSources: scenario.meta?.historicalSources || '',
                created_at: Date.now(),
                modified_at: Date.now(),
                version: '1.0'
            },
            settings: {
                dimensions: { rows, cols },
                maxPlayers: 2,
                startingPhase: 'play',
                turnLimit: null,
                victoryConditions: scenario.victoryConditions || ['eliminate_enemy'],
                mapType: 'custom'
            },
            boardData,
            unitsData,
            citiesData,
            playerConfig: {
                1: {
                    civilization: null,
                    controllerType: 'human',
                    aiDifficulty: 'medium',
                    resources: scenario?.playerSetup?.initialResources || { oro: 1000, comida: 500, madera: 200, piedra: 0, hierro: 0, puntosInvestigacion: 0, puntosReclutamiento: 300 }
                },
                2: {
                    civilization: null,
                    controllerType: 'ai',
                    aiDifficulty: 'medium',
                    resources: scenario?.enemySetup?.initialResources || { oro: 1000, comida: 500, madera: 200, piedra: 0, hierro: 0, puntosInvestigacion: 0, puntosReclutamiento: 300 }
                }
            }
        };
    },

    _convertRegistryMapToEditorScenario(mapKey, mapData) {
        const registryScenarioShell = {
            displayName: `Escenario base de ${mapData.displayName || mapKey}`,
            scenarioId: `SCENARIO_${mapKey}`,
            description: `Escenario base creado desde el mapa ${mapData.displayName || mapKey}.`,
            mapFile: mapKey,
            playerSetup: { initialResources: { oro: 800, comida: 600, madera: 200, piedra: 100, hierro: 100 }, initialUnits: [] },
            enemySetup: { initialResources: { oro: 800, comida: 600, madera: 200, piedra: 100, hierro: 100 }, initialUnits: [] },
            victoryConditions: [{ type: 'eliminate_all_enemies' }]
        };
        const converted = this._convertRegistryScenarioToEditorScenario(`map-shell:${mapKey}`, registryScenarioShell);
        converted.__mapKey = mapKey;
        converted.__sourceId = `registry-map:${mapKey}`;
        return converted;
    },

    _getAssignedSourceIds() {
        return new Set(CampaignState.scenarios.map(s => s.sourceId).filter(Boolean));
    },

    _closeScenarioPickerModal() {
        const modal = document.getElementById(this._scenarioPickerModalId);
        if (modal) modal.remove();
    },

    _openScenarioPickerModal() {
        this._closeScenarioPickerModal();
        const assignedSourceIds = this._getAssignedSourceIds();

        const registryScenarios = [];
        if (typeof GAME_DATA_REGISTRY !== 'undefined' && GAME_DATA_REGISTRY.scenarios) {
            Object.entries(GAME_DATA_REGISTRY.scenarios).forEach(([key, data]) => {
                const sourceId = `registry-scenario:${key}`;
                if (!assignedSourceIds.has(sourceId)) {
                    registryScenarios.push({
                        label: data.displayName || data.scenarioId || key,
                        description: data.description || '',
                        sourceId,
                        scenarioData: this._convertRegistryScenarioToEditorScenario(key, data)
                    });
                }
            });
        }

        const registryMaps = [];
        if (typeof GAME_DATA_REGISTRY !== 'undefined' && GAME_DATA_REGISTRY.maps) {
            Object.entries(GAME_DATA_REGISTRY.maps).forEach(([mapKey, mapData]) => {
                const sourceId = `registry-map:${mapKey}`;
                if (!assignedSourceIds.has(sourceId)) {
                    registryMaps.push({
                        label: `Mapa: ${mapData.displayName || mapKey}`,
                        description: `${mapData.rows || '?'}x${mapData.cols || '?'} (escenario base)` ,
                        sourceId,
                        scenarioData: this._convertRegistryMapToEditorScenario(mapKey, mapData)
                    });
                }
            });
        }

        const localScenarios = [];
        if (typeof ScenarioStorage !== 'undefined' && ScenarioStorage.listLocalScenarios) {
            const list = ScenarioStorage.listLocalScenarios() || [];
            list.forEach(item => {
                const sourceId = `local:${item.id}`;
                if (!assignedSourceIds.has(sourceId)) {
                    const loaded = ScenarioStorage.loadFromLocalStorage(item.id);
                    if (loaded?.meta) {
                        loaded.__sourceId = sourceId;
                        localScenarios.push({
                            label: loaded.meta.name || item.name || item.id,
                            description: loaded.meta.description || '',
                            sourceId,
                            scenarioData: loaded
                        });
                    }
                }
            });
        }

        const allOptions = [...registryScenarios, ...localScenarios, ...registryMaps];
        if (allOptions.length === 0) {
            alert('No hay escenarios/mapas disponibles para añadir (todos ya están asignados o no existen).');
            return;
        }

        const modal = document.createElement('div');
        modal.id = this._scenarioPickerModalId;
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 10620; display: flex; align-items: center; justify-content: center; padding: 16px; pointer-events: auto;';

        const panel = document.createElement('div');
        panel.style.cssText = 'width: min(900px, 96vw); max-height: 86vh; overflow: hidden; background: #112433; border: 2px solid #00f3ff; border-radius: 10px; display: flex; flex-direction: column;';

        const header = document.createElement('div');
        header.style.cssText = 'padding: 14px 16px; border-bottom: 1px solid rgba(0,243,255,0.35); color: #00f3ff; font-weight: bold;';
        header.textContent = 'Seleccionar escenario/mapa para campaña (no asignados)';

        const list = document.createElement('div');
        list.style.cssText = 'padding: 12px 14px; overflow-y: auto; display: grid; gap: 8px;';

        allOptions.forEach(opt => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid rgba(0,243,255,0.25); border-radius: 8px; padding: 10px; background: rgba(8,18,26,0.8);';

            const info = document.createElement('div');
            info.style.cssText = 'min-width: 0;';
            info.innerHTML = `<div style="color:#dff9ff;font-weight:600;">${opt.label}</div><div style="color:#9dc2d4;font-size:0.86em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${opt.description || 'Sin descripción'}</div>`;

            const addBtn = document.createElement('button');
            addBtn.textContent = 'Añadir';
            addBtn.style.cssText = 'padding: 8px 12px; background: #28a745; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;';
            addBtn.onclick = () => {
                CampaignEditor.addScenario(opt.scenarioData);
                this.renderScenarioList();
                this._closeScenarioPickerModal();
            };

            row.appendChild(info);
            row.appendChild(addBtn);
            list.appendChild(row);
        });

        const footer = document.createElement('div');
        footer.style.cssText = 'padding: 10px 14px; border-top: 1px solid rgba(0,243,255,0.25); display: flex; justify-content: space-between; gap: 8px;';

        const createBtn = document.createElement('button');
        createBtn.textContent = 'Crear nuevo escenario';
        createBtn.style.cssText = 'padding: 10px 12px; background: #0d6efd; color: #fff; border: none; border-radius: 6px; cursor: pointer;';
        createBtn.onclick = () => {
            this._closeScenarioPickerModal();
            document.getElementById('campaignEditorContainer').style.display = 'none';
            if (typeof EditorUI !== 'undefined') {
                EditorUI.openScenarioEditor(null, {
                    returnToCampaignEditor: true,
                    onScenarioSaved: (savedScenarioData) => {
                        savedScenarioData.__sourceId = `created:${Date.now()}`;
                        CampaignEditor.addScenario(savedScenarioData);
                        this.renderScenarioList();
                    }
                });
            }
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar';
        closeBtn.style.cssText = 'padding: 10px 12px; background: #6c757d; color: #fff; border: none; border-radius: 6px; cursor: pointer;';
        closeBtn.onclick = () => this._closeScenarioPickerModal();

        footer.appendChild(createBtn);
        footer.appendChild(closeBtn);

        panel.appendChild(header);
        panel.appendChild(list);
        panel.appendChild(footer);
        modal.appendChild(panel);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this._closeScenarioPickerModal();
        });

        document.body.appendChild(modal);
    },
    
    /**
     * Añade un escenario desde localStorage o crea uno nuevo
     */
    async addScenario() {
        this._openScenarioPickerModal();
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
