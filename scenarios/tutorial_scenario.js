// scenarios/tutorial_scenario.js

// Definición de un mapa simple para el tutorial
const TUTORIAL_MAP_DATA = {
    mapId: "TUTORIAL_MAP",
    name: "Mapa de Tutorial",
    rows: 8, // Un mapa pequeño para el tutorial
    cols: 10,

    hexesConfig: {
        defaultTerrain: "plains",
        specificHexes: [
            { r: 2, c: 2, terrain: "forest" },
            { r: 3, c: 2, terrain: "forest" },
            { r: 4, c: 3, terrain: "hills" },
            { r: 5, c: 3, terrain: "hills" },
            { r: 0, c: 5, terrain: "water" }, 
            { r: 1, c: 5, terrain: "water" }
        ]
    },

    playerCapital: { r: 1, c: 1, name: "Capital Tutorial" },
    enemyCapital: null, 
    cities: [], 
    resourceNodes: [
        { r: 2, c: 1, type: "oro_mina" },
        { r: 4, c: 2, type: "comida" }
    ]
};

// Definición del escenario del tutorial
const TUTORIAL_SCENARIO_DATA = {
    scenarioId: "TUTORIAL_SCENARIO",
    displayName: "Manual de Campo: Primeros Pasos",
    description: "Bienvenido, General. Este escenario interactivo te guiará a través de las mecánicas fundamentales de Hex General Evolved. ¡Sigue las instrucciones para dominar el arte de la guerra!",
    briefingImage: "", 
    mapFile: "TUTORIAL_MAP", 
    
    playerSetup: {
        initialResources: { oro: 300, hierro: 100, piedra: 100, madera: 100, comida: 100, researchPoints: 50 },
        initialUnits: [], 
        startHexes: [ 
            { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }, { r: 2, c: 2 },
            { r: 0, c: 0 }, { r: 0, c: 1 }
        ],
        aiProfile: "none"
    },
    
    enemySetup: {
        initialResources: { oro: 0, hierro: 0, piedra: 0, madera: 0, comida: 0, researchPoints: 0 },
        initialUnits: [], 
        aiProfile: "none"
    },

    deploymentUnitLimit: 3, 

    victoryGoldBonus: 0, 
    victoryConditions: [{ type: "complete_all_tutorial_steps" }], 
    lossConditions: [], 
    
    // --- Lógica de Tutorial: Pasos específicos ---
    tutorialSteps: [
        {
            id: "deploy_units",
            message: "¡Paso 1: Despliega tus unidades! Tienes 3 unidades para colocar en los hexágonos resaltados. Primero, haz clic en el botón '+' para crear una unidad. Luego, haz clic en un hexágono para colocarla.",
            type: "deployment", 
            validate: (gameState) => gameState.unitsPlacedByPlayer && gameState.unitsPlacedByPlayer[1] >= 1, // Validar UNA unidad desplegada
            highlightUI: '#floatingCreateDivisionBtn', // Resaltar el botón de crear unidad
            nextMessage: "¡Bien! Has creado tu primera unidad. Ahora, coloca el resto de tus unidades haciendo clic en los hexágonos resaltados. Tienes un límite de 3 unidades en esta fase."
        },
        {
            id: "place_all_units",
            message: "¡Paso 1.5: Coloca el resto de tus unidades! Tienes más unidades por colocar. Haz clic en el botón '+' si necesitas crear más, y luego en los hexágonos resaltados para colocarlas.",
            type: "deployment",
            validate: (gameState) => gameState.unitsPlacedByPlayer && gameState.unitsPlacedByPlayer[1] >= gameState.deploymentUnitLimit,
            highlightHexCoords: [ // Resaltar hexágonos de despliegue si aún no están todas las unidades.
                { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }, { r: 2, c: 2 },
                { r: 0, c: 0 }, { r: 0, c: 1 }
            ],
            nextMessage: "¡Excelente! Has desplegado todas tus unidades. Ahora el turno pasará al juego. Haz clic en el botón ► (Finalizar Turno)."
        },
        {
            id: "end_deployment_turn",
            message: "¡Paso 1.6: Finaliza el Despliegue! Haz clic en el botón ► (Finalizar Turno) para empezar el juego.",
            type: "deployment",
            validate: (gameState) => gameState.currentPhase === "play" && gameState.turnNumber >= 1, // La validación es que el turno avanzó a "play"
            highlightUI: '#floatingEndTurnBtn', // Resaltar el botón de fin de turno
            nextMessage: "¡Bienvenido al Turno 1! Ahora podemos mover nuestras unidades."
        },
        {
            id: "move_unit",
            message: "¡Paso 2: Mueve una unidad! Selecciona una de tus unidades (haz clic en ella). Luego, haz clic en un hexágono verde para moverla. Intenta moverla a un hexágono de Bosque (verde oscuro) o Colina (gris) para ver cómo afecta el movimiento.",
            type: "play",
            validate: (gameState, lastUnitMovedId) => {
                const unit = units.find(u => u.id === lastUnitMovedId);
                return unit && unit.hasMoved;
            },
            highlightExpectedClick: 'unit', // Espera un clic en una unidad propia
            nextMessage: "¡Bien hecho! Has movido una unidad. Las unidades pierden puntos de movimiento al moverse, y ciertos terrenos (como bosques o colinas) cuestan más."
        },
        {
            id: "attack_enemy",
            message: "¡Paso 3: Ataca a un enemigo! Una unidad enemiga ha aparecido. Selecciona una de tus unidades y haz clic en la unidad enemiga (o en un hexágono rojo sobre ella) para atacar. Observa la predicción de combate al pasar el ratón.",
            type: "play",
            action: (gameState) => {
                const enemyUnitType = "Infantería Ligera";
                const enemyUnitData = {
                    id: `u${unitIdCounter++}`, player: 2, name: "Unidad Enemiga Tutorial",
                    regiments: [{ ...REGIMENT_TYPES[enemyUnitType], type: enemyUnitType }],
                    attack: REGIMENT_TYPES[enemyUnitType].attack, defense: REGIMENT_TYPES[enemyUnitType].defense,
                    maxHealth: REGIMENT_TYPES[enemyUnitType].health, currentHealth: REGIMENT_TYPES[enemyUnitType].health,
                    movement: REGIMENT_TYPES[enemyUnitType].movement, currentMovement: REGIMENT_TYPES[enemyUnitType].movement,
                    visionRange: REGIMENT_TYPES[enemyUnitType].visionRange, attackRange: REGIMENT_TYPES[enemyUnitType].attackRange,
                    experience: 0, r: 4, c: 5, sprite: REGIMENT_TYPES[enemyUnitType].sprite, element: null, hasMoved: false, hasAttacked: false
                };
                if (typeof placeFinalizedDivision === "function") {
                    placeFinalizedDivision(enemyUnitData, enemyUnitData.r, enemyUnitData.c);
                }
                if (typeof updateFogOfWar === "function") updateFogOfWar(); 
                if (typeof logMessage === "function") logMessage("¡Una unidad enemiga ha aparecido!");
            },
            validate: (gameState) => {
                return !units.some(u => u.player === 2 && u.currentHealth > 0);
            },
            highlightExpectedClick: 'enemy_unit', 
            nextMessage: "¡Victoria! Has destruido a la unidad enemiga. Las batallas aumentan la experiencia de tus unidades."
        },
        {
            id: "build_road",
            message: "¡Paso 4: Construye un camino! Haz clic en el botón 💡 (Árbol Tecnológico) y luego investiga 'Ingeniería Civil'. Luego, selecciona una unidad y haz clic en el botón 'Construir Estructura' en el panel contextual para construir un Camino sobre un hexágono vacío adyacente a tu capital. Un camino mejora la producción de recursos.",
            type: "play",
            action: (gameState) => {
                if (gameState.playerResources[1].oro < 50) gameState.playerResources[1].oro = 50;
                if (gameState.playerResources[1].piedra < 10) gameState.playerResources[1].piedra = 10;
                if (gameState.playerResources[1].researchPoints < 40) gameState.playerResources[1].researchPoints = 40; 
                if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
            },
            validate: (gameState) => {
                const playerTechs = gameState.playerResources[1].researchedTechnologies || [];
                if (!playerTechs.includes("ENGINEERING")) return false;
                
                for (let r = 0; r < board.length; r++) {
                    for (let c = 0; c < board[0].length; c++) {
                        const hex = board[r][c];
                        if (hex && hex.owner === 1 && hex.structure === "Camino") {
                            return true;
                        }
                    }
                }
                return false;
            },
            highlightUI: '#floatingTechTreeBtn', 
            nextMessage: "¡Excelente! Los caminos facilitan el movimiento y mejoran la economía. ¡Ahora, investiguemos nuevas unidades!"
        },
        {
            id: "research_unit",
            message: "¡Paso 5: Investiga una nueva unidad! Abre el árbol tecnológico (💡) e investiga cualquier tecnología que desbloquee una nueva unidad (ej. 'Tácticas de Formación').",
            type: "play",
            action: (gameState) => {
                if (gameState.playerResources[1].researchPoints < 75) gameState.playerResources[1].researchPoints = 75; 
                if (gameState.playerResources[1].oro < 50) gameState.playerResources[1].oro = 50;
                if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
            },
            validate: (gameState) => {
                const playerTechs = gameState.playerResources[1].researchedTechnologies || [];
                for (const techId in TECHNOLOGY_TREE_DATA) {
                    if (playerTechs.includes(techId) && TECHNOLOGY_TREE_DATA[techId].unlocksUnits && TECHNOLOGY_TREE_DATA[techId].unlocksUnits.length > 0) {
                        return true;
                    }
                }
                return false;
            },
            highlightUI: '#floatingTechTreeBtn',
            nextMessage: "¡Felicidades! Has investigado una nueva unidad. Ahora podrás reclutar unidades más avanzadas."
        },
        {
            id: "recruit_unit",
            message: "¡Paso 6: Recluta una nueva unidad! Selecciona tu capital o una fortaleza vacía. Haz clic en el botón 'Crear División Aquí' en el panel contextual para reclutar tu nueva unidad.",
            type: "play",
            action: (gameState) => {
                if (gameState.playerResources[1].oro < 50) gameState.playerResources[1].oro = 50; 
                if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
            },
            validate: (gameState) => units.some(u => u.player === 1 && u.name.includes("División P1 #") && u.regiments.length > 0 && !u.hasMoved),
            highlightExpectedClick: 'recruitment_spot', // Espera un clic en un lugar de reclutamiento
            nextMessage: "¡Excelente! Has reclutado una nueva unidad. Puedes usarla en este mismo turno."
        },
        {
            id: "end_tutorial",
            message: "¡Paso Final! Has completado el tutorial. Ahora estás listo para el campo de batalla real. Haz clic en 'Finalizar Tutorial' para volver al menú principal.",
            type: "play",
            validate: (gameState) => false, 
            action: (gameState) => {},
            nextMessage: ""
        }
    ]
};

// Registrar el mapa y el escenario del tutorial en GAME_DATA_REGISTRY
if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.maps[TUTORIAL_MAP_DATA.mapId] = TUTORIAL_MAP_DATA;
    console.log(`TUTORIAL_MAP_DATA registrado en GAME_DATA_REGISTRY.maps con clave "${TUTORIAL_MAP_DATA.mapId}"`);
    GAME_DATA_REGISTRY.scenarios[TUTORIAL_SCENARIO_DATA.scenarioId] = TUTORIAL_SCENARIO_DATA;
    console.log(`TUTORIAL_SCENARIO_DATA registrado en GAME_DATA_REGISTRY.scenarios con clave "${TUTORIAL_SCENARIO_DATA.scenarioId}"`);
} else {
    console.error("ERROR: GAME_DATA_REGISTRY no está definido. No se pudo registrar el escenario del tutorial.");
}