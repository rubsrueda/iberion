// scenarios/test_A2_SimpleExpansion_scenario.js
const TEST_A2_SCENARIO = {
    scenarioId: "TEST_A2_SIMPLE_EXPANSION",
    displayName: "Test IA: Movimiento de Expansión Simple",
    description: "Prueba si una unidad IA de un solo regimiento se mueve para capturar territorio neutral adyacente.",
    mapFile: "MAP_TEST_A2", // Usa el mismo mapa simple
    playerSetup: {
        initialResources: { oro: 1000 },
        initialUnits: []
    },
    enemySetup: {
        aiProfile: "ai_normal",
        initialResources: { oro: 1000 },
        initialUnits: [
            {
                type: 'Explorador Solitario',
                r: 5, c: 5,
                regiments: ['Infantería Ligera'] // 1 solo regimiento
            }
        ]
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_A2_SCENARIO.scenarioId] = TEST_A2_SCENARIO;
}