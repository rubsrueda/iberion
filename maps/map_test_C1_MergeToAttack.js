// maps/map_test_C1_MergeToAttack.js
const MAP_TEST_C1 = {
    rows: 15,
    cols: 15,
    playerCapital: { r: 13, c: 7 },
    enemyCapital: { r: 1, c: 7 },
    hexesConfig: {
        defaultTerrain: 'plains',
    }
};

if(typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.maps['MAP_TEST_C1'] = MAP_TEST_C1;
}