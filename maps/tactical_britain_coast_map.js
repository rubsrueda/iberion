// maps/tactical_britain_coast_map.js

const BRITAIN_COAST_MAP = { // Definido SIN _DATA
  "mapId": "britain_coast_01",
  "displayName": "Costa Sur de Bretaña",
  "rows": 12,
  "cols": 15,
  "hexesConfig": {
    "defaultTerrain": "plains",
    "specificHexes": [
      {"r": 0, "c": 0, "terrain": "water"},
      {"r": 0, "c": 1, "terrain": "water"},
      {"r": 0, "c": 2, "terrain": "water"},
      {"r": 0, "c": 3, "terrain": "water"},
      {"r": 0, "c": 4, "terrain": "water"},
      {"r": 0, "c": 5, "terrain": "water"},
      {"r": 0, "c": 6, "terrain": "water"},
      {"r": 0, "c": 7, "terrain": "water"},
      {"r": 0, "c": 8, "terrain": "water"},
      {"r": 0, "c": 9, "terrain": "water"},
      {"r": 0, "c": 10, "terrain": "water"},
      {"r": 0, "c": 11, "terrain": "water"},
      {"r": 0, "c": 12, "terrain": "water"},
      {"r": 0, "c": 13, "terrain": "water"},
      {"r": 0, "c": 14, "terrain": "water"},
      {"r": 1, "c": 0, "terrain": "water"},
      {"r": 1, "c": 1, "terrain": "water"},
      {"r": 1, "c": 2, "terrain": "beach"},
      {"r": 1, "c": 3, "terrain": "beach"},
      {"r": 1, "c": 4, "terrain": "beach"},
      {"r": 1, "c": 5, "terrain": "beach"},
      {"r": 1, "c": 6, "terrain": "beach"},
      {"r": 1, "c": 7, "terrain": "beach"},
      {"r": 1, "c": 8, "terrain": "water"},
      {"r": 1, "c": 9, "terrain": "water"},
      {"r": 2, "c": 1, "terrain": "beach"},
      {"r": 2, "c": 2, "terrain": "plains"},
      {"r": 2, "c": 3, "terrain": "plains"},
      {"r": 2, "c": 4, "terrain": "plains"},
      {"r": 2, "c": 5, "terrain": "plains"},
      {"r": 2, "c": 6, "terrain": "plains"},
      {"r": 2, "c": 7, "terrain": "beach"},
      {"r": 5, "c": 3, "terrain": "hills"},
      {"r": 5, "c": 4, "terrain": "hills"},
      {"r": 6, "c": 4, "terrain": "hills"},
      {"r": 5, "c": 8, "terrain": "hills"},
      {"r": 5, "c": 9, "terrain": "hills"},
      {"r": 7, "c": 2, "terrain": "forest"},
      {"r": 7, "c": 3, "terrain": "forest"},
      {"r": 8, "c": 6, "terrain": "forest"},
      {"r": 8, "c": 7, "terrain": "forest"},
      {"r": 4, "c": 11, "terrain": "forest"},
      {"r": 9, "c": 2, "terrain": "plains", "structure": "Camino"},
      {"r": 9, "c": 3, "terrain": "plains", "structure": "Camino"},
      {"r": 9, "c": 4, "terrain": "plains", "structure": "Camino"},
      {"r": 8, "c": 4, "terrain": "plains", "structure": "Camino"},
      {"r": 8, "c": 5, "terrain": "plains", "structure": "Camino"}
    ]
  },
  "playerCapital": {
    "r": 10,
    "c": 3,
    "name": "Cuartel General (Sur)"
  },
  "enemyCapital": {
    "r": 1,
    "c": 5,
    "name": "Puesto de Mando Invasor"
  },
  "cities": [
    { "r": 9, "c": 8, "name": "Aldea de Pescadores", "owner": "player" },
    { "r": 3, "c": 10, "name": "Granja Aislada", "owner": "neutral" }
  ],
  "resourceNodes": [
    { "r": 5, "c": 6, "type": "hierro" },
    { "r": 8, "c": 2, "type": "madera" },
    { "r": 4, "c": 9, "type": "comida" },
    { "r": 10, "c": 10, "type": "piedra" },
    { "r": 2, "c": 12, "type": "oro_mina" }
  ],
  "ambientSound": "sounds/coast_battle.mp3"
};

// Usar la constante BRITAIN_COAST_MAP (sin _DATA) para registrar
if (typeof GAME_DATA_REGISTRY !== 'undefined' && GAME_DATA_REGISTRY.maps) {
    // La CLAVE en el registro sigue siendo "BRITAIN_COAST_MAP"
    // El VALOR ahora es la constante BRITAIN_COAST_MAP
    GAME_DATA_REGISTRY.maps["BRITAIN_COAST_MAP"] = BRITAIN_COAST_MAP; // <<<< CAMBIO AQUÍ
    0 && console.log('BRITAIN_COAST_MAP registrado en GAME_DATA_REGISTRY.maps con clave "BRITAIN_COAST_MAP"');
    0 && console.log('REGISTRO OK: BRITAIN_COAST_MAP se ha registrado en GAME_DATA_REGISTRY.maps');

} else {
    console.error("Error en tactical_britain_coast_map.js: GAME_DATA_REGISTRY o GAME_DATA_REGISTRY.maps no está definido al intentar registrar.");
}

0 && console.log("DEFINICIÓN LOCAL: BRITAIN_COAST_MAP (constante) definido:", typeof BRITAIN_COAST_MAP);
