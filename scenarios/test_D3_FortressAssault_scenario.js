// scenarios/test_D3_FortressAssault_scenario.js
// ============================================================
// ACCEPTANCE TEST T-10: Evaluación de asalto a fortaleza
// ============================================================
// Sub-test T-10a: Fortaleza desguarnecida → IA debe ocuparla.
//   Precondición: Hex con fortification=true sin unidad defensora.
//                 Unidad J2 adyacente o a ≤2 hexes.
//   Esperado: Unidad J2 se mueve hacia /ocupa la fortaleza.
//             Log: [IA-MOTOR] NODO:fortaleza_vacia o NODO:posicion_estrategica
//
// Sub-test T-10b: Fortaleza defendida, ratio bajo → IA debe vetar el ataque.
//   Precondición: Fortaleza con unidad J1 (poder=80), unidad J2 (poder=100).
//                 Ratio = 100/80 = 1.25 < umbral ratio_asedio_sin_artilleria (2.5).
//   Esperado: Ninguna unidad J2 ataca la fortaleza.
//             Motor prioriza consolidación / repliegue.
// ============================================================
// Para cambiar entre sub-test, modifica la propiedad 'subtest' más abajo:
//   "10a" → fortaleza vacía (IA ocupa)
//   "10b" → fortaleza defendida (IA veta ataque)
// ============================================================
// Verificación manual en consola:
//   IaValidationTools.imprimirResumenIA(2)
//   AiGameplayManager._lastDecisionLog[2]
// ============================================================

// ==== SUB-TEST T-10a: Fortaleza desguarnecida ====
const TEST_D3A_SCENARIO = {
    scenarioId: "TEST_D3A_FORTRESS_EMPTY",
    displayName: "Test IA T-10a: Fortaleza Desguarnecida (IA ocupa)",
    description: "Verifica que la IA prioriza ocupar una fortaleza vacía adyacente. El motor debe emitir NODO:posicion_estrategica o similar.",
    mapFile: "MAP_TEST_D3",

    playerSetup: {
        // J1 (humano): unidad alejada, no representa amenaza inmediata.
        initialResources: { oro: 500, comida: 100, madera: 80, piedra: 60, hierro: 20 },
        initialUnits: [
            {
                type: 'Retaguardia',
                r: 1, c: 1,
                regiments: ['Milicia']
            }
        ]
    },

    enemySetup: {
        aiProfile: 'ai_normal',
        // J2 (IA): recursos normales, unidad adyacente a la fortaleza en (6,6).
        initialResources: { oro: 600, comida: 150, madera: 100, piedra: 80, hierro: 40 },
        initialUnits: [
            {
                type: 'Vanguardia',
                // Adyacente a fortaleza en (6,6) → posicionada en (6,7)
                r: 6, c: 7,
                regiments: ['Infantería Ligera', 'Infantería Ligera'],
                // Ratio de poder suficiente si hubiera defensor (no aplica en 10a)
            }
        ]
    },

    // Hex (6,6) marcado como fortaleza vacía en el mapa MAP_TEST_D3
    mapOverrides: {
        fortressHex: { r: 6, c: 6, hasWalls: true, owner: null }
    },

    victoryConditions: [{ type: "control_hex", r: 6, c: 6 }],
    lossConditions: [{ type: "player_capital_lost" }],

    _testMeta: {
        id: "T-10a",
        nombre: "Fortaleza desguarnecida — IA ocupa",
        nodos_esperados: ["posicion_estrategica", "fortaleza_vacia"],
        accion_esperada: "MOVER",
        player_ia: 2,
        verificar: "AiGameplayManager._lastDecisionLog[2] → accion=MOVER hacia (6,6)"
    }
};

// ==== SUB-TEST T-10b: Fortaleza defendida, ratio insuficiente ====
const TEST_D3B_SCENARIO = {
    scenarioId: "TEST_D3B_FORTRESS_DEFENDED",
    displayName: "Test IA T-10b: Fortaleza Defendida (IA veta ataque, ratio < 2.5)",
    description: "Verifica que la IA NO ataca una fortaleza cuando el ratio de fuerza es menor al umbral ratio_asedio_sin_artilleria (2.5). Debe priorizar consolidación.",
    mapFile: "MAP_TEST_D3",

    playerSetup: {
        // J1 (humano): unidad dentro de la fortaleza (poder efectivo ~80 por bonificación).
        initialResources: { oro: 500, comida: 100, madera: 80, piedra: 60, hierro: 20 },
        initialUnits: [
            {
                type: 'Defensor de Fortaleza',
                r: 6, c: 6,
                regiments: ['Infantería Pesada', 'Infantería Pesada', 'Arqueros'],
                // poder estimado = 80 (bonificación de fortaleza aplicada)
                enFortaleza: true
            }
        ]
    },

    enemySetup: {
        aiProfile: 'ai_normal',
        // J2 (IA): unidad a distancia 1, poder = 100.
        // Ratio = 100/80 = 1.25 < umbral 2.5 → motor debe cancelar ataque.
        initialResources: { oro: 1100, comida: 200, madera: 150, piedra: 100, hierro: 60 },
        initialUnits: [
            {
                type: 'Asaltante',
                r: 6, c: 7,
                regiments: ['Infantería Ligera', 'Infantería Ligera', 'Caballería Ligera'],
                // poder estimado = 100 (sin artillería → ratio insuficiente)
                sinArtilleria: true
            }
        ]
    },

    mapOverrides: {
        fortressHex: { r: 6, c: 6, hasWalls: true, owner: 1 }
    },

    victoryConditions: [{ type: "eliminate_all_enemies" }],
    lossConditions: [{ type: "player_capital_lost" }],

    _testMeta: {
        id: "T-10b",
        nombre: "Fortaleza defendida — IA veta ataque por ratio bajo",
        ratio_calculado: 1.25,
        umbral_ratio: 2.5,
        nodos_prohibidos: ["ataque_fortaleza_ratio_bajo"],
        accion_prohibida: "ATACAR",
        player_ia: 2,
        verificar: "AiGameplayManager._lastDecisionLog[2] → accion NO debe ser ATACAR hacia (6,6)"
    }
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.scenarios[TEST_D3A_SCENARIO.scenarioId] = TEST_D3A_SCENARIO;
    GAME_DATA_REGISTRY.scenarios[TEST_D3B_SCENARIO.scenarioId] = TEST_D3B_SCENARIO;
} else {
    console.warn("[TEST_D3] GAME_DATA_REGISTRY no disponible; escenarios no registrados.");
}
