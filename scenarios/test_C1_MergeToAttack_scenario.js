// scenarios/test_C1_MergeToAttack_scenario.js
const TEST_C1_SCENARIO = {
    scenarioId: "TEST_C1_MERGE_TO_ATTACK",
    displayName: "Test IA: Fusión Ofensiva",
    mapFile: "MAP_TEST_C1",
    playerSetup: {
        initialUnits: [
            { type: 'Bloqueo', r: 5, c: 7, regiments: ['Infantería Pesada', 'Infantería Pesada'] } // Fuerza humana decente
        ]
    },
    enemySetup: {
        initialUnits: [
            { type: 'Vanguardia', r: 5, c: 5, regiments: ['Infantería Ligera'] }, // IA débil 1
            { type: 'Refuerzo', r: 4, c: 5, regiments: ['Infantería Ligera'] }   // IA débil 2
        ]
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_C1_SCENARIO.scenarioId] = TEST_C1_SCENARIO;
}