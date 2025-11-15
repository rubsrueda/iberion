// scenarios/test_B2_TacticalRetreat_scenario.js
const TEST_B2_SCENARIO = {
    scenarioId: "TEST_B2_TACTICAL_RETREAT",
    displayName: "Test IA: Retirada Táctica",
    mapFile: "MAP_TEST_B2",
    playerSetup: {
        initialUnits: [
             // Humano con una fuerza abrumadora
            { type: 'Ejército Principal', r: 5, c: 7, regiments: ['Caballería Pesada', 'Caballería Pesada', 'Infantería Pesada', 'Arqueros', 'Arqueros'] }
        ]
    },
    enemySetup: {
        initialUnits: [
            { type: 'Patrulla', r: 5, c: 5, regiments: ['Infantería Ligera', 'Infantería Ligera'] } // IA en inferioridad
        ]
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_B2_SCENARIO.scenarioId] = TEST_B2_SCENARIO;
}