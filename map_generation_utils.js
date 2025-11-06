// map_generation_utils.js
// Herramientas para cargar y parsear mapas desde archivos.

/**
 * HERRAMIENTA 1: Carga un archivo CSV desde el servidor y lo parsea.
 * Es una función 'async' porque la carga de archivos no es instantánea.
 * @param {string} filePath - La ruta a tu archivo .csv (ej: 'peninsula2.csv').
 * @param {object} legend - El objeto que traduce 'W' y 'T' a terrenos.
 * @returns {Promise<Array>} Una promesa que se resuelve con el array de hexágonos.
 */
async function loadAndParseMapFromCSV(filePath, legend) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Error de red: No se pudo cargar el archivo del mapa en ${filePath}`);
        }
        const csvText = await response.text();
        return parseAsciiMap(csvText, legend, 0);
    } catch (error) {
        console.error("Error fatal al cargar o parsear el mapa CSV:", error);
        alert("¡ERROR! No se pudo cargar el archivo del mapa. Revisa la consola para más detalles.");
        return []; // Devuelve un array vacío en caso de error
    }
}

// En map_generation_utils.js, REEMPLAZA la función parseAsciiMap

/**
 * PINCEL 4: Convierte un "mapa" hecho con texto (ASCII) a una lista de hexágonos.
 * Versión v3.0 - CORRECCIÓN CRÍTICA DE POSICIONAMIENTO HEXAGONAL.
 * @param {string} asciiMap - El contenido del archivo CSV.
 * @param {object} legend - El objeto que mapea cada caracter a un tipo de hexágono.
 * @param {number} startRow - La fila del tablero donde empieza el dibujo.
 * @returns {Array} Un array de objetos de hexágonos para el mapa.
 */
function parseAsciiMap(asciiMap, legend, startRow = 0) {
    const hexes = [];
    const rows = asciiMap.trim().split('\n');

    rows.forEach((rowString, r_offset) => {
        const r = startRow + r_offset;
        const chars = rowString.replace(/,/g, '').trim();

        for (let c_ascii = 0; c_ascii < chars.length; c_ascii++) {
            const char = chars[c_ascii];
            const hexData = legend[char];
            
            if (hexData) {

                const c = c_ascii;
           
                hexes.push({ r, c, ...hexData });
            }
        }
    });
    return hexes;
}