// maps/iberia_map_24x35.js
// Mapa Conceptual de la Península Ibérica para HEX GENERAL EVOLVED
// Tamaño: 24 filas x 35 columnas
const IBERIA_MAP = {
"mapId": "iberia_01", // Puedes mantener el mismo ID o cambiarlo si quieres versiones diferentes
"displayName": "Península Ibérica (24x35)", // Nombre descriptivo
"rows": 24,
"cols": 35,
"hexesConfig": {
"defaultTerrain": "plains", // La mayoría será llanura por defecto
"specificHexes": [
// --- Esqueleto Mínimo de Costa y Mar (Necesita MUCHO más detalle) ---
// Costa Noroeste
{"r": 0, "c": 0, "terrain": "water"}, {"r": 0, "c": 1, "terrain": "water"}, {"r": 0, "c": 2, "terrain": "water"}, {"r": 0, "c": 3, "terrain": "water"},
{"r": 1, "c": 0, "terrain": "water"}, {"r": 1, "c": 1, "terrain": "water"}, {"r": 1, "c": 2, "terrain": "beach"}, {"r": 1, "c": 3, "terrain": "beach"},
{"r": 2, "c": 0, "terrain": "water"}, {"r": 2, "c": 1, "terrain": "beach"}, {"r": 2, "c": 2, "terrain": "plains"},
{"r": 3, "c": 0, "terrain": "water"}, {"r": 3, "c": 1, "terrain": "beach"},
// Costa Cantábrica
{"r": 4, "c": 2, "terrain": "beach"}, {"r": 4, "c": 3, "terrain": "water"},
{"r": 5, "c": 3, "terrain": "beach"}, {"r": 5, "c": 4, "terrain": "water"},
// Costa Este Mediterráneo
{"r": 8, "c": 34, "terrain": "water"}, {"r": 9, "c": 34, "terrain": "water"}, {"r": 10, "c": 34, "terrain": "water"},
{"r": 9, "c": 33, "terrain": "beach"}, {"r": 10, "c": 33, "terrain": "beach"}, {"r": 11, "c": 32, "terrain": "beach"},
// Costa Sur
{"r": 18, "c": 28, "terrain": "water"}, {"r": 19, "c": 28, "terrain": "water"}, {"r": 20, "c": 27, "terrain": "water"},
{"r": 19, "c": 27, "terrain": "beach"}, {"r": 20, "c": 26, "terrain": "beach"}, {"r": 21, "c": 25, "terrain": "beach"},
// Estrecho
{"r": 23, "c": 22, "terrain": "water"}, {"r": 23, "c": 21, "terrain": "beach"},
Generated code
// --- Esqueleto Mínimo de Montañas (Necesita MUCHO más detalle) ---
  // Pirineos
  {"r": 4, "c": 26, "terrain": "mountain"}, {"r": 4, "c": 27, "terrain": "mountain"}, {"r": 5, "c": 26, "terrain": "mountain"}, {"r": 5, "c": 27, "terrain": "mountain"}, {"r": 6, "c": 25, "terrain": "mountain"},
  // Sistema Central
  {"r": 11, "c": 16, "terrain": "mountain"}, {"r": 11, "c": 17, "terrain": "mountain"}, {"r": 12, "c": 16, "terrain": "mountain"},
  // Sierra Nevada
  {"r": 18, "c": 23, "terrain": "mountain"}, {"r": 19, "c": 23, "terrain": "mountain"},

  // --- Esqueleto Mínimo de Ríos (Necesita MUCHO más detalle) ---
  // Ebro (parcial)
  {"r": 10, "c": 25, "terrain": "river"}, {"r": 10, "c": 26, "terrain": "river"}, {"r": 11, "c": 26, "terrain": "river"},
  // Tajo (parcial)
  {"r": 13, "c": 18, "terrain": "river"}, {"r": 13, "c": 19, "terrain": "river"}, {"r": 14, "c": 19, "terrain": "river"},

  // --- Esqueleto Mínimo de Bosques (Ejemplo) ---
  {"r": 5, "c": 8, "terrain": "forest"}, {"r": 6, "c": 8, "terrain": "forest"},

  // --- Esqueleto Mínimo de Caminos (Ejemplo) ---
  {"r": 12, "c": 17, "terrain": "plains", "structure": "Camino"}, // Cerca de Madrid
  {"r": 11, "c": 18, "terrain": "plains", "structure": "Camino"},
  {"r": 10, "c": 19, "terrain": "plains", "structure": "Camino"},
]
Use code with caution.
},
"playerCapital": {
"r": 12, // Coordenada R aproximada para Madrid (centro-ish)
"c": 17, // Coordenada C aproximada para Madrid
"name": "Cuartel General (Madrid)"
},
"enemyCapital": {
"r": 5, // Coordenada R aproximada (ejemplo cerca de Pirineos)
"c": 28, // Coordenada C aproximada
"name": "Puesto de Mando Enemigo"
},
"cities": [
// --- España ---
{ "r": 12, "c": 17, "name": "Madrid", "owner": "player" }, // Player Capital
{ "r": 9, "c": 31, "name": "Barcelona", "owner": "neutral" }, // Aproximado
{ "r": 19, "c": 15, "name": "Sevilla", "owner": "neutral" }, // Aproximado
{ "r": 9, "c": 26, "name": "Zaragoza", "owner": "neutral" }, // Aproximado
{ "r": 18, "c": 22, "name": "Granada", "owner": "neutral" }, // Aproximado
{ "r": 19, "c": 17, "name": "Córdoba", "owner": "neutral" }, // Aproximado
{ "r": 10, "c": 13, "name": "Salamanca", "owner": "neutral" }, // Aproximado
{ "r": 5, "c": 8, "name": "Bilbao", "owner": "neutral" }, // Aproximado
{ "r": 2, "c": 2, "name": "Santiago", "owner": "neutral" }, // Aproximado (Santiago de Compostela)
{ "r": 12, "c": 31, "name": "Valencia", "owner": "neutral" }, // Aproximado
// --- Portugal ---
{ "r": 17, "c": 4, "name": "Lisboa", "owner": "neutral" }, // Aproximado
{ "r": 10, "c": 3, "name": "Porto", "owner": "neutral" }, // Aproximado
// --- Baleares (Aproximación burda en un mapa pequeño) ---
{ "r": 13, "c": 33, "name": "Palma", "owner": "neutral" }, // Aproximado (Mallorca)
// ... (Añade más ciudades clave y ajústa coordenadas)
],
"resourceNodes": [
// --- Hierro ---
{ "r": 6, "c": 9, "type": "hierro" }, // Cerca de montañas Cantábricas
{ "r": 17, "c": 19, "type": "hierro" }, // Cerca de Sierra Morena/Sur
// --- Madera ---
{ "r": 5, "c": 9, "type": "madera" }, // Zona forestal
{ "r": 16, "c": 10, "type": "madera" }, // Zona forestal
// --- Comida ---
{ "r": 16, "c": 8, "type": "comida" }, // Llanuras (Extremadura)
{ "r": 11, "c": 20, "type": "comida" }, // Meseta/Valle
// --- Piedra ---
{ "r": 5, "c": 25, "type": "piedra" }, // Pirineos
{ "r": 12, "c": 16, "type": "piedra" }, // Sistema Central
// --- Oro ---
{ "r": 3, "c": 4, "type": "oro_mina" }, // Noroeste
{ "r": 21, "c": 25, "type": "oro_mina" } // Sur (Andalucía)
// ... (Añade más nodos de recursos y ajústa coordenadas)
],
"ambientSound": "sounds/iberia_ambience.mp3" // O el que tengas
};
// Usar la constante IBERIA_MAP para registrar
if (typeof GAME_DATA_REGISTRY !== 'undefined' && GAME_DATA_REGISTRY.maps) {
// La CLAVE en el registro debe ser el ID del mapa
GAME_DATA_REGISTRY.maps[IBERIA_MAP.mapId] = IBERIA_MAP; // <<<< USAR mapId como clave
console.log(Mapa "${IBERIA_MAP.displayName}" (${IBERIA_MAP.mapId}) registrado.);
} else {
console.error(Error en ${IBERIA_MAP.mapId}.js: GAME_DATA_REGISTRY o GAME_DATA_REGISTRY.maps no está definido al intentar registrar.);
}
console.log(DEFINICIÓN LOCAL: IBERIA_MAP (constante) definido:, typeof IBERIA_MAP);
