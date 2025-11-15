// maps/map_test_B1_FavorableCombat.js
const MAP_TEST_B1 = {
    rows: 15,
    cols: 15,
    playerCapital: { r: 13, c: 7 },
    enemyCapital: { r: 1, c: 7 },
    hexesConfig: {
        defaultTerrain: 'plains',
        specificHexes: [
            {r: 5, c: 6, resourceNode: 'oro'}
        ]
    }
};

if(typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.maps['MAP_TEST_B1'] = MAP_TEST_B1;
}