// scenarios/britain_defense_scenario.js

// 1. Definir la constante de datos del escenario
const BRITAIN_DEFENSE_SCENARIO = {
  "scenarioId": "britain_defense",
  "displayName": "Defensa de Bretaña",
  "description": "Las fuerzas enemigas del Imperio Germánico desembarcan en las costas del sur. ¡Debes repeler la invasión!",
  "briefingImage": "",
  "mapFile": "BRITAIN_COAST_MAP", // Esta es la CLAVE que se usará para buscar en GAME_DATA_REGISTRY.maps
  "playerSetup": {
    "initialResources": { "oro": 200, "hierro": 50, "piedra": 100, "madera": 100, "comida": 50 },
    "initialUnits": [],
    "startHexes": [{"r":10, "c":2}, {"r":10, "c":3}]
  },
  "enemySetup": {
    "ownerId": "ai_1",
    "initialResources": { "oro": 150, "hierro": 30, "piedra": 70, "madera": 70, "comida": 40 },
    "initialUnits": [],
    "startHexes": [{"r":1, "c":4}, {"r":1, "c":5}],
    "aiProfile": "aggressive_attacker"
  },
  "victoryConditions": [ { "type": "eliminate_all_enemies" } ],
  "lossConditions": [ { "type": "player_capital_lost" } ],
  "resourceLevelOverride": "med"
};

// 2. Registrar esta constante en el objeto global GAME_DATA_REGISTRY
if (typeof GAME_DATA_REGISTRY !== 'undefined' && GAME_DATA_REGISTRY.scenarios) {
    // La CLAVE para el registro es la cadena "BRITAIN_DEFENSE_SCENARIO"
    // El VALOR es la constante BRITAIN_DEFENSE_SCENARIO que acabamos de definir
    GAME_DATA_REGISTRY.scenarios["BRITAIN_DEFENSE_SCENARIO"] = BRITAIN_DEFENSE_SCENARIO;
} else {
    console.error("ERROR DE REGISTRO en britain_defense_scenario.js: GAME_DATA_REGISTRY o GAME_DATA_REGISTRY.scenarios no está definido.");
}
