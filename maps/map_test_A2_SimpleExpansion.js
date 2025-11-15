// maps/map_test_A2_SimpleExpansion.js
// Podemos reusar el mismo mapa que A1, ya que las unidades las definimos por separado.
const MAP_TEST_A2 = MAP_TEST_A1;

if(typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.maps['MAP_TEST_A2'] = MAP_TEST_A2;
}