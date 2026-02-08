// scenarioEditor.js
// Sistema de edición de escenarios - Herramientas y serialización
console.log("scenarioEditor.js CARGADO");

// ===================================================================
// ==================== HERRAMIENTAS DEL EDITOR ======================
// ===================================================================

/**
 * EditorTools: Conjunto de herramientas para editar escenarios
 * Cada herramienta modifica el board[][] o units[] directamente
 */
const EditorTools = {
    
    /**
     * Pinta un hexágono con un tipo de terreno
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @param {string} terrainType - Tipo de terreno (plains, forest, water, etc.)
     */
    paintTerrain(r, c, terrainType) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // Validar tipo de terreno
        if (!TERRAIN_TYPES[terrainType]) {
            console.error('[EditorTools] Tipo de terreno inválido:', terrainType);
            return false;
        }
        
        hex.terrain = terrainType;
        
        // Auto-asignar recursos según terreno
        if (terrainType === 'forest' && !hex.resourceNode) {
            hex.resourceNode = 'madera';
        } else if (terrainType === 'hills' && !hex.resourceNode) {
            hex.resourceNode = Math.random() < 0.5 ? 'piedra' : 'hierro';
        } else if (terrainType === 'water') {
            // Limpiar estructuras/unidades en agua (excepto navales)
            hex.resourceNode = null;
            if (hex.structure && hex.structure !== 'Puerto') {
                hex.structure = null;
            }
            // Remover unidades terrestres
            const unit = getUnitOnHex(r, c);
            if (unit && !unit.isNaval) {
                EditorTools.removeUnitAt(r, c);
            }
        }
        
        console.log(`[EditorTools] Terreno ${terrainType} aplicado en (${r},${c})`);
        return true;
    },
    
    /**
     * Coloca una unidad en el hexágono
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @param {Object} unitConfig - Configuración de la unidad
     */
    placeUnit(r, c, unitConfig) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // Verificar que no haya ya una unidad
        const existingUnit = getUnitOnHex(r, c);
        if (existingUnit) {
            console.warn('[EditorTools] Ya hay una unidad en este hexágono. Usa borrador primero.');
            return false;
        }
        
        // Validar tipo de unidad
        if (!REGIMENT_TYPES[unitConfig.type]) {
            console.error('[EditorTools] Tipo de unidad inválido:', unitConfig.type);
            return false;
        }
        
        const regimentData = REGIMENT_TYPES[unitConfig.type];
        
        // Validar terreno transitable
        if (hex.terrain === 'water' && !regimentData.is_naval) {
            console.warn('[EditorTools] No se puede colocar unidad terrestre en agua');
            return false;
        }
        
        // Crear unidad temporal (sin ID final hasta guardar)
        const tempUnit = {
            tempId: `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            id: null, // Se asignará al cargar el escenario
            type: unitConfig.type,
            player: unitConfig.player || EditorState.selectedPlayer,
            r: r,
            c: c,
            regiments: unitConfig.regiments || [
                { 
                    type: unitConfig.type, 
                    health: regimentData.health || 200 
                }
            ],
            morale: 100,
            isVeteran: unitConfig.isVeteran || false,
            isNaval: regimentData.is_naval || false,
            
            // Flags de editor
            isEditorPlaced: true,
            customName: unitConfig.customName || null
        };
        
        units.push(tempUnit);
        console.log(`[EditorTools] Unidad ${unitConfig.type} colocada en (${r},${c}) para Jugador ${tempUnit.player}`);
        return true;
    },
    
    /**
     * Coloca una estructura (ciudad, camino, fortaleza, etc.)
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @param {string} structureType - Tipo de estructura
     */
    placeStructure(r, c, structureType) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // No permitir estructuras en agua (excepto puertos)
        if (hex.terrain === 'water' && structureType !== 'Puerto') {
            console.warn('[EditorTools] No se pueden colocar estructuras terrestres en agua');
            return false;
        }
        
        hex.structure = structureType;
        
        // Si es una ciudad, registrarla en gameState.cities
        if (structureType === 'Ciudad' || structureType === 'Metrópoli' || structureType === 'Aldea') {
            const cityName = `${structureType} ${gameState.cities.length + 1}`;
            hex.isCity = true;
            hex.owner = EditorState.selectedPlayer;
            
            // Añadir a array de ciudades
            if (!gameState.cities) gameState.cities = [];
            gameState.cities.push({
                r: r,
                c: c,
                name: cityName,
                owner: EditorState.selectedPlayer,
                type: structureType,
                isCapital: false
            });
            
            console.log(`[EditorTools] Ciudad "${cityName}" registrada para Jugador ${EditorState.selectedPlayer}`);
        } else if (structureType === 'Camino') {
            hex.hasRoad = true;
        } else if (structureType === 'Fortaleza') {
            hex.owner = EditorState.selectedPlayer;
        }
        
        console.log(`[EditorTools] Estructura ${structureType} colocada en (${r},${c})`);
        return true;
    },
    
    /**
     * Establece el propietario de un hexágono
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @param {number} playerId - ID del jugador (null para neutral)
     */
    setHexOwner(r, c, playerId) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        hex.owner = playerId;
        console.log(`[EditorTools] Propietario de (${r},${c}) establecido: Jugador ${playerId || 'Neutral'}`);
        return true;
    },
    
    /**
     * Borra contenido del hexágono (unidades y estructuras, mantiene terreno)
     * @param {number} r - Fila
     * @param {number} c - Columna
     */
    eraseHexContent(r, c) {
        const hex = board[r]?.[c];
        if (!hex) return false;
        
        // Remover unidad si existe
        EditorTools.removeUnitAt(r, c);
        
        // Remover estructura
        hex.structure = null;
        hex.hasRoad = false;
        hex.isCity = false;
        
        // Remover ciudad de gameState.cities si es ciudad
        if (gameState.cities) {
            gameState.cities = gameState.cities.filter(city => 
                !(city.r === r && city.c === c)
            );
        }
        
        console.log(`[EditorTools] Contenido borrado en (${r},${c})`);
        return true;
    },
    
    /**
     * Helper: Remueve unidad en coordenadas específicas
     * @param {number} r - Fila
     * @param {number} c - Columna
     */
    removeUnitAt(r, c) {
        const unitIndex = units.findIndex(u => u.r === r && u.c === c);
        if (unitIndex >= 0) {
            const unit = units[unitIndex];
            units.splice(unitIndex, 1);
            console.log(`[EditorTools] Unidad removida de (${r},${c})`);
            return true;
        }
        return false;
    },
    
    /**
     * Genera mapa procedural como base para editar
     * @param {number} rows - Filas
     * @param {number} cols - Columnas
     * @param {string} biome - Bioma ('mixed', 'naval', 'plains', etc.)
     */
    generateProceduralBase(rows, cols, biome = 'mixed') {
        // Reutilizar lógica de boardManager.js
        const resourceLevel = 'med';
        const isNaval = (biome === 'naval');
        
        if (typeof generateProceduralMap === 'function') {
            generateProceduralMap(rows, cols, resourceLevel, isNaval, 'editor');
            console.log(`[EditorTools] Mapa procedural ${rows}x${cols} generado (${biome})`);
        } else {
            console.error('[EditorTools] generateProceduralMap no está disponible');
        }
    }
};

// ===================================================================
// ================= SERIALIZACIÓN DE ESCENARIOS =====================
// ===================================================================

/**
 * EditorSerializer: Maneja la exportación e importación de escenarios
 */
const EditorSerializer = {
    
    /**
     * Exporta el estado actual como JSON de escenario
     * @returns {Object} Objeto JSON del escenario
     */
    exportScenario() {
        // Serializar board[][] de forma compacta (solo hexágonos modificados)
        const boardData = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                
                // Solo guardar si no es el terreno por defecto vacío
                if (hex && (hex.terrain !== 'plains' || 
                    hex.structure || 
                    hex.resourceNode || 
                    hex.owner !== null ||
                    hex.isCity ||
                    hex.hasRoad)) {
                    
                    boardData.push({
                        r: r,
                        c: c,
                        terrain: hex.terrain,
                        owner: hex.owner,
                        structure: hex.structure,
                        resourceNode: hex.resourceNode,
                        isCity: hex.isCity || false,
                        isCapital: hex.isCapital || false,
                        hasRoad: hex.hasRoad || false
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
            isVeteran: unit.isVeteran || false,
            isNaval: unit.isNaval || false
        }));
        
        // Construir el JSON final
        const scenarioJSON = {
            meta: {
                name: EditorState.scenarioMeta.name,
                author: (typeof PlayerDataManager !== 'undefined' && PlayerDataManager.currentPlayer?.displayName) 
                    ? PlayerDataManager.currentPlayer.displayName 
                    : 'Anónimo',
                description: EditorState.scenarioMeta.description || '',
                created_at: EditorState.scenarioMeta.created_at || Date.now(),
                modified_at: Date.now(),
                version: '1.0'
            },
            
            settings: {
                dimensions: EditorState.scenarioSettings.dimensions,
                maxPlayers: EditorState.scenarioSettings.maxPlayers,
                startingPhase: EditorState.scenarioSettings.startingPhase,
                turnLimit: EditorState.scenarioSettings.turnLimit,
                victoryConditions: EditorState.scenarioSettings.victoryConditions,
                mapType: EditorState.scenarioSettings.mapType
            },
            
            boardData: boardData,
            unitsData: unitsData,
            citiesData: gameState.cities || [],
            
            playerConfig: EditorState.playerConfigs
        };
        
        console.log('[EditorSerializer] Escenario exportado:', scenarioJSON.meta.name);
        return scenarioJSON;
    },
    
    /**
     * Importa un escenario desde JSON
     * @param {Object} scenarioJSON - Objeto JSON del escenario
     * @returns {boolean} true si se importó correctamente
     */
    importScenario(scenarioJSON) {
        // Validar estructura
        if (!scenarioJSON.meta || !scenarioJSON.settings) {
            console.error('[EditorSerializer] JSON de escenario inválido');
            return false;
        }
        
        console.log('[EditorSerializer] Importando escenario:', scenarioJSON.meta.name);
        
        // Actualizar dimensiones del escenario
        EditorState.scenarioSettings.dimensions = scenarioJSON.settings.dimensions;
        
        // Inicializar tablero con dimensiones del escenario
        const { rows, cols } = scenarioJSON.settings.dimensions;
        
        if (typeof EditorUI !== 'undefined' && EditorUI.initializeEmptyBoard) {
            EditorUI.initializeEmptyBoard(rows, cols);
        } else {
            console.error('[EditorSerializer] EditorUI no está disponible');
            return false;
        }
        
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
            hex.hasRoad = hexData.hasRoad || false;
        }
        
        // Cargar unidades (generar IDs únicos temporales)
        units = [];
        for (const unitData of scenarioJSON.unitsData) {
            const unit = {
                tempId: `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                id: null, // Se asignará al jugar
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
        if (typeof renderFullBoardVisualState === 'function') {
            renderFullBoardVisualState();
        }
        
        console.log('[EditorSerializer] Escenario importado correctamente');
        return true;
    },
    
    /**
     * Convierte escenario a formato para jugar (inicializa IDs reales)
     * @param {Object} scenarioJSON - Objeto JSON del escenario
     */
    prepareScenarioForPlay(scenarioJSON) {
        console.log('[EditorSerializer] Preparando escenario para jugar...');
        
        // Asignar IDs reales a unidades
        units.forEach((unit, index) => {
            unit.id = `unit_${Date.now()}_${index}`;
            delete unit.tempId;
            delete unit.isEditorPlaced;
        });
        
        // Inicializar gameState para juego
        gameState.numPlayers = scenarioJSON.settings.maxPlayers;
        gameState.currentPlayer = 1;
        gameState.currentPhase = scenarioJSON.settings.startingPhase || 'deployment';
        gameState.turnNumber = 1;
        gameState.eliminatedPlayers = [];
        
        // Cargar recursos de jugadores
        for (let i = 1; i <= scenarioJSON.settings.maxPlayers; i++) {
            const config = scenarioJSON.playerConfig[i];
            if (config) {
                gameState.playerResources[i] = { ...config.resources };
                gameState.playerCivilizations[i] = config.civilization || 'ninguna';
                gameState.playerTypes[`player${i}`] = config.controllerType;
            }
        }
        
        console.log('[EditorSerializer] Escenario listo para jugar');
    }
};

// ===================================================================
// =================== ACCIONES DEL EDITOR ===========================
// ===================================================================

/**
 * EditorActions: Manejo de historial (Undo/Redo) y acciones del editor
 */
const EditorActions = {
    
    /**
     * Guarda snapshot del estado actual para Undo
     */
    saveHistorySnapshot() {
        // No guardar cada clic, sino cada N segundos o cambios significativos
        const now = Date.now();
        if (EditorState.lastSaveTime && (now - EditorState.lastSaveTime) < 1000) {
            return; // Muy pronto, evitar spam
        }
        
        EditorState.lastSaveTime = now;
        
        // Clonar estado actual
        const snapshot = {
            board: JSON.parse(JSON.stringify(board.map(row => 
                row.map(hex => ({
                    terrain: hex.terrain,
                    owner: hex.owner,
                    structure: hex.structure,
                    resourceNode: hex.resourceNode
                }))
            ))),
            units: JSON.parse(JSON.stringify(units))
        };
        
        // Si estamos en medio del historial, borrar el futuro
        if (EditorState.historyIndex < EditorState.history.length - 1) {
            EditorState.history = EditorState.history.slice(0, EditorState.historyIndex + 1);
        }
        
        // Añadir snapshot
        EditorState.history.push(snapshot);
        EditorState.historyIndex++;
        
        // Limitar tamaño
        if (EditorState.history.length > EditorState.maxHistorySize) {
            EditorState.history.shift();
            EditorState.historyIndex--;
        }
    },
    
    /**
     * Restaura un snapshot del historial
     * @param {Object} snapshot - Snapshot a restaurar
     */
    restoreSnapshot(snapshot) {
        // Restaurar board
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (snapshot.board[r] && snapshot.board[r][c]) {
                    board[r][c].terrain = snapshot.board[r][c].terrain;
                    board[r][c].owner = snapshot.board[r][c].owner;
                    board[r][c].structure = snapshot.board[r][c].structure;
                    board[r][c].resourceNode = snapshot.board[r][c].resourceNode;
                }
            }
        }
        
        // Restaurar units
        units = JSON.parse(JSON.stringify(snapshot.units));
        
        // Re-renderizar
        if (typeof renderFullBoardVisualState === 'function') {
            renderFullBoardVisualState();
        }
    }
};

console.log("scenarioEditor.js: EditorTools, EditorSerializer y EditorActions listos");
