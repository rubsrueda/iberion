// scenarios/test_D1_Sabotage_scenario.js
// ============================================================
// ACCEPTANCE TEST T-05: Sabotaje de ruta enemiga (NIVEL:3)
// ============================================================
// Precondición:
//   - J1 (humano) tiene una caravana activa con ruta al Banco.
//   - J2 (IA) tiene una unidad a distancia ≤4 del eslabón más débil de esa ruta.
//   - Oro de J2 > umbral_ataque_ofensivo (1000) → no hay crisis económica ni amenaza capital.
// Esperado:
//   - La unidad de J2 se mueve hacia o ataca el eslabón de la ruta.
//   - El log emite: [IA-MOTOR] NIVEL:3 NODO:caravana_enemiga o NODO:camino_enemigo_critico
// Fallo si:
//   - El motor ignora completamente la ruta enemiga.
// ============================================================
// Verificación manual en consola:
//   IaValidationTools.imprimirResumenIA(2)
//   AiGameplayManager._lastDecisionLog[2]  → buscar NIVEL:3
// ============================================================

const TEST_D1_SCENARIO = {
    scenarioId: "TEST_D1_SABOTAGE",
    displayName: "Test IA T-05: Sabotaje de Ruta Enemiga (NIVEL:3)",
    description: "Verifica que la IA detecta y prioriza interrumpir una ruta comercial enemiga activa cuando tiene recursos y unidad posicionada.",
    mapFile: "MAP_TEST_D1",

    playerSetup: {
        // J1 (humano): caravana en ruta activa hacia el banco. Unidad de escolta
        // en hex (5,5) — actúa como eslabón debilitado de la ruta.
        initialResources: { oro: 1200, comida: 200, madera: 150, piedra: 100, hierro: 50 },
        initialUnits: [
            {
                type: 'Caravana',
                r: 5, c: 5,
                regiments: ['Milicia'],
                // Ruta activa hacia hex banco: marcado con 'hasBank: true' en el mapa
                tieneRutaAlBanco: true
            }
        ]
    },

    enemySetup: {
        aiProfile: 'ai_normal',
        // J2 (IA): recursos abundantes → sin crisis, sin amenaza capital → motor escala a NIVEL:3
        initialResources: { oro: 1500, comida: 300, madera: 200, piedra: 150, hierro: 80 },
        initialUnits: [
            {
                type: 'Patrulla',
                // Distancia ≤4 del eslabón en (5,5) → colocada en (5,8)
                r: 5, c: 8,
                regiments: ['Infantería Ligera', 'Arqueros']
            }
        ]
    },

    // Condiciones de victoria/derrota no relevantes para el test;
    // el test se da por validado inspeccionando el log [IA-MOTOR].
    victoryConditions: [{ type: "eliminate_all_enemies" }],
    lossConditions: [{ type: "player_capital_lost" }],

    // Metadatos de test para IaValidationTools
    _testMeta: {
        id: "T-05",
        nombre: "Sabotaje de ruta enemiga",
        nivel_esperado: 3,
        nodos_esperados: ["caravana_enemiga", "camino_enemigo_critico"],
        player_ia: 2,
        verificar: "AiGameplayManager._lastDecisionLog[2] debe contener NIVEL:3"
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_D1_SCENARIO.scenarioId] = TEST_D1_SCENARIO;
} else {
    console.warn("[TEST_D1] GAME_DATA_REGISTRY no disponible; escenario no registrado.");
}
