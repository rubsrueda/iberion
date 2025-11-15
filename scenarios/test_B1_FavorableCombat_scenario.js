// scenarios/test_B1_FavorableCombat_scenario.js
const TEST_B1_SCENARIO = {
    scenarioId: "TEST_B1_FAVORABLE_COMBAT",
    displayName: "Test IA: Tomar Recurso y Atacar (Favorable)",
    mapFile: "MAP_TEST_B1",
    playerSetup: {
        initialUnits: [
            { type: 'Cebo', r: 5, c: 7, regiments: ['Infantería Ligera'] } // Humano con 1 regimiento
        ]
    },
    enemySetup: {
        initialUnits: [
            { type: 'Atacante', r: 5, c: 5, regiments: ['Infantería Ligera', 'Arqueros'] } // IA con 2
        ]
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_B1_SCENARIO.scenarioId] = TEST_B1_SCENARIO;
}