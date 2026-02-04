// maps/iberia_map_data.js
// Mapa detallado "Tronos de Iberia" v4.0 - Generado por Capas Geográficas

// --- CAPA 1: OCÉANOS Y MARES (Pincel de Área) ---
// Primero, pintamos grandes manchas de agua para definir los mares.
const oceansAndSeas = [
    ...generateBlob({ r: 40, c: -10 }, 45, 'water', 1), // Océano Atlántico
    ...generateBlob({ r: 10, c: 40 }, 25, 'water', 1),  // Mar Cantábrico / Golfo de Vizcaya
    ...generateBlob({ r: 55, c: 125 }, 35, 'water', 1), // Mar Mediterráneo
];

// --- CAPA 2: TIERRA FIRME (Pincel de Área) ---
// Ahora, pintamos una gran mancha de llanura encima del agua para crear la península.
const peninsulaLandmass = [
    ...generateBlob({ r: 45, c: 55 }, 35, 'plains', 1) // Gran elipse de tierra
];

// --- CAPA 3: MONTAÑAS, BOSQUES Y RÍOS (Pinceles de Línea y Área) ---
// Dibujamos los detalles geográficos sobre la tierra firme.
const terrainFeatures = [
    // Cordilleras (Líneas gruesas de colinas)
    ...generateLine({ r: 18, c: 65 }, { r: 29, c: 85 }, 'hills', 2), // Pirineos
    ...generateLine({ r: 18, c: 28 }, { r: 20, c: 62 }, 'hills', 2), // Cordillera Cantábrica y Montes Vascos
    ...generateLine({ r: 25, c: 24 }, { r: 32, c: 30 }, 'hills', 1), // Macizo Galaico-Leonés
    ...generateLine({ r: 28, c: 60 }, { r: 52, c: 82 }, 'hills', 1), // Sistema Ibérico
    ...generateLine({ r: 45, c: 38 }, { r: 43, c: 54 }, 'hills', 2), // Sistema Central
    ...generateLine({ r: 62, c: 38 }, { r: 61, c: 50 }, 'hills', 1), // Sierra Morena
    ...generateLine({ r: 68, c: 50 }, { r: 70, c: 72 }, 'hills', 2), // Sistema Bético

    // Bosques (Áreas densas)
    ...generateBlob({ r: 20, c: 25 }, 8, 'forest', 0.7), // Bosque Atlántico (Oeste)
    ...generateBlob({ r: 19, c: 62 }, 6, 'forest', 0.8), // Bosque Atlántico (Este)
    ...generateBlob({ r: 22, c: 72 }, 5, 'forest', 0.8), // Bosques Pirineos
    ...generateBlob({ r: 65, c: 28 }, 6, 'forest', 0.5), // Bosque Mediterráneo (Doñana)

    // Ríos (Líneas finas de agua)
    ...generateLine({ r: 22, c: 50 }, { r: 39, c: 92 }, 'water', 0), // Río Ebro
    ...generateLine({ r: 35, c: 60 }, { r: 41, c: 18 }, 'water', 0), // Río Duero
    ...generateLine({ r: 48, c: 65 }, { r: 60, c: 18 }, 'water', 0), // Río Tajo
    ...generateLine({ r: 58, c: 55 }, { r: 68, c: 25 }, 'water', 0), // Río Guadiana
    ...generateLine({ r: 64, c: 52 }, { r: 68, c: 32 }, 'water', 0), // Río Guadalquivir
    ...generateLine({ r: 22, c: 22 }, { r: 25, c: 16 }, 'water', 0), // Río Miño
];

// --- CAPA 4: CIUDADES Y RECURSOS (Puntos Estratégicos) ---
// Finalmente, colocamos los puntos de interés. Estos sobrescribirán cualquier terreno debajo.
const pointsOfInterest = [
    // Capitales de Jugadores
    { r: 42, c: 55, isCapital: true, owner: 1, cityName: 'Toletum (Castilla)' }, { r: 35, c: 80, isCapital: true, owner: 2, cityName: 'Caesaraugusta (Aragón)' }, { r: 60, c: 15, isCapital: true, owner: 3, cityName: 'Olisipo (Portugal)' }, { r: 68, c: 58, isCapital: true, owner: 4, cityName: 'Garnatah (Granada)' }, { r: 25, c: 40, isCapital: true, owner: 5, cityName: 'Legio (León)' }, { r: 20, c: 65, isCapital: true, owner: 6, cityName: 'Pamplona (Navarra)' }, { r: 35, c: 98, isCapital: true, owner: 7, cityName: 'Barcino (Barcelona)' }, { r: 65, c: 35, isCapital: true, owner: 8, cityName: 'Hispalis (Sevilla)' },
    // Ciudades Neutrales
    { r: 43, c: 88, isCity: true, owner: null, cityName: 'Valencia' }, { r: 65, c: 75, isCity: true, owner: null, cityName: 'Murcia' }, { r: 51, c: 109, isCity: true, owner: null, cityName: 'Palma de Mallorca', terrain: 'plains' }, { r: 48, c: 112, isCity: true, owner: null, cityName: 'Menorca', terrain: 'plains' }, { r: 18, c: 55, isCity: true, owner: null, cityName: 'Bilbao' }, { r: 58, c: 88, isCity: true, owner: null, cityName: 'Alicante' }, { r: 60, c: 45, isCity: true, owner: null, cityName: 'Córdoba' }, { r: 30, c: 45, isCity: true, owner: null, cityName: 'Valladolid' }, { r: 25, c: 15, isCity: true, owner: null, cityName: 'Vigo' }, { r: 18, c: 38, isCity: true, owner: null, cityName: 'Gijón' }, { r: 18, c: 60, isCity: true, owner: null, cityName: 'Vitoria-Gasteiz' }, { r: 20, c: 18, isCity: true, owner: null, cityName: 'A Coruña' }, { r: 18, c: 35, isCity: true, owner: null, cityName: 'Oviedo' }, { r: 68, c: 80, isCity: true, owner: null, cityName: 'Cartagena' }, { r: 38, c: 35, isCity: true, owner: null, cityName: 'Salamanca' }, { r: 28, c: 52, isCity: true, owner: null, cityName: 'Burgos' }, { r: 17, c: 48, isCity: true, owner: null, cityName: 'Santander' }, { r: 58, c: 65, isCity: true, owner: null, cityName: 'Albacete' }, { r: 68, c: 28, isCity: true, owner: null, cityName: 'Huelva' }, { r: 30, c: 68, isCity: true, owner: null, cityName: 'Logroño' }, { r: 55, c: 38, isCity: true, owner: null, cityName: 'Cáceres' }, { r: 40, c: 20, isCity: true, owner: null, cityName: 'Oporto' }, { r: 48, c: 22, isCity: true, owner: null, cityName: 'Coímbra' }, { r: 35, c: 22, isCity: true, owner: null, cityName: 'Braga' }, { r: 72, c: 20, isCity: true, owner: null, cityName: 'Faro' }, { r: 70, c: 5, isCity: true, owner: null, cityName: 'Las Palmas', terrain: 'hills' }, { r: 72, c: 8, isCity: true, owner: null, cityName: 'Santa Cruz', terrain: 'hills' },
    // Recursos
    { r: 28, c: 28, resourceNode: 'oro_mina' }, { r: 68, c: 30, resourceNode: 'oro_mina' }, { r: 70, c: 64, resourceNode: 'oro_mina' }, { r: 18, c: 45, resourceNode: 'hierro' }, { r: 22, c: 34, resourceNode: 'hierro' }, { r: 66, c: 32, resourceNode: 'hierro' }, { r: 69, c: 82, resourceNode: 'hierro' }, { r: 21, c: 24, resourceNode: 'madera' }, { r: 19, c: 60, resourceNode: 'madera' }, { r: 50, c: 30, resourceNode: 'madera' }, { r: 43, c: 52, resourceNode: 'piedra' }, { r: 70, c: 78, resourceNode: 'piedra' }, { r: 50, c: 85, resourceNode: 'comida' }, { r: 67, c: 42, resourceNode: 'comida' }, { r: 38, c: 45, resourceNode: 'comida' },
];

// --- ENSAMBLAJE FINAL DEL MAPA ---
// Se combinan todas las capas en el orden correcto. Las capas posteriores
// sobrescriben a las anteriores, permitiendo colocar ciudades sobre montañas, etc.
const IBERIA_MAGNA_MAP_DATA = {
    rows: 75,
    cols: 120,
    specialHexes: [
        ...oceansAndSeas,
        ...peninsulaLandmass,
        ...terrainFeatures,
        ...pointsOfInterest
    ]
};

if (typeof GAME_DATA_REGISTRY !== 'undefined') {
    GAME_DATA_REGISTRY.maps['IBERIA_MAGNA'] = IBERIA_MAGNA_MAP_DATA;
    0 && console.log("Mapa 'IBERIA_MAGNA' (v4.0 por Capas) registrado con éxito.");
} else {
    console.error("Error: GAME_DATA_REGISTRY no está definido.");
}