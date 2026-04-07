// editorUI.js
// Interfaz de usuario para el sistema de edición de escenarios
console.log("editorUI.js CARGADO");

// ===================================================================
// ==================== INTERFAZ DEL EDITOR ==========================
// ===================================================================

/**
 * EditorUI: Maneja toda la interacción del usuario con el editor
 */
const EditorUI = {
    _integrationContext: {
        returnToCampaignEditor: false,
        onScenarioSaved: null
    },
    
    /**
     * Abre el editor de escenarios
     * @param {Object} existingScenario - Escenario a editar (opcional)
     */
    openScenarioEditor(existingScenario = null, options = {}) {
        console.log('[EditorUI] Abriendo editor de escenarios');

        this._integrationContext = {
            returnToCampaignEditor: !!options.returnToCampaignEditor,
            onScenarioSaved: typeof options.onScenarioSaved === 'function' ? options.onScenarioSaved : null
        };
        
        // Ocultar menú principal
        const mainMenu = document.getElementById('mainMenuScreen');
        if (mainMenu) mainMenu.style.display = 'none';
        
        // Ocultar otros modales
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.style.display = 'none');
        
        // IMPORTANTE: Mostrar el contenedor del juego para que gameBoard sea visible
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.display = 'flex';
            gameContainer.style.pointerEvents = 'auto';
            gameContainer.style.paddingTop = '54px'; // Espacio para top bar
            gameContainer.style.paddingBottom = '60px'; // Espacio para config bar
        }
        
        // Asegurar que gameBoard sea visible
        const gameBoard = document.getElementById('gameBoard');
        if (gameBoard) {
            gameBoard.style.display = 'grid';
            gameBoard.style.zIndex = '1';
            gameBoard.style.position = 'relative';
            gameBoard.style.pointerEvents = 'auto';
        }
        
        // Mostrar UI del editor
        const editorContainer = document.getElementById('scenarioEditorContainer');
        if (editorContainer) {
            editorContainer.style.display = 'flex';
        } else {
            console.error('[EditorUI] #scenarioEditorContainer no encontrado');
            return;
        }
        
        // Activar modo editor
        EditorState.isEditorMode = true;
        EditorState.currentTool = null;
        
        // Cargar escenario existente o crear uno nuevo
        if (existingScenario) {
            EditorSerializer.importScenario(existingScenario);
        } else {
            // Inicializar tablero vacío
            this.initializeEmptyBoard(12, 15);
            EditorState.scenarioMeta.created_at = Date.now();
        }
        
        // Poblar selectores
        this.populateSelectors();
        
        // Actualizar nombre del escenario en UI
        this.updateScenarioName();

        // Herramienta por defecto para facilitar edición inmediata
        this.selectTool('terrain');
        
        console.log('[EditorUI] Editor de escenarios abierto');
    },

    _closeAndRouteBack() {
        EditorState.isEditorMode = false;

        const editorContainer = document.getElementById('scenarioEditorContainer');
        if (editorContainer) editorContainer.style.display = 'none';

        if (this._integrationContext.returnToCampaignEditor) {
            const campaignEditorContainer = document.getElementById('campaignEditorContainer');
            if (campaignEditorContainer) campaignEditorContainer.style.display = 'flex';
            return;
        }

        // Flujo normal: volver al menú principal
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.display = 'none';
            gameContainer.style.paddingTop = '';
            gameContainer.style.paddingBottom = '';
        }

        const mainMenu = document.getElementById('mainMenuScreen');
        if (mainMenu) mainMenu.style.display = 'flex';
    },
    
    /**
     * Inicializa un tablero vacío para editar
     * @param {number} rows - Número de filas
     * @param {number} cols - Número de columnas
     */
    initializeEmptyBoard(rows, cols) {
        console.log(`[EditorUI] Inicializando tablero ${rows}x${cols}`);
        
        // Limpiar estado de juego
        units = [];
        gameState.cities = [];
        gameState.playerResources = {};
        
        // Actualizar dimensiones en EditorState
        EditorState.scenarioSettings.dimensions = { rows, cols };
        
        // Crear tablero nuevo
        board = Array(rows).fill(null).map(() => Array(cols).fill(null));
        
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) {
            console.error('[EditorUI] #gameBoard no encontrado');
            return;
        }
        
        gameBoard.innerHTML = '';
        gameBoard.style.display = 'grid';
        
        console.log(`[EditorUI] Creando ${rows * cols} hexágonos...`);
        
        // Crear hexágonos DOM
        let hexCount = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hexElement = this.createEditorHexElement(r, c);
                gameBoard.appendChild(hexElement);
                
                board[r][c] = {
                    element: hexElement,
                    terrain: 'plains', // Terreno por defecto
                    owner: null,
                    structure: null,
                    isCity: false,
                    resourceNode: null,
                    hasRoad: false,
                    visibility: {}
                };
                hexCount++;
            }
        }
        
        console.log(`[EditorUI] ${hexCount} hexágonos creados`);
        
        // Renderizar tablero
        if (typeof renderFullBoardVisualState === 'function') {
            renderFullBoardVisualState();
            console.log('[EditorUI] Tablero renderizado');
        } else {
            console.warn('[EditorUI] renderFullBoardVisualState no disponible');
        }
        
        console.log(`[EditorUI] Tablero ${rows}x${cols} inicializado completamente`);
    },
    
    /**
     * Crea un elemento hexágono DOM para el editor
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {HTMLElement} Elemento hexágono
     */
    createEditorHexElement(r, c) {
        const hexDiv = document.createElement('div');
        hexDiv.className = 'hex';
        hexDiv.dataset.r = r;
        hexDiv.dataset.c = c;
        
        // Calcular posición
        const xOffset = c * HEX_WIDTH * 0.75;
        const yOffset = r * HEX_VERT_SPACING + (c % 2) * (HEX_VERT_SPACING / 2);
        
        hexDiv.style.left = `${xOffset}px`;
        hexDiv.style.top = `${yOffset}px`;
        hexDiv.style.pointerEvents = 'auto';
        
        // Listener de clic modificado para editor
        hexDiv.addEventListener('click', () => {
            if (EditorState.isEditorMode) {
                handleEditorHexClick(r, c);
            }
        });
        
        // Soporte para arrastrar y pintar
        hexDiv.addEventListener('mousedown', () => {
            EditorState.isPainting = true;
        });
        
        hexDiv.addEventListener('mouseenter', () => {
            if (EditorState.isPainting && EditorState.currentTool === 'terrain') {
                handleEditorHexClick(r, c);
            }
        });
        
        hexDiv.addEventListener('mouseup', () => {
            EditorState.isPainting = false;
        });
        
        return hexDiv;
    },
    
    /**
     * Pobla todos los selectores con opciones
     */
    populateSelectors() {
        // Selector de tipos de unidad
        this.populateUnitTypeSelector();
        
        // Selector de jugadores (hasta maxPlayers)
        this.populatePlayerSelector();
        
        // Selector de terrenos
        this.populateTerrainSelector();
        
        // Selector de estructuras
        this.populateStructureSelector();
    },
    
    /**
     * Pobla el selector de tipos de unidad
     */
    populateUnitTypeSelector() {
        const selector = document.getElementById('unitTypeSelector');
        if (!selector) return;
        
        selector.innerHTML = '';
        
        for (const [unitType, data] of Object.entries(REGIMENT_TYPES)) {
            const option = document.createElement('option');
            option.value = unitType;
            option.textContent = `${unitType} (${data.cost.oro}💰)`;
            selector.appendChild(option);
        }
        
        // Actualizar selectedUnitType
        if (selector.options.length > 0) {
            EditorState.selectedUnitType = selector.options[0].value;
        }
    },
    
    /**
     * Pobla el selector de jugadores
     */
    populatePlayerSelector() {
        const selectors = [
            document.getElementById('unitPlayerSelector'),
            document.getElementById('structurePlayerSelector'),
            document.getElementById('ownerPlayerSelector')
        ].filter(Boolean);

        if (selectors.length === 0) return;

        const maxPlayers = EditorState.scenarioSettings.maxPlayers;
        selectors.forEach(selector => {
            selector.innerHTML = '';
            for (let i = 1; i <= maxPlayers; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Jugador ${i}`;
                selector.appendChild(option);
            }
            selector.value = String(EditorState.selectedPlayer || 1);
        });
    },
    
    /**
     * Pobla el selector de terrenos
     */
    populateTerrainSelector() {
        const selector = document.getElementById('terrainTypeSelector');
        if (!selector) return;
        
        selector.innerHTML = '';
        
        const terrains = [
            { value: 'plains', label: '🌾 Llanura' },
            { value: 'forest', label: '🌲 Bosque' },
            { value: 'hills', label: '⛰️ Colinas' },
            { value: 'mountain', label: '🗻 Montaña' },
            { value: 'water', label: '🌊 Agua' },
            { value: 'desert', label: '🏜️ Desierto' },
            { value: 'swamp', label: '🐊 Pantano' }
        ];
        
        terrains.forEach(terrain => {
            if (TERRAIN_TYPES[terrain.value]) {
                const option = document.createElement('option');
                option.value = terrain.value;
                option.textContent = terrain.label;
                selector.appendChild(option);
            }
        });
    },
    
    /**
     * Pobla el selector de estructuras
     */
    populateStructureSelector() {
        const selector = document.getElementById('structureTypeSelector');
        if (!selector) return;
        
        selector.innerHTML = '';
        
        const structures = [
            { value: 'Camino', label: '🛤️ Camino' },
            { value: 'Fortaleza', label: '🏰 Fortaleza' },
            { value: 'Ciudad', label: '🏘️ Ciudad' },
            { value: 'Aldea', label: '🏡 Aldea' },
            { value: 'Metrópoli', label: '🏙️ Metrópoli' },
            { value: 'Atalaya', label: '🔭 Atalaya' },
            { value: 'Puerto', label: '⚓ Puerto' }
        ];
        
        structures.forEach(structure => {
            const option = document.createElement('option');
            option.value = structure.value;
            option.textContent = structure.label;
            selector.appendChild(option);
        });
    },
    
    /**
     * Maneja cambio de herramienta
     * @param {string} toolName - Nombre de la herramienta
     */
    selectTool(toolName) {
        EditorState.currentTool = toolName;
        
        console.log(`[EditorUI] Herramienta seleccionada: ${toolName}`);
        
        // Resaltar botón activo (móvil)
        document.querySelectorAll('.tool-btn-mobile').forEach(btn => {
            btn.classList.remove('editor-tool-active');
        });
        
        const activeBtn = document.querySelector(`[data-tool="${toolName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('editor-tool-active');
        }
        
        // Mostrar panel correspondiente
        document.querySelectorAll('.tool-panel-mobile').forEach(panel => {
            panel.style.display = 'none';
        });
        
        const activePanel = document.getElementById(`toolPanel_${toolName}`);
        if (activePanel) {
            activePanel.style.display = 'flex';
        }
        
        // Actualizar valores seleccionados según selectores
        this.updateToolSettings();
    },
    
    /**
     * Actualiza configuraciones de la herramienta actual desde los selectores
     */
    updateToolSettings() {
        const terrainSelector = document.getElementById('terrainTypeSelector');
        if (terrainSelector && EditorState.currentTool === 'terrain') {
            EditorState.selectedTerrain = terrainSelector.value;
        }
        
        const unitTypeSelector = document.getElementById('unitTypeSelector');
        if (unitTypeSelector && EditorState.currentTool === 'unit') {
            EditorState.selectedUnitType = unitTypeSelector.value;
        }
        
        const playerSelectorByTool = {
            unit: 'unitPlayerSelector',
            structure: 'structurePlayerSelector',
            player_owner: 'ownerPlayerSelector'
        };
        const playerSelectorId = playerSelectorByTool[EditorState.currentTool];
        const playerSelector = playerSelectorId ? document.getElementById(playerSelectorId) : null;
        if (playerSelector) {
            EditorState.selectedPlayer = parseInt(playerSelector.value, 10) || 1;
        }
        
        const structureSelector = document.getElementById('structureTypeSelector');
        if (structureSelector && EditorState.currentTool === 'structure') {
            EditorState.selectedStructure = structureSelector.value;
        }
    },
    
    /**
     * Guarda el escenario actual
     */
    async saveScenario() {
        console.log('[EditorUI] Guardando escenario...');
        
        // Pedir nombre si no tiene
        if (EditorState.scenarioMeta.name === 'Sin título') {
            const name = prompt('Nombre del escenario:');
            if (!name) return;
            EditorState.scenarioMeta.name = name;
        }
        
        const scenarioData = EditorSerializer.exportScenario();

        // Metadatos de guardado
        scenarioData.meta.modified_at = Date.now();

        try {
            let scenarioId = null;
            if (typeof ScenarioStorage !== 'undefined' && ScenarioStorage.saveToLocalStorage) {
                scenarioId = ScenarioStorage.saveToLocalStorage(scenarioData);
            } else {
                scenarioId = `SCENARIO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem(scenarioId, JSON.stringify(scenarioData));
            }

            console.log('[EditorUI] Escenario guardado en localStorage:', scenarioId);
            
            // Guardar también en Supabase si está disponible
            if (typeof ScenarioStorage !== 'undefined' && ScenarioStorage.saveToSupabase) {
                await ScenarioStorage.saveToSupabase(scenarioData, false);
            }

            if (this._integrationContext.onScenarioSaved) {
                this._integrationContext.onScenarioSaved(scenarioData, scenarioId);
            }
            
            alert('✅ Escenario guardado correctamente');
            this.updateScenarioName();

            if (this._integrationContext.returnToCampaignEditor) {
                this._closeAndRouteBack();
            }
        } catch (error) {
            console.error('[EditorUI] Error guardando escenario:', error);
            alert('❌ Error al guardar el escenario');
        }
    },
    
    /**
     * Prueba el escenario en el motor de juego
     */
    testScenario() {
        if (!confirm('¿Probar el escenario? (Se cerrará el editor)')) return;
        
        console.log('[EditorUI] Preparando escenario para prueba...');
        
        // Guardar temporalmente
        const scenarioData = EditorSerializer.exportScenario();
        sessionStorage.setItem('TEMP_TEST_SCENARIO', JSON.stringify(scenarioData));
        
        // Preparar escenario para juego
        EditorSerializer.prepareScenarioForPlay(scenarioData);
        
        // Cerrar editor
        EditorState.isEditorMode = false;
        
        const editorContainer = document.getElementById('scenarioEditorContainer');
        if (editorContainer) editorContainer.style.display = 'none';
        
        // Iniciar juego
        gameState.currentPhase = scenarioData.settings.startingPhase || 'deployment';
        
        // Mostrar contenedor del juego y restaurar estilos normales
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.display = 'flex';
        }
        
        // Actualizar UI
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
        
        console.log('[EditorUI] Escenario cargado para prueba');
    },
    
    /**
     * Exporta el escenario como archivo JSON descargable
     */
    exportScenario() {
        console.log('[EditorUI] Exportando escenario...');
        
        const scenarioData = EditorSerializer.exportScenario();
        const jsonStr = JSON.stringify(scenarioData, null, 2);
        
        // Crear blob y descarga
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scenarioData.meta.name.replace(/\s+/g, '_')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('[EditorUI] Escenario exportado');
    },
    
    /**
     * Importa un escenario desde archivo JSON
     */
    importScenario() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const scenarioData = JSON.parse(event.target.result);
                    EditorSerializer.importScenario(scenarioData);
                    this.updateScenarioName();
                    alert('✅ Escenario importado correctamente');
                } catch (error) {
                    console.error('[EditorUI] Error importando escenario:', error);
                    alert('❌ Error al importar el escenario');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    },
    
    /**
     * Cierra el editor y vuelve al menú principal
     */
    closeEditor() {
        if (!confirm('¿Salir del editor? Los cambios no guardados se perderán.')) return;
        
        console.log('[EditorUI] Cerrando editor');

        this._closeAndRouteBack();
    },
    
    /**
     * Deshace la última acción
     */
    undo() {
        if (EditorState.historyIndex <= 0) {
            console.log('[EditorUI] No hay acciones para deshacer');
            return;
        }
        
        EditorState.historyIndex--;
        EditorActions.restoreSnapshot(EditorState.history[EditorState.historyIndex]);
        console.log('[EditorUI] Deshacer aplicado');
    },
    
    /**
     * Rehace la última acción deshecha
     */
    redo() {
        if (EditorState.historyIndex >= EditorState.history.length - 1) {
            console.log('[EditorUI] No hay acciones para rehacer');
            return;
        }
        
        EditorState.historyIndex++;
        EditorActions.restoreSnapshot(EditorState.history[EditorState.historyIndex]);
        console.log('[EditorUI] Rehacer aplicado');
    },
    
    /**
     * Actualiza el nombre del escenario en la UI
     */
    updateScenarioName() {
        const nameElement = document.getElementById('editorScenarioName');
        if (nameElement) {
            nameElement.textContent = EditorState.scenarioMeta.name;
        }
    },
    
    /**
     * Abre modal de configuración del mapa
     */
    openMapSettings() {
        const rows = prompt('Filas del mapa:', EditorState.scenarioSettings.dimensions.rows);
        const cols = prompt('Columnas del mapa:', EditorState.scenarioSettings.dimensions.cols);
        
        if (rows && cols) {
            const numRows = parseInt(rows);
            const numCols = parseInt(cols);
            
            if (numRows > 0 && numCols > 0) {
                EditorState.scenarioSettings.dimensions = { rows: numRows, cols: numCols };
                this.initializeEmptyBoard(numRows, numCols);
            }
        }
    },
    
    /**
     * Toggle del panel de herramientas móvil
     */
    toggleToolPanel() {
        const panel = document.getElementById('editorToolsPanel');
        if (!panel) return;
        
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        
        const toggleBtn = document.getElementById('toolsPanelToggle');
        if (toggleBtn) {
            toggleBtn.style.background = isHidden ? '#00f3ff' : 'rgba(0, 243, 255, 0.2)';
            toggleBtn.style.color = isHidden ? '#000' : '#00f3ff';
        }
    },
    
    /**
     * Abre menú de opciones avanzadas del editor
     */
    openEditorMenu() {
        const options = [
            '📤 Exportar JSON',
            '📥 Importar JSON',
            '📜 Metadatos Históricos',
            '↶ Deshacer',
            '↷ Rehacer',
            '⚙️ Tamaño del Mapa',
            '👥 Jugadores',
            '🏆 Condiciones Victoria',
            '🎲 Generar Mapa Aleatorio'
        ];
        
        // Crear menú simple con botones
        const menu = document.createElement('div');
        menu.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(10,25,41,0.98); border: 2px solid #00f3ff; border-radius: 10px; padding: 20px; z-index: 10505; max-width: 90%; min-width: 250px; pointer-events: auto;';
        
        const title = document.createElement('h3');
        title.textContent = 'Opciones del Editor';
        title.style.cssText = 'color: #00f3ff; margin: 0 0 15px 0; text-align: center;';
        menu.appendChild(title);
        
        options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.textContent = opt;
            btn.style.cssText = 'display: block; width: 100%; padding: 12px; margin-bottom: 8px; background: rgba(0,243,255,0.1); border: 1px solid #00f3ff; border-radius: 5px; color: #00f3ff; font-size: 1em; cursor: pointer; pointer-events: auto;';
            
            btn.onclick = () => {
                document.body.removeChild(menu);
                switch(index) {
                    case 0: this.exportScenario(); break;
                    case 1: this.importScenario(); break;
                    case 2: this.openHistoricalMetadata(); break;
                    case 3: this.undo(); break;
                    case 4: this.redo(); break;
                    case 5: this.openMapSettings(); break;
                    case 6: this.openPlayerSettings(); break;
                    case 7: this.openVictoryConditions(); break;
                    case 8: this.generateProcedural(); break;
                }
            };
            
            menu.appendChild(btn);
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar';
        closeBtn.style.cssText = 'display: block; width: 100%; padding: 12px; background: #dc3545; border: none; border-radius: 5px; color: white; font-size: 1em; cursor: pointer; margin-top: 10px; pointer-events: auto;';
        closeBtn.onclick = () => document.body.removeChild(menu);
        menu.appendChild(closeBtn);
        
        document.body.appendChild(menu);
    },
    
    /**
     * Abre configuración de jugadores
     */
    openPlayerSettings() {
        // TODO: Implementar modal completo
        const maxPlayers = prompt('Número máximo de jugadores (2-8):', EditorState.scenarioSettings.maxPlayers);
        
        if (maxPlayers) {
            const num = parseInt(maxPlayers);
            if (num >= 2 && num <= 8) {
                EditorState.scenarioSettings.maxPlayers = num;
                
                // Inicializar configuración para nuevos jugadores
                for (let i = 1; i <= num; i++) {
                    if (!EditorState.playerConfigs[i]) {
                        EditorState.playerConfigs[i] = {
                            civilization: null,
                            controllerType: i === 1 ? 'human' : 'ai',
                            aiDifficulty: 'medium',
                            resources: {
                                oro: 1000,
                                comida: 500,
                                madera: 200,
                                piedra: 0,
                                hierro: 0,
                                puntosInvestigacion: 0,
                                puntosReclutamiento: 300
                            }
                        };
                    }
                }
                
                this.populatePlayerSelector();
            }
        }
    },
    
    /**
     * Abre configuración de condiciones de victoria
     */
    openVictoryConditions() {
        // TODO: Implementar modal completo
        alert('Condiciones de victoria:\n\n' +
              '✅ Eliminar jugador enemigo\n' +
              '⏱️ Límite de turnos (configurable)\n' +
              '🏰 Capturar ciudades clave');
    },

    /**
     * Abre modal de metadatos históricos del escenario
     */
    openHistoricalMetadata() {
        const existing = document.getElementById('editorHistoricalMetaModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'editorHistoricalMetaModal';
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 10520; display: flex; align-items: center; justify-content: center; padding: 16px; pointer-events: auto;';

        const panel = document.createElement('div');
        panel.style.cssText = 'width: min(720px, 100%); max-height: 90vh; overflow-y: auto; background: #0b1623; border: 2px solid #00f3ff; border-radius: 10px; padding: 16px; color: #e5f6ff;';

        const esc = (v) => String(v || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        panel.innerHTML = `
            <h3 style="margin: 0 0 12px 0; color: #00f3ff;">Metadatos Históricos del Escenario</h3>
            <p style="margin: 0 0 14px 0; color: #9fd3e6; font-size: 0.92em;">Documenta la batalla para convertir este escenario en una recreación histórica completa.</p>

            <label style="display:block; margin-bottom:8px;">Título histórico
                <input id="histTitle" type="text" style="width:100%; margin-top:4px;" value="${esc(EditorState.scenarioMeta.historicalTitle)}">
            </label>
            <label style="display:block; margin-bottom:8px;">Periodo
                <input id="histPeriod" type="text" style="width:100%; margin-top:4px;" placeholder="Ej: Segunda Guerra Púnica" value="${esc(EditorState.scenarioMeta.historicalPeriod)}">
            </label>
            <label style="display:block; margin-bottom:8px;">Fecha o rango temporal
                <input id="histDate" type="text" style="width:100%; margin-top:4px;" placeholder="Ej: 216 a.C." value="${esc(EditorState.scenarioMeta.historicalDate)}">
            </label>
            <label style="display:block; margin-bottom:8px;">Ubicación
                <input id="histLocation" type="text" style="width:100%; margin-top:4px;" placeholder="Ej: Cannas, Apulia" value="${esc(EditorState.scenarioMeta.historicalLocation)}">
            </label>
            <label style="display:block; margin-bottom:8px;">Bandos y comandantes
                <textarea id="histSides" rows="3" style="width:100%; margin-top:4px;">${esc(EditorState.scenarioMeta.historicalSides)}</textarea>
            </label>
            <label style="display:block; margin-bottom:8px;">Contexto histórico
                <textarea id="histContext" rows="5" style="width:100%; margin-top:4px;">${esc(EditorState.scenarioMeta.historicalContext)}</textarea>
            </label>
            <label style="display:block; margin-bottom:8px;">Objetivos del escenario
                <textarea id="histObjectives" rows="4" style="width:100%; margin-top:4px;">${esc(EditorState.scenarioMeta.historicalObjectives)}</textarea>
            </label>
            <label style="display:block; margin-bottom:8px;">Fuentes / bibliografía
                <textarea id="histSources" rows="4" style="width:100%; margin-top:4px;">${esc(EditorState.scenarioMeta.historicalSources)}</textarea>
            </label>

            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">
                <button id="histCancelBtn" style="padding:10px 14px; background:#444; color:#fff; border:none; border-radius:6px; cursor:pointer;">Cancelar</button>
                <button id="histSaveBtn" style="padding:10px 14px; background:#00f3ff; color:#001018; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Guardar metadatos</button>
            </div>
        `;

        modal.appendChild(panel);
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        panel.querySelector('#histCancelBtn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        panel.querySelector('#histSaveBtn').addEventListener('click', () => {
            EditorState.scenarioMeta.historicalTitle = panel.querySelector('#histTitle').value.trim();
            EditorState.scenarioMeta.historicalPeriod = panel.querySelector('#histPeriod').value.trim();
            EditorState.scenarioMeta.historicalDate = panel.querySelector('#histDate').value.trim();
            EditorState.scenarioMeta.historicalLocation = panel.querySelector('#histLocation').value.trim();
            EditorState.scenarioMeta.historicalSides = panel.querySelector('#histSides').value.trim();
            EditorState.scenarioMeta.historicalContext = panel.querySelector('#histContext').value.trim();
            EditorState.scenarioMeta.historicalObjectives = panel.querySelector('#histObjectives').value.trim();
            EditorState.scenarioMeta.historicalSources = panel.querySelector('#histSources').value.trim();
            EditorState.scenarioMeta.modified_at = Date.now();

            alert('✅ Metadatos históricos guardados en el escenario');
            closeModal();
        });
    },
    
    /**
     * Genera un mapa procedural
     */
    generateProcedural() {
        if (!confirm('¿Generar mapa procedural? Esto borrará el contenido actual.')) return;
        
        const biome = prompt('Tipo de bioma (mixed/naval/plains):', 'mixed');
        
        const { rows, cols } = EditorState.scenarioSettings.dimensions;
        EditorTools.generateProceduralBase(rows, cols, biome);
        
        console.log('[EditorUI] Mapa procedural generado');
    }
};

/**
 * Manejador de clic en hexágono en modo editor
 * @param {number} r - Fila
 * @param {number} c - Columna
 */
function handleEditorHexClick(r, c) {
    const hex = board[r]?.[c];
    if (!hex) return;
    
    // Guardar estado para Undo (throttled)
    EditorActions.saveHistorySnapshot();
    
    // Aplicar herramienta actual
    switch (EditorState.currentTool) {
        case 'terrain':
            EditorState.selectedTerrain = document.getElementById('terrainTypeSelector')?.value || 'plains';
            EditorTools.paintTerrain(r, c, EditorState.selectedTerrain);
            break;
            
        case 'unit':
            EditorState.selectedUnitType = document.getElementById('unitTypeSelector')?.value;
            EditorState.selectedPlayer = parseInt(document.getElementById('unitPlayerSelector')?.value || 1, 10);
            
            if (EditorState.selectedUnitType) {
                EditorTools.placeUnit(r, c, {
                    type: EditorState.selectedUnitType,
                    player: EditorState.selectedPlayer
                });
            }
            break;
            
        case 'structure':
            EditorState.selectedStructure = document.getElementById('structureTypeSelector')?.value;
            EditorState.selectedPlayer = parseInt(document.getElementById('structurePlayerSelector')?.value || 1, 10);
            
            if (EditorState.selectedStructure) {
                EditorTools.placeStructure(r, c, EditorState.selectedStructure);
            }
            break;
            
        case 'player_owner':
            EditorState.selectedPlayer = parseInt(document.getElementById('ownerPlayerSelector')?.value || 1, 10);
            EditorTools.setHexOwner(r, c, EditorState.selectedPlayer);
            break;
            
        case 'eraser':
            EditorTools.eraseHexContent(r, c);
            break;
            
        default:
            console.log('[EditorUI] Sin herramienta seleccionada. Haz clic en una herramienta primero.');
            return;
    }
    
    // Actualizar visualización del hexágono
    if (typeof updateHex === 'function') {
        updateHex(r, c);
    } else if (typeof renderFullBoardVisualState === 'function') {
        renderFullBoardVisualState();
    }
}

// Manejar eventos globales del editor
document.addEventListener('mouseup', () => {
    EditorState.isPainting = false;
});

console.log("editorUI.js: EditorUI y handleEditorHexClick listos");
