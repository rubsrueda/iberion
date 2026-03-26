// scenarios/test_D2_NoAttack_scenario.js
// ============================================================
// ACCEPTANCE TEST T-06: Sin ataque prematuro
// ============================================================
// Precondición:
//   - J2 (IA) sin ruta activa al Banco.
//   - Oro J2 = 800 < umbral_ataque_ofensivo (1000).
//   - Ciudad enemiga (J1) a distancia hexagonal ≥6 de la unidad J2.
//   - No hay amenaza de capital ni crisis económica < 400.
// Esperado:
//   - Ninguna unidad de J2 avanza hacia la ciudad enemiga.
//   - La misión prioritaria es logística o económica (NODO: ciudad_propia, recurso, banco).
//   - Log [IA-MOTOR] no muestra NODO: ciudad_enemiga con accion: MOVER/ATACAR.
// Fallo si:
//   - Alguna unidad de J2 se desplaza en dirección a la ciudad de J1.
// ============================================================
// Verificación manual en consola:
//   IaValidationTools.imprimirResumenIA(2)
//   AiGameplayManager._lastDecisionLog[2]  → accion NO debe ser 'atacar_ciudad' ni dirección hacia (3,3)
// ============================================================

const TEST_D2_SCENARIO = {
    scenarioId: "TEST_D2_NO_PREMATURE_ATTACK",
    displayName: "Test IA T-06: Sin Ataque Prematuro (lógistica prioritaria)",
    description: "Verifica que la IA NO avanza hacia ciudad enemiga cuando sus recursos están por debajo del umbral de ataque ofensivo.",
    mapFile: "MAP_TEST_D2",

    playerSetup: {
        // J1 (humano): ciudad capitalizada en hex (3,3), bien defendida.
        initialResources: { oro: 600, comida: 150, madera: 100, piedra: 80, hierro: 40 },
        initialUnits: [
            {
                type: 'Guardia',
                r: 3, c: 3,
                regiments: ['Infantería Pesada', 'Infantería Pesada', 'Arqueros']
            }
        ]
    },

    enemySetup: {
        aiProfile: 'ai_normal',
        // J2 (IA): oro = 800 < 1000 (umbral_ataque_ofensivo) → no debe atacar.
        // Unidad posicionada en (9,9), distancia >6 respecto a (3,3).
        initialResources: { oro: 800, comida: 100, madera: 80, piedra: 60, hierro: 30 },
        initialUnits: [
            {
                type: 'Patrulla Económica',
                r: 9, c: 9,
                regiments: ['Infantería Ligera']
            }
        ]
    },

    victoryConditions: [{ type: "eliminate_all_enemies" }],
    lossConditions: [{ type: "player_capital_lost" }],

    // Metadatos de test para IaValidationTools
    _testMeta: {
        id: "T-06",
        nombre: "Sin ataque prematuro",
        nivel_prohibido: null,      // No hay nivel prohibido; se verifica el nodo objetivo
        nodos_prohibidos: ["ciudad_enemiga_atacar"],
        player_ia: 2,
        oro_ia: 800,
        umbral_ataque: 1000,
        verificar: "AiGameplayManager._lastDecisionLog[2].accion NO debe ser movimiento hacia (3,3)"
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_D2_SCENARIO.scenarioId] = TEST_D2_SCENARIO;
} else {
    console.warn("[TEST_D2] GAME_DATA_REGISTRY no disponible; escenario no registrado.");
}
