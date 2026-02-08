Editor_prototipo_desarrollo.md

# 🎮 PROTOTIPO DE DESARROLLO: Sistema de Edición de Escenarios y Campañas

**Fecha:** 8 de Febrero, 2026  
**Proyecto:** IBERION - Editor de Contenido UGC  
**Autor:** GitHub Copilot + rubsrueda

---

## 📊 FASE 0: Análisis de Arquitectura Actual

### Archivos Clave a Modificar/Extender:
```
state.js          → Añadir flags de modo editor
main.js           → Bifurcar onHexClick() según modo
boardManager.js   → Exponer funciones de generación
constants.js      → Definir constantes del editor
index.html        → Crear UI del editor (overlay)
```

### Nuevos Archivos a Crear:
```
scenarioEditor.js      → Lógica del editor de escenarios
campaignEditor.js      → Lógica del editor de campañas
editorUI.js            → UI/controles del editor
scenarioStorage.js     → Guardar/cargar escenarios (localStorage + Supabase)
campaignStorage.js     → Guardar/cargar campañas
editorConstants.js     → Constantes específicas del editor
```

---

## 🏗️ FASE 1: Fundamentos del Editor (MVP Mínimo)

### 1.1 Estado del Editor (editorState)

```javascript
// En state.js - AÑADIR:
const EditorState = {
    isEditorMode: false,           // Flag principal
    currentTool: null,             // 'terrain' | 'unit' | 'structure' | 'eraser'
    selectedTerrain: 'plains',     // Para pincel de terreno
    selectedUnitType: null,        // Para colocación de unidades
    selectedPlayer: 1,             // Jugador activo en edición
    selectedStructure: null,       // Para colocación de estructuras
    isPainting: false,             // Para arrastrar y pintar
    
    // Metadata del escenario actual
    scenarioMeta: {
        name: 'Sin título',
        author: null,
        created_at: null,
        modified_at: null,
        version: '1.0'
    },
    
    // Configuración del escenario
    scenarioSettings: {
        dimensions: { rows: 12, cols: 15 },
        maxPlayers: 2,
        startingPhase: 'deployment',  // 'deployment' | 'play'
        turnLimit: null,
        victoryConditions: ['eliminate_enemy'] // Array de condiciones
    },
    
    // Configuración de jugadores
    playerConfigs: {
        1: {
            civilization: null,      // null = "elegir al jugar"
            controllerType: 'human', // 'human' | 'ai'
            aiDifficulty: null,
            resources: {
                oro: 1000,
                comida: 500,
                madera: 200,
                piedra: 0,
                hierro: 0,
                puntosInvestigacion: 0,
                puntosReclutamiento: 300
            }
        },
        2: { /* ... */ }
    },
    
    // Historia de acciones (para Undo/Redo)
    history: [],
    historyIndex: -1,
    maxHistorySize: 50
};
```

### 1.2 Modificación de onHexClick()

```javascript
// En main.js - MODIFICAR:

function onHexClick(r, c) {
    // === BIFURCACIÓN: Modo Editor vs Modo Juego ===
    
    if (EditorState.isEditorMode) {
        handleEditorHexClick(r, c);
        return; // Salir temprano, no ejecutar lógica de juego
    }
    
    // ... [Lógica existente del juego] ...
}

// NUEVA FUNCIÓN:
function handleEditorHexClick(r, c) {
    const hex = board[r]?.[c];
    if (!hex) return;
    
    // Guardar estado para Undo
    EditorActions.saveHistorySnapshot();
    
    switch (EditorState.currentTool) {
        case 'terrain':
            EditorTools.paintTerrain(r, c, EditorState.selectedTerrain);
            break;
            
        case 'unit':
            EditorTools.placeUnit(r, c, {
                type: EditorState.selectedUnitType,
                player: EditorState.selectedPlayer
            });
            break;
            
        case 'structure':
            EditorTools.placeStructure(r, c, EditorState.selectedStructure);
            break;
            
        case 'eraser':
            EditorTools.eraseHexContent(r, c);
            break;
            
        default:
            console.log('[Editor] Sin herramienta seleccionada');
    }
    
    // Actualizar visualización
    updateHex(r, c);
}
```

---

## 🎨 FASE 2: Herramientas del Editor

### 2.1 Módulo de Herramientas (EditorTools)

```javascript
// scenarioEditor.js

const EditorTools = {
    
    /**
     * Pinta un hexágono con un tipo de terreno
     */
    paintTerrain(r, c, terrainType) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // Validar tipo de terreno
        if (!TERRAIN_TYPES[terrainType]) {
            console.error('[Editor] Tipo de terreno inválido:', terrainType);
            return false;
        }
        
        hex.terrain = terrainType;
        
        // Auto-asignar recursos según terreno
        if (terrainType === 'forest' && !hex.resourceNode) {
            hex.resourceNode = 'madera';
        } else if (terrainType === 'hills' && !hex.resourceNode) {
            hex.resourceNode = Math.random() < 0.5 ? 'piedra' : 'hierro';
        } else if (terrainType === 'water') {
            // Limpiar estructuras/unidades en agua
            hex.resourceNode = null;
            hex.structure = null;
            EditorTools.removeUnitAt(r, c);
        }
        
        console.log(`[Editor] Terreno ${terrainType} aplicado en (${r},${c})`);
        return true;
    },
    
    /**
     * Coloca una unidad en el hexágono
     */
    placeUnit(r, c, unitConfig) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // Verificar que no haya ya una unidad
        const existingUnit = getUnitOnHex(r, c);
        if (existingUnit) {
            console.warn('[Editor] Ya hay una unidad en este hexágono');
            return false;
        }
        
        // Validar terreno transitable
        if (hex.terrain === 'water' && !unitConfig.isNaval) {
            console.warn('[Editor] No se puede colocar unidad terrestre en agua');
            return false;
        }
        
        // Crear unidad temporal (sin ID final)
        const tempUnit = {
            tempId: `TEMP_${Date.now()}_${Math.random()}`, // ID temporal
            type: unitConfig.type,
            player: unitConfig.player,
            r: r,
            c: c,
            regiments: unitConfig.regiments || [
                { type: unitConfig.type, health: 200 }
            ],
            // Flags de editor
            isEditorPlaced: true,
            customName: unitConfig.customName || null
        };
        
        units.push(tempUnit);
        console.log(`[Editor] Unidad ${unitConfig.type} colocada en (${r},${c})`);
        return true;
    },
    
    /**
     * Coloca una estructura (ciudad, camino, etc.)
     */
    placeStructure(r, c, structureType) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // No permitir estructuras en agua (excepto puertos en el futuro)
        if (hex.terrain === 'water') {
            console.warn('[Editor] No se pueden colocar estructuras en agua');
            return false;
        }
        
        hex.structure = structureType;
        
        // Si es una ciudad, registrarla en gameState.cities
        if (structureType === 'Ciudad' || structureType === 'Metrópoli' || structureType === 'Aldea') {
            const cityName = `Ciudad ${gameState.cities.length + 1}`;
            addCityToBoardData(r, c, EditorState.selectedPlayer, cityName, false);
        }
        
        console.log(`[Editor] Estructura ${structureType} colocada en (${r},${c})`);
        return true;
    },
    
    /**
     * Borra contenido del hexágono
     */
    eraseHexContent(r, c) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // Remover unidad si existe
        EditorTools.removeUnitAt(r, c);
        
        // Remover estructura
        hex.structure = null;
        
        // Remover ciudad de gameState.cities si es ciudad
        gameState.cities = gameState.cities.filter(city => 
            !(city.r === r && city.c === c)
        );
        
        // NO borrar el terreno (solo contenido)
        console.log(`[Editor] Contenido borrado en (${r},${c})`);
        return true;
    },
    
    /**
     * Helper: Remueve unidad en coordenadas
     */
    removeUnitAt(r, c) {
        const unitIndex = units.findIndex(u => u.r === r && u.c === c);
        if (unitIndex >= 0) {
            units.splice(unitIndex, 1);
            return true;
        }
        return false;
    },
    
    /**
     * Genera mapa procedural como base
     */
    generateProceduralBase(rows, cols, biome = 'mixed') {
        // Reutilizar lógica de boardManager.js
        const resourceLevel = 'med';
        const isNaval = (biome === 'naval');
        
        generateProceduralMap(rows, cols, resourceLevel, isNaval, 'editor');
        
        console.log(`[Editor] Mapa procedural ${rows}x${cols} generado (${biome})`);
    }
};
```

---

## 🖥️ FASE 3: Interfaz del Editor (UI)

### 3.1 HTML del Editor (index.html - AÑADIR)

```html
<!-- Editor de Escenarios - Overlay -->
<div id="scenarioEditorContainer" style="display: none;">
    
    <!-- Menú Superior -->
    <div id="editorTopMenu" class="editor-top-bar">
        <button onclick="EditorUI.saveScenario()">💾 Guardar</button>
        <button onclick="EditorUI.testScenario()">▶️ Probar</button>
        <button onclick="EditorUI.exportScenario()">📤 Exportar</button>
        <button onclick="EditorUI.closeEditor()">❌ Salir</button>
        
        <span id="editorScenarioName">Sin título</span>
        
        <button onclick="EditorUI.undo()">↶ Deshacer</button>
        <button onclick="EditorUI.redo()">↷ Rehacer</button>
    </div>
    
    <!-- Panel Lateral: Herramientas -->
    <div id="editorToolbox" class="editor-sidebar">
        <h3>🛠️ Herramientas</h3>
        
        <!-- Selector de Herramienta -->
        <div class="tool-selector">
            <button class="tool-btn" data-tool="terrain">🗺️ Terreno</button>
            <button class="tool-btn" data-tool="unit">🎖️ Unidades</button>
            <button class="tool-btn" data-tool="structure">🏰 Estructuras</button>
            <button class="tool-btn" data-tool="eraser">🗑️ Borrador</button>
        </div>
        
        <!-- Panel de Terreno -->
        <div id="toolPanel_terrain" class="tool-panel" style="display: none;">
            <h4>Tipo de Terreno</h4>
            <select id="terrainTypeSelector">
                <option value="plains">🌾 Llanura</option>
                <option value="forest">🌲 Bosque</option>
                <option value="hills">⛰️ Colinas</option>
                <option value="water">🌊 Agua</option>
            </select>
        </div>
        
        <!-- Panel de Unidades -->
        <div id="toolPanel_unit" class="tool-panel" style="display: none;">
            <h4>Jugador</h4>
            <select id="unitPlayerSelector">
                <option value="1">Jugador 1</option>
                <option value="2">Jugador 2</option>
                <option value="3">Jugador 3</option>
                <option value="4">Jugador 4</option>
            </select>
            
            <h4>Tipo de Unidad</h4>
            <select id="unitTypeSelector">
                <!-- Generado dinámicamente desde REGIMENT_TYPES -->
            </select>
        </div>
        
        <!-- Panel de Estructuras -->
        <div id="toolPanel_structure" class="tool-panel" style="display: none;">
            <h4>Tipo de Estructura</h4>
            <select id="structureTypeSelector">
                <option value="Camino">🞰 Camino</option>
                <option value="Fortaleza">🏰 Fortaleza</option>
                <option value="Ciudad">🏘️ Ciudad</option>
                <option value="Aldea">🏡 Aldea</option>
                <option value="Atalaya">🔭 Atalaya</option>
            </select>
        </div>
    </div>
    
    <!-- Panel Inferior: Configuración -->
    <div id="editorBottomPanel" class="editor-bottom-bar">
        <button onclick="EditorUI.openMapSettings()">⚙️ Configuración del Mapa</button>
        <button onclick="EditorUI.openPlayerSettings()">👥 Jugadores</button>
        <button onclick="EditorUI.openVictoryConditions()">🏆 Condiciones de Victoria</button>
    </div>
    
</div>
```

### 3.2 JavaScript de la UI (editorUI.js)

```javascript
// editorUI.js

const EditorUI = {
    
    /**
     * Abre el editor de escenarios
     */
    openScenarioEditor() {
        // Ocultar menú principal
        document.getElementById('mainMenu').style.display = 'none';
        
        // Mostrar UI del editor
        document.getElementById('scenarioEditorContainer').style.display = 'block';
        
        // Activar modo editor
        EditorState.isEditorMode = true;
        
        // Inicializar tablero vacío o cargar escenario
        this.initializeEmptyBoard(12, 15);
        
        // Poblar selectores
        this.populateUnitTypeSelector();
        
        console.log('[EditorUI] Editor de escenarios abierto');
    },
    
    /**
     * Inicializa un tablero vacío
     */
    initializeEmptyBoard(rows, cols) {
        // Limpiar estado de juego
        units = [];
        gameState.cities = [];
        
        // Crear tablero nuevo
        board = Array(rows).fill(null).map(() => Array(cols).fill(null));
        
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hexElement = createHexDOMElementWithListener(r, c);
                gameBoard.appendChild(hexElement);
                
                board[r][c] = {
                    element: hexElement,
                    terrain: 'plains', // Terreno por defecto
                    owner: null,
                    structure: null,
                    isCity: false,
                    resourceNode: null,
                    visibility: {}
                };
            }
        }
        
        renderBoardToDOM();
        console.log(`[EditorUI] Tablero ${rows}x${cols} inicializado`);
    },
    
    /**
     * Pobla el selector de tipos de unidad
     */
    populateUnitTypeSelector() {
        const selector = document.getElementById('unitTypeSelector');
        selector.innerHTML = '';
        
        for (const [unitType, data] of Object.entries(REGIMENT_TYPES)) {
            const option = document.createElement('option');
            option.value = unitType;
            option.textContent = `${data.sprite || '⚔️'} ${unitType}`;
            selector.appendChild(option);
        }
    },
    
    /**
     * Maneja cambio de herramienta
     */
    selectTool(toolName) {
        EditorState.currentTool = toolName;
        
        // Resaltar botón activo
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${toolName}"]`)?.classList.add('active');
        
        // Mostrar panel correspondiente
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        document.getElementById(`toolPanel_${toolName}`)?.style.display = 'block';
        
        console.log(`[EditorUI] Herramienta seleccionada: ${toolName}`);
    },
    
    /**
     * Guarda el escenario
     */
    async saveScenario() {
        const scenarioData = EditorSerializer.exportScenario();
        
        // Pedir nombre si no tiene
        if (EditorState.scenarioMeta.name === 'Sin título') {
            const name = prompt('Nombre del escenario:');
            if (!name) return;
            EditorState.scenarioMeta.name = name;
            scenarioData.meta.name = name;
        }
        
        // Guardar en localStorage
        const scenarioId = `SCENARIO_${Date.now()}`;
        localStorage.setItem(scenarioId, JSON.stringify(scenarioData));
        
        // TODO: Guardar en Supabase
        // await ScenarioStorage.saveToSupabase(scenarioData);
        
        alert('✅ Escenario guardado correctamente');
        console.log('[EditorUI] Escenario guardado:', scenarioId);
    },
    
    /**
     * Carga el escenario en el juego para probarlo
     */
    testScenario() {
        if (!confirm('¿Probar el escenario? (Se cerrará el editor)')) return;
        
        // Guardar temporalmente
        const scenarioData = EditorSerializer.exportScenario();
        sessionStorage.setItem('TEMP_TEST_SCENARIO', JSON.stringify(scenarioData));
        
        // Cerrar editor
        EditorState.isEditorMode = false;
        
        // Cargar escenario en el motor de juego
        EditorSerializer.importScenario(scenarioData);
        
        // Iniciar juego
        gameState.currentPhase = scenarioData.settings.startingPhase || 'deployment';
        
        console.log('[EditorUI] Escenario cargado para prueba');
    },
    
    /**
     * Cierra el editor
     */
    closeEditor() {
        if (!confirm('¿Salir del editor? Los cambios no guardados se perderán.')) return;
        
        EditorState.isEditorMode = false;
        document.getElementById('scenarioEditorContainer').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
        
        console.log('[EditorUI] Editor cerrado');
    },
    
    // Undo/Redo (simplificado)
    undo() {
        if (EditorState.historyIndex <= 0) return;
        EditorState.historyIndex--;
        EditorActions.restoreSnapshot(EditorState.history[EditorState.historyIndex]);
    },
    
    redo() {
        if (EditorState.historyIndex >= EditorState.history.length - 1) return;
        EditorState.historyIndex++;
        EditorActions.restoreSnapshot(EditorState.history[EditorState.historyIndex]);
    }
};
```

---

## 💾 FASE 4: Serialización (Guardar/Cargar)

### 4.1 Exportación de Escenarios

```javascript
// scenarioEditor.js

const EditorSerializer = {
    
    /**
     * Exporta el estado actual como JSON de escenario
     */
    exportScenario() {
        // Serializar board[][] de forma compacta (solo hexágonos modificados)
        const boardData = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                
                // Solo guardar si no es el terreno por defecto vacío
                if (hex.terrain !== 'plains' || 
                    hex.structure || 
                    hex.resourceNode || 
                    hex.owner !== null) {
                    
                    boardData.push({
                        r: r,
                        c: c,
                        terrain: hex.terrain,
                        owner: hex.owner,
                        structure: hex.structure,
                        resourceNode: hex.resourceNode,
                        isCity: hex.isCity,
                        isCapital: hex.isCapital
                    });
                }
            }
        }
        
        // Serializar unidades (limpiar IDs temporales)
        const unitsData = units.map(unit => ({
            type: unit.type || unit.regiments[0]?.type,
            player: unit.player,
            r: unit.r,
            c: unit.c,
            regiments: unit.regiments.map(reg => ({
                type: reg.type,
                health: reg.health || 200
            })),
            customName: unit.customName || null,
            isVeteran: unit.isVeteran || false
        }));
        
        // Construir el JSON final
        const scenarioJSON = {
            meta: {
                name: EditorState.scenarioMeta.name,
                author: PlayerDataManager.currentPlayer?.displayName || 'Anónimo',
                created_at: EditorState.scenarioMeta.created_at || Date.now(),
                modified_at: Date.now(),
                version: '1.0'
            },
            
            settings: {
                dimensions: EditorState.scenarioSettings.dimensions,
                maxPlayers: EditorState.scenarioSettings.maxPlayers,
                startingPhase: EditorState.scenarioSettings.startingPhase,
                turnLimit: EditorState.scenarioSettings.turnLimit,
                victoryConditions: EditorState.scenarioSettings.victoryConditions
            },
            
            boardData: boardData,
            unitsData: unitsData,
            citiesData: gameState.cities,
            
            playerConfig: EditorState.playerConfigs
        };
        
        return scenarioJSON;
    },
    
    /**
     * Importa un escenario desde JSON
     */
    importScenario(scenarioJSON) {
        // Validar estructura
        if (!scenarioJSON.meta || !scenarioJSON.settings) {
            console.error('[EditorSerializer] JSON de escenario inválido');
            return false;
        }
        
        // Inicializar tablero con dimensiones del escenario
        const { rows, cols } = scenarioJSON.settings.dimensions;
        EditorUI.initializeEmptyBoard(rows, cols);
        
        // Cargar hexágonos modificados
        for (const hexData of scenarioJSON.boardData) {
            const hex = board[hexData.r]?.[hexData.c];
            if (!hex) continue;
            
            hex.terrain = hexData.terrain;
            hex.owner = hexData.owner;
            hex.structure = hexData.structure;
            hex.resourceNode = hexData.resourceNode;
            hex.isCity = hexData.isCity || false;
            hex.isCapital = hexData.isCapital || false;
        }
        
        // Cargar unidades (generar IDs reales)
        units = [];
        for (const unitData of scenarioJSON.unitsData) {
            const unit = {
                id: `unit_${crypto.randomUUID()}`, // ID real
                ...unitData
            };
            units.push(unit);
        }
        
        // Cargar ciudades
        gameState.cities = scenarioJSON.citiesData || [];
        
        // Cargar configuración de jugadores
        gameState.playerResources = {};
        for (const [playerId, config] of Object.entries(scenarioJSON.playerConfig)) {
            gameState.playerResources[playerId] = config.resources;
        }
        
        // Actualizar metadata del editor
        EditorState.scenarioMeta = scenarioJSON.meta;
        EditorState.scenarioSettings = scenarioJSON.settings;
        EditorState.playerConfigs = scenarioJSON.playerConfig;
        
        // Re-renderizar
        renderBoardToDOM();
        
        console.log('[EditorSerializer] Escenario importado:', scenarioJSON.meta.name);
        return true;
    }
};
```

---

## 📦 FASE 5: Integración con Supabase

### 5.1 Esquema de Base de Datos

```sql
-- Tabla para escenarios compartidos
CREATE TABLE public.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id TEXT REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    scenario_data JSONB NOT NULL,  -- El JSON completo del escenario
    is_public BOOLEAN DEFAULT false,
    downloads INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para campañas
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id TEXT REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    campaign_data JSONB NOT NULL,  -- Array de escenarios
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_scenarios_author ON public.scenarios(author_id);
CREATE INDEX idx_scenarios_public ON public.scenarios(is_public);
CREATE INDEX idx_campaigns_author ON public.campaigns(author_id);
```

### 5.2 Funciones de Storage (scenarioStorage.js)

```javascript
// scenarioStorage.js

const ScenarioStorage = {
    
    /**
     * Guarda escenario en Supabase
     */
    async saveToSupabase(scenarioData, isPublic = false) {
        if (!PlayerDataManager.currentPlayer?.auth_id) {
            console.error('[ScenarioStorage] Usuario no autenticado');
            return null;
        }
        
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
    },
    
    /**
     * Carga escenarios del usuario
     */
    async loadUserScenarios() {
        if (!PlayerDataManager.currentPlayer?.auth_id) return [];
        
        const { data, error } = await supabase
            .from('scenarios')
            .select('*')
            .eq('author_id', PlayerDataManager.currentPlayer.auth_id)
            .order('updated_at', { ascending: false });
        
        if (error) {
            console.error('[ScenarioStorage] Error cargando escenarios:', error);
            return [];
        }
        
        return data;
    },
    
    /**
     * Busca escenarios públicos
     */
    async searchPublicScenarios(query = '') {
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
        
        return data;
    }
};
```

---

## 🎯 FASE 6: Plan de Implementación (Orden Sugerido)

### Sprint 1: Fundamentos (1-2 semanas)
1. ✅ Crear `EditorState` en state.js
2. ✅ Bifurcar `onHexClick()` en main.js
3. ✅ Crear archivo `scenarioEditor.js` con `EditorTools`
4. ✅ Implementar herramienta básica de pincel de terreno
5. ✅ Crear UI mínima en HTML (botones de herramientas)

### Sprint 2: Herramientas Completas (1 semana)
6. ✅ Implementar colocación de unidades
7. ✅ Implementar colocación de estructuras
8. ✅ Implementar borrador
9. ✅ Sistema de Undo/Redo básico

### Sprint 3: Serialización (1 semana)
10. ✅ Crear `EditorSerializer` (export/import)
11. ✅ Guardar en localStorage
12. ✅ Probar escenario en el motor de juego
13. ✅ Validación de integridad de escenarios

### Sprint 4: UI Avanzada (1 semana)
14. ✅ Modal de configuración del mapa
15. ✅ Modal de configuración de jugadores
16. ✅ Modal de condiciones de victoria
17. ✅ Generación procedural desde el editor

### Sprint 5: Integración Supabase (1 semana)
18. ✅ Crear tablas en Supabase
19. ✅ Implementar `ScenarioStorage` (guardar/cargar)
20. ✅ Browser de escenarios públicos
21. ✅ Sistema de puntuación/descargas

### Sprint 6: Editor de Campañas (1-2 semanas)
22. ✅ Crear `campaignEditor.js`
23. ✅ UI para gestión de secuencias
24. ✅ Exportar/importar campañas
25. ✅ Integración con Supabase

---

## 🚀 Pasos Inmediatos para Empezar

### 1. Modificar state.js
```javascript
// Añadir al final del archivo:
const EditorState = { /* ... (ver FASE 1.1) ... */ };
```

### 2. Modificar main.js
```javascript
// Reemplazar función onHexClick con bifurcación (ver FASE 1.2)
```

### 3. Crear scenarioEditor.js
```javascript
// Nuevo archivo con EditorTools (ver FASE 2.1)
```

### 4. Añadir al index.html
```html
<!-- Antes de </body> -->
<script src="scenarioEditor.js"></script>
```

### 5. Crear botón en menú principal
```html
<button onclick="EditorUI.openScenarioEditor()">
    🛠️ Editor de Escenarios
</button>
```

---

## ⚠️ Consideraciones Importantes

### Compatibilidad con Código Existente
- ✅ El editor NO debe romper el flujo de juego normal
- ✅ Usar flags (`isEditorMode`) para bifurcación limpia
- ✅ Reutilizar máximo código existente (no duplicar lógica)

### Performance
- ⚡ Guardar snapshots de history cada N acciones (no cada clic)
- ⚡ Renderizar solo hexágonos modificados
- ⚡ Comprimir datos de escenario para Supabase

### UX/UI
- 🎨 Feedback visual claro de herramienta activa
- 🎨 Preview al arrastrar unidades/estructuras
- 🎨 Validación en tiempo real (terreno inválido = borde rojo)

---

## 📝 Checklist de Validación

Antes de considerar el editor "terminado", verificar:

- [ ] Puede crear mapa desde cero
- [ ] Puede generar mapa procedural
- [ ] Puede pintar terreno con arrastrar
- [ ] Puede colocar/remover unidades
- [ ] Puede colocar/remover estructuras
- [ ] Puede configurar jugadores
- [ ] Puede guardar en localStorage
- [ ] Puede cargar escenario guardado
- [ ] Puede probar escenario en el juego
- [ ] Escenario cargado funciona correctamente
- [ ] Undo/Redo funciona
- [ ] Puede guardar en Supabase
- [ ] Puede cargar desde Supabase
- [ ] Puede buscar escenarios públicos
- [ ] Editor de campañas funcional

---

**Fin del Prototipo de Desarrollo**

Este documento es un blueprint completo para implementar el sistema de edición. 
Actualizar conforme se implementan features o surgen cambios arquitectónicos.
