// maps/map_test_A1_SplitExpansion.js
const MAP_TEST_A1 = {
    rows: 15,
    cols: 15,
    playerCapital: { r: 13, c: 7 }, // Capital del Humano (fuera del camino)
    enemyCapital: { r: 1, c: 7 },   // Capital de la IA
    hexesConfig: {
        defaultTerrain: 'plains',
        specificHexes: [
            // Puedes añadir algún bosque o colina para variar si quieres
            {r: 6, c: 6, terrain: 'hills'},
        ]
    },
    // NOTA: Las unidades se definen en el archivo del escenario, no en el mapa.
};

if(typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.maps['MAP_TEST_A1'] = MAP_TEST_A1;
}