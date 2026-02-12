// utils.js
// Funciones de utilidad general.

/**
 * Registra un mensaje de juego. Lo envía a la consola del navegador
 * y también a la consola de depuración en pantalla, si está disponible.
 * @param {string} msg - El mensaje a mostrar.
 * @param {string} type - El tipo de mensaje ('info', 'success', 'warning', 'error') para darle estilo.
 */
function logMessage(msg, type = 'info') {
    // 1. Siempre registrar en la consola del navegador para la depuración profunda.
    switch(type) {
        case 'error':
            console.error(msg);
            break;
        case 'warning':
            console.warn(msg);
            break;
        default:
            console.log(msg);
    }

    // 2. Si la función de la consola en pantalla existe, la llamamos para mostrar el mensaje.
    // Esto mantiene los archivos desacoplados: utils.js no necesita saber CÓMO funciona la consola, solo que existe.
    if (typeof logToConsole === 'function') {
        logToConsole(msg, type);
    }
}

function hexDistance(r1, c1, r2, c2) {
    // Convertir coordenadas de offset (r, c) a cúbicas (q, r, s)
    const q1 = c1 - (r1 - (r1 & 1)) / 2;
    const r_coord1 = r1;

    const q2 = c2 - (r2 - (r2 & 1)) / 2;
    const r_coord2 = r2;

    // La distancia en un sistema cúbico es la mitad de la "distancia de Manhattan" de las 3 coordenadas.
    const dq = Math.abs(q1 - q2);
    const dr = Math.abs(r_coord1 - r_coord2);
    const ds = Math.abs((-q1 - r_coord1) - (-q2 - r_coord2));

    return (dq + dr + ds) / 2;
}

function getHexNeighbors(r, c) {
    // --- GUARDA DE SEGURIDAD ---
    // Si las coordenadas no son válidas, devolvemos un array vacío.
    if (typeof CoordValidator !== 'undefined') {
        if (!CoordValidator.check(r, c, 'getHexNeighbors')) return [];
    } else {
        if (typeof r !== 'number' || typeof c !== 'number' || isNaN(r) || isNaN(c)) {
            console.error(`getHexNeighbors fue llamado con coordenadas inválidas: r=${r}, c=${c}`);
            return [];
        }
    }

    const neighbor_directions = [
        // Fila par
        [ {r: 0, c: +1}, {r: -1, c: 0}, {r: -1, c: -1}, {r: 0, c: -1}, {r: +1, c: -1}, {r: +1, c: 0} ],
        // Fila impar
        [ {r: 0, c: +1}, {r: -1, c: +1}, {r: -1, c: 0}, {r: 0, c: -1}, {r: +1, c: 0}, {r: +1, c: +1} ]
    ];

    const directions = neighbor_directions[r % 2];
    const neighbors = [];

    for (const dir of directions) {
        neighbors.push({ r: r + dir.r, c: c + dir.c });
    }

    // ¡LA LÍNEA CLAVE RESTAURADA!
    // Filtra para asegurarse de que los vecinos están dentro de los límites del tablero actual.
    // Esto es vital para toda la lógica del juego (movimiento, IA, etc.).
    return neighbors.filter(n =>
        board && board.length > 0 && n.r >= 0 && n.r < board.length &&
        board[0] && n.c >= 0 && n.c < board[0].length
    );
}

function getUnitOnHex(r, c) {
    if (!board || board.length === 0 || !board[0] || !units) {
        return null;
    }

    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) {
        return null;
    }

    // Usar UnitGrid si está disponible para acceso O(1)
    if (typeof UnitGrid !== 'undefined') {
        if (UnitGrid.grid.size === 0 && units.length > 0) {
            UnitGrid.initialize();
        }
        const unit = UnitGrid.get(r, c);
        if (unit && unit.currentHealth > 0) return unit;
        const boardUnit = board?.[r]?.[c]?.unit;
        return boardUnit && boardUnit.currentHealth > 0 ? boardUnit : null;
    }

    return units.find(u => u.r === r && u.c === c && u.currentHealth > 0);
}

function getUnitById(unitId) {
    if (!unitId || !units) return null;

    if (typeof UnitGrid !== 'undefined') {
        const unit = UnitGrid.getById(unitId);
        if (unit) return unit;
    }

    return units.find(u => u.id === unitId) || null;
}

function isHexSupplied(startR, startC, playerId) {
   // console.log(`%c[DEBUG Suministro] Chequeando suministro para (${startR},${startC}) de J${playerId}`, "background: yellow; color: black;");

    if (!board || board.length === 0 || !board[0] || !board[startR] || !board[startR][startC]) {
        console.error(`[isHexSupplied] Tablero o hexágono inicial (${startR},${startC}) no inicializado/válido.`);
        return false;
    }
    const startHexData = board[startR][startC];
    
    // === CASO 1: La unidad YA ESTÁ en una fuente de suministro propia ===
    if (startHexData.owner === playerId && (startHexData.isCapital || startHexData.structure === "Fortaleza")) {
        return true;
    }

    // === CASO 2: Buscar un camino a una fuente de suministro ===
    let queue = [{ r: startR, c: startC }];
    let visited = new Set();
    visited.add(`${startR},${startC}`);

    const maxSearchDepth = 15; // Límite de búsqueda razonable para evitar bucles en mapas grandes
    let iterations = 0;

    while (queue.length > 0 && iterations < maxSearchDepth * BOARD_ROWS * BOARD_COLS) { // Multiplicar por BOARD_ROWS*BOARD_COLS para evitar bucles infinitos en búsqueda
        iterations++;
        const current = queue.shift();
        const currentHexData = board[current.r]?.[current.c];

        if (!currentHexData) continue; // Si por alguna razón el hex actual no existe (fuera de límites, etc.)

        // Condición de Éxito: ¿Hemos llegado a una ciudad o fortaleza propia DESDE OTRO HEXÁGONO?
        // Esta condición ya no es la misma que la del inicio para evitar doble conteo y mejorar la lógica.
        if (current.r !== startR || current.c !== startC) { // Si no es el hexágono de partida
            if (currentHexData.owner === playerId && (currentHexData.isCapital || currentHexData.structure === "Fortaleza")) {
                //console.log(`%c[isHexSupplied] (${startR},${startC}) está suministrada via ruta a fuente en (${current.r},${current.c}). SÍ SUMINISTRADA.`, "color: lightgreen;");
                return true;
            }
        }

        const neighbors = getHexNeighbors(current.r, current.c);
        for (const neighborCoords of neighbors) {
            const neighborKey = `${neighborCoords.r},${neighborCoords.c}`;
            // Asegurarse de que el vecino esté dentro de los límites y no haya sido visitado
            if (neighborCoords.r >= 0 && neighborCoords.r < board.length &&
                neighborCoords.c >= 0 && neighborCoords.c < board[0].length &&
                !visited.has(neighborKey)) {

                const neighborHexData = board[neighborCoords.r][neighborCoords.c]; // Acceso seguro
                if (neighborHexData) {
                    // Se puede pasar a través de:
                    // 1. Hexágonos propios (owner === playerId)
                    // 2. Hexágonos con una estructura "Camino" QUE TAMBIÉN SEA PROPIA (owner === playerId)
                    if (neighborHexData.owner === playerId || (neighborHexData.structure === "Camino" && neighborHexData.owner === playerId)) {
                        visited.add(neighborKey);
                        queue.push({ r: neighborCoords.r, c: neighborCoords.c });
                    }
                }
            }
        }
    }
    //console.log(`%c[isHexSupplied] (${startR},${startC}) NO está suministrada (no se encontró ruta).`, "color: red;");
    return false;
}

function isHexSuppliedForReinforce(r, c, playerId) {
    const hexData = board[r]?.[c];
    if (!hexData) return false;

    // Caso 1: La unidad está DIRECTAMENTE en una fuente de refuerzo propia.
    // Antes solo considerábamos Capital o Fortaleza; ahora incluimos también Ciudades propias.
    if (hexData.owner === playerId && (hexData.isCapital || hexData.structure === "Fortaleza" || hexData.isCity)) {
        return true;
    }

    // Caso 2: La unidad está ADYACENTE a una fuente de refuerzo propia (Capital/Fortaleza/Ciudad).
    const neighbors = getHexNeighbors(r, c);
    for (const neighbor of neighbors) {
        const neighborHexData = board[neighbor.r]?.[neighbor.c];
        if (neighborHexData) {
            if (neighborHexData.owner === playerId && (neighborHexData.isCapital || neighborHexData.structure === "Fortaleza" || neighborHexData.isCity)) {
                return true;
            }
        }
    }
    return false;
}

function getRandomTerrainType() {
    // Obtenemos los tipos de terreno que NO son intransitables (como el agua)
    const availableTerrains = Object.keys(TERRAIN_TYPES).filter(type => 
        !TERRAIN_TYPES[type].isImpassableForLand
    );

    if (availableTerrains.length === 0) {
        console.warn("No hay terrenos transitables definidos en TERRAIN_TYPES. Devolviendo 'plains'.");
        return 'plains'; // Fallback por si acaso
    }
    
    // Devolvemos uno al azar
    const randomIndex = Math.floor(Math.random() * availableTerrains.length);
    return availableTerrains[randomIndex];
}

/**
 * Devuelve una versión abreviada del nombre de un tipo de regimiento.
 * @param {string} unitTypeName - El nombre completo del tipo de regimiento (ej. "Infantería Pesada").
 * @returns {string} El nombre abreviado (ej. "Inf. Pesada").
 */
function getAbbreviatedName(unitTypeName) {
    if (typeof unitTypeName !== 'string') return '';

    // Mapeo de nombres completos a abreviaturas.
    // Se puede expandir fácilmente con más tipos de unidades.
    const abbreviations = {
        "Infantería Ligera": "Inf. Ligera",
        "Infantería Pesada": "Inf. Pesada",
        "Caballería Ligera": "Cab. Ligera",
        "Caballería Pesada": "Cab. Pesada",
        "Arqueros": "Arqueros", // No necesita abreviatura
        "Arcabuceros": "Arcabuceros", // No necesita abreviatura
        "Arqueros a Caballo": "Arq. a Caballo",
        "Artillería": "Artillería", // No necesita abreviatura
        "Cuartel General": "Cuartel Gral.",
        "Ingenieros": "Ingenieros",
        "Hospital de Campaña": "Hospital Camp.",
        "Columna de Suministro": "Suministros",
        "Patache": "Patache",
        "Barco de Guerra": "Navío Guerra",
        "Colono": "Colono",
        "Explorador": "Explorador"
    };

    // Devuelve la abreviatura si existe, o el nombre original si no.
    return abbreviations[unitTypeName] || unitTypeName;
}

// Pequeña función de utilidad para no repetir código
function isNetworkGame() {
    return NetworkManager.conn && NetworkManager.conn.open;
}

/**
 * (NUEVO v3.0 - Definitiva) Calcula TODAS las bonificaciones de talentos, incluyendo
 * las condicionales y probabilísticas, basándose en el contexto del combate.
 * @param {object} unit - La división para la que se calculan los bonos (el sujeto).
 * @param {object} [opposingUnit=null] - La división enemiga (contexto opcional).
 * @param {boolean} [isFirstHit=false] - Si es el primer golpe de la ronda (contexto opcional).
 * @returns {object|null} Un objeto "hoja de órdenes" con todas las bonificaciones y efectos a aplicar.
 */
function calculateTalentBonuses(unit, opposingUnit = null, isFirstHit = false) {
    if (!unit.commander || !PlayerDataManager.currentPlayer) {
        return null;
    }

    const heroInstance = PlayerDataManager.currentPlayer.heroes.find(h => h.id === unit.commander);
    if (!heroInstance) {
        return null;
    }

    const bonuses = {
        attack_percentage: 0, defense_percentage: 0, health_percentage: 0,
        attack_flat: 0, defense_flat: 0, health_flat: 0,
        damage_increase_percentage: 0, damage_reduction_percentage: 0,
        movement_flat: 0, attackRange_flat: 0, initiative_flat: 0, xp_gain_percentage: 0
    };

    // =======================================================
    // === PASO 1: PROCESAR TALENTOS ======
    // =======================================================
    if (heroInstance.talents && Object.keys(heroInstance.talents).length > 0) {
        for (const talentId in heroInstance.talents) {
            const currentLevel = heroInstance.talents[talentId];
            if (currentLevel === 0) continue;

            const talentDef = TALENT_DEFINITIONS[talentId];
            if (!talentDef || !talentDef.effect || !talentDef.values) continue;

            const bonusValue = talentDef.values[currentLevel - 1];
            const effect = talentDef.effect;

            let applyBonus = true; 

        // Lógica de Filtros (si aplica)
        if (effect.filters && effect.filters.category) {
            if (!unit.regiments.some(reg => effect.filters.category.includes(REGIMENT_TYPES[reg.type]?.category))) {
                applyBonus = false;
            }
        }
        if (!applyBonus) continue;

        // --- LÓGICA DE APLICACIÓN DE EFECTOS (TODA CENTRALIZADA AQUÍ) ---
        switch (effect.stat) {
            // Stats Pasivos
            case 'attack':
                if (effect.is_percentage) bonuses.attack_percentage += bonusValue;
                else bonuses.attack_flat += bonusValue;
                break;
            case 'defense':
                if (effect.is_percentage) bonuses.defense_percentage += bonusValue;
                else bonuses.defense_flat += bonusValue;
                break;
            case 'health':
                if (effect.is_percentage) bonuses.health_percentage += bonusValue;
                else bonuses.health_flat += bonusValue;
                break;
            case 'movement':
                 if (!effect.is_percentage) bonuses.movement_flat += bonusValue;
                 break;
            case 'attackRange':
                 if (!effect.is_percentage) bonuses.attackRange_flat += bonusValue;
                 break;
            case 'initiative':
                 if (!effect.is_percentage) bonuses.initiative_flat += bonusValue;
                 break;
            case 'xp_gain':
                if (effect.is_percentage) bonuses.xp_gain_percentage += bonusValue;
                break;

            // Talentos Condicionales
            case 'conditional_attack_percentage':
                if (effect.condition === 'morale_high' && unit.morale > (unit.maxMorale || 125) * 0.8) {
                    bonuses.attack_percentage += bonusValue;
                }
                break;
            case 'conditional_defense_percentage':
                if (effect.condition === 'health_low' && unit.currentHealth < unit.maxHealth * 0.3) {
                    bonuses.defense_percentage += bonusValue;
                }
                break;
            
            // Modificadores de Daño Situacionales
            case 'damage_vs_low_hp':
                if (opposingUnit && opposingUnit.currentHealth < opposingUnit.maxHealth * 0.5) {
                    bonuses.damage_increase_percentage += bonusValue;
                }
                break;
            case 'first_hit_damage_increase':
                if (isFirstHit) {
                    bonuses.damage_increase_percentage += bonusValue;
                }
                break;

            // Talentos de Probabilidad (se resuelven aquí mismo)
            case 'chance_for_double_shot':
                if (Math.random() * 100 < effect.chance) {
                    // Si la tirada tiene éxito, añade el bonus de daño directamente.
                    // 'bonusValue' es el multiplicador de daño (ej: 50 para 50%).
                    bonuses.damage_increase_percentage += bonusValue;
                    logMessage(`¡Talento activado: ${talentDef.name}!`, "success");
                }
                break;
        }
    }

    // =======================================================
    // === PASO 2: PROCESAR EQUIPO (¡NUEVA LÓGICA!) =========
    // =======================================================
    if (heroInstance.equipment && PlayerDataManager.currentPlayer.inventory.equipment) {
        const playerInventory = PlayerDataManager.currentPlayer.inventory.equipment;

        // Itera sobre cada slot del héroe (head, weapon, etc.)
        for (const slot in heroInstance.equipment) {
            const equippedInstanceId = heroInstance.equipment[slot];
            
            // Si hay un objeto equipado en este slot
            if (equippedInstanceId) {
                // Busca el objeto en el inventario del jugador
                const itemInInventory = playerInventory.find(item => item.instance_id === equippedInstanceId);
                
                if (itemInInventory) {
                    // Busca la definición del objeto en nuestro catálogo
                    const itemDefinition = EQUIPMENT_DEFINITIONS[itemInInventory.item_id];
                    
                    if (itemDefinition && itemDefinition.bonuses) {
                        // Aplica cada una de las bonificaciones del objeto
                        itemDefinition.bonuses.forEach(bonus => {
                            // La lógica es muy similar a la de los talentos
                            switch (bonus.stat) {
                                case 'attack':
                                    if (bonus.is_percentage) bonuses.attack_percentage += bonus.value;
                                    else bonuses.attack_flat += bonus.value;
                                    break;
                                case 'defense':
                                    if (bonus.is_percentage) bonuses.defense_percentage += bonus.value;
                                    else bonuses.defense_flat += bonus.value;
                                    break;
                                case 'health':
                                    if (bonus.is_percentage) bonuses.health_percentage += bonus.value;
                                    else bonuses.health_flat += bonus.value;
                                    break;
                                // ... Añadir el resto de casos para los stats que definimos en equipment.js
                                case 'movement':
                                    if (bonus.is_percentage) { /* Por ahora no manejamos % de movimiento */ }
                                    else bonuses.movement_flat += bonus.value;
                                    break;
                                case 'initiative':
                                    if (!bonus.is_percentage) bonuses.initiative_flat += bonus.value;
                                    break;
                                case 'xp_gain':
                                    if (bonus.is_percentage) bonuses.xp_gain_percentage += bonus.value;
                                    break;
                                // Se pueden añadir más casos para stats de equipo más complejos
                            }
                        });
                    }
                }
            }
        }
    }
    }    

    return bonuses;
}

/**
 * Muestra una notificación temporal (toast) en el centro de la pantalla.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} [type='info'] - El tipo de notificación ('info', 'success', 'warning', 'error').
 * @param {number} [duration=3000] - La duración en milisegundos.
 */
function showToast(message, type = 'info', duration = 3000) {
    // Crear el elemento de la notificación
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;

    // Ajustar la duración de la animación a través de JS
    toast.style.animationDuration = `${duration / 1000}s`;

    // Añadirlo al cuerpo del documento
    document.body.appendChild(toast);

    // Eliminar el elemento del DOM después de que termine la animación
    setTimeout(() => {
        toast.remove();
    }, duration);
}

/**
 * A partir de una posición en una ruta, busca en ambas direcciones para encontrar las dos ciudades conectadas.
 * @param {number} startR - Fila inicial de la unidad.
 * @param {number} startC - Columna inicial de la unidad.
 * @returns {Array<object>} Un array con los dos objetos de ciudad encontrados, o un array vacío si no se encuentra una ruta válida.
 */
function findConnectedCities(startR, startC) {
    const foundCities = new Map();

    // Función de búsqueda BFS que se expande por toda la red conectada
    const exploreNetwork = (r, c) => {
        const queue = [{ r, c }];
        const visited = new Set([`${r},${c}`]);

        while (queue.length > 0) {
            const current = queue.shift();
            const currentHex = board[current.r]?.[current.c];

            // Si el hexágono actual es una ciudad, la registramos.
            if (currentHex && currentHex.isCity) {
                const cityData = gameState.cities.find(city => city.r === current.r && city.c === current.c);
                if (cityData && !foundCities.has(cityData.name)) {
                    foundCities.set(cityData.name, cityData);
                }
            }

            // Explorar vecinos
            for (const neighbor of getHexNeighbors(current.r, current.c)) {
                const key = `${neighbor.r},${neighbor.c}`;
                const neighborHex = board[neighbor.r]?.[neighbor.c];
                
                // Condición para seguir la ruta: debe tener infraestructura y no haber sido visitado.
                if (neighborHex && (neighborHex.structure || neighborHex.isCity) && !visited.has(key)) {
                    visited.add(key);
                    queue.push(neighbor);
                }
            }
        }
    };

    // Iniciar la exploración de toda la red desde la posición inicial de la caravana.
    exploreNetwork(startR, startC);

    // Devolver las ciudades encontradas como un array.
    return Array.from(foundCities.values());
}


/**
 * Asegura que el objeto gameState tenga todas las propiedades necesarias,
 * añadiendo las que falten con valores por defecto.
 * Esto previene errores al cargar partidas antiguas o estados de red incompletos.
 */
function ensureFullGameState() {
    if (!gameState) return;

    // A. INICIALIZACIÓN DE OBJETOS PADRE (Crucial para evitar el crash 'reading player1')
    if (!gameState.playerStats) gameState.playerStats = {};
    if (!gameState.playerStats.unitsDestroyed) gameState.playerStats.unitsDestroyed = {};
    if (!gameState.playerStats.sealTrades) gameState.playerStats.sealTrades = {};
    if (!gameState.playerStats.ruinsExplored) gameState.playerStats.ruinsExplored = {};

    if (!gameState.victoryPoints) gameState.victoryPoints = { holders: {}, ruins: {} };
    if (!gameState.victoryPoints.holders) gameState.victoryPoints.holders = {};
    if (!gameState.victoryPoints.ruins) gameState.victoryPoints.ruins = {};
    if (!gameState.playerStats) gameState.playerStats = { unitsDestroyed: {}, sealTrades: {}, ruinsExplored: {}, navalVictories: {} };
    if (!gameState.playerStats.navalVictories) gameState.playerStats.navalVictories = {};

    // B. INICIALIZACIÓN DE VALORES POR JUGADOR
    const totalPlayers = gameState.numPlayers || 2;
    for (let i = 1; i <= totalPlayers; i++) {
        const pKey = `player${i}`;
        
        // Inicializar contadores a 0 si no existen
        if (typeof gameState.playerStats.unitsDestroyed[pKey] === 'undefined') gameState.playerStats.unitsDestroyed[pKey] = 0;
        if (typeof gameState.playerStats.sealTrades[pKey] === 'undefined') gameState.playerStats.sealTrades[pKey] = 0;
        if (typeof gameState.playerStats.ruinsExplored[pKey] === 'undefined') gameState.playerStats.ruinsExplored[pKey] = 0;
        if (typeof gameState.victoryPoints.ruins[pKey] === 'undefined') gameState.victoryPoints.ruins[pKey] = 0;
        if (typeof gameState.victoryPoints[pKey] === 'undefined') gameState.victoryPoints[pKey] = 0;
    }
}

/**
 * Detecta si el input es una ruta de imagen o un emoji y devuelve el HTML correcto.
 */
function renderEquipIcon(iconValue, className = "item-icon") {
    if (!iconValue) return "❓";
    
    // Si contiene puntos o barras, es una imagen
    if (iconValue.includes('.') || iconValue.includes('/')) {
        return `<img src="${iconValue}" class="${className}" style="width:100%; height:100%; object-fit:contain;">`;
    }
    // Si no, es un emoji o texto
    return `<span class="${className}">${iconValue}</span>`;
}

//Audio
    function enableMobileWakeLock() {
        // 1. Intentar la API nativa de 'Wake Lock' (para que la pantalla no se apague sola)
        if ('wakeLock' in navigator) {
            try {
                let wakeLock = null;
                const requestWakeLock = async () => {
                    try {
                        wakeLock = await navigator.wakeLock.request('screen');
                    } catch (err) {
                    }
                };
                requestWakeLock();
                
                // Re-activar si se minimiza y vuelve
                document.addEventListener('visibilitychange', async () => {
                    if (wakeLock !== null && document.visibilityState === 'visible') {
                        await requestWakeLock();
                    }
                });
            } catch (err) {
                console.warn("Wake Lock no soportado.");
            }
        }
    }
