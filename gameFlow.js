// gameFlow.js
// Lógica principal del flujo del juego: turnos, fases, IA, victoria, niebla de guerra, recolección de recursos.

let currentTutorialStepIndex = -1; // -1 significa que el tutorial no ha comenzado o ha terminado
let tutorialScenarioData = null; // Almacena los datos del escenario de tutorial activo
const MAX_STABILITY = 5; // Definimos la constante aquí para que la función la reconozca.
const MAX_NACIONALIDAD = 5; // Valor máximo para la lealtad de un hexágono.

/**
 * Comprueba si una unidad está totalmente rodeada (6 hexágonos hostiles).
 */
function checkSurroundStatus(unit) {
    const neighbors = getHexNeighbors(unit.r, unit.c);
    if (neighbors.length < 6) return false; // Bordes del mapa no cuentan como rodeo total táctico usualmente, o sí. Asumimos 6 lados.
    
    // Está rodeada si TODOS los vecinos tienen un dueño diferente al jugador de la unidad
    // O están ocupados por unidades enemigas. Simplificaremos a "Controlados por el enemigo" (Dueño del hex).
    const enemyPlayer = unit.player === 1 ? 2 : 1; // Simplificación para 2 jugadores, ajustar para N.
    
    const surrounded = neighbors.every(n => {
        const hex = board[n.r]?.[n.c];
        // Es hostil si es del enemigo O si hay una unidad enemiga bloqueando
        const unitOnHex = getUnitOnHex(n.r, n.c);
        const isEnemyUnit = unitOnHex && unitOnHex.player !== unit.player;
        const isEnemyTerritory = hex && hex.owner !== null && hex.owner !== unit.player;
        
        return isEnemyTerritory || isEnemyUnit || (hex && TERRAIN_TYPES[hex.terrain]?.isImpassableForLand);
    });

    return surrounded;
}

/**
 * Calcula una ruta de escape campo a través (ignorando carreteras, solo terreno físico).
 * @param {Object} unit - Unidad que busca escapar
 * @param {number} targetR - Fila destino
 * @param {number} targetC - Columna destino
 * @param {number} maxDepth - Profundidad máxima de búsqueda (por defecto 15)
 * @returns {Array|null} Path de escape o null si no existe
 */
function findEscapePath(unit, targetR, targetC, maxDepth = 15) {
    // Validar coordenadas si CoordValidator está disponible
    if (typeof CoordValidator !== 'undefined') {
        if (!CoordValidator.check(unit.r, unit.c, 'findEscapePath_start') ||
            !CoordValidator.check(targetR, targetC, 'findEscapePath_target')) {
            return null;
        }
    }
    
    // Algoritmo A* simplificado para supervivencia
    let openSet = [{ r: unit.r, c: unit.c, g: 0, f: 0, path: [] }];
    let visited = new Set([`${unit.r},${unit.c}`]);
    let iterations = 0;
    const MAX_ITERATIONS = maxDepth * 10; // Límite absoluto de iteraciones

    while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        
        // Ordenar por coste estimado (f)
        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift();

        // Si llegamos al destino (o adyacente si está ocupado por la propia ciudad)
        if (current.r === targetR && current.c === targetC) {
            if (typeof Logger !== 'undefined') {
                Logger.debug('Pathfinding', `Ruta de escape encontrada en ${iterations} iteraciones`, {
                    pathLength: current.path.length,
                    cost: current.g
                });
            }
            return current.path;
        }

        // Límite estricto de profundidad
        if (current.g >= maxDepth) continue; 

        let neighbors = getHexNeighbors(current.r, current.c);
        for (const n of neighbors) {
            const key = `${n.r},${n.c}`;
            if (visited.has(key)) continue;

            const hex = board[n.r]?.[n.c];
            // Regla de Oro punto 5: Solo terreno físico transitable. Ignoramos si hay carretera.
            const isPassable = hex && !TERRAIN_TYPES[hex.terrain]?.isImpassableForLand;
            
            // Usar UnitGrid si está disponible para optimización
            let unitThere;
            if (typeof UnitGrid !== 'undefined' && UnitGrid.grid.size > 0) {
                unitThere = UnitGrid.get(n.r, n.c);
            } else {
                unitThere = getUnitOnHex(n.r, n.c);
            }
            
            // No podemos atravesar unidades enemigas
            const blockedByEnemy = unitThere && unitThere.player !== unit.player;

            if (isPassable && !blockedByEnemy) {
                visited.add(key);
                // Coste del terreno (Bosque cuesta más que Llanura)
                const moveCost = TERRAIN_TYPES[hex.terrain]?.movementCostMultiplier || 1;
                const g = current.g + moveCost;
                const h = hexDistance(n.r, n.c, targetR, targetC);
                const newPath = [...current.path, {r: n.r, c: n.c}];
                
                openSet.push({ r: n.r, c: n.c, g: g, f: g + h, path: newPath });
            }
        }
    }
    
    // No se encontró ruta
    if (typeof Logger !== 'undefined') {
        Logger.warn('Pathfinding', 
            `No se encontró ruta de escape después de ${iterations} iteraciones (límite: ${MAX_ITERATIONS})`, {
            from: {r: unit.r, c: unit.c},
            to: {r: targetR, c: targetC},
            maxDepth,
            visitedNodes: visited.size
        });
    } else {
        console.warn(`[Pathfinding] Límite alcanzado (${iterations} iteraciones)`);
    }
    
    return null; // No hay camino físico
}

/**
 * Gestiona la destrucción por asedio o combate fallido con probabilidad de deserción.
 */
async function attemptDefectionOrDestroy(unit, cause) {
    const chance = Math.random() * 100;
    
    // 25% de posibilidad de cambiar de bando
    if (chance <= 25) {
        const enemyPlayer = unit.player === 1 ? 2 : 1; // Calcular enemigo real
        
        // Cambiar de bando
        unit.player = enemyPlayer;
        unit.morale = 25; // Recupera un poco de moral por el cambio
        unit.isDisorganized = false; // Recupera el control bajo nuevo dueño
        unit.turnsSurrounded = 0;
        
        // Reducir efectivos al 50%
        unit.regiments.forEach(r => r.health = Math.floor(r.health * 0.5));
        recalculateUnitHealth(unit);
        
        // Actualizar visuales
        if (unit.element) {
            unit.element.classList.remove(`player${unit.player === 1 ? 2 : 1}`);
            unit.element.classList.add(`player${unit.player}`);
        }
        
        logMessage(`¡TRAICIÓN! La división "${unit.name}" ha desertado al bando enemigo debido a ${cause}.`, "important");
        if (UIManager) UIManager.updateAllUIDisplays();
        
    } else {
        // Destrucción normal
        logMessage(`La división "${unit.name}" ha sido aniquilada por ${cause}.`, "error");
        await handleUnitDestroyed(unit, null);
    }
}

function checkAndProcessBrokenUnit(unit) {
    if (!unit || unit.morale > 0) {
        return false;
    }

    logMessage(`¡${unit.name} tiene la moral rota y no puede ser controlada!`, "error");

    const originalUnit = getUnitById(unit.id);
    if (!originalUnit) return true; // La unidad ya no existe

    originalUnit.hasMoved = true;
    originalUnit.hasAttacked = true;

    const safeHavens = gameState.cities
        .filter(c => c.owner === originalUnit.player)
        .sort((a, b) => hexDistance(originalUnit.r, originalUnit.c, a.r, a.c) - hexDistance(originalUnit.r, originalUnit.c, b.r, b.c));
    
    const nearestSafeHaven = safeHavens.length > 0 ? safeHavens[0] : null;

    let retreatHex = null;
    if (nearestSafeHaven) {
        const neighbors = getHexNeighbors(originalUnit.r, originalUnit.c);
        let bestNeighbor = null;
        let minDistance = hexDistance(originalUnit.r, originalUnit.c, nearestSafeHaven.r, nearestSafeHaven.c);

        for (const n of neighbors) {
            if (!getUnitOnHex(n.r, n.c) && !TERRAIN_TYPES[board[n.r]?.[n.c]?.terrain]?.isImpassableForLand) {
                const dist = hexDistance(n.r, n.c, nearestSafeHaven.r, nearestSafeHaven.c);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestNeighbor = n;
                }
            }
        }
        retreatHex = bestNeighbor;
    }

    if (retreatHex) {
        logMessage(`¡${originalUnit.name} huye hacia (${retreatHex.r}, ${retreatHex.c})!`);
        //moveUnit({ ...originalUnit, currentMovement: 1, hasMoved: false }, retreatHex.r, retreatHex.c);
        const oldR = originalUnit.r;
        const oldC = originalUnit.c;
        if(board[oldR]?.[oldC]) board[oldR][oldC].unit = null; // Quitar lógicamente del hex original
        
        originalUnit.r = retreatHex.r; // Mover el OBJETO ORIGINAL
        originalUnit.c = retreatHex.c;
        if(board[retreatHex.r]?.[retreatHex.c]) board[retreatHex.r][retreatHex.c].unit = originalUnit; // Poner en el nuevo hex

    } else {
        logMessage(`¡${originalUnit.name} está rodeada y se rinde!`, "error");
        handleUnitDestroyed(originalUnit, null);
    }
    
    if (selectedUnit && selectedUnit.id === originalUnit.id) {
        deselectUnit();
        if (UIManager) UIManager.hideContextualPanel();
    }
    if (typeof renderFullBoardVisualState === "function") renderFullBoardVisualState();
    return true; 
}

function handleUnitUpkeep(playerNum) {
    if (!gameState.playerResources?.[playerNum] || !units) return;

    const playerUnits = units.filter(u => u.player === playerNum && u.currentHealth > 0);
    if (playerUnits.length === 0) return;

    console.group(`%c[Upkeep] INICIO Fase de Mantenimiento para Jugador ${playerNum}`, "background: #444; color: #fff;");

    const playerRes = gameState.playerResources[playerNum];
    let totalGoldUpkeep = 0;
    
    playerUnits.forEach(unit => {
        console.groupCollapsed(`-> Procesando unidad: ${unit.name}`);
        let maxMoraleBonus = 0;
        let upkeepReductionPercent = 0;

        // --- 1. CÁLCULO DE BONUS DE HABILIDADES ---
        if (unit.commander) {
            const commanderData = COMMANDERS[unit.commander];
            const playerProfile = PlayerDataManager.getCurrentPlayer();
            const heroInstance = playerProfile?.heroes.find(h => h.id === unit.commander);

            if (commanderData && heroInstance) {
                commanderData.skills.forEach((skill, index) => {
                    const skillDef = SKILL_DEFINITIONS[skill.skill_id];
                    const starsRequired = index + 1;

                    if (heroInstance.stars >= starsRequired && skillDef?.scope === 'turno') {
                        const skillLevel = heroInstance.skill_levels[index] || (index === 0 ? 1 : 0);
                        if (skillLevel > 0 && skill.scaling_override) {
                            const bonusValue = skill.scaling_override[skillLevel - 1];
                            
                            if (skillDef.effect.stat === 'morale') {
                                maxMoraleBonus += bonusValue;
                            } else if (skillDef.effect.stat === 'upkeep') {
                                upkeepReductionPercent += bonusValue;
                            }
                        }
                    }
                });
            }
        } else {
        }

        // --- 2. LÓGICA DE MORAL Y SUMINISTRO ---
        const baseMaxMorale = unit.maxMorale || 125;
        const finalMaxMorale = baseMaxMorale + maxMoraleBonus;
        
        // Aplicamos bonus de comandante a la moral actual
        unit.morale = Math.max(0, unit.morale + maxMoraleBonus);
        

        // Comprobación de Suministro (Regla 2: Incomunicación)
        const isSupplied = isHexSupplied(unit.r, unit.c, unit.player);
        
        // Comprobar si está en territorio amigo para la regla de recuperación
        const hexData = board[unit.r]?.[unit.c];
        const inFriendlyTerritory = hexData && hexData.owner === unit.player;

        if (isSupplied) {
            // Regla 6: Recuperación de Moral en territorio amigo
            if (inFriendlyTerritory) {
                const moraleGain = 10; // Subimos un poco la recuperación si está en casa
                unit.morale = Math.min(finalMaxMorale, (unit.morale || 50) + moraleGain);

                // Si recupera suficiente moral, deja de estar desorganizada
                if (unit.isDisorganized && unit.morale > 30) {
                    unit.isDisorganized = false;
                    unit.turnsSurrounded = 0; // Resetear contador si se recupera
                    logMessage(`¡${unit.name} se ha reorganizado y vuelve a estar bajo tu control!`, "success");
                }
            } else {
                // Suministrada pero fuera de casa (Mantiene o sube poco)
                const moraleGain = 5;
                unit.morale = Math.min(finalMaxMorale, (unit.morale || 50) + moraleGain);
            }
        } else {
            // Regla 2 y 5: Pérdida por incomunicación
            const moraleLoss = 10;
            
            unit.morale = Math.max(0, (unit.morale || 50) - moraleLoss);
            logMessage(`¡${unit.name} está incomunicada y pierde moral!`, 'warning');
        }

        // --- GESTIÓN DE ESTADOS: DESORGANIZADA Y ASEDIO ---
        
        if (unit.morale <= 0) {
            // Estado Desorganizada (Regla 5)
            if (!unit.isDisorganized) {
                unit.isDisorganized = true;
                logMessage(`¡${unit.name} ha perdido la moral y está DESORGANIZADA!`, "error");
            }

            // Regla 4: Asedio Prolongado
            // Solo contamos turnos de asedio si está Desorganizada (Moral 0) Y Rodeada
            const isSurrounded = checkSurroundStatus(unit);
            if (isSurrounded) {
                unit.turnsSurrounded = (unit.turnsSurrounded || 0) + 1;
                logMessage(`${unit.name} está RODEADA y SIN MORAL (Turno ${unit.turnsSurrounded}/5).`);
                
                if (unit.turnsSurrounded >= 5) {
                    // Ejecutar Regla 4: Muerte o Traición
                    attemptDefectionOrDestroy(unit, "colapso por asedio prolongado");
                    console.groupEnd();
                    return; // IMPORTANTE: Detener proceso para esta unidad, ya no es nuestra o no existe
                }
            } else {
                // Si no está rodeada, el contador no avanza (o se podría resetear según tu preferencia estricta)
                // Según tu punto 4: "Si gana combate, moral sube". Aquí si no está rodeada, al menos no muere por esto.
            }
        } else {
            // Si tiene moral > 0, reseteamos el contador de asedio porque sus hombres aún luchan
            unit.turnsSurrounded = 0;
        }
        
        // --- 3. LÓGICA DE MANTENIMIENTO---
        let unitUpkeep = 0;
        (unit.regiments || []).forEach(regiment => { unitUpkeep += REGIMENT_TYPES[regiment.type]?.cost?.upkeep || 0; });
         // Aplicar la reducción de consumo
        if (upkeepReductionPercent >= 100) {
            unitUpkeep = 0;
        } else if (upkeepReductionPercent > 0) {
            const reductionAmount = unitUpkeep * (upkeepReductionPercent / 100);
            unitUpkeep -= reductionAmount;
        }
        const finalUnitUpkeep = Math.round(Math.max(0, unitUpkeep));
        totalGoldUpkeep += finalUnitUpkeep;
        console.groupEnd();
    });

    // --- 4. LÓGICA DE PAGO  ---
    if (playerRes.oro < totalGoldUpkeep) {
        logMessage(`¡Jugador ${playerNum} no puede pagar el mantenimiento (${totalGoldUpkeep})! ¡Las tropas se desmoralizan!`, "error");
        playerUnits.forEach(unit => {
            // <<== La penalización ahora depende del número de regimientos ==>>
            // Se calcula la pérdida de moral como -1 por cada regimiento en la división.
            const moralePenalty = (unit.regiments || []).length;
            unit.morale = Math.max(0, unit.morale - moralePenalty);
            logMessage(`  -> ${unit.name} pierde ${moralePenalty} de moral por el impago.`);
            
            // Si el impago baja la moral a 0, se desorganiza
            if (unit.morale <= 0) unit.isDisorganized = true;
        });
    } else {
        playerRes.oro -= totalGoldUpkeep;
        // Si pagan, y NO están desorganizadas por otras causas (batalla/cerco), recuperan ánimo leve
        logMessage(`Jugador ${playerNum} paga ${totalGoldUpkeep} de oro en mantenimiento.`);
        playerUnits.forEach(unit => {
            if (unit.isDemoralized) {
                logMessage(`¡Las tropas de ${unit.name} reciben su paga y recuperan el ánimo!`);
                unit.isDemoralized = false;
            }
        });
    }
    console.groupEnd();
}

async function handleBrokenUnits(playerNum) {
    // Filtramos unidades del jugador que están desorganizadas y vivas
    const disorganizedUnits = units.filter(u => u.player === playerNum && u.isDisorganized && u.currentHealth > 0);

    if (disorganizedUnits.length > 0) {
        logMessage(`Tropas desorganizadas del Jugador ${playerNum} intentan replegarse...`, "warning");
    }

    for (const unit of disorganizedUnits) {
        const originalUnit = getUnitById(unit.id);
        if (!originalUnit) continue; 

        // Consumir acciones (el jugador no puede usarlas)
        originalUnit.hasMoved = true; 
        originalUnit.hasAttacked = true;

        // Buscar refugio más cercano (Capital o Fortaleza propia)
        const safeHavens = gameState.cities
            .filter(c => c.owner === unit.player && (c.isCapital || c.structure === 'Fortaleza'))
            .sort((a, b) => hexDistance(originalUnit.r, originalUnit.c, a.r, a.c) - hexDistance(originalUnit.r, originalUnit.c, b.r, b.c));
        
        const target = safeHavens[0];
        let nextStepCoords = null;

        // Usamos la nueva función de pathfinding de supervivencia
        if (target) {
            // Devuelve el camino completo
            const path = findEscapePath(originalUnit, target.r, target.c);
            
            if (path && path.length > 0) {
                // El primer elemento del path es el siguiente paso
                nextStepCoords = path[0];
            }
        }

        if (nextStepCoords) {
            logMessage(`La desorganizada "${originalUnit.name}" huye hacia ${target.name}.`);
            
            // Ejecutamos el movimiento real
            await _executeMoveUnit(originalUnit, nextStepCoords.r, nextStepCoords.c);
            // Después del movimiento, el estado de 'hasMoved' de la unidad original SÍ habrá cambiado a 'true'
            // pero `resetUnitsForNewTurn` lo pondrá a 'false' al inicio del siguiente turno, permitiendo
            // que la unidad vuelva a huir si sigue desmoralizada.

        } else {
            // Si no hay ruta física (encerrada por agua, montañas o enemigos), se queda quieta.
            // NO SE DESTRUYE AQUI.
            // Esperará a handleUnitUpkeep para ver si se cumple el criterio de Asedio (5 turnos).
            logMessage(`"${originalUnit.name}" está desorganizada y bloqueada. Permanece inmóvil.`);
        }
    }
}

function resetUnitsForNewTurn(playerNumber) { 
    if (!units || !Array.isArray(units)) {
        console.error("[TurnStart] El array 'units' no está disponible o no es un array.");
        return;
    }
    
    // === PROCESAR MOVIMIENTOS AUTOMÁTICOS AL INICIO DEL TURNO ===
    if (typeof AutoMoveManager !== 'undefined') {
        AutoMoveManager.processAutoMovesForCurrentPlayer().then(() => {
        }).catch(err => {
            console.error("[AutoMove] Error al procesar movimientos automáticos:", err);
        });
    }
    
    // === PROCESAR INVESTIGACIÓN AUTOMÁTICA AL INICIO DEL TURNO ===
    if (typeof AutoResearchManager !== 'undefined') {
        AutoResearchManager.processAutoResearch(playerNumber);
    }
    
    // Iteramos sobre TODAS las unidades
    units.forEach(unit => {
        // >> INICIO DE LA CORRECCIÓN LÓGICA <<
        // Si la unidad pertenece al jugador cuyo turno está COMENZANDO...
        if (unit.player === playerNumber) {
            unit.hasMoved = false; unit.hasAttacked = false; unit.currentMovement = unit.movement || 2;
            // Se resetean sus acciones y su movimiento
            calculateRegimentStats(unit); // Le pasamos la unidad completa. La función actualiza sus stats directamente.
            unit.currentMovement = unit.movement;
            // <<== INICIO: LÓGICA DE HABILIDADES DE MOVIMIENTO ==>>
                if (unit.commander) {
                    const commanderData = COMMANDERS[unit.commander];
                    const playerProfile = PlayerDataManager.getCurrentPlayer();
                    const heroInstance = playerProfile.heroes.find(h => h.id === unit.commander);

                    if (commanderData && heroInstance) {
                        commanderData.skills.forEach((skill, index) => {
                            const skillDef = SKILL_DEFINITIONS[skill.skill_id];
                            const starsRequired = index + 1;

                            // Comprobar si la habilidad está desbloqueada y si es de movimiento
                            if (heroInstance.stars >= starsRequired && skillDef?.scope === 'movimiento') {
                                const regimientoPrincipal = REGIMENT_TYPES[unit.regiments[0].type];
                                
                                // Comprobar filtro de categoría
                                const categoryFilter = skillDef.filters?.category;
                                let filterMatch = false;
                                if (categoryFilter) {
                                    if (categoryFilter.includes('all') || categoryFilter.includes(regimientoPrincipal.category)) {
                                        filterMatch = true;
                                    }
                                } else {
                                    filterMatch = true; // Si no hay filtro, se aplica
                                }

                                if (filterMatch) {
                                    const skillLevel = heroInstance.skill_levels[index] || 1;
                                    const bonusValue = skill.scaling_override[skillLevel - 1];
                                    
                                    // Las habilidades de movimiento siempre son planas, no porcentuales
                                    unit.currentMovement += bonusValue;
                                    
                                    // Log para depuración
                                }
                            }
                        });
                    }
                }
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.isFlanked = false; // Se resetea el estado de flanqueo al inicio de su turno
        }
    });

    if (typeof deselectUnit === "function") deselectUnit();
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
        UIManager.updateAllUIDisplays();
    }
}

function handleHealingPhase(playerNum) {
    console.group(`[DEBUG CURACIÓN- ANÁLISIS PROFUNDO] Iniciando Fase de Curación para Jugador ${playerNum}`);

    // >>>>> CORRECCIÓN: Eliminada la condición `!unit.hasMoved` <<<<<
    const divisionsWithHealers = units.filter(unit => 
        unit.player === playerNum && 
        unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.is_healer)
    );

    if (divisionsWithHealers.length === 0) {
        console.groupEnd();
        return;
    }
    
    //console.log(`[DEBUG CURACIÓN] Se encontraron ${divisionsWithHealers.length} divisiones con sanadores.`);

    divisionsWithHealers.forEach(healerUnit => {

        healerUnit.regiments.forEach((reg, index) => {
            const regInfo = REGIMENT_TYPES[reg.type];
        });

        const hospitalRegs = healerUnit.regiments.filter(r => REGIMENT_TYPES[r.type]?.is_healer);
        const hospitalCount = hospitalRegs.length;
        if (hospitalCount === 0) {
            console.groupEnd(); return;
        }

        const totalHealPower = hospitalRegs.reduce((sum, r) => sum + (REGIMENT_TYPES[r.type]?.heal_power || 0), 0);
        
        const damagedRegiments = healerUnit.regiments.filter(reg => {
            const maxHealth = REGIMENT_TYPES[reg.type]?.health;
            return reg.health < maxHealth && !REGIMENT_TYPES[reg.type]?.is_healer;
        });

        if (damagedRegiments.length === 0) {
            console.groupEnd();
            return;
        }

        if (damagedRegiments.length > 0) {
            // Aquí iría tu lógica de curación, que por ahora podemos omitir para centrarnos en el bug.
        } else {
            console.error(`%cFALLO: NO se encontraron regimientos dañados. La condición 'reg.health < maxHealth' falló para todos.`, 'color: red;');
        }


        const maxTargets = hospitalCount * 2;
        const targetsToHealCount = Math.min(damagedRegiments.length, maxTargets);
        
        damagedRegiments.sort((a,b) => (a.health / REGIMENT_TYPES[a.type].health) - (b.health / REGIMENT_TYPES[b.type].health));

        for (let i = 0; i < targetsToHealCount; i++) {
            const regimentToHeal = damagedRegiments[i];
            const maxHealth = REGIMENT_TYPES[regimentToHeal.type].health;
            const previousHealth = regimentToHeal.health;
            
            regimentToHeal.health = Math.min(maxHealth, regimentToHeal.health + totalHealPower);
            const healthRestored = regimentToHeal.health - previousHealth;

            if (healthRestored > 0) {
                logMessage(`${healerUnit.name} cura ${healthRestored} HP al regimiento de ${regimentToHeal.type}.`);
            }
        }
        
        recalculateUnitHealth(healerUnit);
        
        console.groupEnd();
    });

    console.groupEnd();
}

function collectPlayerResources(playerNum) {
    console.groupCollapsed(`[RECURSOS] Análisis Detallado de Recolección para Jugador ${playerNum}`);

    const playerRes = gameState.playerResources[playerNum];
    if (!playerRes) {
        console.warn(`[RECURSOS] No se encontraron datos de recursos para el jugador ${playerNum}.`);
        console.groupEnd();
        return;
    }

    const playerTechs = playerRes.researchedTechnologies || [];
    let totalIncome = { oro: 0, hierro: 0, piedra: 0, madera: 0, comida: 0, researchPoints: 0, puntosReclutamiento: 0 };
    let logItems = [];

    board.forEach(row => {
        row.forEach(hex => {
            if (hex.owner !== playerNum) {
                return;
            }

           // console.log(`--- Analizando Hex (${hex.r},${hex.c}) ---`);

            // <<== NUEVO: Cálculo no lineal del multiplicador de estabilidad ==>>
            let stabilityMultiplier = 0;
            switch (hex.estabilidad) {
                case 0: stabilityMultiplier = 0; break;
                case 1: stabilityMultiplier = 0.25; break; // 25%
                case 2: stabilityMultiplier = 0.70; break; // 70%
                case 3: stabilityMultiplier = 1.0; break;  // 100%
                case 4: stabilityMultiplier = 1.25; break; // 125%
                case 5: stabilityMultiplier = 1.50; break; // 150%
                default: stabilityMultiplier = 0;
            }
            // <<== FIN DE LA MODIFICACIÓN ==>>

            const nationalityMultiplier = (hex.nacionalidad[playerNum] || 0) / MAX_NACIONALIDAD;

           // console.log(`  - Estabilidad: ${hex.estabilidad}/${MAX_STABILITY} (Multiplicador: ${stabilityMultiplier.toFixed(2)})`);
           // console.log(`  - Nacionalidad: ${hex.nacionalidad[playerNum]}/${MAX_NACIONALIDAD} (Multiplicador: ${nationalityMultiplier.toFixed(2)})`);
            
            let recruitmentPointsFromHex = 0;
            if (hex.isCity) {
                recruitmentPointsFromHex = hex.isCapital ? 100 : 50;
            } else if (hex.structure === "Fortaleza") {
                recruitmentPointsFromHex = 20;
            } else {
                recruitmentPointsFromHex = 10 * nationalityMultiplier * stabilityMultiplier;
            }
           // console.log(`  - Puntos Reclutamiento base del hex: ${recruitmentPointsFromHex.toFixed(2)}`);
            totalIncome.puntosReclutamiento += Math.round(recruitmentPointsFromHex);

            let incomeFromHex = { oro: 0, hierro: 0, piedra: 0, madera: 0, comida: 0 };
            
            if (hex.isCity) {
                incomeFromHex.oro = hex.isCapital ? GOLD_INCOME.PER_CAPITAL : GOLD_INCOME.PER_CITY;
            } else if (hex.structure === "Fortaleza") {
                incomeFromHex.oro = GOLD_INCOME.PER_FORT;
            } else if (hex.structure === "Camino") {
                incomeFromHex.oro = GOLD_INCOME.PER_ROAD;
            } else {
                incomeFromHex.oro = GOLD_INCOME.PER_HEX;
            }

            if (hex.resourceNode && RESOURCE_NODES_DATA[hex.resourceNode]) {
                const nodeInfo = RESOURCE_NODES_DATA[hex.resourceNode];
                const resourceType = nodeInfo.name.toLowerCase().replace('_mina', '');
                
                if (resourceType !== 'oro') {
                    incomeFromHex[resourceType] += nodeInfo.income || 0;
                }
            }

            let techBonusLog = "";
            if (incomeFromHex.oro > 0 && playerTechs.includes('PROSPECTING')) { incomeFromHex.oro += 1; techBonusLog += "PROSPECTING, "; }
            if (incomeFromHex.hierro > 0 && playerTechs.includes('IRON_WORKING')) { incomeFromHex.hierro += 1; techBonusLog += "IRON_WORKING, "; }
            if (incomeFromHex.piedra > 0 && playerTechs.includes('MASONRY')) { incomeFromHex.piedra += 1; techBonusLog += "MASONRY, "; }
            if (incomeFromHex.madera > 0 && playerTechs.includes('FORESTRY')) { incomeFromHex.madera += 1; techBonusLog += "FORESTRY, "; }
            if (incomeFromHex.comida > 0 && playerTechs.includes('SELECTIVE_BREEDING')) { incomeFromHex.comida += 1; techBonusLog += "SELECTIVE_BREEDING, "; }


            for (const res in incomeFromHex) {
                const baseIncome = incomeFromHex[res];
                const finalIncome = baseIncome * stabilityMultiplier * nationalityMultiplier;
                totalIncome[res] = (totalIncome[res] || 0) + finalIncome;
            }
        }); 
    });


    for (const resType in totalIncome) {
        if (totalIncome[resType] > 0) {
            const roundedIncome = Math.round(totalIncome[resType]);
            if (roundedIncome > 0) {
                playerRes[resType] = (playerRes[resType] || 0) + roundedIncome;
                logItems.push(`+${roundedIncome} ${resType}`);
            }
        }
    }

    if (logItems.length > 0) {
        logMessage(`Ingresos J${playerNum}: ${logItems.join(', ')}`);
    } else {
        logMessage(`Jugador ${playerNum} no generó ingresos este turno.`);
    }

    console.groupEnd();
}

function updateFogOfWar() {
    if (!board || board.length === 0) return;
    if (gameState.isTutorialActive) return; 

    const currentRows = board.length;
    // --- CORRECCIÓN AQUÍ: Añadida la 's' al final para que coincida con el uso abajo ---
    const currentCols = board[0] ? board[0].length : 0; 
    
    const playerKey = `player${gameState.currentPlayer}`;

    // 1. SI EL MAPA ESTÁ REVELADO (TRUCO), SALIR
    if (gameState.isMapRevealed) {
        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCols; c++) {
                const hexData = board[r]?.[c];
                if (hexData) {
                    hexData.visibility[playerKey] = 'visible';
                    // Mostrar unidades ocultas
                    const u = getUnitOnHex(r, c);
                    if (u && u.element) u.element.style.display = 'flex';
                    // Limpiar clases de niebla
                    if (hexData.element) hexData.element.classList.remove('fog-hidden', 'fog-partial');
                }
            }
        }
        return;
    }

    // 2. RESETEAR VISIBILIDAD (A PARTIAL SI YA FUE VISITADO)
    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            const hexData = board[r]?.[c];
            if (!hexData || !hexData.element) continue;

            const unitOnThisHex = getUnitOnHex(r, c);

            // Si estaba visible, pasa a partial (memoria de mapa). Si estaba hidden, se queda hidden.
            if (hexData.visibility[playerKey] === 'visible') {
                hexData.visibility[playerKey] = 'partial';
            }
            
            // Ocultar unidades por defecto (se revelarán abajo si están en rango)
            if (unitOnThisHex && unitOnThisHex.element && unitOnThisHex.player !== gameState.currentPlayer) {
                unitOnThisHex.element.style.display = 'none';
            }
        }
    }

    // 3. CALCULAR FUENTES DE VISIÓN
    const visionSources = [];

    // A) UNIDADES PROPIAS
    units.forEach(unit => {
        if (unit.player === gameState.currentPlayer && unit.currentHealth > 0 && unit.r !== -1) {
            visionSources.push({r: unit.r, c: unit.c, range: unit.visionRange || 1});
        }
    });

    // B) ESTRUCTURAS PROPIAS
    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            const hex = board[r][c];
            if (hex && hex.owner === gameState.currentPlayer && hex.structure) {
                let range = 1; // Visión base
                
                const structDef = STRUCTURE_TYPES[hex.structure];
                if (structDef) {
                    if (structDef.visionBonus) {
                        range = structDef.visionBonus;
                    } 
                    else if (hex.isCapital) range = 3;
                    else if (hex.isCity) range = 2;
                    else if (hex.structure === 'Fortaleza') range = 2;
                    else if (hex.structure === 'Fortaleza con Muralla') range = 3;
                }
                
                visionSources.push({r: r, c: c, range: range});
            }
        }
    }

    // 4. APLICAR VISIÓN
    visionSources.forEach(source => {
        // Optimización: Solo iterar un cuadrado alrededor de la fuente
        const rMin = Math.max(0, source.r - source.range);
        const rMax = Math.min(currentRows - 1, source.r + source.range);
        const cMin = Math.max(0, source.c - source.range);
        // --- AQUÍ ESTABA EL ERROR: Ahora currentCols existe y funciona ---
        const cMax = Math.min(currentCols - 1, source.c + source.range);

        for (let r = rMin; r <= rMax; r++) {
            for (let c = cMin; c <= cMax; c++) {
                if (hexDistance(source.r, source.c, r, c) <= source.range) {
                    const targetHex = board[r]?.[c];
                    if (targetHex) {
                        // Detectar si la casilla estaba oculta y ahora se revela (exploración)
                        const wasHidden = !targetHex.visibility[playerKey] || targetHex.visibility[playerKey] === 'hidden';
                        
                        targetHex.visibility[playerKey] = 'visible';
                        
                        // Otorgar puntos de investigación por casilla explorada
                        if (wasHidden && typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.onHexExplored) {
                            ResearchRewardsManager.onHexExplored(gameState.currentPlayer, r, c);
                        }
                        
                        // Revelar unidad enemiga si la hay
                        const unitThere = getUnitOnHex(r, c);
                        if (unitThere && unitThere.element) {
                            unitThere.element.style.display = 'flex';
                            if (unitThere.player === gameState.currentPlayer) {
                                unitThere.element.classList.add('player-controlled-visible');
                            }
                        }
                    }
                }
            }
        }
    });

    // 5. ACTUALIZAR CLASES CSS
    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            const hexData = board[r][c];
            if (!hexData || !hexData.element) continue;

            const status = hexData.visibility[playerKey];
            
            hexData.element.classList.remove('fog-hidden', 'fog-partial');

            if (status === 'hidden' || !status) {
                hexData.element.classList.add('fog-hidden');
            } else if (status === 'partial') {
                hexData.element.classList.add('fog-partial');
            }
        }
    }
}

function checkVictory() {

    // PUNTO DE CONTROL A: Entrada al árbitro

    // --- PUENTE DE COMPATIBILIDAD ESCARAMUZA/CAMPAÑA ---
    // Buscamos la capital de J1
    const pCap = gameState.currentMapData?.playerCapital || gameState.capitalCityId?.[1];
    // Buscamos la capital de J2
    const eCap = gameState.currentMapData?.enemyCapital || gameState.capitalCityId?.[2];

    // Extraemos las coordenadas de forma segura
    const pCapR = pCap?.r;
    const pCapC = pCap?.c;
    const eCapR = eCap?.r;
    const eCapC = eCap?.c;
    
    if (pCap && board[pCap.r] && board[pCap.r][pCap.c]) {
    } else {
    }

    if (eCap && board[eCap.r] && board[eCap.r][eCap.c]) {
    } else {
    }

    const p1Units = units.filter(u => u.player === 1 && u.currentHealth > 0).length;
    const p2Units = units.filter(u => u.player === 2 && u.currentHealth > 0).length;
    // --- FIN DEL BLOQUE DE OJO DE DATOS ---

   if (gameState.isTutorialActive) {
        // Durante el tutorial, la victoria solo la dicta el propio tutorial.
        // No se debe declarar una victoria normal.
        return false;
    }
    if (gameState.currentPhase !== 'play') return false;

    let winner = null; // 1 para jugador humano, 2 para IA u oponente

    // 1. Verificación por Capital (Usando las coordenadas del log)
    if (eCapR !== undefined && eCapC !== undefined) {
        if (board[eCapR][eCapC].owner === 1) {
            winner = 1;
        } else if (board[pCapR][pCapC].owner === 2) {
            winner = 2;
        }
    }

    // 2. Verificación por Eliminación (Si no hay ganador por capital aún)
    if (!winner) {
        if (p1Units > 0 && p2Units === 0) {
            winner = 1;
        } else if (p2Units > 0 && p1Units === 0) {
            winner = 2;
        }
    }

    // --- 1. Condiciones de Victoria/Derrota Específicas del Escenario ---
    if (gameState.isCampaignBattle && gameState.currentScenarioData) {
        const scenario = gameState.currentScenarioData;
        const playerHuman = 1; // Asumimos que el jugador humano es siempre el jugador 1
        const enemyPlayer = 2; // Asumimos que el oponente IA es jugador 2 (esto podría necesitar ser más flexible)

        // Checar condiciones de victoria del jugador
        if (scenario.victoryConditions) {
            for (const condition of scenario.victoryConditions) {
                if (condition.type === "eliminate_all_enemies") {
                    if (!units.some(u => u.player === enemyPlayer && u.currentHealth > 0)) {
                        winner = playerHuman;
                        logMessage(`¡Condición de victoria: Enemigos eliminados! Jugador ${winner} gana.`);
                        break;
                    }
                }
                // TODO: Implementar más tipos de condiciones de victoria del escenario
                // else if (condition.type === "capture_hex") { ... }
                // else if (condition.type === "survive_turns") { ... }
            }
        }
        if (winner) { // Si ya ganó el jugador

            // PUNTO DE CONTROL B1: Victoria detectada por Capital o Eliminación
            endTacticalBattle(winner);
            return true;
        }

        // Chequear condiciones de derrota del jugador (victoria del enemigo)
        if (scenario.lossConditions) {
            for (const condition of scenario.lossConditions) {
                if (condition.type === "player_capital_lost") {
                    const playerCapitalCity = gameState.cities.find(c => c.isCapital && c.ownerOriginal === playerHuman); // Necesitaríamos 'ownerOriginal' o una forma de saber cuál era la capital del jugador
                    // O usar la info del mapa:
                    const pCapR = gameState.currentMapData?.playerCapital?.r;
                    const pCapC = gameState.currentMapData?.playerCapital?.c;
                    if (typeof pCapR !== 'undefined' && board[pCapR]?.[pCapC]?.owner === enemyPlayer) {
                        winner = enemyPlayer;
                        logMessage(`Condición de derrota: ¡Capital del jugador capturada! Jugador ${winner} gana.`);
                        break;
                    }
                }
                // TODO: Implementar más tipos de condiciones de derrota del escenario
                // else if (condition.type === "time_limit_exceeded") { ... }
            }
        }
        if (winner) { // Si ya perdió el jugador (ganó el enemigo)
            endTacticalBattle(winner);
            return true;
        }
    }



    // --- 2. Condiciones de Victoria/Derrota Genéricas (si no es campaña o no se cumplieron las específicas) ---
    // Solo si no se ha determinado un ganador por condiciones de escenario
    if (!winner) {
        let p1CapitalOwner = null;
        let p2CapitalOwner = null; // p2 puede ser IA u otro humano

        // Intentar identificar capitales de forma más genérica o basada en el mapa actual
        const playerCapitalInfo = gameState.currentMapData?.playerCapital;
        const enemyCapitalInfo = gameState.currentMapData?.enemyCapital;

        gameState.cities.forEach(city => {
            if (city.isCapital && board[city.r]?.[city.c]) {
                const currentOwner = board[city.r][city.c].owner;
                if (playerCapitalInfo && city.r === playerCapitalInfo.r && city.c === playerCapitalInfo.c) {
                    p1CapitalOwner = currentOwner;
                } else if (enemyCapitalInfo && city.r === enemyCapitalInfo.r && city.c === enemyCapitalInfo.c) {
                    p2CapitalOwner = currentOwner;
                } else { // Fallback para escaramuzas si los nombres de capitales no coinciden con mapData
                    if (city.name.toLowerCase().includes("p1") || (city.ownerOriginal === 1 && !enemyCapitalInfo)) { // Asume que p1 es el nombre para capital P1 en escaramuza
                        p1CapitalOwner = currentOwner;
                    } else if (city.name.toLowerCase().includes("p2") || (city.ownerOriginal === 2 && !playerCapitalInfo) ) {
                        p2CapitalOwner = currentOwner;
                    }
                }
            }
        });
        
        if (p1CapitalOwner !== null && p1CapitalOwner === 2) winner = 2; // IA/P2 capturó capital de P1
        if (p2CapitalOwner !== null && p2CapitalOwner === 1) winner = 1; // P1 capturó capital de IA/P2


        if (winner) {
            logMessage(`¡JUGADOR ${winner} GANA AL CAPTURAR LA CAPITAL ENEMIGA!`);
        } else {
            // Victoria por eliminación total (si no hay captura de capital)
            const player1HasUnits = units.some(u => u.player === 1 && u.currentHealth > 0);
            // Determinar quién es el jugador 2 (puede ser IA o humano en escaramuza)
            const player2Id = (gameState.playerTypes.player2 === 'human') ? 2 : 2; // Asumimos IA es jugador 2 por ahora
            const player2HasUnits = units.some(u => u.player === player2Id && u.currentHealth > 0);

            const player1EverHadUnits = units.some(u => u.player === 1);
            const player2EverHadUnits = units.some(u => u.player === player2Id);

            if (player1EverHadUnits && !player1HasUnits && player2HasUnits) {
                winner = player2Id;
                logMessage(`¡JUGADOR ${winner} GANA POR ELIMINACIÓN TOTAL DE UNIDADES DEL JUGADOR 1!`);
            } else if (player2EverHadUnits && !player2HasUnits && player1HasUnits) {
                winner = 1;
                logMessage(`¡JUGADOR 1 GANA POR ELIMINACIÓN TOTAL DE UNIDADES DEL JUGADOR ${player2Id}!`);
            }
        }
    }

    if (winner) {
        endTacticalBattle(winner); // Llamar a la función centralizada de fin de batalla
        return true;
    }
    return false;
}

// Función para centralizar el fin de una batalla táctica
async function endTacticalBattle(winningPlayerNumber) {
    if (gameState.currentPhase === "gameOver") {
        console.warn("[endTacticalBattle] La batalla ya había terminado. Saliendo.");
        return; // Evitar múltiples ejecuciones si checkVictory se llama varias veces
    }

    // PUNTO DE CONTROL C: Inicio del cierre

    // --- PROGRESO ---
    PlayerDataManager.processEndGameProgression(winningPlayerNumber);

    TurnTimerManager.stop(); 
    
    logMessage(`Fin de la batalla. Jugador ${winningPlayerNumber} es el vencedor.`);
    gameState.currentPhase = "gameOver";
    gameState.winner = winningPlayerNumber;

    // --- LIMPIEZA DE PARTIDA ONLINE (CORRECCIÓN ZOMBIS) ---
    // Si la partida tiene ID de red, la borramos de la lista de activas al terminar
    if (typeof NetworkManager !== 'undefined' && NetworkManager.miId) {
        // Usamos replace para quitar el prefijo si lo tiene y limpiar la DB
        const cleanId = NetworkManager.miId.replace('hge-', ''); 
        const { error } = await supabaseClient
            .from('active_matches')
            .delete()
            .eq('match_id', cleanId);
            
        if(error) console.error("Error al limpiar partida de la nube:", error);
    }
    // -----------------------------------------------------

    // --- Registrar el progreso de carrera ---
    if (PlayerDataManager.applyCareerProgression) {
        PlayerDataManager.applyCareerProgression(winningPlayerNumber)
            .catch(err => console.error("Error en progresión:", err));
    }

    // --- BONUS DE ORO POR VICTORIA ---
    let goldBonus = 0;
    let victoryMessage = `¡Jugador ${winningPlayerNumber} ha ganado la batalla!`;

    if (gameState.isCampaignBattle && gameState.currentScenarioData && typeof gameState.currentScenarioData.victoryGoldBonus === 'number') {
        goldBonus = gameState.currentScenarioData.victoryGoldBonus;
        victoryMessage = `¡Jugador ${winningPlayerNumber} ha ganado el escenario y recibe un bonus de ${goldBonus} de oro!`;
    } else if (!gameState.isCampaignBattle) { // Es una escaramuza
        // Asegúrate de que SKIRMISH_VICTORY_GOLD_BONUS esté definido en constants.js
        goldBonus = (typeof SKIRMISH_VICTORY_GOLD_BONUS !== 'undefined') ? SKIRMISH_VICTORY_GOLD_BONUS : 50; 
        victoryMessage = `¡Jugador ${winningPlayerNumber} ha ganado la escaramuza y recibe un bonus de ${goldBonus} de oro!`;
    }

    if (goldBonus > 0) {
        if (gameState.playerResources[winningPlayerNumber]) {
            gameState.playerResources[winningPlayerNumber].oro = (gameState.playerResources[winningPlayerNumber].oro || 0) + goldBonus;
        } else {
            console.warn(`[endTacticalBattle] No se encontraron recursos para el jugador ganador ${winningPlayerNumber}`);
        }
    }
    if (typeof logMessage === "function") {
        logMessage(victoryMessage);
    }

    // Actualización visual final
    if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') {
        UIManager.updateAllUIDisplays();
    }
    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function'){
        UIManager.hideContextualPanel();
    }

    const playerWon = (winningPlayerNumber === gameState.myPlayerNumber);

    // --- Captura de métricas ---
    const matchMetrics = {
        outcome: playerWon ? 'victoria' : 'derrota',
        turns: gameState.turnNumber,
        duration: 30, // Aquí podrías calcular la diferencia de tiempo real si quieres
        heroes: units.filter(u => u.player === gameState.myPlayerNumber && u.commander).map(u => u.commander),
        kills: (gameState.playerStats?.unitsDestroyed?.[`player${gameState.myPlayerNumber}`]) || 0
    };

    const xpGained = PlayerDataManager.calculateMatchXP(playerWon, matchMetrics.turns, matchMetrics.kills);
    
    // Guardar progreso
    const progress = await PlayerDataManager.syncMatchResult(xpGained, matchMetrics);

    // 🔴 MOSTRAR MODAL DE RESULTADOS (IMPORTANTE!)
    if (typeof UIManager !== 'undefined' && typeof UIManager.showPostMatchSummary === 'function') {
        console.log('[endTacticalBattle] 🔴 MOSTRANDO MODAL DE RESULTADOS');
        UIManager.showPostMatchSummary(playerWon, xpGained, progress, matchMetrics);
    } else {
        console.error('[endTacticalBattle] ❌ UIManager o showPostMatchSummary no disponible');
    }

    if (gameState.isCampaignBattle) {
        if (typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
            const playerHumanWon = (winningPlayerNumber === 1);
            logMessage("Preparando para volver al mapa de campaña...");
            setTimeout(() => {
                campaignManager.handleTacticalBattleResult(playerHumanWon, gameState.currentCampaignTerritoryId, { goldEarnedFromBattle: goldBonus });
            }, 2000);
        }
    }

    // --- XP Pase de Batalla ---
    if (gameState.myPlayerNumber && typeof BattlePassManager !== 'undefined') { 
        
        // PASO CLAVE: Asegurar que los datos del pase están cargados antes de sumar
        // Si no hacemos esto, userProgress es null y la XP se pierde.
        if (!BattlePassManager.userProgress) {
            // Nota: loadAllData es async, pero no podemos detener endTacticalBattle demasiado tiempo.
            // Usamos .then() para procesar la recompensa cuando los datos lleguen.
            BattlePassManager.loadAllData().then(() => {
                _processBattlePassRewards(playerWon);
            });
        } else {
            // Si ya están cargados, procesamos directo
            _processBattlePassRewards(playerWon);
        }
    }

    // --- GUARDADO UNIFICADO: Todas las partidas se guardan igual ---
    // El tipo de oponente (IA, jugador local, red) no afecta el sistema de guardado
    // Esto simplifica la lógica y garantiza consistencia
    
    // <<== CAPTURA DE FIN DE PARTIDA PARA REPLAY ==>>
    let replayData = null;
    if (typeof ReplayIntegration !== 'undefined') {
        replayData = await ReplayIntegration.finishGameRecording(winningPlayerNumber, gameState.turnNumber);
        
        // Mostrar notificación con link al replay
        if (replayData && typeof ChronicleIntegration !== 'undefined') {
            ChronicleIntegration.saveReplayLink(replayData.match_id, replayData);
            ChronicleIntegration.showReplayNotification(replayData.match_id);
        }
    }

    // <<== FINALIZAR ESTADÍSTICAS ==>>
    if (typeof StatTracker !== 'undefined') {
        const gameStats = StatTracker.finalize(gameState.winner);
        // La crónica se abrirá DESPUÉS que el usuario cierre el modal de resultados
        // (desde showPostMatchSummary en uiUpdates.js)
    }
    
    if (PlayerDataManager.currentPlayer && typeof saveGameUnified === 'function') {
        
        // El autosave toma un nombre genérico - UPSERT lo sobrescribe si existe
        // Así no se acumulan autosaves, solo se guarda el más reciente
        const autoSaveName = "AUTOSAVE_RECENT";
        
        saveGameUnified(autoSaveName, true)
            .then(success => {
                if (success) {
                } else {
                    console.warn("[GameFlow] Error al guardar partida en autosave unificado");
                }
            })
            .catch(err => console.error("[GameFlow] Excepción en autosave:", err));
    }
    
    // Sincronización con la nube al terminar
    if (PlayerDataManager.currentPlayer) {
        PlayerDataManager.saveCurrentPlayer();
    }

    if (playerWon && typeof BattlePassManager !== 'undefined') {
        BattlePassManager.updateProgress('match_win', 1);
    }
    // Independientemente del resultado
    BattlePassManager.updateProgress('turn_played', gameState.turnNumber);

}

// --- Nueva función auxiliar interna para no repetir código ---
function _processBattlePassRewards(isWinner) {
    // 1. Calcular XP
    const myPKey = `player${gameState.myPlayerNumber}`;
    const myKills = gameState.playerStats?.unitsDestroyed?.[myPKey] || 0;
    
    // Base: 100 si ganas, 30 si pierdes
    let battlePassXp = isWinner ? 100 : 30;
    // Bonus: +5 por kill
    battlePassXp += (myKills * 5);


    // 2. Sumar XP
    BattlePassManager.addMatchXp(battlePassXp).then(res => {
        if (res && res.success) {
            if (typeof showToast === 'function') {
                let msg = `⭐ Pase de Batalla: +${res.xpAdded} XP`;
                if (res.levelsGained > 0) {
                    msg += ` | ¡NIVEL ${res.currentLevel}! 🎉`;
                    // Sonido extra de celebración
                    if(typeof AudioManager !== 'undefined') AudioManager.playSound('structure_built');
                } else {
                    msg += ` | Nivel ${res.currentLevel}`;
                }
                showToast(msg, res.levelsGained > 0 ? "success" : "warning", 4000); 
            }
        } else {
            console.warn(`[BP] Error al aplicar XP:`, res?.error || 'Unknown');
        }
    }).catch(err => {
        console.error("[BP] Error en la promesa de addMatchXp:", err);
    });

    // 3. Actualizar Misiones
    if (isWinner) BattlePassManager.updateProgress('match_win', 1);
    BattlePassManager.updateProgress('turn_played', gameState.turnNumber || 1);
    if (myKills > 0) BattlePassManager.updateProgress('unit_kill', myKills);
}

/**
 * Inicia el turno de despliegue para un jugador de IA.
 * Es una función simple que llama al manager de despliegue.
 */
function simpleAiDeploymentTurn() {
    const aiPlayerNumber = gameState.currentPlayer;

    const useArchipelagoDeployment = gameState.gameMode === 'invasion' || !!gameState.setupTempSettings?.navalMap;

    if (useArchipelagoDeployment && typeof IAArchipielago !== 'undefined' && typeof IAArchipielago.deployUnitsAI === 'function') {
        IAArchipielago.deployUnitsAI(aiPlayerNumber);
        setTimeout(() => {
            const aiUnits = units.filter(u => u.player === aiPlayerNumber);
            if (gameState.currentPhase === 'deployment' && aiUnits.length === 0 && typeof IAArchipielago.crearUnidadInicialDeEmergencia === 'function') {
                console.warn(`[IA DEPLOY] Fallback critico: IA sin unidades. Creando emergencia para J${aiPlayerNumber}.`);
                IAArchipielago.crearUnidadInicialDeEmergencia(aiPlayerNumber);
            }
        }, 200);
        return;
    }

    // Fallback: Llama al manager de despliegue clásico.
    if (typeof AiDeploymentManager !== 'undefined' && AiDeploymentManager.deployUnitsAI) {
        AiDeploymentManager.deployUnitsAI(aiPlayerNumber);
        setTimeout(() => {
            const aiUnits = units.filter(u => u.player === aiPlayerNumber);
            if (gameState.currentPhase === 'deployment' && aiUnits.length === 0 && typeof IAArchipielago !== 'undefined' && typeof IAArchipielago.crearUnidadInicialDeEmergencia === 'function') {
                console.warn(`[IA DEPLOY] Fallback critico: IA sin unidades. Creando emergencia para J${aiPlayerNumber}.`);
                IAArchipielago.crearUnidadInicialDeEmergencia(aiPlayerNumber);
            }
        }, 200);
    } else {
        console.error("[simpleAiDeploymentTurn] AiDeploymentManager no está definido. Revisa que ai_deploymentLogic.js esté cargado.");
    }
    
}

function simpleAiTurn() {
    const aiPlayerIdString = `player${gameState.currentPlayer}`;
    const aiActualPlayerNumber = gameState.currentPlayer;
    const aiLevel = gameState.playerAiLevels?.[aiPlayerIdString] || 'normal';
    const aiPlayerType = gameState.playerTypes?.[aiPlayerIdString];

    // Verificación robusta: Solo procede si realmente es el turno de la IA.
    if (gameState.currentPhase !== 'play' || !aiPlayerType?.startsWith('ai_')) {
        console.warn(`[simpleAiTurn] Bloqueado | fase=${gameState.currentPhase} | jugador=${aiActualPlayerNumber} | tipo=${aiPlayerType || 'undefined'}`);
        return;
    }

    // Ahora busca AiGameplayManager en lugar de AiManager.
   /* if (typeof AiGameplayManager === 'undefined' || typeof AiGameplayManager.executeTurn !== 'function') {
        console.error("[simpleAiTurn] AiGameplayManager no está definido. Revisa que ai_gameplayLogic.js esté cargado. Forzando fin de turno.");
        logMessage("Error crítico: Módulo de IA de juego no disponible. Pasando turno.");
        // Como fallback de emergencia, aquí sí llamamos a handleEndTurn
        setTimeout(() => handleEndTurn(), 500);
        return;
    }
    */
   
    const useArchipelagoAI = gameState.gameMode === 'invasion' || !!gameState.setupTempSettings?.navalMap;
    if (useArchipelagoAI && typeof IAArchipielago !== 'undefined' && typeof IAArchipielago.ejecutarTurno === 'function') {
        logMessage(`IA (Jugador ${aiActualPlayerNumber}) inicia su turno en Archipiélago... (IAArchipielago)`);
        IAArchipielago.ejecutarTurno(aiActualPlayerNumber);
        return;
    }
    
    if (useArchipelagoAI) {
        console.warn(`[simpleAiTurn] Modo Archipiélago/Invasión detectado pero IAArchipielago NO disponible`);
        console.warn(`  - IAArchipielago definido: ${typeof IAArchipielago !== 'undefined'}`);
        console.warn(`  - Método ejecutarTurno disponible: ${typeof IAArchipielago?.ejecutarTurno === 'function'}`);
    }

    logMessage(`IA (Jugador ${aiActualPlayerNumber}, Nivel: ${aiLevel}) inicia su turno... (Usando AiGameplayManager)`);
    // Y aquí se llama al método del objeto correcto.
    AiGameplayManager.executeTurn(aiActualPlayerNumber, aiLevel);
}

function initializeTutorialState() {
    gameState.isTutorialActive = true;
    window.TUTORIAL_MODE_ACTIVE = true;
    gameState.tutorial = {
        attack_completed: false,
        flank_attack_completed: false,
        unitHasSplit: false,
        unitHasMerge: false,
        consolidation_completed: false,
        pillage_completed: false,
        unitReinforced: false,
        hero_assigned: false,
        techResearched: false,
        lastMovedUnitId: null,
        unit_in_ambush_position: false,
        unit_in_reinforce_position: false,
        turnEnded: false,
        enemyDefeated: false,
        unitHasMoved: false,
        menu_opened: false,
        menu_closed: false,
        force_attack_allowed: false,
        unit_selected_by_objective: false,
        hex_selected: false
    };
}

function startTutorial(steps) {
    if (!steps) {
        console.error("Error: startTutorial fue llamado sin pasos de tutorial.");
        return;
    }
    gameState.isTutorialActive = true;
    tutorialScenarioData = { tutorialSteps: steps }; // La clave es anidar los pasos aquí
    currentTutorialStepIndex = -1;
    
    // Lista completa y final de flags
    gameState.tutorial = {
        menu_opened: false, 
        menu_closed: false,
        lastMovedUnitId: null, 
        turnEnded: false,
        enemyDefeated: false,
        unit_in_ambush_position: false,
        unit_in_reinforce_position: false,
        
        // -- Capítulo 1 --
        // Paso 3-6: Gestionados por `domElements`, `placementMode` y `units.length`. No necesitan flag.
        
        // -- Capítulo 2 --
        attack_completed: false,         // Para el Paso 8: Se activa al iniciar un combate.
        flank_attack_completed: false,   // Para el Paso 11: Se activa al realizar un ataque de flanqueo.
        // Paso 12 (fin de turno): Gestionado por `gameState.turnNumber`. No necesita flag.

        // -- Capítulo 3 --
        unit_split: false,             // Para el Paso 14: Se activa al confirmar una división.
        unitHasMerge: false,            // Para el Paso 15: Se activa al confirmar una fusión.
        consolidation_completed: false,  // Para el Paso 16: Se activa al usar la acción de consolidar.
        
        // -- Capítulo 4 --
        pillage_completed: false,        // Para el Paso 23 (Saqueo).
        unitReinforced: false,           // Para el reforzamiento, aunque el guion actual lo quita, es bueno tenerlo.
                                        // Sí, en el 4.5. se necesita este flag!

        // -- Capítulo 5 --
        techResearched: false,           // Para el Paso 24 y 26 (Ingeniería y Fortificaciones).
        // Construcción se valida mirando el estado del `board`. No necesita flag.

        // -- Capítulo 6 --
        // La progresión de héroes se valida directamente mirando el `PlayerDataManager.currentPlayer`. No necesita flags aquí.
        hero_assigned: false,            // Para el Paso 36 (confirmar asignación).
        
        // --- Flags Auxiliares que ya usamos ---
        unitHasMoved: false              // Mecanismo genérico para validar el movimiento en varios pasos.
    };



    moveToNextTutorialStep();
}

function moveToNextTutorialStep() {
    // Limpiar cualquier resaltado anterior del tutorial antes de mostrar el siguiente paso
    if (typeof UIManager !== 'undefined' && UIManager.clearTutorialHighlights) {
        UIManager.clearTutorialHighlights();
    }

    currentTutorialStepIndex++;
    const steps = tutorialScenarioData.tutorialSteps;

    if (currentTutorialStepIndex < steps.length) {
        const currentStep = steps[currentTutorialStepIndex];

        // Reiniciar la variable de la última unidad movida para la validación del siguiente paso.
        if (gameState.tutorial) gameState.tutorial.lastMovedUnitId = null;

        // Ejecutar cualquier acción que deba ocurrir al inicio de este paso (ej. generar una unidad enemiga)
        if (currentStep.action && typeof currentStep.action === 'function') {
            currentStep.action(gameState); 
        }
        
        // Mostrar el mensaje del paso actual
        if (typeof UIManager !== 'undefined' && UIManager.showTutorialMessage) { 
            UIManager.showTutorialMessage(currentStep.message, currentStep.id === "final_step");
        } else {
            logMessage(`Tutorial: ${currentStep.message}`);
        }

        // Configurar la fase del juego según el paso
        if (currentStep.type === "deployment") {
            gameState.currentPhase = "deployment";
            gameState.currentPlayer = 1; 
            if (typeof UIManager !== 'undefined' && UIManager.updateActionButtonsBasedOnPhase) UIManager.updateActionButtonsBasedOnPhase();
        } else if (currentStep.type === "play") {
            gameState.currentPhase = "play";
            gameState.currentPlayer = 1;
            gameState.turnNumber = (gameState.turnNumber || 0) + 1; 
            if (typeof UIManager !== 'undefined' && UIManager.updateActionButtonsBasedOnPhase) UIManager.updateActionButtonsBasedOnPhase();
        }

        // Si es el último paso, modificar el botón de fin de turno.
        if (currentStep.id === "final_step") {
            if (typeof UIManager !== 'undefined' && UIManager.setEndTurnButtonToFinalizeTutorial) {
                UIManager.setEndTurnButtonToFinalizeTutorial(finalizeTutorial); 
            }
        } else {
            // Para todos los demás pasos, asegurarse de que el botón de fin de turno es el normal.
            if (typeof UIManager !== 'undefined' && UIManager.restoreEndTurnButton) {
                UIManager.restoreEndTurnButton();
            }
        }

        // --- ¡CORRECCIÓN CLAVE AQUÍ: Resaltar elementos para el paso actual! ---
        if (typeof UIManager !== 'undefined' && UIManager.highlightTutorialElement) {
            const elementToHighlightId = currentStep.highlightUI;
            const hexesToHighlight = currentStep.highlightHexCoords;
            UIManager.highlightTutorialElement(elementToHighlightId, hexesToHighlight);
        }
        // --- FIN CORRECCIÓN ---

        // Actualizar la UI
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }

        // Habilitar el botón de fin de turno al inicio de cada paso (luego handleEndTurn lo puede deshabilitar si no se cumple el paso)
        if (typeof UIManager !== 'undefined' && UIManager.setEndTurnButtonEnabled) {
            UIManager.setEndTurnButtonEnabled(true);
        }

    } else {
        // Todos los pasos completados, finalizar el tutorial.
        finalizeTutorial();
    }
}

function updateTerritoryMetrics(playerEndingTurn) {

    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            const hex = board[r][c];
            if (!hex) continue; // Ignorar hexágonos inválidos

            const unitOnHex = getUnitOnHex(r, c);

            const bankPlayerId = typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : null;
            const isBankUnit = unitOnHex && unitOnHex.player === bankPlayerId;

            // --- LÓGICA DE OCUPACIÓN ENEMIGA ---
            // Si hay una unidad, y NO es del dueño del hexágono.
            if (unitOnHex && !isBankUnit && hex.owner !== null && unitOnHex.player !== hex.owner) {
                const originalOwner = hex.owner;
                
                // Si la estabilidad es suficiente (umbral de 3), se reduce la nacionalidad.
                if (hex.estabilidad >= 3) {
                    if (hex.nacionalidad[originalOwner] > 0) {
                        hex.nacionalidad[originalOwner]--;
                        //console.log(`Hex (${r},${c}): Estabilidad es ${hex.estabilidad}. Baja nación de J${originalOwner} a ${hex.nacionalidad[originalOwner]}`);

                        // Si la nacionalidad llega a 0, se produce la conquista.
                        if (hex.nacionalidad[originalOwner] === 0) {
                            hex.owner = unitOnHex.player;
                            hex.nacionalidad[unitOnHex.player] = 1;

                            // Sincronizar ciudad si aplica (evita desajustes en comercio)
                            if (hex.isCity) {
                                const cityEntry = gameState.cities?.find(ci => ci.r === r && ci.c === c);
                                const cityName = hex.cityName || cityEntry?.name || hex.structure || `Ciudad (${r},${c})`;
                                if (cityEntry) {
                                    cityEntry.owner = unitOnHex.player;
                                    if (cityName) cityEntry.name = cityName;
                                } else if (gameState.cities) {
                                    gameState.cities.push({ r, c, owner: unitOnHex.player, name: cityName, isCapital: false });
                                }
                            }

                            // La estabilidad NO se resetea.
                            renderSingleHexVisuals(r, c);
                        }
                    }
                } else {
                }
            }

            // --- LÓGICA DE EVOLUCIÓN PASIVA (Solo para el dueño del hexágono) ---
            // Esta parte solo se ejecuta para los hexágonos del jugador cuyo turno está terminando.
            if (hex.owner === playerEndingTurn) {
                // 1. AUMENTO DE ESTABILIDAD
                let stabilityGained = 0;
                if (hex.estabilidad < MAX_STABILITY) {
                    stabilityGained = 1; // Ganancia base
                    if (unitOnHex) { // Bonus por presencia militar (amiga o enemiga)
                        stabilityGained++;
                    }
                }
                
                if (stabilityGained > 0) {
                    hex.estabilidad = Math.min(MAX_STABILITY, hex.estabilidad + stabilityGained);
                     //console.log(`Hex (${r},${c}): Gana ${stabilityGained} Estabilidad -> ahora es ${hex.estabilidad}`);
                }

                // 2. AUMENTO DE NACIONALIDAD (si la estabilidad es suficiente)
                if (hex.estabilidad >= 3) {
                    if (hex.nacionalidad[hex.owner] < MAX_NACIONALIDAD) {
                        hex.nacionalidad[hex.owner]++;
                        //console.log(`Hex (${r},${c}): Estabilidad es ${hex.estabilidad}. Sube nación de J${hex.owner} a ${hex.nacionalidad[hex.owner]}`);
                    }
                }
            }
        }
    }
}

function calculateTradeIncome(playerNum) {
    // --- CAMBIO 1: Verificación de seguridad inicial ---
    // Nos aseguramos de que existen las ciudades y el tablero antes de empezar.
    if (!gameState.cities || !board) {
        return 0;
    }

    const playerCities = gameState.cities.filter(c => c.owner === playerNum);
    if (playerCities.length < 2) {
        return 0; // No hay comercio posible con menos de 2 ciudades.
    }

    const tradeRoutes = new Set();

    for (let i = 0; i < playerCities.length; i++) {
        const startCity = playerCities[i];

        // --- CAMBIO 2: Más verificaciones de seguridad ---
        // Si la ciudad de inicio no tiene coordenadas válidas, la saltamos.
        // Esto previene el error 'getHexNeighbors fue llamado con coordenadas inválidas'.
        if (typeof startCity.r !== 'number' || typeof startCity.c !== 'number') {
            console.warn(`La ciudad ${startCity.name} no tiene coordenadas válidas y no puede generar rutas comerciales.`);
            continue; // Pasa a la siguiente ciudad del bucle.
        }

        // --- CAMBIO 3: La línea que faltaba y causaba el "queue is not defined" ---
        // ¡Se define la variable `queue` antes de usarla!
        const queue = [{ r: startCity.r, c: startCity.c, path: [] }];
        const visited = new Set([`${startCity.r},${startCity.c}`]);
        // --- FIN DEL CAMBIO 3 ---

        while (queue.length > 0) {
            const current = queue.shift();
            
            // Verificación si el hex actual es otra ciudad válida del jugador.
            const targetCity = playerCities.find(c =>
                c.r === current.r && c.c === current.c && c.name !== startCity.name
            );
            
            if (targetCity) {
                const routeKey = [startCity.name, targetCity.name].sort().join('-');
                tradeRoutes.add(routeKey);
                // No continuamos la búsqueda desde aquí para no encontrar la misma ruta múltiples veces.
            }
            
            // Explorar vecinos
            const neighbors = getHexNeighbors(current.r, current.c);
            for (const neighbor of neighbors) {
                const key = `${neighbor.r},${neighbor.c}`;
                const neighborHex = board[neighbor.r]?.[neighbor.c];
                
                // Condición de paso: el hexágono vecino es del jugador Y tiene una infraestructura.
                if (neighborHex && neighborHex.owner === playerNum && neighborHex.structure && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ r: neighbor.r, c: neighbor.c, path: [...current.path, key] });
                }
            }
        }
    }
    
    // Cálculo de ingreso final (se mantiene igual, pero lo incluyo para que sea un bloque completo)
    let tradeIncome = 0;
    const playerTradeCities = gameState.cities.filter(c => c.owner === playerNum && STRUCTURE_TYPES[c.structure]?.tradeValue > 0);
    
    tradeRoutes.forEach(routeKey => {
        const [city1Name, city2Name] = routeKey.split('-');
        const city1 = playerTradeCities.find(c => c.name === city1Name);
        const city2 = playerTradeCities.find(c => c.name === city2Name);
        
        if (city1 && city2) {
            const city1TradeValue = STRUCTURE_TYPES[city1.structure]?.tradeValue || 0;
            const city2TradeValue = STRUCTURE_TYPES[city2.structure]?.tradeValue || 0;
            
            const routeValue = Math.min(city1TradeValue, city2TradeValue);
            tradeIncome += routeValue * (TRADE_INCOME_PER_ROUTE || 50); // Usa valor por defecto si no existe
        }
    });

    if (tradeIncome > 0) {
        logMessage(`Rutas comerciales activas: ${tradeRoutes.size}. Ingreso por comercio: ${tradeIncome} oro.`);
    }

    return tradeIncome;
}

/**
 * Busca y selecciona la siguiente unidad del jugador actual que no ha movido ni atacado.
 * El ciclo de búsqueda empieza desde la última unidad seleccionada o desde el principio.
 */
function selectNextIdleUnit() {
    const idleUnits = units.filter(u => 
        u.player === gameState.currentPlayer && 
        u.currentHealth > 0 && 
        !u.hasMoved && 
        !u.hasAttacked
    );

    if (idleUnits.length === 0) {
        logMessage("Todas las unidades han actuado este turno.");
        return;
    }

    let nextUnitToSelect = null;
    if (selectedUnit) {
        const currentIndex = idleUnits.findIndex(u => u.id === selectedUnit.id);
        // Si la unidad seleccionada está en la lista de inactivas, busca la siguiente
        if (currentIndex !== -1) {
            nextUnitToSelect = idleUnits[(currentIndex + 1) % idleUnits.length];
        }
    }
    
    // Si no había unidad seleccionada o la seleccionada ya había actuado, elige la primera de la lista
    if (!nextUnitToSelect) {
        nextUnitToSelect = idleUnits[0];
    }

    // Selecciona la unidad y centra la vista (necesitaremos una función para centrar)
    if (nextUnitToSelect) {
        // 1. Forzar el cierre de cualquier modal abierto (Reforzar, Construir, etc.) EXCEPTO ledgerModal y legacyModal
        document.querySelectorAll('.modal:not(#ledgerModal):not(#legacyModal)').forEach(m => m.style.display = 'none');
        
        // 2. Si el panel contextual está oculto por el botón ▲, lo preparamos para que se vea
        const reopenBtn = document.getElementById('reopenContextualPanelBtn');
        if (reopenBtn) reopenBtn.style.display = 'none';

        // 3. Seleccionamos la unidad
        selectUnit(nextUnitToSelect);

        // 4. Centramos la cámara (con un pequeño retraso para evitar tirones de la UI)
        setTimeout(() => {
            if (typeof centerMapOn === 'function') {
                centerMapOn(nextUnitToSelect.r, nextUnitToSelect.c);
            }
        }, 50);
    }
}

/**
 * Solicita cambiar la capital del jugador a una ciudad seleccionada.
 * Valida la ciudad y maneja la lógica local o de red.
 * @param {number} r - Fila de la ciudad objetivo.
 * @param {number} c - Columna de la ciudad objetivo.
 * @returns {boolean} True si la acción fue procesada o enviada, false si falló.
 */
function requestChangeCapital(r, c) {
    // --- VALIDACIONES ---
    if (!board || !gameState || !gameState.playerResources || typeof hexDistance === 'undefined') {
        logMessage("Error: Estado del juego o módulos requeridos no disponibles.", "error");
        return false;
    }
    const hexData = board[r]?.[c];
    const currentPlayer = gameState.currentPlayer;
    const playerRes = gameState.playerResources[currentPlayer];
    
    if (!hexData) { logMessage("Hexágono inválido."); return false; }
    if (hexData.owner !== currentPlayer) { logMessage("Solo puedes establecer tu capital en ciudades propias."); return false; }
    const isEligibleCity = hexData.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexData.structure);
    if (!isEligibleCity) { logMessage("Solo Aldeas, Ciudades o Metrópolis pueden ser capitales."); return false; }
    // Aquí se necesita una forma de determinar si la ciudad es "Avanzada" (Aldea+)
    // Asumamos que si no tiene estructura ('Aldea' base) y NO es la capital actual, es válida.
    // Si tiene estructura, verificamos que sea Aldea, Ciudad, o Metrópoli.
    const structureHierarchy = ["Aldea", "Ciudad", "Metrópoli"]; // Necesitarías definir esto bien
    const isAdvancedCity = hexData.isCapital || 
                           (hexData.structure && structureHierarchy.includes(hexData.structure)) ||
                           (!hexData.structure && hexData.isCity); // O que sea simplemente una ciudad válida

    if (!isAdvancedCity) {
        logMessage("Solo se puede establecer capitales en Aldeas o superiores.");
        return false;
    }
    if (hexData.isCapital) {
        logMessage("Esta ciudad ya es tu capital.");
        return false;
    }
    // --- FIN DE VALIDACIONES ---

    // --- ACCIÓN DE RED (si aplica) ---
    if (isNetworkGame()) { // Asumiendo que isNetworkGame() es una función útil de networkManager.js
        const action = {
            type: 'changeCapital',
            payload: {
                playerId: currentPlayer,
                cityR: r,
                cityC: c
            }
        };
        // Enviar la acción a través del NetworkManager
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action); // Anfitrión procesa localmente y retransmite
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action }); // Cliente pide
        }
    } else {
        // --- ACCIÓN LOCAL ---
        handleChangeCapital(r, c);
    }
    
    // Devuelve true para indicar que la acción se ha iniciado
    return true;
}

/**
 * Ejecuta el cambio de capital en el estado del juego y actualiza la UI.
 * Esta es la función que modifica directamente el estado global.
 * @param {number} r - Fila de la nueva capital.
 * @param {number} c - Columna de la nueva capital.
 * @returns {boolean} True si el cambio fue exitoso.
 */
function handleChangeCapital(r, c) {
    const currentPlayer = gameState.currentPlayer;

    // --- 1. ENCONTRAR Y DESMARCAR LA CAPITAL ANTIGUA ---
    let oldCapitalData = null;
    
    // Buscar la capital antigua directamente en el array gameState.cities
    const oldCapitalEntryInGameState = gameState.cities.find(city => city.owner === currentPlayer && city.isCapital);

    if (oldCapitalEntryInGameState) {
        // Obtenemos sus coordenadas
        const oldR = oldCapitalEntryInGameState.r;
        const oldC = oldCapitalEntryInGameState.c;
        oldCapitalData = board[oldR]?.[oldC];
        
        // Desmarcar en gameState.cities Y en el board
        oldCapitalEntryInGameState.isCapital = false;
        if (oldCapitalData) {
            oldCapitalData.isCapital = false;
        }
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(oldR, oldC);
    }
    // Si no la encontramos en gameState.cities, como fallback, la buscamos en el tablero (tu código anterior).
    else {
        for (let row of board) {
            for (const hex of row) {
                if (hex && hex.owner === currentPlayer && hex.isCapital) {
                    oldCapitalData = hex;
                    oldCapitalData.isCapital = false;
                    if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(hex.r, hex.c);
                    break;
                }
            }
            if (oldCapitalData) break;
        }
    }


    // --- 2. MARCAR LA NUEVA CAPITAL ---
    const targetHexData = board[r]?.[c];
    if (!targetHexData || targetHexData.owner !== currentPlayer) {
        logMessage(`Error: No se puede establecer la capital en (${r},${c}).`, "error");
        return false;
    }

    targetHexData.isCapital = true;
    
    let targetCityEntry = gameState.cities.find(city => city.r === r && city.c === c);
    
    if (targetCityEntry) {
        targetCityEntry.isCapital = true;
    } else {
        // Si no existe, es una Aldea/Ciudad/Metrópoli que no estaba en la lista, la añadimos.
        gameState.cities.push({
            r: r, c: c, owner: currentPlayer,
            name: targetHexData.structure || 'Nueva Ciudad',
            isCapital: true 
        });
    }

    if (gameState.capitalCityId) {
        gameState.capitalCityId[currentPlayer] = { r: r, c: c };
    }

    logMessage(`Capital establecida en (${r},${c}) para el Jugador ${currentPlayer}.`);

    // --- 3. ACTUALIZAR LA UI ---
    if (typeof renderSingleHexVisuals === 'function') renderSingleHexVisuals(r, c);
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
        UIManager.updateAllUIDisplays();
    }

    return true;
}

let handleEndTurnCallCount = 0; // Se pondría fuera de la función

async function handleEndTurn(isHostProcessing = false) {
    try {
    
    // ESCUDO: Si por algún motivo el cajón no existe, lo creamos ahora mismo
    if (!gameState.matchSnapshots) gameState.matchSnapshots = [];

    // Audio
    if (typeof AudioManager !== 'undefined') {
        AudioManager.playSound('turn_start');
    }
    
    // --- LÓGICA DE EJECUCIÓN DEL CAMBIO DE TURNO ---
    if (typeof deselectUnit === "function") deselectUnit();
    
    if (gameState.currentPhase === "gameOver") {
        logMessage("La partida ya ha terminado.");
        return;
    }

    gameState.lastActionTimestamp = Date.now();
    
    // Al inicio del proceso de cambio de turno, detenemos cualquier temporizador activo.
    TurnTimerManager.stop();

    // Validar turno en red (solo si no es procesamiento forzado por host)
    if (isNetworkGame() && !isHostProcessing) {
        if (gameState.currentPlayer !== gameState.myPlayerNumber) {
            logMessage("No es tu turno.");
            return;
        }
    }

    const playerEndingTurn = gameState.currentPlayer;

    // --- CASO 1: MODO TUTORIAL (Lógica especial simplificada) ---
    if (gameState.isTutorialActive) {
        console.log("[handleEndTurn] MODO TUTORIAL DETECTADO. Flujo de turno especial activado.");

        // 1. Ejecutar las tareas de mantenimiento del jugador
        updateTerritoryMetrics(playerEndingTurn);
        collectPlayerResources(playerEndingTurn);
        handleUnitUpkeep(playerEndingTurn);
        handleHealingPhase(playerEndingTurn);
        const tradeGold = calculateTradeIncome(playerEndingTurn);
        if (tradeGold > 0) gameState.playerResources[playerEndingTurn].oro += tradeGold;
        
        // 2. SALTAR EL TURNO DE LA IA COMPLETAMENTE
        gameState.currentPlayer = 1;
        gameState.turnNumber++;

        // <<== REGISTRAR ESTADÍSTICAS DEL TURNO ==>>
        if (typeof StatTracker !== 'undefined') {
            StatTracker.recordTurnStats(gameState.turnNumber, playerEndingTurn);
        }

        logMessage(`Comienza el turno del Jugador ${gameState.currentPlayer} (Turno ${gameState.turnNumber}).`);
        
        // 3. Preparar al jugador para su nuevo turno (¡CLAVE! Reseteo antes de avisar)
        resetUnitsForNewTurn(gameState.currentPlayer);
        
        // Avisa al tutorial de que el turno terminó
        TutorialManager.notifyActionCompleted('turnEnded');

        // Actualizamos TODA la UI INMEDIATAMENTE después de cambiar de jugador
        if (UIManager) UIManager.updateAllUIDisplays(); 

        // El siguiente jugador es una IA?
        if (gameState.playerTypes[`player${gameState.currentPlayer}`].includes('ai')) {
            
            // Mostramos un bloqueador TEMPORAL para que el jugador sepa que la IA está jugando
            const turnBlocker1 = document.getElementById('turnBlocker');
            if (turnBlocker1) {
                turnBlocker1.textContent = `Turno de la IA (Jugador ${gameState.currentPlayer})...`;
                turnBlocker1.style.display = 'flex';
            }
            setTimeout(() => {
                executeAiTurn();
                const turnBlocker2 = document.getElementById('turnBlocker');
                if (turnBlocker2) turnBlocker2.style.display = 'none';
            }, 500);
        }
        
        // El resto de la lógica de preparación (moral, experiencia, comida)
        if (gameState.currentPlayer === 1) {
             units.forEach(unit => { if (unit.player === 1) unit.experience++; });
             gameState.playerResources[1].researchPoints += BASE_INCOME.RESEARCH_POINTS_PER_TURN;
        }
        if (UIManager) UIManager.updateAllUIDisplays();

        // --- AL FINAL DE LA FUNCIÓN, DENTRO DEL IF (no en game over) ---
        if (gameState.currentPhase !== "gameOver") {
            // Solo guardamos si estamos en una partida en red
            if (typeof NetworkManager !== 'undefined' && NetworkManager.miId) {
                // Cualquiera puede guardar, pero idealmente el que acaba de terminar el turno
                NetworkManager.guardarPartidaEnNube();
            }
        }

        return; // Detenemos aquí para el tutorial
    }

    // --- CASO 2: PARTIDA NORMAL (Local o Red) ---

    // =========================================================
    // === INTEGRACIÓN CON SISTEMA DE RAIDS ===
    // =========================================================
    if (gameState.isRaid && typeof RaidManager !== 'undefined' && RaidManager.currentRaid) {
        console.log("[handleEndTurn] Procesando turno en modo Raid...");
        
        // 1. Actualizar movimiento de la caravana basado en tiempo transcurrido
        await RaidManager.calculateCaravanPath(RaidManager.currentRaid.stage_data);
        
        // 2. Verificar si la caravana llegó al final
        if (RaidManager.currentRaid.stage_data.caravan_pos.c >= 24) {
            alert("¡DERROTA! La Caravana Imperial ha escapado.");
            // Volver al HQ
            if (RaidManager.allianceId) {
                await RaidManager.openRaidWindow(RaidManager.allianceId);
            }
            return;
        }
        
        // 3. Guardar estado de mi unidad en la DB
        const myUnit = units.find(u => u.player === 1);
        if (myUnit) {
            await RaidManager.saveMyUnitToDB(myUnit);
        }
        
        console.log("[handleEndTurn] Turno de Raid procesado");
    }

    // =========================================================
    // === FASE A: MANTENIMIENTO DEL JUGADOR QUE TERMINA ===
    // =========================================================
    if (gameState.currentPhase === "play") {
        updateTerritoryMetrics(playerEndingTurn);
        collectPlayerResources(playerEndingTurn); 
        handleUnitUpkeep(playerEndingTurn);
        handleHealingPhase(playerEndingTurn);
        updateTradeRoutes(playerEndingTurn);
        const tradeGold = calculateTradeIncome(playerEndingTurn);
        if (tradeGold > 0) gameState.playerResources[playerEndingTurn].oro += tradeGold;
    }

    // =========================================================
    // === FASE B: CAMBIO DE JUGADOR Y RONDA ===
    // =========================================================
    
    if (gameState.currentPhase === "deployment") {
        // Lógica de despliegue
        if (playerEndingTurn < gameState.numPlayers) {
            gameState.currentPlayer++;
            
            // 1. Aseguramos que el objeto contador existe
            if (!gameState.unitsPlacedByPlayer) gameState.unitsPlacedByPlayer = {};

            // 2. Inicializamos explícitamente a 0 el contador del NUEVO jugador
            gameState.unitsPlacedByPlayer[gameState.currentPlayer] = 0; // Resetear contador para el siguiente
            logMessage(`Despliegue: Turno del Jugador ${gameState.currentPlayer}.`);
        } else {
            // Si es el último jugador, termina la fase de despliegue y empieza el juego
            gameState.currentPhase = "play";
            gameState.currentPlayer = 1; 
            gameState.turnNumber = 1;
            
            // 🎬 INICIAR SISTEMA DE REPLAY
            if (typeof ReplayEngine !== 'undefined' && ReplayEngine.initialize) {
                const boardCopy = board.map(row => [...row]);
                const unitsCopy = units.map(u => ({...u}));
                ReplayEngine.initialize(gameState, boardCopy, unitsCopy);
            }
            
            // ⭐ NUEVO: Capturar snapshot de deployment al finalizar la fase
            if (typeof ReplayIntegration !== 'undefined' && ReplayIntegration.recordDeploymentPhaseEnd) {
                ReplayIntegration.recordDeploymentPhaseEnd();
            }
            
            // Importante: Resetear unidades para el combate
            resetUnitsForNewTurn(1); 
            
            logMessage("¡Comienza la Batalla! Turno del Jugador 1.");
        }
    } else {
        // Lógica de juego normal (ciclado de jugadores)
        let nextPlayer = playerEndingTurn;
        let foundValidPlayer = false;
        let attempts = 0;

        // Bucle para encontrar el siguiente jugador VÁLIDO.
        do {
            // 1. Avanza al siguiente jugador en el ciclo.
            nextPlayer = (nextPlayer % gameState.numPlayers) + 1;
            
            // 2. Si volvemos al jugador 1, es una nueva ronda. (Se comprueba solo al principio del ciclo)
            if (nextPlayer === 1 && attempts === 0) { 
                gameState.turnNumber++;
                
                // <<== REGISTRAR ESTADÍSTICAS DEL TURNO ==>>
                if (typeof StatTracker !== 'undefined') {
                    StatTracker.recordTurnStats(gameState.turnNumber, playerEndingTurn);
                }
                
                // Snapshot de poder para gráficas
                const p1Power = units.filter(u => u.player === 1).reduce((sum, u) => sum + u.currentHealth, 0);
                const p2Power = units.filter(u => u.player === 2).reduce((sum, u) => sum + u.currentHealth, 0);
                gameState.matchSnapshots.push({ 
                    turn: gameState.turnNumber, p1: p1Power, p2: p2Power 
                });

                if (typeof Chronicle !== 'undefined') Chronicle.logEvent('turn_start');
                
                // Justo aquí, cuando una ronda completa ha terminado, ejecutamos el turno de La Banca.
                if (typeof BankManager !== 'undefined' && BankManager.executeTurn) BankManager.executeTurn();
                // --- calculamos los puntos de victoria ---
                calculateVictoryPoints();
            }
            attempts++;

            // 3. Comprobamos si el jugador candidato NO está eliminado.
            if (!gameState.eliminatedPlayers.includes(nextPlayer)) {
                foundValidPlayer = true;
            }

        // 4. Repetimos si no hemos encontrado un jugador válido y no hemos dado ya la vuelta.
        } while (!foundValidPlayer && attempts < gameState.numPlayers * 2);

        // 5. Asignamos el jugador encontrado.
        if (foundValidPlayer) {
            gameState.currentPlayer = nextPlayer;
        } else {
            gameState.currentPhase = "gameOver"; 
        }
    }

    // =========================================================
    // === FASE C: PREPARACIÓN DEL NUEVO TURNO ===
    // =========================================================
    
    logMessage(`Comienza el turno del Jugador ${gameState.currentPlayer}.`);
    
    // Tareas de preparación para el jugador que EMPIEZA
    resetUnitsForNewTurn(gameState.currentPlayer);
    handleBrokenUnits(gameState.currentPlayer);

    // Ingresos pasivos (XP, Investigación)
    units.forEach(unit => {
        if (unit.player === gameState.currentPlayer && unit.currentHealth > 0) {
            unit.experience = Math.min(unit.maxExperience || 500, (unit.experience || 0) + 1);
            if (typeof checkAndApplyLevelUp === "function") checkAndApplyLevelUp(unit);
        }
    });

    if (gameState.playerResources[gameState.currentPlayer]) {
        const baseResearchIncome = BASE_INCOME.RESEARCH_POINTS_PER_TURN || 5;
        gameState.playerResources[gameState.currentPlayer].researchPoints = (gameState.playerResources[gameState.currentPlayer].researchPoints || 0) + baseResearchIncome;
    }
    
    // Atrición por comida (si aplica)
    const playerRes = gameState.playerResources[gameState.currentPlayer];
    if (playerRes) {
         // Lógica de consumo de comida
        let foodActuallyConsumed = 0;
        let unitsSufferingAttrition = 0;
        let unitsDestroyedByAttrition = [];
        units.filter(u => u.player === gameState.currentPlayer && u.currentHealth > 0).forEach(unit => {
            let unitConsumption = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.foodConsumption || 0), 0);
            if (isHexSupplied(unit.r, unit.c, unit.player) && playerRes.comida >= unitConsumption) {
                playerRes.comida -= unitConsumption;
                foodActuallyConsumed += unitConsumption;
            } else {
                const damage = ATTRITION_DAMAGE_PER_TURN || 1;

                    // --- INICIO DE LA SOLUCIÓN ---
                    // 1. Buscamos el primer regimiento que todavía tenga salud para dañarlo.
                const regimentToDamage = unit.regiments.find(reg => reg.health > 0);

                // 2. Si encontramos un regimiento, le aplicamos el daño.
                if (regimentToDamage) regimentToDamage.health = Math.max(0, regimentToDamage.health - damage);
                // 3. Recalculamos la salud total de la división a partir de la suma de sus regimientos.
                    
                recalculateUnitHealth(unit); 
                unitsSufferingAttrition++;
                logMessage(`¡${unit.name} sufre atrición!`);

                    if (unit.currentHealth <= 0) {
                        unitsDestroyedByAttrition.push(unit.id);
                    } else if (UIManager) {
                        UIManager.updateUnitStrengthDisplay(unit);
                    }
            }
        });
        unitsDestroyedByAttrition.forEach(unitId => { 
            const unit = getUnitById(unitId); 
            if (unit) handleUnitDestroyed(unit, null); 
        });
            if (foodActuallyConsumed > 0 || unitsSufferingAttrition > 0) logMessage(`Comida consumida: ${foodActuallyConsumed}.`);
            if (playerRes.comida < 0) playerRes.comida = 0;
    }

    // =========================================================
    // === FASE D: GUARDADO Y ACTUALIZACIÓN FINAL ===
    // =========================================================

    // 1. GUARDADO EN NUBE (Si tenemos un ID de partida activo)
    if (typeof NetworkManager !== 'undefined' && NetworkManager.miId) {
        await NetworkManager.subirTurnoANube(); 
    }

    // 2. ACTUALIZACIÓN UI LOCAL
    if (UIManager) {
        UIManager.updateAllUIDisplays();
        UIManager.updateTurnIndicatorAndBlocker();
    }

     // 3. GESTIÓN DEL SIGUIENTE TURNO (IA vs HUMANO vs RELOJ)
    const isNextPlayerAI = gameState.playerTypes[`player${gameState.currentPlayer}`]?.startsWith('ai_');
    
    const isNetworkMatch = (typeof NetworkManager !== 'undefined' && NetworkManager.miId);

    // --- AUTOSAVE AUTOMÁTICO: Cada turno para partidas locales y en red ---
    if (typeof saveGameUnified === 'function' && gameState.currentPhase !== "gameOver") {
        // Partidas locales: Guardar cada turno
        if (!isNetworkMatch) {
            saveGameUnified("AUTOSAVE_RECENT", true)
                .catch(err => console.warn("[AutoSave] Error (local):", err));
        }
        // Partidas en red: Guardar cada 5 turnos
        else if (gameState.turnNumber % 5 === 0) {
            saveGameUnified(`AUTOSAVE_TURN_${gameState.turnNumber}`, true)
                .catch(err => console.warn("[AutoSave] Error (red):", err));
        }
    }

    // --- AUTOSAVE CRÍTICO AL FINAL DE LA PARTIDA ---
    if (gameState.currentPhase === "gameOver" && typeof saveGameUnified === 'function') {
        const gameName = `Partida Completada ${new Date().toLocaleDateString('es-ES')}`;
        saveGameUnified(gameName, false)
            .then(() => {
                // Mostrar opción de replay
                if (typeof GameHistoryManager !== 'undefined' && GameHistoryManager.open) {
                    setTimeout(() => {
                        if (confirm("¿Deseas ver el replay de la partida?")) {
                            GameHistoryManager.open();
                        }
                    }, 1000);
                }
            })
            .catch(err => console.warn("[AutoSave] Error al guardar fin de partida:", err));
    }
    
    if (isNextPlayerAI && gameState.currentPhase !== "gameOver") {
        // --- TURNO DE IA ---
        if (checkVictory && checkVictory()) return;
        
        const turnBlocker = document.getElementById('turnBlocker');
        if (turnBlocker) {
            turnBlocker.textContent = `Turno de la IA (Jugador ${gameState.currentPlayer})...`;
            turnBlocker.style.display = 'flex';
        }
        setTimeout(async () => {
            const playerNumberForAI = gameState.currentPlayer;
            if (gameState.currentPhase === 'deployment') await simpleAiDeploymentTurn(playerNumberForAI);
            else await simpleAiTurn(playerNumberForAI); 
        }, 700);

    } else {
        // --- TURNO HUMANO (CON RELOJ) ---
            if (gameState.currentPhase !== "gameOver") {
                // Asegúrate de leer la variable del gameState
                const duration = gameState.turnDurationSeconds;
                
                // Validación estricta para evitar NaN o errores
                if (duration && duration !== Infinity && typeof duration === 'number') {
                    if(typeof TurnTimerManager !== 'undefined') TurnTimerManager.start(duration);
                } else {
                    // Si es infinito, aseguramos que se pare cualquier reloj previo
                    if(typeof TurnTimerManager !== 'undefined') TurnTimerManager.stop(); 
                }
            }
            
            // <<== CAPTURA DE EVENTO DE FIN DE TURNO PARA REPLAY ==>>
            if (typeof ReplayIntegration !== 'undefined' && gameState.currentPhase === 'play') {
                ReplayIntegration.recordTurnEnd(gameState.turnNumber, gameState.currentPlayer);
            }
            
            if (typeof checkVictory === 'function') checkVictory();
        }
    
    } catch (err) {
        console.error("[handleEndTurn] ERROR CRÍTICO DURANTE CAMBIO DE TURNO:", err);
        console.error("[handleEndTurn] Stack:", err.stack);
        logMessage(`⚠️ ERROR durante el cambio de turno: ${err.message}`, "error");
    }
}


/**
 * Motor de Logística v2.2: Recolecta en tierra/mar, llegada por adyacencia y reinicio fluido.
 */
function updateTradeRoutes(playerNum) {
    const tradeUnits = units.filter(u => u.player === playerNum && u.tradeRoute);
    if (tradeUnits.length === 0) return;

    tradeUnits.forEach(unit => {
        const route = unit.tradeRoute;
        
        // Validación inicial
        if (!route || !route.path || route.path.length === 0) {
            delete unit.tradeRoute;
            return;
        }

        let movesLeft = unit.movement;
        
        // Validación de seguridad: Si unit.movement no está definido, usar valor por defecto
        if (typeof movesLeft !== 'number' || movesLeft <= 0) {
            // Calcular movement del regimiento más rápido
            const maxRegimentMovement = unit.regiments.reduce((max, reg) => {
                const regType = REGIMENT_TYPES[reg.type];
                return Math.max(max, regType ? regType.movement : 0);
            }, 0);
            movesLeft = maxRegimentMovement || 3; // Default 3 si no se encuentra
            unit.movement = movesLeft; // Guardar para futuro uso
            console.warn(`[TradeRoute] unit.movement no definido para ${unit.name}. Usando ${movesLeft} del regimiento.`);
        }
        
        // Guardar posición anterior para debugging Y para limpiar correctamente
        const previousPos = { r: unit.r, c: unit.c };
        const oldR = unit.r;
        const oldC = unit.c;
        
        // Quitar de la rejilla para evitar auto-bloqueo durante el bucle
        if (board[unit.r] && board[unit.r][unit.c]) {
            board[unit.r][unit.c].unit = null;
        }
        
        // También limpiar de UnitGrid para evitar auto-bloqueo
        if (typeof UnitGrid !== 'undefined') {
            const key = UnitGrid._toKey ? UnitGrid._toKey(unit.r, unit.c) : `${unit.r},${unit.c}`;
            UnitGrid.grid.delete(key);
        }

        while (movesLeft > 0) {
            // Si la ruta se ha borrado en una iteración anterior del while (por llegar a destino y fallar la vuelta), salimos.
            if (!unit.tradeRoute) break;

            // --- PASO 1: AVANZAR ---
            if (route.position < route.path.length - 1) {
                route.position++;
                movesLeft--;
                
                const hexPos = route.path[route.position];
                const hexData = board[hexPos.r]?.[hexPos.c];

                // RECOLECCIÓN: Cobro por hex de Camino, Ciudad o Mar (water)
                if (hexData && (hexData.structure === 'Camino' || hexData.isCity || hexData.terrain === 'water')) {
                    const goldPerHex = GOLD_INCOME.PER_ROAD || 20;
                    if (route.goldCarried < route.cargoCapacity) {
                        route.goldCarried = Math.min(route.cargoCapacity, route.goldCarried + goldPerHex);
                    }
                }
            }

            // --- PASO 2: CONTROL DE LLEGADA ---
            const currentPos = route.path[route.position];
            const dest = route.destination; 
            const dist = hexDistance(currentPos.r, currentPos.c, dest.r, dest.c);

            // Llegada si está en la casilla o a distancia 1 (barco atracado)
            if (dist <= 1 || route.position >= route.path.length - 1) {
                const ownerOfDest = board[dest.r]?.[dest.c]?.owner;
                
                // Entrega de oro
                if (ownerOfDest !== null && ownerOfDest !== BankManager.PLAYER_ID && route.goldCarried > 0) {
                    gameState.playerResources[ownerOfDest].oro += route.goldCarried;
                    logMessage(`${unit.name} ha entregado ${route.goldCarried} de oro en ${dest.name}.`);
                    
                    // Otorgar puntos de investigación por intercambio de caravana
                    if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.onCaravanTrade) {
                        ResearchRewardsManager.onCaravanTrade(ownerOfDest);
                    }
                }

                // Curación y Reparación
                unit.currentHealth = unit.maxHealth;
                unit.regiments.forEach(reg => {
                    const rType = REGIMENT_TYPES[reg.type];
                    if (rType) reg.health = rType.health;
                });

                // Reinicio e Inversión
                route.goldCarried = 0;
                route.position = 0;
                const prevOrigin = route.origin;
                route.origin = route.destination;
                route.destination = prevOrigin;

                // Pathfinding de regreso
                const isShip = unit.regiments.some(r => REGIMENT_TYPES[r.type].is_naval);
                
                if (isShip) {
                    // Usamos la función global que está en unit_Actions.js
                    if (typeof traceNavalPath === 'function') {
                        route.path = traceNavalPath(unit, {r: currentPos.r, c: currentPos.c}, route.destination);
                    } else {
                        console.error("traceNavalPath no está definida.");
                        route.path = null;
                    }
                } else {
                    route.path = findInfrastructurePath(currentPos, route.destination);
                }

                if (!route.path || route.path.length === 0) {
                    logMessage(`"${unit.name}" cancela ruta: camino de vuelta obstruido o inexistente.`);
                    delete unit.tradeRoute; // <--- AQUÍ SE BORRA LA RUTA
                    break; // Rompe el while, e irá a la comprobación de seguridad de abajo
                }
            }
        }

        // --- PASO 3: FINALIZAR POSICIÓN ---
        // <<== CORRECCIÓN CRÍTICA: Verificar que la ruta aún existe antes de leerla ==>>
        if (unit.tradeRoute && unit.tradeRoute.path) {
            const finalCoords = unit.tradeRoute.path[unit.tradeRoute.position];
            
            // Seguridad adicional por si el índice está fuera de rango
            if (finalCoords) {
                unit.r = finalCoords.r;
                unit.c = finalCoords.c;
            } else {
                console.warn(`[TradeRoute] ADVERTENCIA: finalCoords es undefined para ${unit.name} en position ${unit.tradeRoute.position}`);
                // Restaurar posición original si no hay coordenadas válidas
                unit.r = oldR;
                unit.c = oldC;
            }
        } else {
            // Si la ruta se borró, la unidad se queda donde estaba al inicio de este turno
            console.warn(`[TradeRoute] ADVERTENCIA: Ruta borrada para ${unit.name}. Se mantiene en (${oldR},${oldC})`);
            unit.r = oldR;
            unit.c = oldC;
        }

        // Reinsertar en el tablero lógico - CORRECCIÓN: Verificar que board[unit.r] existe
        if (board[unit.r] && board[unit.r][unit.c]) {
            board[unit.r][unit.c].unit = unit;
        } else {
            console.error(`[TradeRoute] ERROR: No se pudo reinsertar ${unit.name} en tablero. board[${unit.r}][${unit.c}] no existe`);
        }
        
        // Sincronizar índice espacial - SIEMPRE después de actualizar unit.r y unit.c
        if (typeof UnitGrid !== 'undefined') {
            // Indexar la unidad en su nueva posición
            UnitGrid.index(unit);
        }

        unit.hasMoved = true;
        unit.hasAttacked = true;
        positionUnitElement(unit);
    });

    if (UIManager) UIManager.renderAllUnitsFromData();
}

/**
 * Calcula y asigna los Puntos de Victoria al final de una ronda.
 */
function calculateVictoryPoints() {
    if (gameState.turnNumber < 2) return; 

    ensureFullGameState();

    const players = Array.from({ length: gameState.numPlayers }, (_, i) => i + 1);
    const metrics = {};
    const vp = gameState.victoryPoints;
    const oldHolders = { ...vp.holders };

    // 1. Recopilar métricas según acuerdo técnico
    players.forEach(p => {
        const pKey = `player${p}`;
        const res = gameState.playerResources[p] || {};
        const playerUnits = units.filter(u => u.player === p && u.currentHealth > 0);

        // === NUEVA MÉTRICA: Ciudades bárbaras (neutrales) conquistadas ===
        const barbaraCitiesConquered = gameState.cities.filter(c => {
            return c.owner === p && (c.isBarbaric === true || (c.owner === 9 && board[c.r]?.[c.c]?.owner === p));
        }).length;

        metrics[p] = {
            // MÉTRICA ACORDADA 1: Conteo de rutas activas
            routesCount: playerUnits.filter(u => u.tradeRoute).length,

            // MÉTRICA ACORDADA 2: Suma directa de 5 recursos
            wealthSum: (res.oro || 0) + (res.hierro || 0) + (res.piedra || 0) + (res.madera || 0) + (res.comida || 0),

            // Otras métricas existentes (fijas para el resto de PV)
            cities: board.flat().filter(h => h && h.owner === p && (h.isCity || h.structure === 'Aldea')).length,
            armySize: playerUnits.reduce((sum, u) => sum + u.maxHealth, 0),
            kills: gameState.playerStats?.unitsDestroyed?.[pKey] || 0,
            techs: (res.researchedTechnologies || []).length,
            heroes: playerUnits.filter(u => u.commander).length,
            trades: gameState.playerStats?.sealTrades?.[pKey] || 0,
            ruinsCount: gameState.playerStats?.ruinsExplored?.[pKey] || 0,
            barbaraCities: barbaraCitiesConquered,  // === NUEVA MÉTRICA ===
            navalVictories: gameState.playerStats?.navalVictories?.[pKey] || 0  // === NUEVA MÉTRICA ===
        };
    });

    // Función auxiliar de comparación (Récordista)
    const findWinner = (metric) => {
        let maxVal = 0;
        let winner = null;
        players.forEach(p => {
            const val = metrics[p][metric];
            if (val > maxVal) {
                maxVal = val;
                winner = `player${p}`;
            } else if (val === maxVal && val > 0) {
                winner = null; // Empate anula el punto
            }
        });
        return winner;
    };

    // 2. Asignación de Títulos por Récord
    vp.holders.mostCities = findWinner('cities');
    vp.holders.largestArmy = findWinner('armySize');
    vp.holders.mostRoutes = findWinner('routesCount'); // Cambio aplicado
    vp.holders.mostKills = findWinner('kills');
    vp.holders.mostTechs = findWinner('techs');
    vp.holders.mostHeroes = findWinner('heroes');
    vp.holders.mostResources = findWinner('wealthSum'); // Cambio aplicado
    vp.holders.mostTrades = findWinner('trades');
    vp.holders.mostRuins = findWinner('ruinsCount');
    vp.holders.mostBarbaraCities = findWinner('barbaraCities');  // === NUEVO TÍTULO ===
    vp.holders.mostNavalVictories = findWinner('navalVictories');  // === NUEVO TÍTULO ===

    // 3. Recalcular total de PV para cada jugador
    players.forEach(p => {
        const pKey = `player${p}`;
        // Base: Puntos encontrados directamente + Trofeos de récord
        let total = vp.ruins[pKey] || 0; 
        for (const title in vp.holders) {
            if (vp.holders[title] === pKey) total++;
        }
        vp[pKey] = total;
    });

    // 4. Notificar cambios de manos y comprobar victoria (Tu lógica original)
    for (const title in vp.holders) {
        if (vp.holders[title] !== oldHolders[title]) {
            if (vp.holders[title]) logMessage(`¡${vp.holders[title]} ahora ostenta el título de "${title}"!`, "success");
        }
    }

    // VERIFICACIÓN DE VICTORIA POR PUNTOS
    const victoryPointsEnabled = gameState.victoryByPointsEnabled ?? VICTORY_BY_POINTS_ENABLED_DEFAULT;
    const victoryThreshold = VICTORY_POINTS_TO_WIN;
    
    if (victoryPointsEnabled) {
        // Verificar todos los jugadores (no solo el actual)
        players.forEach(p => {
            const pKey = `player${p}`;
            const currentScore = vp[pKey] || 0;
            
            if (currentScore >= victoryThreshold) {
                console.log(`%c[AUDITORÍA] ¡Victoria por ${victoryThreshold} puntos alcanzada por J${p}! Llamando a endTacticalBattle.`, "color: #f1c40f; font-weight: bold;");
                endTacticalBattle(p);
            }
        });
    }

    if (UIManager) UIManager.updateVictoryPointsDisplay();
}