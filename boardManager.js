// boardManager.js (20251206)
// Funciones para crear, gestionar y renderizar el tablero y sus hexágonos.

let _boundMouseMove, _boundMouseUp;
let panStartTimestamp = 0;
let hasMovedEnoughForPan = false;
const PAN_MOVE_THRESHOLD = 5;

// --- INICIALIZACIÓN PARA PARTIDAS DE ESCARAMUZA ---
function initializeNewGameBoardDOMAndData(selectedResourceLevel = 'min', selectedBoardSize = 'small', isNavalMap = false, gameMode = 'development') {

console.log(`boardManager.js: initializeNewGameBoardDOMAndData ha sido llamada. Naval: ${isNavalMap}, Modo: ${gameMode}`);

const boardDimensions = BOARD_SIZES[selectedBoardSize] || BOARD_SIZES['small'];
const B_ROWS = boardDimensions.rows;
const B_COLS = boardDimensions.cols;
const isInvasionMode = gameMode === 'invasion';    

// --- ¡CORRECCIÓN CLAVE AQUÍ! Acceder a través de domElements ---
if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateX !== 'undefined') domElements.currentBoardTranslateX = 0;
if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateY !== 'undefined') domElements.currentBoardTranslateY = 0;
if (domElements.gameBoard) {
    domElements.gameBoard.style.transform = `translate(0px, 0px)`;
}

if (!domElements.gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM."); return; } // Usar domElements
domElements.gameBoard.innerHTML = ''; // Limpiar tablero existente // Usar domElements

board = Array(B_ROWS).fill(null).map(() => Array(B_COLS).fill(null));
gameState.cities = []; // Limpiar ciudades del estado global para una nueva partida

domElements.gameBoard.style.width = `${B_COLS * HEX_WIDTH + HEX_WIDTH / 2}px`; // Usar domElements
domElements.gameBoard.style.height = `${B_ROWS * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`; // Usar domElements

for (let r = 0; r < B_ROWS; r++) {
    for (let c = 0; c < B_COLS; c++) {
        const hexElement = createHexDOMElementWithListener(r, c);
        domElements.gameBoard.appendChild(hexElement); // Usar domElements
        
        const terrainType = getRandomTerrainType(); 
        board[r][c] = {
            r: r, 
            c: c, 
            element: hexElement, 
            terrain: terrainType, 
            owner: null, structure: null,
            isCity: false, isCapital: false, resourceNode: null,
            visibility: { player1: 'visible', player2: 'visible' }, unit: null,
            estabilidad: 0,
            nacionalidad: { 1: 0, 2: 0 }
        };
    }
}



if (gameState) { 
    gameState.isCampaignBattle = false;
    gameState.currentScenarioData = null;
    gameState.currentMapData = null;
}

// Solo crear capitales iniciales si NO es un mapa naval
// (en mapas navales, las capitales se crean durante generateNavalArchipelagoMap)
if (!isNavalMap) {
    if (isInvasionMode) {
        // MODO INVASIÓN: Distribución Asimétrica
        console.log('[INVASION] Creando distribución asimétrica de territorio...');
        
        // Jugador 1: Ciudad base en esquina (punto de invasión - rol de atacante)
        const attackerBaseR = 1;
        const attackerBaseC = 2;
        addCityToBoardData(attackerBaseR, attackerBaseC, 1, "Base de Invasión", true);
        if (board[attackerBaseR]?.[attackerBaseC]) {
            board[attackerBaseR][attackerBaseC].structure = 'Aldea';
            board[attackerBaseR][attackerBaseC].owner = 1;
        }
        
        // Marcar hexágonos cercanos como territorio del atacante (zona de desembarco - radio 1)
        const attackerDeploymentRadius = INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS;
        for (let dr = -attackerDeploymentRadius; dr <= attackerDeploymentRadius; dr++) {
            for (let dc = -attackerDeploymentRadius; dc <= attackerDeploymentRadius; dc++) {
                const r = attackerBaseR + dr;
                const c = attackerBaseC + dc;
                if (board[r]?.[c] && hexDistance(attackerBaseR, attackerBaseC, r, c) <= attackerDeploymentRadius) {
                    board[r][c].owner = 1;
                }
            }
        }
        
        // Jugador 2: Capital en posición opuesta + ciudades distribuidas (rol de defensor)
        const defenderCapitalR = B_ROWS - 2;
        const defenderCapitalC = B_COLS - 3;
        addCityToBoardData(defenderCapitalR, defenderCapitalC, 2, "Capital del Reino", true);
        if (board[defenderCapitalR]?.[defenderCapitalC]) {
            board[defenderCapitalR][defenderCapitalC].structure = 'Ciudad';
            board[defenderCapitalR][defenderCapitalC].owner = 2;
        }
        
        // Ciudades adicionales para el defensor (distribuidas y alejadas)
        const additionalCities = INVASION_MODE_CONFIG.DEFENDER_CITIES - 1;
        const minCityDistance = 6;
        for (let i = 0; i < additionalCities; i++) {
            const cityPos = findDistributedLandPosition({
                minR: Math.floor(B_ROWS * 0.3),
                maxR: Math.floor(B_ROWS * 0.8),
                minC: Math.floor(B_COLS * 0.3),
                maxC: Math.floor(B_COLS * 0.8),
                minDistanceFrom: [
                    { r: defenderCapitalR, c: defenderCapitalC, min: minCityDistance },
                    { r: attackerBaseR, c: attackerBaseC, min: minCityDistance }
                ],
                minDistanceFromCities: minCityDistance,
                maxAttempts: 500
            });

            if (cityPos) {
                addCityToBoardData(cityPos.r, cityPos.c, 2, `Ciudad ${i + 1}`, false);
                if (board[cityPos.r]?.[cityPos.c]) {
                    board[cityPos.r][cityPos.c].structure = i === 0 ? 'Ciudad' : 'Aldea';
                    board[cityPos.r][cityPos.c].owner = 2;
                }
            }
        }
        
        // Marcar todo el resto del mapa como territorio del defensor (excepto zona atacante)
        for (let r = 0; r < B_ROWS; r++) {
            for (let c = 0; c < B_COLS; c++) {
                if (board[r]?.[c] && !board[r][c].owner) {
                    // Si no está en la zona del atacante, pertenece al defensor
                    if (hexDistance(attackerBaseR, attackerBaseC, r, c) > attackerDeploymentRadius) {
                        board[r][c].owner = 2;
                    }
                }
            }
        }
        
        logMessage(`Modo Invasión: Atacante en (${attackerBaseR},${attackerBaseC}), Defensor controla el resto del mapa.`);
    } else {
        // MODO DESARROLLO: Distribución Simétrica (lógica original)
        // Capital Jugador 1
        addCityToBoardData(1, 2, 1, "Capital P1 (Escaramuza)", true);
        if (board[1]?.[2]) board[1][2].structure = 'Aldea';

        // Capital Jugador 2
        const capitalP2_r = B_ROWS - 2;
        const capitalP2_c = B_COLS - 3;
        addCityToBoardData(capitalP2_r, capitalP2_c, 2, "Capital P2 (Escaramuza)", true);
        if (board[capitalP2_r]?.[capitalP2_c]) board[capitalP2_r][capitalP2_c].structure = 'Aldea';
    }
}

/* se cambia por generateProceduralMap a continuación.
generateRiversAndLakes(B_ROWS, B_COLS, 1); 
generateHillsAndForests(B_ROWS, B_COLS, 0.15, 0.1); 

generateRandomResourceNodes(selectedResourceLevel); 
*/
generateProceduralMap(B_ROWS, B_COLS, selectedResourceLevel, isNavalMap, gameMode);

const barbDensity = gameState.setupTempSettings?.barbarianDensity || 'med';
generateBarbarianCities(B_ROWS, B_COLS, barbDensity);

generateInitialRuins();
initializeTerritoryData(); 

renderFullBoardVisualState(); 
if (typeof updateFogOfWar === "function") updateFogOfWar();
initializeBoardPanning(); 

// Registrar inicio de partida en la Crónica
if (typeof Chronicle !== 'undefined') {
    Chronicle.clearLogs(); // Limpiar logs anteriores
    Chronicle.logEvent('game_start', {
        boardSize: `${B_ROWS}x${B_COLS}`,
        resourceLevel: selectedResourceLevel,
        isNaval: isNavalMap,
        numPlayers: gameState.numPlayers
    });
}

console.log("boardManager.js: initializeNewGameBoardDOMAndData completada.");
}

/**
 * Orquesta la generación procedural del mapa de escaramuza.
 * @param {number} B_ROWS - Número de filas del tablero.
 * @param {number} B_COLS - Número de columnas del tablero.
 * @param {string} resourceLevel - Nivel de recursos ('min', 'med', 'max').
*/
function generateProceduralMap(B_ROWS, B_COLS, resourceLevel, isNavalMap = false, gameMode = 'development') {
    console.log(`Iniciando generación procedural de mapa... Naval: ${isNavalMap}`);
    const totalHexes = B_ROWS * B_COLS;

    // --- GENERACIÓN DE MAPA NAVAL ---
    if (isNavalMap) {
        generateNavalArchipelagoMap(B_ROWS, B_COLS, resourceLevel, gameMode);
        return; // Salir temprano, la función naval maneja todo
    }

    // --- 1. Generar Terreno (Mapa estándar) ---
    const terrainProportions = { water: 0.30, forest: 0.25, hills: 0.15, plains: 0.30 };

    // Primero, llenamos todo de llanura
    for (let r = 0; r < B_ROWS; r++) {
        for (let c = 0; c < B_COLS; c++) {
            if (board[r]?.[c]) board[r][c].terrain = 'plains';
        }
    }

    // Segundo, creamos cuerpos de agua y bosques
    generateContiguousTerrain(B_ROWS, B_COLS, 'water', Math.floor(totalHexes * terrainProportions.water));
    generateClusteredTerrain(B_ROWS, B_COLS, 'forest', Math.floor(totalHexes * terrainProportions.forest), 2, 4);
    generateClusteredTerrain(B_ROWS, B_COLS, 'hills', Math.floor(totalHexes * terrainProportions.hills), 1, 3);

    // --- Asegurar un camino entre capitales de jugadores ---
    const capitalP1 = gameState.cities.find(c => c.isCapital && c.owner === 1);
    const capitalP2 = gameState.cities.find(c => c.isCapital && c.owner === 2);
    if (capitalP1 && capitalP2) {
        ensurePathBetweenPoints({r: capitalP1.r, c: capitalP1.c}, {r: capitalP2.r, c: capitalP2.c}, 1);
    }

    // --- INICIO COLOCAR LA BANCA ---
    const bankCityR = Math.floor(B_ROWS / 2);
    let bankCityC = Math.floor(B_COLS / 2);
    
    // Si cae en agua, desplazar
    while(board[bankCityR]?.[bankCityC]?.terrain === 'water') {
        bankCityC++; 
        if (bankCityC >= B_COLS) { bankCityC = Math.floor(B_COLS / 2) - 1; }
    }

    // Definir la ciudad
    const bankCityName = "La Banca";
    addCityToBoardData(bankCityR, bankCityC, BankManager.PLAYER_ID, bankCityName, true);
    const bankHex = board[bankCityR]?.[bankCityC];
    if (bankHex) {
        bankHex.terrain = 'plains';
        bankHex.structure = 'Metrópoli';
    }
    logMessage(`¡La ciudad neutral de ${bankCityName} ha sido fundada en (${bankCityR}, ${bankCityC})!`);

    // =========================================================================
    // === "EXCAVADORA" DE ACCESO A LA BANCA (Solución Definitiva) ===
    // =========================================================================
    
    // 1. Buscar la tierra firme (Llanura/Colina) más cercana que NO esté pegada a la banca.
    // Esto asegura que salimos de cualquier "anillo" de bloqueo inmediato.
    let targetLand = null;
    let minDistance = Infinity;

    for (let r = 0; r < B_ROWS; r++) {
        for (let c = 0; c < B_COLS; c++) {
            const hex = board[r]?.[c];
            // Buscamos terreno transitable que no sea la propia ciudad
            if (hex && (hex.terrain === 'plains' || hex.terrain === 'hills') && !hex.isCity) {
                const dist = hexDistance(bankCityR, bankCityC, r, c);
                // Buscamos el más cercano, pero que esté al menos a distancia 2 
                // (para saltar un posible anillo de bloqueo adyacente)
                if (dist >= 2 && dist < minDistance) {
                    minDistance = dist;
                    targetLand = { r, c };
                }
            }
        }
    }

    // 2. Si encontramos un destino, "excavamos" una línea recta hacia él.
    if (targetLand) {
        console.log(`[MapGen] Abriendo ruta comercial forzada hacia (${targetLand.r}, ${targetLand.c})`);
        
        let crawlerR = bankCityR;
        let crawlerC = bankCityC;
        let safetyCounter = 0;

        // Bucle paso a paso desde la Banca hasta el Objetivo
        while ((crawlerR !== targetLand.r || crawlerC !== targetLand.c) && safetyCounter < 50) {
            safetyCounter++;
            
            // Obtener vecinos
            const neighbors = getHexNeighbors(crawlerR, crawlerC);
            let bestNeighbor = null;
            let bestDist = Infinity;

            // Elegir el vecino que nos acerca más al objetivo (ignorando terreno)
            for (const n of neighbors) {
                const d = hexDistance(n.r, n.c, targetLand.r, targetLand.c);
                if (d < bestDist) {
                    bestDist = d;
                    bestNeighbor = n;
                }
            }

            if (bestNeighbor) {
                crawlerR = bestNeighbor.r;
                crawlerC = bestNeighbor.c;

                // --- TERRAFORMACIÓN ---
                const hexToClear = board[crawlerR]?.[crawlerC];
                if (hexToClear && !hexToClear.isCity) {
                    // Convertimos cualquier cosa (Agua, Bosque, etc.) en Llanura
                    hexToClear.terrain = 'plains';
                    hexToClear.resourceNode = null; // Quitamos recursos que estorben
                    hexToClear.structure = null;    // Quitamos estructuras
                }
            } else {
                break; // No debería ocurrir
            }
        }
    } else {
        // Fallback extremo: Si todo el mapa es agua/bosque, limpiar un radio de 2 alrededor.
        console.log("[MapGen] Fallback: Limpiando área perimetral.");
        const neighbors = getHexNeighbors(bankCityR, bankCityC);
        for (const n of neighbors) {
            if(board[n.r]?.[n.c]) board[n.r][n.c].terrain = 'plains';
        }
    }
    // =========================================================================

    // --- 2. Colocar Recursos ---
    placeResourcesOnGeneratedMap(B_ROWS, B_COLS, resourceLevel);

    console.log("Generación procedural de mapa completada.");
}

/**
 * Genera un mapa naval con dos archipiélagos separados por mar.
 * 70-80% del mapa es agua, con dos islas/archipiélagos que pueden estar conectados opcionalmente.
 */
function generateNavalArchipelagoMap(B_ROWS, B_COLS, resourceLevel, gameMode = 'development') {
    console.log("Generando mapa naval de archipiélagos...");
    const totalHexes = B_ROWS * B_COLS;
    const isInvasionMode = gameMode === 'invasion';
    
    // 1. LLENAR TODO EL MAPA DE AGUA
    for (let r = 0; r < B_ROWS; r++) {
        for (let c = 0; c < B_COLS; c++) {
            if (board[r]?.[c]) {
                board[r][c].terrain = 'water';
                board[r][c].resourceNode = null;
            }
        }
    }
    
    // 2. DEFINIR CENTROS DE LOS DOS ARCHIPIÉLAGOS
    // Archipiélago 1 (izquierda): Para Jugador 1
    const arch1CenterR = Math.floor(B_ROWS / 2);
    const arch1CenterC = Math.floor(B_COLS * 0.25);
    
    // Archipiélago 2 (derecha): Para Jugador 2
    const arch2CenterR = Math.floor(B_ROWS / 2);
    const arch2CenterC = Math.floor(B_COLS * 0.75);
    
    // 3. GENERAR ARCHIPIÉLAGO 1
    const arch1Size = Math.floor(totalHexes * (isInvasionMode ? 0.08 : 0.12)); // Atacante más pequeño en invasión
    generateIslandCluster(arch1CenterR, arch1CenterC, arch1Size, B_ROWS, B_COLS);
    
    // 4. GENERAR ARCHIPIÉLAGO 2
    const arch2Size = Math.floor(totalHexes * (isInvasionMode ? 0.18 : 0.12)); // Defensor más grande en invasión
    generateIslandCluster(arch2CenterR, arch2CenterC, arch2Size, B_ROWS, B_COLS);
    
    // 5. OPCIONALMENTE CONECTAR CON FRANJA DE TIERRA (50% de probabilidad)
    if (Math.random() < 0.5) {
        console.log("Conectando archipiélagos con franja de tierra...");
        createLandBridge(arch1CenterR, arch1CenterC, arch2CenterR, arch2CenterC, B_ROWS, B_COLS);
    }
    
    // 6. COLOCAR CAPITALES EN LOS ARCHIPIÉLAGOS
    const cap1Pos = findSafeLandPosition(arch1CenterR, arch1CenterC, 5, B_ROWS, B_COLS);
    const cap2Pos = findSafeLandPosition(arch2CenterR, arch2CenterC, 5, B_ROWS, B_COLS);
    
    if (cap1Pos) {
        const cap1Name = isInvasionMode ? "Base de Invasión" : "Capital P1 (Escaramuza)";
        addCityToBoardData(cap1Pos.r, cap1Pos.c, 1, cap1Name, true);
        if (board[cap1Pos.r]?.[cap1Pos.c]) board[cap1Pos.r][cap1Pos.c].structure = 'Aldea';
    }
    
    if (cap2Pos) {
        const cap2Name = isInvasionMode ? "Capital del Reino" : "Capital P2 (Escaramuza)";
        addCityToBoardData(cap2Pos.r, cap2Pos.c, 2, cap2Name, true);
        if (board[cap2Pos.r]?.[cap2Pos.c]) board[cap2Pos.r][cap2Pos.c].structure = isInvasionMode ? 'Ciudad' : 'Aldea';
    }
    
    // 7. COLOCAR LA BANCA EN ISLA NEUTRAL (centro del mapa)
    const bankR = Math.floor(B_ROWS / 2);
    const bankC = Math.floor(B_COLS / 2);
    
    // Crear pequeña isla para la banca
    const bankIslandSize = 8;
    generateIslandCluster(bankR, bankC, bankIslandSize, B_ROWS, B_COLS);
    
    const bankPos = findSafeLandPosition(bankR, bankC, 3, B_ROWS, B_COLS);
    if (bankPos) {
        addCityToBoardData(bankPos.r, bankPos.c, BankManager.PLAYER_ID, "La Banca", true);
        if (board[bankPos.r]?.[bankPos.c]) {
            board[bankPos.r][bankPos.c].structure = 'Metrópoli';
            board[bankPos.r][bankPos.c].terrain = 'plains';
        }
        logMessage("¡La ciudad neutral de La Banca ha sido fundada en una isla central!", "event");
    }

    // 7.5. MODO INVASIÓN: Ciudades adicionales para el defensor en el archipiélago grande
    if (isInvasionMode) {
        const additionalCities = Math.max(0, (INVASION_MODE_CONFIG?.DEFENDER_CITIES || 1) - 1);
        const minCityDistance = 6;
        for (let i = 0; i < additionalCities; i++) {
            const cityPos = findDistributedLandPosition({
                minR: arch2CenterR - 10,
                maxR: arch2CenterR + 10,
                minC: arch2CenterC - 10,
                maxC: arch2CenterC + 10,
                minDistanceFrom: cap2Pos ? [{ r: cap2Pos.r, c: cap2Pos.c, min: minCityDistance }] : [],
                minDistanceFromCities: minCityDistance,
                maxAttempts: 400
            }) || findSafeLandPosition(arch2CenterR, arch2CenterC, 8, B_ROWS, B_COLS);

            if (cityPos && !board[cityPos.r]?.[cityPos.c]?.isCity) {
                addCityToBoardData(cityPos.r, cityPos.c, 2, `Ciudad ${i + 1}`, false);
                if (board[cityPos.r]?.[cityPos.c]) {
                    board[cityPos.r][cityPos.c].structure = i === 0 ? 'Ciudad' : 'Aldea';
                    board[cityPos.r][cityPos.c].owner = 2;
                }
            }
        }
    }
    
    // 8. AGREGAR VARIEDAD DE TERRENO A LAS ISLAS
    addTerrainVarietyToLand(B_ROWS, B_COLS);

    // 8.5. MODO INVASIÓN: Todo terreno del defensor salvo base atacante + radio 1 (excluye La Banca)
    if (isInvasionMode) {
        for (let r = 0; r < B_ROWS; r++) {
            for (let c = 0; c < B_COLS; c++) {
                const hex = board[r]?.[c];
                if (!hex || hex.terrain === 'water') continue;
                if (hex.owner === BankManager?.PLAYER_ID) continue;
                if (hex.isCity && hex.owner === BankManager?.PLAYER_ID) continue;
                hex.owner = 2;
            }
        }

        const attackerDeploymentRadius = INVASION_MODE_CONFIG?.DEPLOYMENT_RADIUS ?? 1;
        if (cap1Pos) {
            for (let dr = -attackerDeploymentRadius; dr <= attackerDeploymentRadius; dr++) {
                for (let dc = -attackerDeploymentRadius; dc <= attackerDeploymentRadius; dc++) {
                    const r = cap1Pos.r + dr;
                    const c = cap1Pos.c + dc;
                    if (board[r]?.[c] && board[r][c].terrain !== 'water') {
                        if (hexDistance(cap1Pos.r, cap1Pos.c, r, c) <= attackerDeploymentRadius) {
                            board[r][c].owner = 1;
                        }
                    }
                }
            }
        }
    }
    
    // 9. COLOCAR RECURSOS
    placeResourcesOnGeneratedMap(B_ROWS, B_COLS, resourceLevel);
    
    console.log("Generación de mapa naval completada.");
}

/**
 * Genera un cluster de islas alrededor de un punto central.
 */
function generateIslandCluster(centerR, centerC, targetSize, maxR, maxC) {
    let placed = 0;
    const placedSet = new Set();
    const queue = [{r: centerR, c: centerC}];
    
    while (queue.length > 0 && placed < targetSize) {
        const current = queue.shift();
        const key = `${current.r},${current.c}`;
        
        if (placedSet.has(key)) continue;
        if (current.r < 0 || current.r >= maxR || current.c < 0 || current.c >= maxC) continue;
        if (!board[current.r]?.[current.c]) continue;
        
        // Convertir a tierra con probabilidad decreciente según distancia
        const distance = Math.abs(current.r - centerR) + Math.abs(current.c - centerC);
        const probability = Math.max(0.3, 1 - (distance / 10));
        
        if (Math.random() < probability) {
            board[current.r][current.c].terrain = 'plains';
            placedSet.add(key);
            placed++;
            
            // Agregar vecinos a la cola
            const neighbors = getHexNeighbors(current.r, current.c);
            neighbors.forEach(n => {
                const nKey = `${n.r},${n.c}`;
                if (!placedSet.has(nKey)) {
                    queue.push(n);
                }
            });
        }
    }
    
    return placed;
}

/**
 * Crea una franja de tierra conectando dos puntos.
 */
function createLandBridge(r1, c1, r2, c2, maxR, maxC) {
    const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = Math.round(r1 + (r2 - r1) * t);
        const c = Math.round(c1 + (c2 - c1) * t);
        
        if (r >= 0 && r < maxR && c >= 0 && c < maxC && board[r]?.[c]) {
            // Crear franja estrecha (1-2 hexágonos de ancho)
            board[r][c].terrain = 'plains';
            
            // Ocasionalmente agregar un hexágono adicional para ancho
            if (Math.random() < 0.3) {
                const neighbors = getHexNeighbors(r, c);
                const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                if (board[randomNeighbor.r]?.[randomNeighbor.c]) {
                    board[randomNeighbor.r][randomNeighbor.c].terrain = 'plains';
                }
            }
        }
    }
}

/**
 * Busca una posición de tierra segura cerca de un punto dado.
 */
function findSafeLandPosition(centerR, centerC, radius, maxR, maxC) {
    for (let r = centerR - radius; r <= centerR + radius; r++) {
        for (let c = centerC - radius; c <= centerC + radius; c++) {
            if (r >= 0 && r < maxR && c >= 0 && c < maxC) {
                const hex = board[r]?.[c];
                if (hex && hex.terrain !== 'water' && !hex.isCity) {
                    return {r, c};
                }
            }
        }
    }
    return null;
}

function findDistributedLandPosition({
    minR,
    maxR,
    minC,
    maxC,
    minDistanceFrom = [],
    minDistanceFromCities = 0,
    maxAttempts = 300
}) {
    const clampedMinR = Math.max(0, minR);
    const clampedMaxR = Math.min(maxR, board.length - 1);
    const clampedMinC = Math.max(0, minC);
    const clampedMaxC = Math.min(maxC, board[0].length - 1);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const r = Math.floor(clampedMinR + Math.random() * (clampedMaxR - clampedMinR + 1));
        const c = Math.floor(clampedMinC + Math.random() * (clampedMaxC - clampedMinC + 1));
        const hex = board[r]?.[c];
        if (!hex || hex.terrain === 'water' || hex.isCity || hex.structure) continue;

        let tooClose = false;
        for (const ref of minDistanceFrom) {
            if (!ref) continue;
            if (hexDistance(r, c, ref.r, ref.c) < ref.min) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) continue;

        if (minDistanceFromCities > 0) {
            for (const city of (gameState.cities || [])) {
                if (hexDistance(r, c, city.r, city.c) < minDistanceFromCities) {
                    tooClose = true;
                    break;
                }
            }
        }
        if (tooClose) continue;

        return { r, c };
    }

    return null;
}

/**
 * Agrega variedad de terreno (bosques, colinas) a las áreas de tierra.
 */
function addTerrainVarietyToLand(maxR, maxC) {
    for (let r = 0; r < maxR; r++) {
        for (let c = 0; c < maxC; c++) {
            const hex = board[r]?.[c];
            if (hex && hex.terrain === 'plains' && !hex.isCity) {
                const rand = Math.random();
                if (rand < 0.15) {
                    hex.terrain = 'forest';
                } else if (rand < 0.25) {
                    hex.terrain = 'hills';
                }
            }
        }
    }
}

/**
 * Genera un cuerpo de terreno contiguo (ideal para agua) usando un algoritmo de "caminante aleatorio".
 * @param {number} rows - Filas del tablero.
 * @param {number} cols - Columnas del tablero.
 * @param {string} terrainType - El tipo de terreno a generar (ej. 'water').
 * @param {number} targetAmount - El número de hexágonos a convertir.
*/
function generateContiguousTerrain(rows, cols, terrainType, targetAmount) {
console.log(`Generando río (${terrainType}) - Objetivo: ${targetAmount} hexágonos`);
let placedCount = 0;
const placedHexes = new Set(); // Para rastrear hexágonos ya convertidos a este terreno

// Elegir un punto de inicio aleatorio cerca del borde.
// Se podría empezar más cerca del centro si se quiere un lago grande.
let startR = Math.floor(Math.random() * rows);
let startC = Math.random() < 0.5 ? 0 : cols - 1; // Empezar en columna 0 o col-1

// Asegurarse de no empezar sobre capitales (si ya están puestas)
let safetyAttempts = 0;
while (board[startR]?.[startC]?.isCapital && safetyAttempts < 100) {
startR = Math.floor(Math.random() * rows);
startC = Math.random() < 0.5 ? 0 : cols - 1;
safetyAttempts++;
}
    if (safetyAttempts === 100) console.warn(`No se pudo encontrar un inicio para el río lejos de capitales.`);
     
let currentR = startR;
let currentC = startC;

// Definir una longitud para el "camino" del caminante.
// No necesariamente colocará 'targetAmount' hexágonos si el camino se atasca o se sale.
let pathLength = Math.floor(targetAmount * 1.5); // Intentar un camino un poco más largo

// Determinar la dirección general de movimiento (alejarse del borde de inicio)
const biasDirection = startC === 0 ? 'right' : (startC === cols - 1 ? 'left' : (startR === 0 ? 'down' : 'up'));
    console.log(`[River Gen] Iniciando en (${startR}, ${startC}), bias: ${biasDirection}`);


// Bucle principal del caminante
for (let j = 0; j < pathLength; j++) {
// Salir si se sale del tablero o si ya colocamos suficientes hexágonos
if (currentR < 0 || currentR >= rows || currentC < 0 || currentC >= cols || placedCount >= targetAmount) break;

const hexKey = `${currentR},${currentC}`;
 const currentHex = board[currentR]?.[currentC];

 // --- 1. Convertir el hexágono actual a terreno de río ---
 // Solo convertir si es un terreno "convertible" (ej: llanura) y no es una ciudad/capital
 // y no ha sido convertido ya en este proceso.
 if (currentHex && currentHex.terrain !== terrainType && !currentHex.isCity && !placedHexes.has(hexKey)) {
     currentHex.terrain = terrainType;
     currentHex.resourceNode = null; // Eliminar recursos al convertir a río
     placedHexes.add(hexKey);
     placedCount++;
 } else if (currentHex?.isCapital) {
      // Si el caminante intenta pasar sobre una capital, se salta este hex y se intenta mover desde aquí
      // sin convertirlo a agua.
      console.log(`[River Gen] Caminante intentó pasar sobre capital en (${currentR}, ${currentC}). Saltando conversión.`);
      // No hacemos 'continue' aquí, simplemente no lo convertimos. El caminante intenta moverse desde aquí.
 }


 // Si ya colocamos suficientes hexágonos, terminar el camino
 if (placedCount >= targetAmount) break;

 // --- 2. Decidir el próximo hexágono para el caminante ---
 const neighbors = getHexNeighbors(currentR, currentC);
 
 // Opciones de movimiento:
 // Prioridad 1: Vecinos que NO son el terreno de río y están DENTRO del tablero y existen.
 // Esto ayuda a que el río se mueva por tierra y se mantenga delgado.
 const potentialMoves = neighbors.filter(n => board[n.r]?.[n.c] && board[n.r][n.c].terrain !== terrainType); 

 // Prioridad 2: Si no hay vecinos terrestres disponibles, cualquier vecino VÁLIDO (dentro del tablero)
 // Esto puede hacer que el río se ensanche si está rodeado de su propio terreno.
 const fallbackMoves = neighbors.filter(n => board[n.r]?.[n.c]);

 const moveOptions = potentialMoves.length > 0 ? potentialMoves : fallbackMoves;

 // Si no hay vecinos válidos a los que moverse (ej: golpeó el borde del mapa o quedó rodeado)
 if (moveOptions.length === 0) {
      console.log(`[River Gen] Caminante atascado en (${currentR}, ${currentC}). No hay vecinos válidos.`);
      // Opcional: intentar un salto aleatorio a otro lugar si se atasca.
      // Por ahora, simplemente romper el bucle.
      break;
 }
 
 // Seleccionar el próximo hexágono de las opciones.
 let nextMove;
 
 // Aplicar sesgo direccional si hay más de una opción
 if (moveOptions.length > 1) {
      let biasedMoves = [];
      // Filtrar los movimientos que van en la dirección general deseada.
      if (biasDirection === 'right') biasedMoves = moveOptions.filter(n => n.c > currentC);
      else if (biasDirection === 'left') biasedMoves = moveOptions.filter(n => n.c < currentC);
      else if (biasDirection === 'down') biasedMoves = moveOptions.filter(n => n.r > currentR);
      else if (biasDirection === 'up') biasedMoves = moveOptions.filter(n => n.r < currentR);

      if (biasedMoves.length > 0) {
          // Si hay opciones sesgadas, elige una al azar de ellas.
          nextMove = biasedMoves[Math.floor(Math.random() * biasedMoves.length)];
      } else {
          // Si no hay opciones sesgadas (ej: llegó al borde opuesto o la dirección sesgada no es transitable),
          // elige una opción válida cualquiera al azar.
          nextMove = moveOptions[Math.floor(Math.random() * moveOptions.length)];
      }

 } else {
     // Si solo hay una opción, tómala.
     nextMove = moveOptions[0];
 }

 // Actualizar la posición actual para la próxima iteración del bucle
 currentR = nextMove.r;
 currentC = nextMove.c;
 
 // Opcional: pequeña probabilidad de un salto aleatorio a cualquier lugar para crear ríos separados.
 // if (Math.random() < 0.02) { // 2% chance to jump
 //      currentR = Math.floor(Math.random() * rows);
 //      currentC = Math.floor(Math.random() * cols);
 //      console.log(`[River Gen] Caminante saltó a (${currentR}, ${currentC})`);
 // }

} // Fin del bucle for (pathLength)

    console.log(`Finalizada generación de ${terrainType}. Colocados: ${placedCount} hexágonos.`);
}

/**
 * Genera grupos de terreno (ideal para bosques y colinas).
 * @param {number} rows - Filas del tablero.
 * @param {number} cols - Columnas del tablero.
 * @param {string} terrainType - El tipo de terreno a generar.
 * @param {number} targetAmount - Número total de hexágonos a convertir.
 * @param {number} minClusterSize - Tamaño mínimo de un grupo.
 * @param {number} maxClusterSize - Tamaño máximo de un grupo.
*/
function generateClusteredTerrain(rows, cols, terrainType, targetAmount, minClusterSize, maxClusterSize) {
let placedCount = 0;
let attempts = 0;

while (placedCount < targetAmount && attempts < targetAmount * 5) {
attempts++;
const startR = Math.floor(Math.random() * rows);
const startC = Math.floor(Math.random() * cols);

// Solo intentar colocar si el hexágono inicial es una llanura
 if (board[startR]?.[startC]?.terrain === 'plains' && !board[startR][startC].isCity) {
     const clusterSize = Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1)) + minClusterSize;
     let currentCluster = [{r: startR, c: startC}];
     let clusterPlacedCount = 0;

     // Colocar el primer hex del cluster
     board[startR][startC].terrain = terrainType;
     placedCount++;
     clusterPlacedCount++;

     // Expandir el cluster
     let safety = 0;
     while(clusterPlacedCount < clusterSize && safety < 50) {
         safety++;
         // Elegir un hexágono aleatorio del cluster actual para expandir desde él
         const expandFrom = currentCluster[Math.floor(Math.random() * currentCluster.length)];
         const neighbors = getHexNeighbors(expandFrom.r, expandFrom.c);
         const validNeighbors = neighbors.filter(n => board[n.r]?.[n.c]?.terrain === 'plains' && !board[n.r][n.c].isCity);

         if (validNeighbors.length > 0) {
             const placeAt = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
             board[placeAt.r][placeAt.c].terrain = terrainType;
             currentCluster.push(placeAt);
             placedCount++;
             clusterPlacedCount++;
         } else {
             // No hay vecinos válidos para expandir, terminar este cluster
             break;
         }
     }
 }
}
}

/**
 * Coloca los recursos en el mapa ya generado, garantizando una cantidad mínima de oro.
 * @param {number} rows - Filas del tablero.
 * @param {number} cols - Columnas del tablero.
 * @param {string} resourceLevel - Nivel de recursos seleccionado por el jugador ('min', 'med', 'max').
*/
function placeResourcesOnGeneratedMap(rows, cols, resourceLevel) {
const plainsHexes = [];
const availableHills = []; // Lista para guardar todas las colinas disponibles

// --- 1. PRIMERA PASADA: Colocar recursos fijos y recopilar ubicaciones disponibles ---
for (let r = 0; r < rows; r++) {
for (let c = 0; c < cols; c++) {
const hex = board[r][c];
if (!hex) continue;

// Regla 1: Bosques siempre tienen Madera
     if (hex.terrain === 'forest') {
         hex.resourceNode = 'madera';
     }
     // Regla 2: Recopilar todas las colinas que no sean ciudades/capitales
     else if (hex.terrain === 'hills' && !hex.isCity) {
         availableHills.push({r, c});
     }
     // Regla 3: Guardar llanuras para la Comida
     else if (hex.terrain === 'plains' && !hex.isCity) {
         plainsHexes.push({r, c});
     }
 }
}

// --- 2. LÓGICA DE ORO GARANTIZADO ---
let goldNodesToPlace = 0;
switch (resourceLevel) {
case 'min': goldNodesToPlace = 1; break;
case 'med': goldNodesToPlace = 2; break;
case 'max': goldNodesToPlace = 3; break;
default: goldNodesToPlace = 1;
}
    
// Barajar las colinas disponibles para colocar el oro aleatoriamente
for (let i = availableHills.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[availableHills[i], availableHills[j]] = [availableHills[j], availableHills[i]];
}

// Colocar el oro garantizado
for (let i = 0; i < goldNodesToPlace && i < availableHills.length; i++) {
const hillCoords = availableHills[i];
board[hillCoords.r][hillCoords.c].resourceNode = 'oro_mina';
}

// --- 3. RELLENAR EL RESTO DE RECURSOS ---
    
// Rellenar las colinas restantes (las que no obtuvieron oro) con piedra o hierro
for (const hillCoords of availableHills) {
const hex = board[hillCoords.r][hillCoords.c];
// Si el hexágono de colina todavía no tiene un recurso asignado...
if (hex && !hex.resourceNode) {
if (Math.random() < 0.75) { // 75% de las restantes serán piedra
hex.resourceNode = 'piedra';
} else { // 25% de las restantes serán hierro
hex.resourceNode = 'hierro';
}
}
}

// Colocar Comida en llanuras (lógica sin cambios)
let foodNodesToPlace = 0;
switch (resourceLevel) {
case 'min': foodNodesToPlace = 2; break;
case 'med': foodNodesToPlace = 4; break;
case 'max': foodNodesToPlace = 8; break;
}

// Barajar las llanuras para colocar la comida aleatoriamente
for (let i = plainsHexes.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[plainsHexes[i], plainsHexes[j]] = [plainsHexes[j], plainsHexes[i]];
}
for (let i = 0; i < foodNodesToPlace && i < plainsHexes.length; i++) {
const hexCoords = plainsHexes[i];
board[hexCoords.r][hexCoords.c].resourceNode = 'comida';
}
}

/**
 * Genera ríos o lagos conectados en el tablero.
 * Implementa un algoritmo de "caminante aleatorio" para trazar un camino de agua.
 * @param {number} rows - Número de filas del tablero.
 * @param {number} cols - Número de columnas del tablero.
 * @param {number} numRivers - Cuántos ríos/lagos generar.
*/
function generateRiversAndLakes(rows, cols, numRivers) {
for (let i = 0; i < numRivers; i++) {
let startR = Math.floor(Math.random() * rows);
let startC = Math.floor(Math.random() * cols);

// Asegurarse de que el río no empiece sobre una capital o demasiado cerca.
 let tooClose = false;
 gameState.cities.forEach(city => {
     if (hexDistance(startR, startC, city.r, city.c) <= 3) { // Capitales + 3 hexágonos de buffer
         tooClose = true;
     }
 });
 if (tooClose) { i--; continue; } // Reintentar si está muy cerca de una capital

 let currentR = startR;
 let currentC = startC;
 let pathLength = Math.floor(Math.random() * (Math.max(rows, cols) * 0.8)) + Math.min(rows, cols) / 2; // Longitud del río
 let waterHexes = new Set(); // Para evitar duplicados y verificar conexión.

 for (let j = 0; j < pathLength; j++) {
     if (currentR < 0 || currentR >= rows || currentC < 0 || currentC >= cols) break; // Fuera de límites

     const hexKey = `${currentR},${currentC}`;
     if (!waterHexes.has(hexKey)) {
         board[currentR][currentC].terrain = 'water';
         waterHexes.add(hexKey);

         // Opcional: Agrandar el río/lago con vecinos
         if (Math.random() < 0.3) { // 30% de probabilidad de ensanchar
             const neighbors = getHexNeighbors(currentR, currentC);
             for (const n of neighbors) {
                 if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols && !waterHexes.has(`${n.r},${n.c}`)) {
                     // Evitar poner agua justo sobre o adyacente a una capital
                     let isNearCapital = false;
                     gameState.cities.forEach(city => {
                         if (hexDistance(n.r, n.c, city.r, city.c) <= 1) { // Capitales + 1 hexágono de buffer
                             isNearCapital = true;
                         }
                     });
                     if (!isNearCapital) {
                         board[n.r][n.c].terrain = 'water';
                         waterHexes.add(`${n.r},${n.c}`);
                     }
                 }
             }
         }
     }

     // Mover a un vecino aleatorio para continuar el camino
     const possibleMoves = getHexNeighbors(currentR, currentC);
     if (possibleMoves.length === 0) break;
     const nextMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
     currentR = nextMove.r;
     currentC = nextMove.c;
 }
}
}

/**
 * Genera colinas y bosques aleatoriamente en el tablero.
 * Ahora también asigna recursos de Madera y Piedra a estos terrenos.
 * @param {number} rows - Número de filas del tablero.
 * @param {number} cols - Número de columnas del tablero.
 * @param {number} hillProbability - Probabilidad (0.0-1.0) de que un hexágono sea colina.
 * @param {number} forestProbability - Probabilidad (0.0-1.0) de que un hexágono sea bosque.
*/
function generateHillsAndForests(rows, cols, hillProbability, forestProbability) {
for (let r = 0; r < rows; r++) {
for (let c = 0; c < cols; c++) {
const hex = board[r][c];
// Solo modificamos si no es agua, no es ciudad, no es capital, y no es un recurso ya puesto.
// Si el terreno ya es 'water' por generateRiversAndLakes, no lo modificamos.
if (hex.terrain === 'plains' && !hex.isCity && !hex.isCapital && !hex.resourceNode) {
if (Math.random() < hillProbability) {
hex.terrain = 'hills';
// --- NUEVO: Asignar recurso de Piedra a las Colinas ---
// Asegurarse de que el hexágono no tenga ya un nodo de recurso (aunque aquí ya lo chequeamos con !hex.resourceNode)
// y que el nodo de piedra exista en RESOURCE_NODES_DATA.
if (!hex.resourceNode && RESOURCE_NODES_DATA['piedra']) {
hex.resourceNode = 'piedra';
}
// --- FIN NUEVO ---
} else if (Math.random() < forestProbability) {
hex.terrain = 'forest';
// --- NUEVO: Asignar recurso de Madera a los Bosques ---
if (!hex.resourceNode && RESOURCE_NODES_DATA['madera']) {
hex.resourceNode = 'madera';
}
// --- FIN NUEVO ---
}
}
}
}
}

// Las variables globales se mantienen
let _boundMouseDown, _boundMouseWheel, _boundTouchStart, _boundTouchMove, _boundTouchEnd;

/**
 * Elimina SOLO los listeners de paneo y zoom para evitar duplicados.
 * Esta versión NO clona el tablero, preservando los listeners de los hexágonos.
*/
function removeBoardPanningListeners() {
console.log("%c[PANNING CLEANUP] Eliminando listeners de paneo específicos...", "color: orange;");
const gameBoard = document.getElementById('gameBoard');
if (!gameBoard) return;

// Eliminar listeners específicos del gameBoard
if (_boundMouseDown) gameBoard.removeEventListener('mousedown', _boundMouseDown);
if (_boundMouseWheel) gameBoard.removeEventListener('wheel', _boundMouseWheel);
if (_boundTouchStart) gameBoard.removeEventListener('touchstart', _boundTouchStart);
if (_boundTouchMove) gameBoard.removeEventListener('touchmove', _boundTouchMove);
if (_boundTouchEnd) gameBoard.removeEventListener('touchend', _boundTouchEnd);
    
// Eliminar listeners del documento
if (_boundMouseMove) document.removeEventListener('mousemove', _boundMouseMove);
if (_boundMouseUp) document.removeEventListener('mouseup', _boundMouseUp);

// Limpiar las referencias
_boundMouseDown = _boundMouseWheel = _boundTouchStart = _boundTouchMove = _boundTouchEnd = null;
_boundMouseMove = _boundMouseUp = null;
}

/**
 * Inicializa el paneo y zoom, guardando referencias a los listeners para poder eliminarlos.
*/
function initializeBoardPanning() {
// 1. Primero, limpiamos cualquier listener antiguo que pudiera existir.
removeBoardPanningListeners();
    
// Ahora obtenemos la referencia al tablero "limpio" y nuevo.
const gameBoard = document.getElementById('gameBoard');
if (!gameBoard || !gameBoard.parentElement) {
console.error("CRÍTICO (Panning): No se pudo encontrar #gameBoard o su viewport.");
return;
}
const viewport = gameBoard.parentElement;
if (!viewport) {
console.error("CRÍTICO (Panning): #gameBoard no tiene un elemento padre (viewport).");
return;
}

let lastTouchX_pan_bm = null;
let lastTouchY_pan_bm = null;

// --- Helper para calcular la distancia entre dos toques ---
function getPinchDistance(touches) {
const touch1 = touches[0];
const touch2 = touches[1];
return Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
}

// --- Función Unificada para Aplicar Transformaciones (Translate y Scale) y Límites ---
function applyTransform() {
// <<== INICIO DE LA MODIFICACIÓN CLAVE ==>>
// Calculamos dinámicamente la altura de la UI inferior que está visible AHORA.
let bottomUiHeight = 0;
// Estas referencias a domElements están bien porque son para la UI, no para el tablero.
const tacticalUiContainer = document.getElementById('tactical-ui-container');
const contextualInfoPanel = document.getElementById('contextualInfoPanel');

if (tacticalUiContainer && tacticalUiContainer.style.display !== 'none') {
     const rightButtonGroup = tacticalUiContainer.querySelector('.floating-action-group.right');
     if (rightButtonGroup) bottomUiHeight = Math.max(bottomUiHeight, rightButtonGroup.offsetHeight + 20);
 }
 if (contextualInfoPanel && contextualInfoPanel.classList.contains('visible')) {
     bottomUiHeight = Math.max(bottomUiHeight, contextualInfoPanel.offsetHeight);
 }
 // Obtenemos dimensiones actuales
 const boardWidth = gameBoard.offsetWidth * domElements.currentBoardScale;
 const boardHeight = gameBoard.offsetHeight * domElements.currentBoardScale;
 
 // ¡LA LÍNEA DEL ERROR! Ahora 'viewport' es una referencia local y segura.
 const viewportWidth = viewport.clientWidth;
 const viewportHeight = viewport.clientHeight - bottomUiHeight;

 // Limitar la escala
 const MIN_SCALE = 0.15; // Aumentamos un poco el mínimo para que no se pierda en móvil
 const MAX_SCALE = 2.0;
 domElements.currentBoardScale = Math.max(MIN_SCALE, Math.min(domElements.currentBoardScale, MAX_SCALE));

 let targetX = domElements.currentBoardTranslateX;
 let targetY = domElements.currentBoardTranslateY;
 if (boardWidth > viewportWidth) targetX = Math.min(0, Math.max(viewportWidth - boardWidth, targetX));
 else targetX = (viewportWidth - boardWidth) / 2;
 if (boardHeight > viewportHeight) targetY = Math.min(0, Math.max(viewportHeight - boardHeight, targetY));
 else targetY = (viewportHeight - boardHeight) / 2;
 // --- Zoom con Rueda del Ratón  ---
 domElements.currentBoardTranslateX = targetX;
 domElements.currentBoardTranslateY = targetY;

 // Aplicar la transformación combinada de escala y traslación
 gameBoard.style.transform = `translate(${targetX}px, ${targetY}px) scale(${domElements.currentBoardScale})`;
}

// --- ASIGNACIÓN DE LISTENERS CON REFERENCIAS ---
    
_boundMouseDown = function(e) {
    if (e.target.closest('button')) return;
    if (e.button !== 0 || (typeof placementMode !== 'undefined' && placementMode.active)) return;
    // NO cerrar el menú radial durante pan/zoom - se actualiza continuamente
    // if (UIManager && UIManager.hideRadialMenu) UIManager.hideRadialMenu();
    e.preventDefault();
    domElements.initialClickX = e.clientX; // Guardamos para el final
    domElements.initialClickY = e.clientY;
    domElements.isPanning = true; // Activamos movimiento YA
    gameState.justPanned = false; // El clic es válido hasta que se demuestre lo contrario
    
    domElements.panStartX = e.clientX - domElements.currentBoardTranslateX;
    domElements.panStartY = e.clientY - domElements.currentBoardTranslateY;
    gameBoard.classList.add('grabbing');
};

gameBoard.addEventListener('mousedown', _boundMouseDown);

_boundMouseMove = function(e) {
    if (!domElements.isPanning) return;
    
    domElements.currentBoardTranslateX = e.clientX - domElements.panStartX;
    domElements.currentBoardTranslateY = e.clientY - domElements.panStartY;

    // Solo si el movimiento es real (más de 5px), bloqueamos el clic
    if (Math.hypot(e.clientX - domElements.initialClickX, e.clientY - domElements.initialClickY) > 5) {
        gameState.justPanned = true;
    }
    applyTransform();
};

document.addEventListener('mousemove', _boundMouseMove);

_boundMouseUp = function(e) {
if (e.button !== 0) return;
domElements.isPanning = false;
gameBoard.classList.remove('grabbing');
};
    // --- Zoom con Rueda del Ratón  ---
document.addEventListener('mouseup', _boundMouseUp);

_boundMouseWheel = function(e) {
e.preventDefault();
const scaleAmount = -e.deltaY * 0.001;
domElements.currentBoardScale += scaleAmount;
applyTransform();
};
// --- Lógica Táctil para Paneo y Zoom ---
gameBoard.addEventListener('wheel', _boundMouseWheel, { passive: false });

_boundTouchStart = function(e) {
if ((typeof placementMode !== 'undefined' && placementMode.active)) return;
        
// Paneo con un dedo
 if (e.touches.length === 1) {
        const touch = e.touches[0];
        domElements.initialTouchX = touch.clientX; // Guardamos para el final
        domElements.initialTouchY = touch.clientY;
        domElements.isPanning = true; // Iniciamos movimiento al instante
        gameState.justPanned = false; // El clic es válido hasta que se mueva más de 5px
        
        domElements.isPinching = false;
        lastTouchX_pan_bm = touch.clientX; 
        lastTouchY_pan_bm = touch.clientY;
    } else if (e.touches.length === 2) {
     // Zoom con dos dedos
     domElements.isPinching = true; 
     domElements.isPanning = false;
     domElements.initialPinchDistance = getPinchDistance(e.touches);
 }
};
gameBoard.addEventListener('touchstart', _boundTouchStart, { passive: true });

_boundTouchMove = function(e) {
e.preventDefault();
        
// Mover con un dedo
if (domElements.isPanning && e.touches.length === 1) {
        const touch = e.touches[0]; 
        const dx = touch.clientX - lastTouchX_pan_bm; 
        const dy = touch.clientY - lastTouchY_pan_bm;
        domElements.currentBoardTranslateX += dx; 
        domElements.currentBoardTranslateY += dy;
        lastTouchX_pan_bm = touch.clientX; 
        lastTouchY_pan_bm = touch.clientY;

        // --- LA CLAVE: Si el dedo se ha movido más de 5px en total, anulamos el clic ---
        const distTotal = Math.hypot(touch.clientX - domElements.initialTouchX, touch.clientY - domElements.initialTouchY);
        if (distTotal > 5) {
            gameState.justPanned = true;
        }

        applyTransform();
    } else if (domElements.isPinching && e.touches.length === 2) {
     // Hacer zoom con dos dedos
     const newDist = getPinchDistance(e.touches); 
     const scaleFactor = newDist / domElements.initialPinchDistance;
     domElements.currentBoardScale *= scaleFactor; 
     
     // Actualizar la distancia inicial para un zoom más suave
     domElements.initialPinchDistance = newDist;
     applyTransform();
 }
};
gameBoard.addEventListener('touchmove', _boundTouchMove, { passive: false });

_boundTouchEnd = function(e) {
// Resetear estados al levantar los dedos
domElements.isPanning = false;
domElements.isPinching = false;
lastTouchX_pan_bm = null;
lastTouchY_pan_bm = null;
};
gameBoard.addEventListener('touchend', _boundTouchEnd);

console.log("BoardManager: Panning and Zoom listeners (versión específica) inicializados.");
applyTransform();
}

function createHexDOMElementWithListener(r, c) {
//    console.log(`[BoardManager] Creando listener para hex (${r},${c})`);
const hexEl = document.createElement('div');
hexEl.classList.add('hex');
hexEl.dataset.r = r;
hexEl.dataset.c = c;
 
const xPos = c * HEX_WIDTH + (r % 2 !== 0 ? HEX_WIDTH / 2 : 0);
const yPos = r * HEX_VERT_SPACING;
hexEl.style.left = `${xPos}px`;
hexEl.style.top = `${yPos}px`;

hexEl.addEventListener('click', (event) => { 
    console.log(`[HEX CLICK LISTENER] Clic detectado en listener directo para (${r},${c})`); 
    // No detener propagación aquí si la unidad tiene pointer-events: none,
    // onHexClick debe decidir qué hacer.
    event.stopPropagation();
    onHexClick(r, c);
});
return hexEl;
}

// --- FUNCIÓN PARA INICIALIZAR TABLERO PARA ESCENARIOS DE CAMPAÑA ---
async function initializeGameBoardForScenario(mapTacticalData, scenarioData) {
console.log("boardManager.js: initializeGameBoardForScenario ha sido llamada.");

// Reseteo de variables de paneo globales
if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateX !== 'undefined') domElements.currentBoardTranslateX = 0; // Usar domElements
if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateY !== 'undefined') domElements.currentBoardTranslateY = 0; // Usar domElements
if (domElements.gameBoard) { // Usar domElements
    domElements.gameBoard.style.transform = `translate(0px, 0px)`; // Usar domElements
}

if (!domElements.gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM for scenario."); return; } // Usar domElements
domElements.gameBoard.innerHTML = ''; // Limpiar tablero existente // Usar domElements

const R = mapTacticalData.rows;
const C = mapTacticalData.cols;

board = Array(R).fill(null).map(() => Array(C).fill(null));
gameState.cities = []; // Limpiar ciudades del estado global para el nuevo escenario

domElements.gameBoard.style.width = `${C * HEX_WIDTH + HEX_WIDTH / 2}px`; // Usar domElements
domElements.gameBoard.style.height = `${R * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`; // Usar domElements

for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
        const hexElement = createHexDOMElementWithListener(r, c);
        domElements.gameBoard.appendChild(hexElement); // Usar domElements

        let terrainType = mapTacticalData.hexesConfig?.defaultTerrain || 'plains';
        let structureType = null;
        const specificHexConfig = mapTacticalData.hexesConfig?.specificHexes?.find(h => h.r === r && h.c === c);
        if (specificHexConfig) {
            if (specificHexConfig.terrain) terrainType = specificHexConfig.terrain;
            if (specificHexConfig.structure) structureType = specificHexConfig.structure;
        }

        board[r][c] = {
            element: hexElement,
            terrain: terrainType, 
            owner: null,
            structure: structureType,
            isCity: false,
            isCapital: false,
            resourceNode: null,
            visibility: { player1: 'visible', player2: 'visible' },
            unit: null
        };
    }
}

if (gameState) {
    gameState.isCampaignBattle = true;
}

// Añadir Ciudades y Capitales
if (mapTacticalData.playerCapital) {
    addCityToBoardData(mapTacticalData.playerCapital.r, mapTacticalData.playerCapital.c, 1, mapTacticalData.playerCapital.name, true);
    if (board[mapTacticalData.playerCapital.r]?.[mapTacticalData.playerCapital.c]) {
        board[mapTacticalData.playerCapital.r][mapTacticalData.playerCapital.c].owner = 1;
    }
}
if (mapTacticalData.enemyCapital) {
    const enemyOwnerId = 2; 
    addCityToBoardData(mapTacticalData.enemyCapital.r, mapTacticalData.enemyCapital.c, enemyOwnerId, mapTacticalData.enemyCapital.name, true);
    if (board[mapTacticalData.enemyCapital.r]?.[mapTacticalData.enemyCapital.c]) {
        board[mapTacticalData.enemyCapital.r][mapTacticalData.enemyCapital.c].owner = enemyOwnerId;
    }
}
mapTacticalData.cities?.forEach(cityInfo => {
    let cityOwnerPlayerNumber = null;
    if (cityInfo.owner === 'player') cityOwnerPlayerNumber = 1;
    else if (cityInfo.owner === 'enemy') cityOwnerPlayerNumber = 2; 
    else if (cityInfo.owner === 'neutral' || !cityInfo.owner) { cityOwnerPlayerNumber = null; }
    addCityToBoardData(cityInfo.r, cityInfo.c, cityOwnerPlayerNumber, cityInfo.name, false);
    if (cityOwnerPlayerNumber && board[cityInfo.r]?.[cityInfo.c]) {
        board[cityInfo.r][cityInfo.c].owner = cityOwnerPlayerNumber;
    }
});

// Añadir Nodos de Recursos
mapTacticalData.resourceNodes?.forEach(node => {
    const hexForResource = board[node.r]?.[node.c];
    if (hexForResource && hexForResource.terrain !== 'water') {
        addResourceNodeToBoardData(node.r, node.c, node.type);
    } else {
        console.warn(`[ScenarioMap] Recurso '${node.type}' definido en (${node.r},${node.c}) pero el hexágono es agua. No se colocará.`);
    }
});

if (gameState.currentPhase !== "deployment") {
    scenarioData.playerSetup.initialUnits?.forEach(unitDef => {
        const unitData = createUnitDataObjectFromDefinition(unitDef, 1);
        if (unitData) placeInitialUnit(unitData);
    });
    scenarioData.enemySetup.initialUnits?.forEach(unitDef => {
        const unitData = createUnitDataObjectFromDefinition(unitDef, 2); 
        if (unitData) placeInitialUnit(unitData);
    });
}

initializeTerritoryData(); 
renderFullBoardVisualState();
if (typeof updateFogOfWar === "function") updateFogOfWar();
initializeBoardPanning(); 
console.log("boardManager.js: initializeGameBoardForScenario completada.");
}

// --- FUNCIONES HELPER PARA LA INICIALIZACIÓN DE ESCENARIOS ---
function createUnitDataObjectFromDefinition(unitDef, player) {
const regimentTypeData = REGIMENT_TYPES[unitDef.type];
if (!regimentTypeData) {
        console.error(`Tipo de regimiento desconocido "${unitDef.type}" en la definición de unidad del escenario.`);
return null;
}

const singleRegiment = { ...regimentTypeData, type: unitDef.type };

return {
    id: `u${unitIdCounter++}`, 
    player: player,
    name: unitDef.name || unitDef.type,
    regiments: [JSON.parse(JSON.stringify(singleRegiment))], 
    attack: regimentTypeData.attack,
    defense: regimentTypeData.defense,
    maxHealth: regimentTypeData.health,
    currentHealth: regimentTypeData.health,
    movement: regimentTypeData.movement,
    currentMovement: regimentTypeData.movement,
    visionRange: regimentTypeData.visionRange,
    attackRange: regimentTypeData.attackRange,
    r: unitDef.r, 
    c: unitDef.c, 
    sprite: regimentTypeData.sprite,
    element: null, 
    hasMoved: false, 
    hasAttacked: false,
};
}

function placeInitialUnit(unitData) {
if (!unitData || typeof unitData.r === 'undefined' || typeof unitData.c === 'undefined') {
console.error("Datos de unidad inválidos o faltan coordenadas para placeInitialUnit", unitData);
return;
}

const unitElement = document.createElement('div');
unitElement.classList.add('unit', `player${unitData.player}`);
unitElement.textContent = unitData.sprite;
unitElement.dataset.id = unitData.id;
const strengthDisplay = document.createElement('div');
strengthDisplay.classList.add('unit-strength');
strengthDisplay.textContent = unitData.currentHealth;
unitElement.appendChild(strengthDisplay);

if (gameBoard) {
    gameBoard.appendChild(unitElement);
} else {
    console.error("CRITICAL: gameBoard no encontrado en DOM al colocar unidad inicial.");
    return; 
}

unitData.element = unitElement; 

const targetHexData = board[unitData.r]?.[unitData.c];
if (targetHexData) {
    if (targetHexData.unit) {
        console.warn(`Conflicto al colocar unidad: ${unitData.name} en (${unitData.r},${unitData.c}). Ya hay una unidad: ${targetHexData.unit.name}. La nueva unidad no se colocará.`);
        unitElement.remove(); 
        return;
    }
    targetHexData.unit = unitData; 
    if (targetHexData.owner !== unitData.player) {
        targetHexData.owner = unitData.player;
    }
} else {
    console.error(`Error al colocar unidad inicial: hexágono destino (${unitData.r},${unitData.c}) no existe en 'board'.`);
    unitElement.remove();
    return;
}

units.push(unitData);
}

function generateRandomResourceNodes(level) {
let cantidadPorTipo;
switch (level) {
case 'min': cantidadPorTipo = 2; break;
case 'med': cantidadPorTipo = 6; break;
case 'max': cantidadPorTipo = 12; break;
default: cantidadPorTipo = 2;
}

logMessage(`Generando recursos aleatorios - Nivel: ${level} (${cantidadPorTipo} de c/u)`);

// --- CAMBIO CLAVE: Excluir 'madera' y 'piedra' de la generación aleatoria ---
const resourceTypesArray = Object.keys(RESOURCE_NODES_DATA).filter(type => 
    type !== 'madera' && type !== 'piedra' // Filtrar los que ya se asignan por terreno
); 
// --- FIN CAMBIO CLAVE ---

const occupiedBySetup = new Set();

gameState.cities.forEach(city => {
    if (city.isCapital) {
        occupiedBySetup.add(`${city.r}-${city.c}`);
    }
});

resourceTypesArray.forEach(type => {
    let countPlaced = 0;
    let attempts = 0;
    const currentBoardRows = board.length || BOARD_ROWS;
    const currentBoardCols = board[0]?.length || BOARD_COLS;
    const maxAttemptsPerType = currentBoardRows * currentBoardCols * 2; 

    while (countPlaced < cantidadPorTipo && attempts < maxAttemptsPerType) {
        const r_rand = Math.floor(Math.random() * currentBoardRows);
        const c_rand = Math.floor(Math.random() * currentBoardCols);
        const hexKey = `${r_rand}-${c_rand}`;

        const hexData = board[r_rand]?.[c_rand];
        // Asegurarse de que el hexágono no sea agua, no tenga ya un recurso, etc.
        // y que el tipo de recurso que se intenta colocar no sea 'madera' o 'piedra' (ya excluidos por el filtro de arriba)
        if (hexData && 
            hexData.terrain !== 'water' && 
            !hexData.resourceNode && // Importante: ya no debe tener un recurso (ni piedra ni madera)
            !hexData.isCity &&
            !occupiedBySetup.has(hexKey) ) {

            let tooCloseToCapital = false;
            gameState.cities.forEach(city => {
                if (city.isCapital && hexDistance(city.r, city.c, r_rand, c_rand) <= 2) { 
                    tooCloseToCapital = true;
                }
            });
            const isBorderHex = r_rand < 1 || r_rand >= currentBoardRows - 1 || c_rand < 1 || c_rand >= currentBoardCols - 1;

            if (!tooCloseToCapital && !isBorderHex) {
                addResourceNodeToBoardData(r_rand, c_rand, type);
                occupiedBySetup.add(hexKey);
                countPlaced++;
            }
        }
        attempts++;
    }
    if (countPlaced < cantidadPorTipo) {
        console.warn(`No se pudieron colocar todas las instancias de ${type}. Colocadas: ${countPlaced}/${cantidadPorTipo}`);
    }
});
logMessage(`Generación de recursos completada.`);
}

// --- HELPER Obtener nombre único ---
function getUniqueCityName() {
    // 1. Recopilar nombres ya usados en el juego actual
    const usedNames = new Set(gameState.cities.map(c => c.name));
    
    // 2. Filtrar la lista de constantes para ver cuáles quedan libres
    const availableNames = IBERIAN_CITY_NAMES.filter(name => !usedNames.has(name));
    
    // 3. Si quedan nombres, elegir uno al azar
    if (availableNames.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableNames.length);
        return availableNames[randomIndex];
    }
    
    // 4. Fallback si nos quedamos sin nombres históricos
    return `Nueva Ciudad ${gameState.cities.length + 1}`;
}

// --- addCityToBoardData ---
function addCityToBoardData(r, c, owner, name, isCapitalInitial = false) { 
    if (board[r]?.[c]) {
        board[r][c].isCity = true;
        board[r][c].owner = owner;

        // LÓGICA DE NOMBRE MEJORADA
        // Si no hay nombre, O si el nombre es genérico, asignamos uno histórico.
        const genericNames = ["Aldea", "Ciudad", "Metrópoli", "Capital P1 (Escaramuza)", "Capital P2 (Escaramuza)"];
        
        let finalName = name;
        if (!name || genericNames.includes(name) || name.startsWith("Capital P")) {
            finalName = getUniqueCityName();
        }

        board[r][c].cityName = finalName; 
        board[r][c].isCapital = isCapitalInitial; 

        // Guardar referencia en gameState.cities
        let cityEntry = gameState.cities?.find(city => city.r === r && city.c === c);
        if (cityEntry) {
            cityEntry.owner = owner;
            cityEntry.name = finalName; // Actualizamos el nombre
            cityEntry.isCapital = isCapitalInitial;
        } else {
            gameState.cities.push({ r, c, owner, name: finalName, isCapital: isCapitalInitial });
        }

        if (isCapitalInitial && owner !== null && gameState.capitalCityId) {
            gameState.capitalCityId[owner] = { r: r, c: c };
        }
        
        // Actualizar visualmente si la partida ya está corriendo
        if (typeof renderSingleHexVisuals === 'function') renderSingleHexVisuals(r, c);

    } else {
        console.warn(`Intento de añadir ciudad en hexágono inválido: (${r},${c})`);
    }
}

function addResourceNodeToBoardData(r, c, type) {
if (board[r]?.[c] && RESOURCE_NODES_DATA[type]) {
board[r][c].resourceNode = type;
} else {
         console.warn(`Intento de añadir nodo de recurso inválido: (${r},${c}) tipo ${type}`);
}
}

function renderFullBoardVisualState() {
if (!board || board.length === 0) return;
const currentRows = board.length;
const currentCols = board[0] ? board[0].length : 0;

for (let r = 0; r < currentRows; r++) {
    for (let c = 0; c < currentCols; c++) {
        if (board[r] && board[r][c]) { 
            renderSingleHexVisuals(r, c);
        }
    }
}
units.forEach(unit => { 
    if (unit.element && !unit.element.parentElement && domElements.gameBoard) { // Usar domElements.gameBoard
        domElements.gameBoard.appendChild(unit.element); // Usar domElements.gameBoard
    }
    if (typeof positionUnitElement === "function") positionUnitElement(unit); else console.warn("positionUnitElement no definida");
    if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unit); else console.warn("updateUnitStrengthDisplay no definida");
});
}

function renderSingleHexVisuals(r, c) {
    const hexData = board[r]?.[c];
    if (!hexData || !hexData.element) { return; }
    const hexEl = hexData.element;

    // --- LÓGICA DE PRESERVACIÓN DE CLASES ---
    const isTutorialHighlighted = hexEl.classList.contains('tutorial-highlight-hex');
    const actionClasses = [];
    if (hexEl.classList.contains('highlight-move')) actionClasses.push('highlight-move');
    if (hexEl.classList.contains('highlight-attack')) actionClasses.push('highlight-attack');
    if (hexEl.classList.contains('highlight-build')) actionClasses.push('highlight-build');
    if (hexEl.classList.contains('highlight-place')) actionClasses.push('highlight-place');

    // Reseteamos SOLO las clases visuales que pueden cambiar
    hexEl.className = 'hex'; 

    // Restaurar clases especiales
    if (isTutorialHighlighted) hexEl.classList.add('tutorial-highlight-hex');
    actionClasses.forEach(cls => hexEl.classList.add(cls));

    // Limpiar sprites anteriores
    let structureSpriteEl = hexEl.querySelector('.structure-sprite');
    if (structureSpriteEl) {
        structureSpriteEl.remove();
    }
    hexEl.classList.remove('feature-ruins', 'feature-ruins-looted');

    // Añadir clases de estado actuales
    if (hexData.terrain) hexEl.classList.add(hexData.terrain);
    if (hexData.owner) hexEl.classList.add(`player${hexData.owner}-owner`);
    if (hexData.isCity) hexEl.classList.add('city');
    if (hexData.isCapital) hexEl.classList.add('capital-city');
    if (hexData.resourceNode) hexEl.classList.add(`resource-${hexData.resourceNode.replace('_mina', '')}`);

    // Si hay una ESTRUCTURA, creamos su sprite
    if (hexData.structure && STRUCTURE_TYPES[hexData.structure]) {
        structureSpriteEl = document.createElement('span');
        structureSpriteEl.classList.add('structure-sprite');
        hexEl.appendChild(structureSpriteEl);
        
        const spriteValue = STRUCTURE_TYPES[hexData.structure].sprite;
        if (spriteValue.includes('.') || spriteValue.includes('/')) {
            structureSpriteEl.style.backgroundImage = `url('${spriteValue}')`;
            structureSpriteEl.textContent = '';
        } else {
            structureSpriteEl.style.backgroundImage = 'none';
            structureSpriteEl.textContent = spriteValue;
        }
    } 
    // Si hay una CARACTERÍSTICA (como ruinas), añadimos su clase CSS
    else if (hexData.feature === 'ruins') {
        hexEl.classList.add('feature-ruins');
        if (hexData.looted === true) {
            hexEl.classList.add('feature-ruins-looted');
        }
    }
}

/**
 * Asegura que exista al menos un camino transitable entre dos puntos (capitales)
 * convirtiendo los hexágonos del camino en llanuras.
 * @param {object} startCoords - Coordenadas de inicio {r, c}.
 * @param {object} endCoords - Coordenadas de destino {r, c}.
 * @param {number} pathWidth - El grosor del camino a crear (ej: 1 para un camino simple).
*/
function ensurePathBetweenPoints(startCoords, endCoords, pathWidth = 1) {
    console.log(`Asegurando un camino entre (${startCoords.r},${startCoords.c}) y (${endCoords.r},${endCoords.c})`);

// Usamos A* para encontrar el camino más corto posible, ignorando el tipo de terreno temporalmente.
let queue = [{ r: startCoords.r, c: startCoords.c, path: [] }];
    let visited = new Set([`${startCoords.r},${startCoords.c}`]);
let pathToCarve = null;

while (queue.length > 0) {
let current = queue.shift();
        
if (current.r === endCoords.r && current.c === endCoords.c) {
     pathToCarve = current.path;
     break;
 }

 const neighbors = getHexNeighbors(current.r, current.c);
 for (const neighbor of neighbors) {
     const key = `${neighbor.r},${neighbor.c}`;
     if (!visited.has(key)) {
         visited.add(key);
         let newPath = [...current.path, neighbor];
         queue.push({ r: neighbor.r, c: neighbor.c, path: newPath });
     }
 }
}

if (pathToCarve) {
        console.log(`Camino encontrado. Tallando ${pathToCarve.length} hexágonos.`);
// "Tallar" el camino y sus alrededores para darle anchura.
pathToCarve.forEach(hexCoords => {
// Obtener el hexágono principal y sus vecinos para crear un camino más ancho.
const hexesToClear = [hexCoords, ...getHexNeighbors(hexCoords.r, hexCoords.c).slice(0, pathWidth * 2)];
            
hexesToClear.forEach(h => {
         const hexToModify = board[h.r]?.[h.c];
         // Solo modificar si no es una capital.
         if (hexToModify && !hexToModify.isCapital) {
             hexToModify.terrain = 'plains'; // Convertir a llanura
             hexToModify.resourceNode = null; // Limpiar cualquier recurso que hubiera
         }
     });
 });
} else {
console.warn("No se pudo encontrar una ruta para tallar el corredor estratégico.");
}
}

function initializeTerritoryData() {
console.log("Inicializando Nacionalidad y Estabilidad de todo el territorio...");
if (!board || board.length === 0) return;

for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
        const hex = board[r][c];
        if (hex && hex.owner !== null) {
            // Si la casilla tiene dueño, se la damos al 100%
            hex.nacionalidad = { 1: 0, 2: 0 };
            hex.nacionalidad[hex.owner] = 5;
            hex.estabilidad = 5;
        }
    }
}
console.log("Inicialización de territorio completada.");
}

/**
 * (NUEVO) Inicializa el tablero para la modalidad de juego "Iberia Magna".
*/
function initializeIberiaMagnaMap() {
console.log("boardManager.js: Inicializando el mapa de Iberia Magna.");

const mapData = GAME_DATA_REGISTRY.maps['IBERIA_MAGNA'];
const B_ROWS = mapData.rows;
const B_COLS = mapData.cols;

// Reseteo del tablero y estado (similar a la función original)
if (domElements.gameBoard) domElements.gameBoard.innerHTML = '';
board = Array(B_ROWS).fill(null).map(() => Array(B_COLS).fill(null));
gameState.cities = [];

    domElements.gameBoard.style.width = `${B_COLS * HEX_WIDTH + HEX_WIDTH / 2}px`;
    domElements.gameBoard.style.height = `${B_ROWS * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

// 1. Crear el tablero base (todo llanuras)
for (let r = 0; r < B_ROWS; r++) {
for (let c = 0; c < B_COLS; c++) {
const hexElement = createHexDOMElementWithListener(r, c);
domElements.gameBoard.appendChild(hexElement);
board[r][c] = {
r, c, element: hexElement, terrain: 'plains', owner: null,
structure: null, isCity: false, isCapital: false, resourceNode: null,
visibility: {}, unit: null, estabilidad: 0, nacionalidad: {}
};
}
}

// 2. Aplicar los hexágonos especiales del archivo de mapa
mapData.specialHexes.forEach(hexConfig => {
if (board[hexConfig.r]?.[hexConfig.c]) {
const hex = board[hexConfig.r][hexConfig.c];
hex.terrain = hexConfig.terrain || hex.terrain;
hex.resourceNode = hexConfig.resourceNode || null;

if (hexConfig.cityName) {
         const isCapital = hexConfig.isCapital || false;
         addCityToBoardData(hexConfig.r, hexConfig.c, hexConfig.owner, hexConfig.cityName, isCapital);
     }
 }
});

initializeTerritoryData();
renderFullBoardVisualState();
if (typeof updateFogOfWar === "function") updateFogOfWar();
initializeBoardPanning();
logMessage("¡Bienvenido a Iberia Magna!");
}

/**
 * Esparce un número determinado de ruinas por el mapa al inicio de la partida.
*/
function generateInitialRuins() {
if (!board || board.length === 0) return;

const numberOfRuins = RUIN_GENERATION_CHANCE.INITIAL_MAP_RUINS || 5;
let ruinsPlaced = 0;
let attempts = 0;
const maxAttempts = numberOfRuins * 20; // Para evitar bucles infinitos en mapas pequeños
    
    console.log(`[Mapa] Intentando generar ${numberOfRuins} ruinas iniciales...`);

// Recopilamos todas las casillas candidatas primero
const candidateHexes = [];
for (let r = 0; r < board.length; r++) {
for (let c = 0; c < board[0].length; c++) {
const hex = board[r][c];
// Una casilla es candidata si no es agua, no es ciudad/capital,
// no tiene recursos y no tiene ya una estructura.
if (hex && !hex.isImpassableForLand && hex.terrain !== 'water' && !hex.isCity && !hex.structure && !hex.resourceNode) {
                
// Añadimos una comprobación extra para no poner ruinas pegadas a las capitales
         let isNearCapital = false;
         for (const city of gameState.cities) {
             if (city.isCapital && hexDistance(r, c, city.r, city.c) <= 3) {
                 isNearCapital = true;
                 break;
             }
         }
         if (!isNearCapital) {
             candidateHexes.push(hex);
         }
     }
 }
}
    
// Barajamos las casillas candidatas para que la colocación sea aleatoria
for (let i = candidateHexes.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[candidateHexes[i], candidateHexes[j]] = [candidateHexes[j], candidateHexes[i]];
}
    
// Colocamos las ruinas en las primeras N casillas de la lista barajada
const hexesToPlaceOn = candidateHexes.slice(0, numberOfRuins);
    
for (const hex of hexesToPlaceOn) {
hex.feature = 'ruins';
ruinsPlaced++;
}

    console.log(`[Mapa] ${ruinsPlaced} ruinas generadas en el mapa.`);
}

/**
 * Genera ciudades independientes (Jugador 9) para acelerar el juego temprano.
 * @param {number} rows - Filas del tablero.
 * @param {number} cols - Columnas del tablero.
 * @param {string} density - 'none', 'low', 'med', 'high'.
 */
function generateBarbarianCities(rows, cols, density) {
    if (density === 'none') return;

    let numCities = 0;
    // Ajusta estos números según el tamaño de tu mapa
    if (density === 'low') numCities = 2;
    else if (density === 'med') numCities = 4;
    else if (density === 'high') numCities = 6;

    console.log(`[Mapa] Generando ${numCities} Ciudades Bárbaras (J9)...`);
    let placed = 0;
    let attempts = 0;

    while (placed < numCities && attempts < 500) {
        attempts++;
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const hex = board[r]?.[c];

        // CONDICIONES:
        // 1. Terreno válido (tierra).
        // 2. No es ya una ciudad, ni recurso, ni ruina, ni la Banca (centro).
        // 3. Importante: No estar PEGADO a un jugador (para darles espacio, pero no tanto como para que sea inalcanzable).
        if (hex && !hex.isCity && !hex.resourceNode && !hex.feature && !TERRAIN_TYPES[hex.terrain].isImpassableForLand) {
            
            // Distancia de seguridad con capitales de jugadores
            let tooClose = false;
            gameState.cities.forEach(city => {
                if (hexDistance(r, c, city.r, city.c) < 4) tooClose = true; // 4 hex de distancia mínima
            });

            // Distancia con la Banca (centro)
            const centerR = Math.floor(rows/2); 
            const centerC = Math.floor(cols/2);
            if (hexDistance(r, c, centerR, centerC) < 3) tooClose = true;

            if (!tooClose) {
                // 1. Crear la Ciudad (Nivel aleatorio)
                // 30% Metrópoli (Premio gordo), 70% Ciudad estándar
                const structureType = Math.random() > 0.7 ? 'Metrópoli' : 'Ciudad';
                const cityName = `Ciudad Libre ${placed + 1}`;

                // Usamos la función existente, pasando el ID 9
                addCityToBoardData(r, c, BARBARIAN_PLAYER_ID, cityName, false);
                
                // Forzamos la estructura y estadísticas
                hex.structure = structureType;
                hex.estabilidad = 5; // Están bien atrincherados
                hex.nacionalidad = { [BARBARIAN_PLAYER_ID]: 5 };

                // 2. Crear la Guardia (Unidad defensiva inmóvil)
                // Usamos una composición defensiva fuerte para que sea un reto
                if (typeof AiGameplayManager !== 'undefined') {
                    const unitDef = {
                        name: "Guardia Rebelde",
                        regiments: [
                            { ...REGIMENT_TYPES["Infantería Pesada"], type: "Infantería Pesada", health: 200 },
                            { ...REGIMENT_TYPES["Arqueros"], type: "Arqueros", health: 150 }
                        ]
                    };
                    
                    // Crear unidad para Jugador 9
                    const barbarianUnit = AiGameplayManager.createUnitObject(unitDef, BARBARIAN_PLAYER_ID, {r, c});
                    
                    // IMPORTANTE: Le damos una propiedad para que la IA sepa que no debe moverla
                    barbarianUnit.isGuardian = true; 
                    
                    placeFinalizedDivision(barbarianUnit, r, c);
                }

                placed++;
                console.log(`Ciudad Bárbara fundada en (${r},${c}): ${structureType}`);
            }
        }
    }
}

function centerMapOn(r, c) {
    const gameBoard = document.getElementById('gameBoard');
    const viewport = gameBoard?.parentElement;
    if (!gameBoard || !viewport || typeof HEX_WIDTH === 'undefined') return;

    // 1. Obtener dimensiones y escala actual
    const scale = domElements.currentBoardScale;
    const boardWidth = gameBoard.offsetWidth * scale;
    const boardHeight = gameBoard.offsetHeight * scale;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    // 2. Calcular la posición física del hexágono en el lienzo original (sin escala)
    const xPos = c * HEX_WIDTH + (r % 2 !== 0 ? HEX_WIDTH / 2 : 0);
    const yPos = r * HEX_VERT_SPACING;

    // 3. Calcular el destino IDEAL (el centro puro)
    let targetX = (viewportWidth / 2) - (xPos * scale);
    let targetY = (viewportHeight / 2) - (yPos * scale);

    // 4. APLICAR LÍMITES (Clamping)
    // No permitimos que el mapa se separe de los bordes si el mapa es más grande que la pantalla
    
    // Eje X
    if (boardWidth > viewportWidth) {
        // El X nunca puede ser mayor que 0 (borde izquierdo)
        // Ni menor que la diferencia negativa (borde derecho)
        targetX = Math.min(0, Math.max(viewportWidth - boardWidth, targetX));
    } else {
        // Si el mapa es más pequeño que la pantalla, lo centramos
        targetX = (viewportWidth - boardWidth) / 2;
    }

    // Eje Y
    if (boardHeight > viewportHeight) {
        // El Y nunca puede ser mayor que 0 (borde superior)
        // Ni menor que la diferencia negativa (borde inferior)
        targetY = Math.min(0, Math.max(viewportHeight - boardHeight, targetY));
    } else {
        // Si el mapa es más bajito que la pantalla, lo centramos
        targetY = (viewportHeight - boardHeight) / 2;
    }

    // 5. Guardar en el estado global y aplicar
    domElements.currentBoardTranslateX = targetX;
    domElements.currentBoardTranslateY = targetY;

    gameBoard.style.transition = "transform 0.5s ease-out"; // Añadimos una transición suave
    gameBoard.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`;

    // Quitamos la transición después de que termine para que el panning manual no se sienta "chicloso"
    setTimeout(() => {
        gameBoard.style.transition = "none";
    }, 500);
}

// Caravana Imperial
function initializeRaidMap(stageConfig, stageData) {
    // 1. Configuración Visual Básica
    const rows = 12;
    const cols = 25;
    
    // Reseteo de Cámara
    if (typeof domElements !== 'undefined') {
        domElements.currentBoardTranslateX = 0;
        domElements.currentBoardTranslateY = 0;
        domElements.currentBoardScale = 1;
        if (domElements.gameBoard) {
            domElements.gameBoard.innerHTML = '';
            domElements.gameBoard.style.width = `${cols * HEX_WIDTH + HEX_WIDTH / 2}px`;
            domElements.gameBoard.style.height = `${rows * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;
            domElements.gameBoard.style.transform = `translate(0px, 0px) scale(1)`;
        }
    }
    
    board = Array(rows).fill(null).map(() => Array(cols).fill(null));
    units = []; 
    if (typeof UnitGrid !== 'undefined') UnitGrid.clear();
    if (!gameState) gameState = {};
    gameState.cities = []; 

    // --- POSICIONES FIJAS ---
    // Bases de Jugadores (Norte y Sur). 
    const playerPorts = [
        {r: 1, c: 2}, {r: 1, c: 6}, {r: 1, c: 10}, {r: 1, c: 14},
        {r: 10, c: 2}, {r: 10, c: 6}, {r: 10, c: 10}, {r: 10, c: 14}
    ];

    const myUid = PlayerDataManager.currentPlayer?.auth_id;
    const mySlotIdx = (stageData.slots || []).indexOf(myUid); 
    
    console.log("[Raid Map] ===== ASIGNACIÓN DE SLOT =====");
    console.log("[Raid Map] Mi UID:", myUid);
    console.log("[Raid Map] Slots disponibles:", stageData.slots);
    console.log("[Raid Map] Mi slot index:", mySlotIdx);
    
    if (mySlotIdx === -1) {
        console.error("%c[Raid Map] ERROR: El jugador NO tiene slot asignado!", 'background: #ff0000; color: #fff; font-weight: bold; padding: 5px;');
    } else {
        const fortressPositions = [
            {r: 1, c: 2}, {r: 1, c: 6}, {r: 1, c: 10}, {r: 1, c: 14},
            {r: 10, c: 2}, {r: 10, c: 6}, {r: 10, c: 10}, {r: 10, c: 14}
        ];
        console.log(`%c[Raid Map] Jugador asignado al SLOT ${mySlotIdx}`, 'background: #00ff00; color: #000; font-weight: bold; padding: 5px;');
        console.log(`[Raid Map] Fortaleza en: (${fortressPositions[mySlotIdx].r}, ${fortressPositions[mySlotIdx].c})`);
    }

    // 2. PINTADO DEL MAPA
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const hexEl = createHexDOMElementWithListener(r, c);
            if (domElements.gameBoard) domElements.gameBoard.appendChild(hexEl);
            
            // LÓGICA DE TERRENO:
            // Por defecto según la etapa. Si es una base de jugador, forzamos 'plains'.
            let terrain = stageConfig.type === 'naval' ? 'water' : (stageConfig.mapType || 'plains');

            let owner = null;
            let struct = null;
            let isCity = false;
            let cityName = null;

            // Verificar si es una Base de Jugador (8 fortalezas)
            const portIndex = playerPorts.findIndex(p => p.r === r && p.c === c);
            
            if (portIndex !== -1) {
                // Forzamos 'plains' en la base para permitir construir
                terrain = 'plains'; 
                isCity = false; // NUNCA ciudad en raids, solo fortaleza
                struct = 'Fortaleza';
                
                // Verificar si este slot está ocupado
                const slotOwnerUid = stageData.slots?.[portIndex];
                
                if (portIndex === mySlotIdx && mySlotIdx !== -1) {
                    // Es MI fortaleza
                    owner = 1;
                    cityName = "Tu Base";
                    console.log("[Raid Map] Creando MI fortaleza en", {r, c, portIndex, mySlotIdx});
                    // Centrar cámara en mi base
                    if(typeof centerMapOn === 'function') setTimeout(()=>centerMapOn(r,c), 100);
                } else if (slotOwnerUid && slotOwnerUid !== null) {
                    // Es de un aliado activo
                    owner = 3; // Aliado
                    // Buscar el nombre del jugador en stageData.units
                    const allyUnit = stageData.units?.[slotOwnerUid];
                    cityName = allyUnit?.player_name || `Aliado ${portIndex+1}`;
                    console.log("[Raid Map] Fortaleza de aliado en", {r, c, portIndex, owner: slotOwnerUid, name: cityName});
                } else {
                    // Slot vacío - fortaleza neutral/disponible
                    owner = null; // NULL para que no aparezca ningún owner
                    cityName = `Slot ${portIndex+1} (Libre)`;
                    console.log("[Raid Map] Fortaleza disponible en", {r, c, portIndex});
                }
            }
            
            // Bases IA (Inicio/Fin) - Puntos de referencia del recorrido
            if ((r===6 && c===0) || (r===6 && c===24)) {
                terrain = 'plains';
                isCity = false; // NO son ciudades funcionales, solo marcadores
                struct = 'Fortaleza'; // SÍ tienen estructura de fortaleza
                owner = 2; // IA - para marcar que son del "enemigo"
                cityName = (c===0) ? "Punto de Salida" : "Objetivo Final";
                console.log("[Raid Map] Base IA creada en", {r, c, name: cityName});
            }

            // CRÍTICO: Inicializar board[r][c] ANTES de llamar a addCityToBoardData
            board[r][c] = {
                r, c, element: hexEl, terrain: terrain,
                owner: owner, structure: struct, isCity: isCity, cityName: cityName,
                visibility: {player1:'visible', player2:'visible'},
                estabilidad: owner ? 5 : 0, 
                nacionalidad: { 1: 0, 2: 0, 3: 0 }
            };
            if(owner) board[r][c].nacionalidad[owner] = 5;

            // Ahora sí, agregar a gameState.cities SOLO mi fortaleza (owner=1)
            if (struct === 'Fortaleza' && owner === 1) {
                // Solo MI fortaleza va a gameState.cities para el botón de crear división
                if (!gameState.cities) gameState.cities = [];
                gameState.cities.push({
                    r: r, c: c, 
                    owner: 1, 
                    name: cityName,
                    isCapital: false, 
                    prosperity: 5, 
                    defenseBonus: 2
                });
                // IMPORTANTE: Para que el botón funcione, la celda debe ser ciudad
                board[r][c].isCity = true;
                console.log("[Raid Map] Agregada MI fortaleza a gameState.cities:", {r, c, name: cityName});
            }

            renderSingleHexVisuals(r, c);
        }
    }

    // 3. COLOCAR AL JEFE (Lectura Real)
    console.log("[Raid Map] ===== INICIANDO COLOCACIÓN DE CARAVANA =====");
    console.log("[Raid Map] stageData completo:", JSON.stringify(stageData, null, 2));
    console.log("[Raid Map] stageConfig:", stageConfig);
    
    // CORRECCIÓN: Si caravan_pos.c es 0, forzar a 1
    if (stageData.caravan_pos && stageData.caravan_pos.c === 0) {
        console.warn("[Raid Map] Detectada posición incorrecta de caravana (c=0), corrigiendo a c=1");
        stageData.caravan_pos.c = 1;
    }
    
    let bossRegiments = stageData.boss_regiments;
    
    // VALIDACIÓN DE CONSISTENCIA: Verificar que los regimientos coincidan con la etapa actual
    if (bossRegiments && bossRegiments.length > 0) {
        const expectedType = stageConfig.regimentType;
        const actualType = bossRegiments[0].type;
        if (expectedType !== actualType) {
            console.error(
                "%c[Raid Map] ERROR DE CONSISTENCIA DETECTADO!",
                'background: #ff0000; color: #fff; font-weight: bold; padding: 10px;'
            );
            console.error("[Raid Map] Se esperaba tipo:", expectedType);
            console.error("[Raid Map] Se recibió tipo:", actualType);
            console.error("[Raid Map] Esto indica que stageData no fue actualizado correctamente en la transición");
            
            // Forzar regeneración de regimientos correctos
            console.warn("[Raid Map] Regenerando regimientos según la configuración de la etapa actual...");
            bossRegiments = null; // Forzar regeneración en el siguiente bloque
        }
    }
    
    // Si no hay regimientos, generarlos ahora basado en la configuración
    if (!bossRegiments || bossRegiments.length === 0) {
        console.warn("[Raid Map] No hay regimientos del boss. Generando desde config...");
        const regimentType = stageConfig.regimentType || "Barco de Guerra";
        const regimentCount = stageConfig.regimentCount || 30;
        
        if (!REGIMENT_TYPES[regimentType]) {
            console.error("[Raid Map] Tipo de regimiento no encontrado:", regimentType);
            console.log("[Raid Map] REGIMENT_TYPES disponibles:", Object.keys(REGIMENT_TYPES));
        }
        
        const baseUnitStats = REGIMENT_TYPES[regimentType] || REGIMENT_TYPES["Infantería Pesada"];
        
        bossRegiments = [];
        for (let i = 0; i < regimentCount; i++) {
            bossRegiments.push({
                type: regimentType,
                health: baseUnitStats.health,
                maxHealth: baseUnitStats.health
            });
        }
        
        // Actualizar stageData para que persista
        stageData.boss_regiments = bossRegiments;
        
        console.log("[Raid Map] Regimientos generados:", bossRegiments.length, "x", regimentType);
    }
    
    if (bossRegiments && bossRegiments.length > 0) {
        const firstType = bossRegiments[0].type;
        const regDef = REGIMENT_TYPES[firstType];
        
        console.log("%c[Raid Map] CREANDO BOSS DE LA CARAVANA", 'background: #00ff00; color: #000; font-weight: bold; padding: 5px;');
        console.log("[Raid Map] Tipo de regimiento:", firstType);
        console.log("[Raid Map] Definición:", regDef);
        console.log("[Raid Map] Etapa actual:", RaidManager?.currentRaid?.current_stage || 'N/A');
        console.log("[Raid Map] Nombre de etapa:", stageConfig.name);
        console.log("[Raid Map] Tipo de etapa:", stageConfig.type);
        
        // Determinar sprite según tipo de etapa
        let bossSprite = 'images/sprites/onlycaraban128.png'; // Default
        if (regDef && regDef.sprite) {
            bossSprite = regDef.sprite;
            console.log("[Raid Map] → Usando sprite del tipo de regimiento:", bossSprite);
        } else if (stageConfig.type === 'naval') {
            bossSprite = 'images/sprites/barco256.png';
            console.log("[Raid Map] → Usando sprite naval por defecto:", bossSprite);
        } else {
            console.log("[Raid Map] → Usando sprite de caravana por defecto:", bossSprite);
        }
        
        console.log("%c[Raid Map] SPRITE FINAL:", 'background: #ffff00; color: #000; font-weight: bold; padding: 5px;', bossSprite);
        
        const bossUnit = {
            id: 'boss_caravan',
            player: 2, 
            civilization: 'Imperio', // Civilización del boss para bonos de combate
            name: stageConfig.caravan || "Caravana Imperial",
            r: stageData.caravan_pos?.r || 6,
            c: Math.max(stageData.caravan_pos?.c || 1, 1), // Siempre >= 1, nunca en 0
            sprite: bossSprite,
            isBoss: true,
            isAI: true,
            regiments: bossRegiments // Array real de 30, 40 o 50
        };
        
        console.log("[Raid Map] Creando unidad boss:", {
            name: bossUnit.name,
            regimentCount: bossUnit.regiments.length,
            position: {r: bossUnit.r, c: bossUnit.c},
            sprite: bossUnit.sprite
        });
        
        // Calcular stats y vida actuales
        if (typeof calculateRegimentStats === 'function') {
            calculateRegimentStats(bossUnit);
            console.log("[Raid Map] Stats calculados por calculateRegimentStats");
        } else {
            console.warn("[Raid Map] calculateRegimentStats no disponible, calculando manualmente");
        }
        
        bossUnit.maxHealth = bossUnit.regiments.reduce((sum, r) => sum + (r.maxHealth || r.health), 0);
        
        console.log("%c[Raid Map] === ASIGNACIÓN DE HP DEL BOSS ===", 'background: #0066ff; color: #fff; font-weight: bold;');
        console.log("[Raid Map] HP máximo calculado desde regimientos:", bossUnit.maxHealth);
        console.log("[Raid Map] HP actual desde stageData.caravan_hp:", stageData.caravan_hp);
        console.log("[Raid Map] HP máximo desde stageData.caravan_max_hp:", stageData.caravan_max_hp);
        
        bossUnit.currentHealth = stageData.caravan_hp || bossUnit.maxHealth;
        
        // Asegurar que el HP actual no exceda el máximo
        if (bossUnit.currentHealth > bossUnit.maxHealth) {
            console.warn("%c[Raid Map] ⚠️ HP actual excede el máximo, corrigiendo...", 'background: #ff6600; color: #fff;');
            bossUnit.currentHealth = bossUnit.maxHealth;
        }
        
        // VALIDACIÓN CRÍTICA: Detectar herencia de daño de fase anterior
        if (stageData.caravan_hp && stageData.caravan_max_hp) {
            const hpPercentage = (stageData.caravan_hp / stageData.caravan_max_hp) * 100;
            console.log("[Raid Map] Porcentaje de HP:", hpPercentage.toFixed(1) + "%");
            
            if (hpPercentage < 100) {
                console.warn(
                    "%c[Raid Map] ⚠️ ADVERTENCIA: La caravana ya tiene daño!",
                    'background: #ff0000; color: #fff; font-weight: bold; padding: 5px;'
                );
                console.warn("[Raid Map] Esto puede indicar herencia de daño de la fase anterior");
                console.warn("[Raid Map] HP actual:", stageData.caravan_hp);
                console.warn("[Raid Map] HP máximo:", stageData.caravan_max_hp);
                console.warn("[Raid Map] HP faltante:", stageData.caravan_max_hp - stageData.caravan_hp);
            } else {
                console.log("%c[Raid Map] ✅ La caravana tiene HP completo", 'background: #00ff00; color: #000;');
            }
        }

        console.log("[Raid Map] HP FINAL asignado al boss:", bossUnit.currentHealth, "/", bossUnit.maxHealth);

        placeBossUnitDirectly(bossUnit);
        console.log("[Raid Map] Boss colocado exitosamente. Total de unidades:", units.length);
    } else {
        console.error("[Raid Map] ERROR CRÍTICO: No se pudieron generar regimientos para el boss");
        alert("Error al cargar la Caravana. Por favor, recarga la página.");
    }

    // 4. COLOCAR JUGADORES (Desde DB)
    if (stageData.units) {
        for (const uid in stageData.units) {
            const uData = stageData.units[uid];
            const pNum = (uid === myUid) ? 1 : 3;
            
            const playerUnit = {
                id: `raid_u_${uid}`,
                player: pNum,
                name: uData.player_name || "Aliado",
                regiments: uData.regiments || [],
                r: uData.r, c: uData.c,
            };
            calculateRegimentStats(playerUnit);
            if(uData.currentHealth) playerUnit.currentHealth = uData.currentHealth;
            
            // Usamos la función estándar porque el mapa ya tiene las ciudades correctas
            placeFinalizedDivision(playerUnit, uData.r, uData.c);
        }
    }
    
    gameState.currentPhase = "play"; 
    gameState.isRaid = true;
    
    if (typeof UIManager !== 'undefined') UIManager.updateAllUIDisplays();
    if (typeof initializeBoardPanning === 'function') initializeBoardPanning();
    
    console.log("[Raid Map] Mapa de Raid inicializado completamente");
}

// Función para actualizar la posición de la caravana en el mapa sin reiniciar todo
function updateCaravanPosition(newR, newC) {
    console.log("[Raid] Actualizando posición de caravana a:", {r: newR, c: newC});
    
    // Buscar la unidad boss en el array
    const bossUnit = getUnitById('boss_caravan') || units.find(u => u.isBoss);
    if (!bossUnit) {
        console.error("[Raid] No se encontró la unidad boss para actualizar");
        return;
    }
    
    // Limpiar hex anterior
    const oldHex = board[bossUnit.r]?.[bossUnit.c];
    if (oldHex) {
        oldHex.unit = null;
    }
    
    // Actualizar posición
    bossUnit.r = newR;
    bossUnit.c = newC;
    
    // Actualizar hex nuevo
    const newHex = board[newR]?.[newC];
    if (newHex) {
        newHex.unit = bossUnit;
    }
    
    // Actualizar posición visual del elemento DOM
    if (bossUnit.element) {
        const xPos = newC * HEX_WIDTH + (newR % 2 !== 0 ? HEX_WIDTH / 2 : 0) + (HEX_WIDTH - 60) / 2;
        const yPos = newR * HEX_VERT_SPACING + (HEX_HEIGHT - 60) / 2;
        
        // Animación suave
        bossUnit.element.style.transition = 'all 0.5s ease-in-out';
        bossUnit.element.style.left = `${xPos}px`;
        bossUnit.element.style.top = `${yPos}px`;
        
        console.log("[Raid] Posición visual actualizada a:", {xPos, yPos});
    }
    
    // Mostrar mensaje
    if (typeof logMessage === 'function') {
        logMessage(`¡La Caravana Imperial avanza hacia (${newR}, ${newC})!`, "warning");
    }
}

function placeBossUnitDirectly(unit) {
    const hex = board[unit.r]?.[unit.c];
    if(!hex) return;

    const unitEl = document.createElement('div');
    unitEl.className = `unit player${unit.player}`;
    
    // Estilo visual del Boss
    unitEl.style.width = "60px";
    unitEl.style.height = "60px";
    unitEl.style.border = "3px solid #f1c40f"; // Borde dorado
    unitEl.style.zIndex = "100";
    
    console.log("[placeBossUnit] Colocando unidad boss:", unit.name, "en posición", {r: unit.r, c: unit.c});
    
    // Imagen de fondo
    if (unit.sprite && (unit.sprite.includes('/') || unit.sprite.includes('.'))) {
         unitEl.style.backgroundImage = `url('${unit.sprite}')`;
         unitEl.style.backgroundSize = "contain";
         unitEl.style.backgroundRepeat = "no-repeat";
         unitEl.style.backgroundPosition = "center";
         unitEl.textContent = "";
         console.log("[placeBossUnit] Usando imagen:", unit.sprite);
    } else {
        unitEl.textContent = unit.sprite || '🚩';
        unitEl.style.fontSize = "30px";
        unitEl.style.display = "flex";
        unitEl.style.alignItems = "center";
        unitEl.style.justifyContent = "center";
        console.log("[placeBossUnit] Usando emoji:", unit.sprite);
    }
    
    // Barra de Vida
    const hpBar = document.createElement('div');
    hpBar.className = 'unit-strength';
    // Mostramos porcentaje porque el número es muy grande
    const hpPercent = Math.ceil((unit.currentHealth/unit.maxHealth)*100);
    hpBar.textContent = hpPercent + '%';
    unitEl.appendChild(hpBar);
    
    console.log("[placeBossUnit] HP del boss:", unit.currentHealth, "/", unit.maxHealth, "=", hpPercent + "%");

    if (domElements.gameBoard) domElements.gameBoard.appendChild(unitEl);
    
    unit.element = unitEl;
    units.push(unit);
    hex.unit = unit;

    if (typeof UnitGrid !== 'undefined') {
        if (UnitGrid.grid.size === 0 && units.length > 0) {
            UnitGrid.initialize();
        }
        UnitGrid.index(unit);
    }
    
    const xPos = unit.c * HEX_WIDTH + (unit.r % 2 !== 0 ? HEX_WIDTH / 2 : 0) + (HEX_WIDTH - 60) / 2;
    const yPos = unit.r * HEX_VERT_SPACING + (HEX_HEIGHT - 60) / 2;
    unitEl.style.left = `${xPos}px`;
    unitEl.style.top = `${yPos}px`;
    
    console.log("[placeBossUnit] Posición calculada:", {xPos, yPos});
    console.log("[placeBossUnit] Boss colocado exitosamente. Total units:", units.length);
}

// Helper para crear unidades en el mapa del Raid
function spawnRaidUnit(player, name, hp, maxHp, r, c, isBoss, stageType) {
    const sprite = stageType === 'naval' ? 'images/sprites/barco256.png' : 'images/sprites/onlycaraban128.png';
    const unit = {
        id: `ai_${r}_${c}`,
        player: player,
        name: name,
        currentHealth: hp,
        maxHealth: maxHp,
        r: r, c: c,
        sprite: sprite,
        isBoss: isBoss,
        regiments: Array(20).fill({type: 'Barco de Guerra'}) // Simulamos 20 barcos para stats
    };
    calculateRegimentStats(unit);
    unit.currentHealth = hp; // Forzar HP real
    
    placeFinalizedDivision(unit, r, c);
    
    // Estilo especial para el Boss
    if(isBoss && unit.element) {
        unit.element.style.width = "55px";
        unit.element.style.height = "55px";
        unit.element.style.border = "3px solid #f1c40f";
        unit.element.style.zIndex = "100";
    }
}

