// scenarios/test_B3_SplitAndHarass_scenario.js
const TEST_B3_SCENARIO = {
    scenarioId: "TEST_B3_SPLIT_AND_HARASS",
    displayName: "Test IA: Tomar y Hostigar (División)",
    mapFile: "MAP_TEST_B3",
    playerSetup: {
        initialUnits: [
            { type: 'Cebo', r: 4, c: 5, regiments: ['Infantería Ligera'] }
        ]
    },
    enemySetup: {
        initialUnits: [
            { type: 'Grupo Táctico', r: 5, c: 5, regiments: ['Infantería Ligera', 'Arqueros'] }
        ]
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_B3_SCENARIO.scenarioId] = TEST_B3_SCENARIO;
}