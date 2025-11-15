// scenarios/test_A1_SplitExpansion_scenario.js
const TEST_A1_SCENARIO = {
    scenarioId: "TEST_A1_SPLIT_EXPANSION",
    displayName: "Test IA: Expansión por División",
    description: "Prueba para verificar si una unidad IA con múltiples regimientos se divide para expandirse cuando no hay enemigos cerca.",
    mapFile: "MAP_TEST_A1",
    playerSetup: {
        initialResources: { oro: 1000 },
        initialUnits: [] // El jugador humano no despliega unidades
    },
    enemySetup: { // IA es Jugador 2
        aiProfile: "ai_normal",
        initialResources: { oro: 1000 },
        initialUnits: [
            {
                type: 'Grupo de Exploracion', // Un nombre para identificarlo
                r: 5, c: 5,
                regiments: ['Infantería Ligera', 'Infantería Ligera', 'Arqueros'] // Composición de 3 regimientos
            }
        ]
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_A1_SCENARIO.scenarioId] = TEST_A1_SCENARIO;
}