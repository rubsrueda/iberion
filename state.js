// state.js
// Contiene las variables globales que definen el estado del juego.
console.log("state.js CARGADO (con Proxy de depuración)"); // Modificado log

// IMPORTANTE: Usar let en lugar de var para prevenir redeclaraciones accidentales
let gameState = {}; // Variable global para el estado - NUNCA usar var
let board = [];
let units = [];
let selectedUnit = null;
let unitIdCounter = 0;
let VISUAL_DEBUG_MODE = false;

// ===>>> CORRECCIÓN AQUÍ: Declarar las variables de estado para la división <<<===
let _unitBeingSplit = null;         // La unidad original que se está dividiendo.
let _tempOriginalRegiments = [];  // Copia de los regimientos que quedan en la unidad original durante el modal.
let _tempNewUnitRegiments = [];   // Copia de los regimientos que irán a la nueva unidad durante el modal.

// ===>>> CORRECCIÓN AQUÍ: Declarar las variables de estado para la construcción <<<===
let hexToBuildOn = null;                // Guarda las coordenadas {r, c} del hexágono donde se va a construir.
let selectedStructureToBuild = null;    // Guarda el tipo de estructura (string) que se ha seleccionado en el modal.

gameState.capitalCityId = {
    1: null, // Coordenadas o null si no hay capital
    2: null
};

let placementMode = {
    active: false,
    unitData: null,
    unitType: null
};

const GAME_DATA_REGISTRY = {
    scenarios: {},
    maps: {} 
};


function resetGameStateForIberiaMagna() {
    console.log("state.js: Ejecutando resetGameStateForIberiaMagna() para 8 jugadores...");

    const numPlayers = 8;
    const initialResources = INITIAL_PLAYER_RESOURCES_MAGNA; // Usaremos una nueva constante

    const initialGameStateObject = {
        numPlayers: numPlayers,
        currentPlayer: 1,
        eliminatedPlayers: [], // (NUEVO) Array para rastrear jugadores derrotados
        currentPhase: "deployment", // O "play" si quieres empezar directamente
        turnNumber: 1,
        playerTypes: {},
        playerCivilizations: {},
        activeCommanders: {},
        capitalCityId: {},
        playerResources: {},
        unitsPlacedByPlayer: {},
        isCampaignBattle: false,
        cities: [],
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null,
        turnDurationSeconds: turnDuration, 
        lastActionTimestamp: 0, 
        matchSnapshots: [], // Aquí guardaremos la "foto" de poder de cada turno
    };

    for (let i = 1; i <= numPlayers; i++) {
        initialGameStateObject.playerTypes[`player${i}`] = 'human'; // Por defecto, luego el escenario lo cambia
        initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(initialResources[i - 1]));
        initialGameStateObject.playerCivilizations[i] = 'ninguna';
        initialGameStateObject.activeCommanders[i] = [];
        initialGameStateObject.capitalCityId[i] = null;
        initialGameStateObject.unitsPlacedByPlayer[i] = 0;
    }

    gameState = initialGameStateObject;

    // Reseteo de variables globales
    board = [];
    units = [];
    if (typeof UnitGrid !== 'undefined') UnitGrid.clear();
    selectedUnit = null;
    unitIdCounter = 0;
    
    console.log("state.js: gameState reseteado para Tronos de Iberia.");
}

function resetGameStateVariables(playerCount = 2, turnDuration = Infinity, gameMode = 'development') { 
    console.log(`state.js: Ejecutando resetGameStateVariables() para ${playerCount} jugadores, modo=${gameMode}...`);

    // Usamos ?. para asegurar que la lectura solo se hace si el elemento existe.
    const p1civ = domElements.player1Civ?.value || 'ninguna'; 
    const p2civ = domElements.player2Civ?.value || 'ninguna';

    const initialGameStateObject = {
        numPlayers: playerCount, // <-- Usa el parámetro
        currentPlayer: 1,
        turnDurationSeconds: turnDuration,
        gameMode: gameMode, // <-- ASEGURAR QUE gameMode SE PRESERVA
        eliminatedPlayers: [],
        currentPhase: "deployment",
        turnNumber: 1,
        playerTypes: {},
        playerAiLevels: {},
        playerCivilizations: {},
        activeCommanders: {},
        capitalCityId: {},
        playerResources: {},
        unitsPlacedByPlayer: {},
        isCampaignBattle: false,
        isTutorialActive: false, 
        cities: [],
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null
    };

    // Este bucle ahora creará los jugadores necesarios dinámicamente
    for (let i = 1; i <= playerCount; i++) {
        // <<== MODO INVASIÓN: Recursos asimétricos ==>>
        if (typeof INVASION_MODE_CONFIG !== 'undefined' && gameMode === 'invasion') {
            if (i === 1) {
                initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(INVASION_MODE_CONFIG.ATTACKER_RESOURCES));
            } else if (i === 2) {
                initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(INVASION_MODE_CONFIG.DEFENDER_RESOURCES));
            } else {
                initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(INITIAL_PLAYER_RESOURCES[i - 1]));
            }
        } else {
            // Modo normal (desarrollo)
            initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(INITIAL_PLAYER_RESOURCES[i - 1]));
        }
        
        initialGameStateObject.playerResources[i].researchedTechnologies = ["ORGANIZATION"];
        initialGameStateObject.activeCommanders[i] = [];
        initialGameStateObject.capitalCityId[i] = null;
        initialGameStateObject.unitsPlacedByPlayer[i] = 0;
        
    }

    // Esto evita que salga "null" o errores al interactuar con ellos
    // 1. Inicializar Recursos para J9
    initialGameStateObject.playerResources[9] = { 
        oro: 0, comida: 0, madera: 0, piedra: 0, hierro: 0, 
        researchPoints: 0, puntosReclutamiento: 0 
    };

    // 2. Inicializar Civilización y Tipo
    initialGameStateObject.playerCivilizations[9] = 'Bárbaros'; 
    
    // Aseguramos que el objeto playerTypes existe antes de asignar
    if (!initialGameStateObject.playerTypes) initialGameStateObject.playerTypes = {};
    initialGameStateObject.playerTypes['player9'] = 'ai_passive'; 

    // 3. Inicializar Comandantes
    if (!initialGameStateObject.activeCommanders) initialGameStateObject.activeCommanders = {};
    initialGameStateObject.activeCommanders[9] = [];
        
    gameState = initialGameStateObject;

    // Reseteo de variables globales
    board = [];
    units = [];
    if (typeof UnitGrid !== 'undefined') UnitGrid.clear();
    selectedUnit = null;
    unitIdCounter = 0;
    placementMode = { active: false, unitData: null, unitType: null };
    
    // Limpiar roles de la IA
    if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.unitRoles) {
        AiGameplayManager.unitRoles.clear();
    }
    
    // Limpiar variables de construcción/división de modales si existen (guardas de seguridad)
    if (typeof currentDivisionBuilder !== 'undefined') currentDivisionBuilder = [];
    if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    if (typeof selectedStructureToBuild !== 'undefined') selectedStructureToBuild = null;
    if (typeof _unitBeingSplit !== 'undefined') _unitBeingSplit = null;
    if (typeof _tempOriginalRegiments !== 'undefined') _tempOriginalRegiments = [];
    if (typeof _tempNewUnitRegiments !== 'undefined') _tempNewUnitRegiments = [];
    
    console.log(`state.js: gameState reseteado para ${playerCount} jugadores.`);
}

async function resetAndSetupTacticalGame(scenarioData, mapTacticalData, campaignTerritoryId, turnDuration = Infinity) {
    console.log("state.js: Resetting and setting up tactical game for scenario:", scenarioData.scenarioId);

    const initialP1Resources = JSON.parse(JSON.stringify(scenarioData.playerSetup.initialResources || INITIAL_PLAYER_RESOURCES[0]));
    const initialP2Resources = JSON.parse(JSON.stringify(scenarioData.enemySetup.initialResources || INITIAL_PLAYER_RESOURCES[1]));
    if (scenarioData.enemySetup.aiProfile?.startsWith('ai_')) {
        initialP2Resources.oro = (initialP2Resources.oro || 0) + 150;
    }

    initialP1Resources.researchedTechnologies = initialP1Resources.researchedTechnologies || ["ORGANIZATION"];
    initialP2Resources.researchedTechnologies = initialP2Resources.researchedTechnologies || ["ORGANIZATION"];
    
    const initialGameStateObject = {
        currentPhase: "deployment",
        playerTypes: {
            player1: "human",
            player2: scenarioData.enemySetup.aiProfile || "ai_normal"
        },
        currentPlayer: 1,
        eliminatedPlayers: [],
        turnNumber: 0,
        playerResources: {
            1: initialP1Resources,
            2: initialP2Resources
        },
        activeCommanders: { 1: [], 2: [] }, // Se asegura de que SIEMPRE exista
        deploymentUnitLimit: scenarioData.deploymentUnitLimit || Infinity,
        unitsPlacedByPlayer: { 1: 0, 2: 0 },
        cities: [],
        isCampaignBattle: true,
        currentScenarioData: scenarioData,
        currentMapData: mapTacticalData,
        currentCampaignTerritoryId: campaignTerritoryId,
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null,

        // --- Puntos de Victoria---
        victoryPoints: {
            player1: 0, player2: 0, player3: 0, player4: 0, player5: 0, player6: 0, player7: 0, player8: 0,
            holders: {
                mostCities: null, largestArmy: null, mostRoutes: null, mostKills: null,
                mostTechs: null, mostHeroes: null, mostResources: null, mostTrades: null,
                mostRuins: null, mostBarbaraCities: null, mostNavalVictories: null,
            },
            ruins: {
                player1: 0, player2: 0, player3: 0, player4: 0, player5: 0, player6: 0, player7: 0, player8: 0,
            }
        },
        playerStats: {
            unitsDestroyed: { player1: 0, player2: 0, player3: 0, player4: 0, player5: 0, player6: 0, player7: 0, player8: 0 },
            sealTrades: { player1: 0, player2: 0, player3: 0, player4: 0, player5: 0, player6: 0, player7: 0, player8: 0 }
        },

        // Y añadimos la propiedad de Civilizaciones que también faltaba aquí
        playerCivilizations: { 1: 'ninguna', 2: 'ninguna' },
        turnDurationSeconds: turnDuration
    };

    gameState = initialGameStateObject;
    

    // Asegurarse de que las variables globales relacionadas con el tablero y unidades estén limpias
    board = [];
    units = [];
    if (typeof UnitGrid !== 'undefined') UnitGrid.clear();
    selectedUnit = null; // Asegurarnos de que la variable global también se limpia
    unitIdCounter = 0;
    placementMode = { active: false, unitData: null, unitType: null };
    
    // Limpiar roles de la IA
    if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.unitRoles) {
        AiGameplayManager.unitRoles.clear();
    }

    // Limpiar variables de construcción/división de modales (guardas de seguridad)
    if (typeof currentDivisionBuilder !== 'undefined') currentDivisionBuilder = [];
    if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    if (typeof selectedStructureToBuild !== 'undefined') selectedStructureToBuild = null;
     if (typeof _unitBeingSplit !== 'undefined') _unitBeingSplit = null;
    if (typeof _tempOriginalRegiments !== 'undefined') _tempOriginalRegiments = [];
    if (typeof _tempNewUnitRegiments !== 'undefined') _tempNewUnitRegiments = [];


    // Inicializar el tablero visual y lógico
    await initializeGameBoardForScenario(mapTacticalData, scenarioData);

    // Preparar UI para el despliegue o juego
    if (gameState.currentPhase === "deployment") {
        if (typeof populateAvailableRegimentsForModal === "function") populateAvailableRegimentsForModal();
        if (typeof logMessage === "function") logMessage(`Despliegue para ${scenarioData.displayName}. Jugador 1, coloca tus fuerzas.`);
    } else { // Si no es despliegue
        if (typeof logMessage === "function") logMessage(`¡Comienza la batalla por ${scenarioData.displayName}!`);
    }

    console.log("state.js: Finalizado resetAndSetupTacticalGame.", JSON.parse(JSON.stringify(gameState)));
}

function resetGameStateForIberiaMagna() {
    console.log("state.js: Ejecutando resetGameStateForIberiaMagna() para 8 jugadores...");

    const numPlayers = 8;
    const initialResources = INITIAL_PLAYER_RESOURCES_MAGNA; // Usamos la nueva constante

    // 1. Crear el objeto de estado inicial completo
    const initialGameStateObject = {
        numPlayers: numPlayers,
        currentPlayer: 1,
        eliminatedPlayers: [], // (NUEVO) Array para rastrear jugadores derrotados
        currentPhase: "deployment", // O directamente "play" si no hay fase de despliegue
        turnNumber: 1,
        
        // Estructuras de datos para N jugadores
        playerTypes: {},
        playerAiLevels: {},
        playerCivilizations: {},
        activeCommanders: {},
        capitalCityId: {},
        playerResources: {},
        unitsPlacedByPlayer: {},

        // Propiedades de estado generales
        isCampaignBattle: false, // Esto es una partida "Magna", no una misión de campaña
        cities: [],
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null
    };

    // 2. Rellenar los datos para cada uno de los 8 jugadores
    for (let i = 1; i <= numPlayers; i++) {
        const playerKey = `player${i}`;
        
        // Asumimos que todos son humanos por ahora. Esto se podría configurar en una futura pantalla de lobby.
        initialGameStateObject.playerTypes[playerKey] = 'human'; 
        
        // Copiamos los recursos iniciales para cada jugador
        initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(initialResources[i - 1]));
        
        // Inicializamos el resto de arrays/objetos
        initialGameStateObject.playerCivilizations[i] = 'ninguna'; // Se puede asignar después
        initialGameStateObject.activeCommanders[i] = [];
        initialGameStateObject.capitalCityId[i] = null;
        initialGameStateObject.unitsPlacedByPlayer[i] = 0;
    }

    // 3. Asignar el nuevo objeto de estado a la variable global
    gameState = initialGameStateObject;

    // 4. Resetear las otras variables globales
    board = [];
    units = [];
    if (typeof UnitGrid !== 'undefined') UnitGrid.clear();
    selectedUnit = null;
    unitIdCounter = 0;
    
    console.log("state.js: gameState reseteado para Tronos de Iberia.", JSON.parse(JSON.stringify(gameState)));
}

// ===================================================================
// ==================== EDITOR DE ESCENARIOS =========================
// ===================================================================

/**
 * EditorState: Estado global del sistema de edición de escenarios
 * Este objeto controla todo el comportamiento del modo editor
 */
const EditorState = {
    isEditorMode: false,           // Flag principal - bifurca onHexClick()
    currentTool: null,             // 'terrain' | 'unit' | 'structure' | 'eraser' | 'player_owner'
    selectedTerrain: 'plains',     // Para pincel de terreno
    selectedUnitType: null,        // Para colocación de unidades
    selectedPlayer: 1,             // Jugador activo en edición
    selectedStructure: null,       // Para colocación de estructuras
    isPainting: false,             // Para arrastrar y pintar
    
    // Metadata del escenario actual
    scenarioMeta: {
        name: 'Sin título',
        author: null,
        description: '',
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
        victoryConditions: ['eliminate_enemy'], // Array de condiciones
        mapType: 'custom' // 'custom' | 'procedural'
    },
    
    // Configuración de jugadores (hasta 8 jugadores)
    playerConfigs: {
        1: {
            civilization: null,      // null = "elegir al jugar"
            controllerType: 'human', // 'human' | 'ai'
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
        },
        2: {
            civilization: null,
            controllerType: 'ai',
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
        }
    },
    
    // Historia de acciones (para Undo/Redo)
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    
    // Estado temporal para edición
    clipboardUnit: null, // Para copiar/pegar unidades
    lastSaveTime: null
};

console.log("state.js: EditorState inicializado");