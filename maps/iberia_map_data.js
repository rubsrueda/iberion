//iberia_map_data.js

const IBERIA_MAP_CONFIG = {
    csvPath: 'peninsula2.csv', // ¡IMPORTANTE! El juego cargará este archivo.
    rows: 125,
    cols: 125,
    legend: {
        'W': { terrain: 'water' },
        'T': { terrain: 'plains' },
        'C': { terrain: 'hills', resourceNode: 'hierro'  },
        'O': { terrain: 'hills', resourceNode: 'Oro'  },
        'M': { terrain: 'hills' , resourceNode: 'piedra' },
        'B': { terrain: 'forest', resourceNode: 'madera' }, // Los bosques siempre dan madera.
        'R': { terrain: 'water' }
    }
};

// --- CAPA DE PUNTOS DE INTERÉS ---
// He colocado todas tus ciudades en sus coordenadas aproximadas sobre tu silueta.
// Tu única tarea es revisar si te gusta su ubicación.
const pointsOfInterestLayer = [
    // --- CAPITALES DE JUGADORES (Grandes Ciudades) ---
    { r: 53, c: 62, isCapital: true, owner: 1, cityName: 'Madrid' },        // J1: Castilla
   
    { r: 29, c: 112, isCapital: true, owner: 2, cityName: 'Barcelona' },     // J2: Aragón/Cataluña
    { r: 49, c: 110, isCapital: true, owner: 5, cityName: 'Valencia' },       // J4: Valencia
    { r: 30, c: 84, isCapital: true, owner: 8, cityName: 'Zaragoza' },       // J7: Aragón

    { r: 47, c: 8, isCapital: true, owner: 6, cityName: 'Oporto' },         // J6: Norte de Portugal
    { r: 79, c: 2, isCapital: true, owner: 3, cityName: 'Lisboa' },         // J3: Portugal
    
    { r: 103, c: 38, isCapital: true, owner: 4, cityName: 'Sevilla' },        // J5: Andalucía
    { r: 108, c: 62, isCapital: true, owner: 7, cityName: 'Málaga' },        // J8: Costa del Sol

// --- CIUDADES SECUNDARIAS (Neutrales, ubicadas por la IA en referencia a tus capitales) ---
    { r: 18, c: 14, terrain: 'plains', isCity: true, owner: null, cityName: 'A Coruña' },
    { r: 67, c: 85, terrain: 'plains', isCity: true, owner: null, cityName: 'Albacete' },
    { r: 75, c: 96, terrain: 'plains', isCity: true, owner: null, cityName: 'Alicante' },
    { r: 14, c: 76, terrain: 'plains', isCity: true, owner: null, cityName: 'Bilbao' },
    { r: 33, c: 14, terrain: 'plains', isCity: true, owner: null, cityName: 'Braga' },
    { r: 26, c: 68, terrain: 'plains', isCity: true, owner: null, cityName: 'Burgos' },
    { r: 60, c: 31, terrain: 'plains', isCity: true, owner: null, cityName: 'Cáceres' },
    { r: 86, c: 95, terrain: 'plains', isCity: true, owner: null, cityName: 'Cartagena' },
    { r: 49, c: 16, terrain: 'plains', isCity: true, owner: null, cityName: 'Coímbra' },
    { r: 83, c: 54, terrain: 'plains', isCity: true, owner: null, cityName: 'Córdoba' },
    { r: 77, c: 95, terrain: 'plains', isCity: true, owner: null, cityName: 'Elche' },
    { r: 99, c: 18, terrain: 'plains', isCity: true, owner: null, cityName: 'Faro' },
    { r: 12, c: 45, terrain: 'plains', isCity: true, owner: null, cityName: 'Gijón' },
    { r: 96, c: 69, terrain: 'plains', isCity: true, owner: null, cityName: 'Granada' },
    { r: 30, c: 111, terrain: 'plains', isCity: true, owner: null, cityName: 'L\'Hospitalet' },
    { r: 95, c: 27, terrain: 'plains', isCity: true, owner: null, cityName: 'Huelva' },
    { r: 21, c: 48, terrain: 'plains', isCity: true, owner: null, cityName: 'León' },
    { r: 24, c: 80, terrain: 'plains', isCity: true, owner: null, cityName: 'Logroño' },
    { r: 81, c: 91, terrain: 'plains', isCity: true, owner: null, cityName: 'Murcia' },
    { r: 13, c: 44, terrain: 'plains', isCity: true, owner: null, cityName: 'Oviedo' },
    { r: 18, c: 85, terrain: 'plains', isCity: true, owner: null, cityName: 'Pamplona' },
    { r: 47, c: 44, terrain: 'plains', isCity: true, owner: null, cityName: 'Salamanca' },
    { r: 11, c: 65, terrain: 'plains', isCity: true, owner: null, cityName: 'Santander' },
    { r: 77, c: 5, terrain: 'plains', isCity: true, owner: null, cityName: 'Setúbal' },
    { r: 35, c: 56, terrain: 'plains', isCity: true, owner: null, cityName: 'Valladolid' },
    { r: 29, c: 10, terrain: 'plains', isCity: true, owner: null, cityName: 'Vigo' },
    { r: 17, c: 78, terrain: 'plains', isCity: true, owner: null, cityName: 'Vitoria-Gasteiz' },
    // Ciudades insulares (ubicadas simbólicamente)
    //{ r: 51, c: 118, terrain: 'plains', isCity: true, owner: null, cityName: 'Palma de Mallorca' },
    //{ r: 115, c: 5, terrain: 'plains', isCity: true, owner: null, cityName: 'Las Palmas' },
    //{ r: 118, c: 8, terrain: 'plains', isCity: true, owner: null, cityName: 'Santa Cruz' },
];


/**
 * Función que el juego llamará para construir el mapa "Tronos de Iberia".
 */
async function initializeIberiaMagnaData() {
    console.log(`Cargando silueta desde: ${IBERIA_MAP_CONFIG.csvPath}`);
    
    // 1. Carga y parsea TU archivo CSV para crear la capa base de tierra y agua.
    const silhouetteLayer = await loadAndParseMapFromCSV(IBERIA_MAP_CONFIG.csvPath, IBERIA_MAP_CONFIG.legend);

    // 2. Registra el mapa final en el juego, combinando la silueta con la capa de ciudades.
    GAME_DATA_REGISTRY.maps['IBERIA_MAGNA'] = {
        rows: IBERIA_MAP_CONFIG.rows,
        cols: IBERIA_MAP_CONFIG.cols,
        specialHexes: [
            ...silhouetteLayer,
            ...pointsOfInterestLayer // Las ciudades se "pintan" encima de la silueta.
        ]
    };
    
    console.log("Mapa 'IBERIA_MAGNA' cargado desde tu CSV y poblado con ciudades.");
}