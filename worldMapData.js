// worldMapData.js
const WORLD_MAP_DATA = {
  "mapImage": "images/world_map_risk_style.png",

  "territories": {

    // territorios
    "territory_A": {
      "id": "territory_A",
      "name": "Gran Bretaña",
      "displayName": "Gran Bretaña",
      "adjacent": [],                               // Vaciado porque B y C no están definidos
      "position": {"x": 150, "y": 120},
      "scenarioFile": "BRITAIN_DEFENSE_SCENARIO", 
      "initialOwner": "player"
    }, 

    "test_A1": {
      "id": "test_A1",
      "name": "Test A.1: Expansión por División",
      "displayName": "Test A.1",
      "position": {"x": 50, "y": 50},
      "scenarioFile": "TEST_A1_SPLIT_EXPANSION",
      "initialOwner": "neutral"
    },
    "test_A2": {
      "id": "test_A2",
      "name": "Test A.2: Expansión Simple",
      "displayName": "Test A.2",
      "position": {"x": 50, "y": 100},
      "scenarioFile": "TEST_A2_SIMPLE_EXPANSION",
      "initialOwner": "neutral"
    },
    "test_B1": {
      "id": "test_B1",
      "name": "Test B.1: Combate Favorable",
      "displayName": "Test B.1",
      "position": {"x": 50, "y": 150},
      "scenarioFile": "TEST_B1_FAVORABLE_COMBAT",
      "initialOwner": "neutral"
    },
    "test_B2": {
      "id": "test_B2",
      "name": "Test B.2: Retirada Táctica",
      "displayName": "Test B.2",
      "position": {"x": 50, "y": 200},
      "scenarioFile": "TEST_B2_TACTICAL_RETREAT",
      "initialOwner": "neutral"
    },
    "test_B3": {
      "id": "test_B3",
      "name": "Test B.3: Tomar y Hostigar",
      "displayName": "Test B.3",
      "position": {"x": 50, "y": 250},
      "scenarioFile": "TEST_B3_SPLIT_AND_HARASS",
      "initialOwner": "neutral"
    },
    "test_C1": {
      "id": "test_C1",
      "name": "Test C.1: Fusión Ofensiva",
      "displayName": "Test C.1",
      "position": {"x": 50, "y": 300},
      "scenarioFile": "TEST_C1_MERGE_TO_ATTACK",
      "initialOwner": "neutral"
    }

    /*
    "territory_B": {
      "id": "territory_B",
      "name": "Europa Occidental",
      "displayName": "Europa Occ.",
      "adjacent": ["territory_A", "territory_D"],
      "position": {"x": 250, "y": 180},
      "scenarioFile": "WESTERN_EUROPE_INVASION_SCENARIO",
      "initialOwner": "ai_1"
    },
    */
    
  },

  "playerStartTerritory": "territory_A",
  "aiPlayers": {
    "ai_1": { "name": "Imperio Germánico", "color": "red" }
    // ai_2 no es necesario si no hay territorios que lo usen
  }
};
