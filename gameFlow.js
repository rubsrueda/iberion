// gameFlow.js
// Lógica principal del flujo del juego: turnos, fases, IA, victoria, niebla de guerra, recolección de recursos.

let currentTutorialStepIndex = -1; // -1 significa que el tutorial no ha comenzado o ha terminado
let tutorialScenarioData = null; // Almacena los datos del escenario de tutorial activo
const MAX_STABILITY = 5; // Definimos la constante aquí para que la función la reconozca.
const MAX_NACIONALIDAD = 5; // Valor máximo para la lealtad de un hexágono.

function checkAndProcessBrokenUnit(unit) {
    if (!unit || unit.morale > 0) {
        return false;
    }

    logMessage(`¡${unit.name} tiene la moral rota y no puede ser controlada!`, "error");

    const originalUnit = units.find(u => u.id === unit.id);
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

function handleBrokenUnits(playerNum) {
    // Obtenemos una copia para iterar de forma segura, ya que handleUnitDestroyed puede modificar 'units'.
    const unitsToCheck = [...units.filter(u => u.player === playerNum && u.morale <= 0 && u.currentHealth > 0)];

    if (unitsToCheck.length > 0) {
        logMessage(`¡Tropas del Jugador ${playerNum} están desmoralizadas y huyen!`, "warning");
    }

    unitsToCheck.forEach(unit => {
        const originalUnit = units.find(u => u.id === unit.id);
        if (!originalUnit) return; // Si ya fue destruida o eliminada por otra causa, no hacer nada

        // Marcamos la unidad para que el jugador no pueda usarla este turno.
        originalUnit.hasMoved = true;
        originalUnit.hasAttacked = true;

        // Buscar el refugio más cercano (capital/ciudad propia)
        const safeHavens = gameState.cities
            .filter(c => c.owner === playerNum)
            .sort((a, b) => hexDistance(originalUnit.r, originalUnit.c, a.r, a.c) - hexDistance(originalUnit.r, originalUnit.c, b.r, b.c));
        
        const nearestSafeHaven = safeHavens.length > 0 ? safeHavens[0] : null;

        let retreatHex = null;
        if (nearestSafeHaven) {
            const neighbors = getHexNeighbors(originalUnit.r, originalUnit.c);
            let bestNeighbor = null;
            let minDistance = hexDistance(originalUnit.r, originalUnit.c, nearestSafeHaven.r, nearestSafeHaven.c);

            for (const n of neighbors) {
                const neighborHexData = board[n.r]?.[n.c];
                // Puede huir a una casilla vacía, transitable y que lo acerque al refugio.
                if (neighborHexData && !neighborHexData.unit && !TERRAIN_TYPES[neighborHexData.terrain]?.isImpassableForLand) {
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
            logMessage(`¡${originalUnit.name} rompe filas y huye hacia (${retreatHex.r}, ${retreatHex.c})!`);
            
            // --- LA CORRECCIÓN CLAVE ESTÁ AQUÍ ---
            // Creamos un objeto temporal para los parámetros de la función de movimiento, pero _executeMoveUnit
            // modificará la unidad real (`originalUnit`) gracias a que se le pasa la referencia.
            const moveData = {
                fromR: originalUnit.r,
                fromC: originalUnit.c,
                toR: retreatHex.r,
                toC: retreatHex.c,
                unit: originalUnit,
                isRetreat: true // Flag para que la función de movimiento sepa que es una huida
            };
            
            // La función _executeMoveUnit será la que realmente mueva la unidad en los datos.
            _executeMoveUnit(originalUnit, retreatHex.r, retreatHex.c);
            
            // Después del movimiento, el estado de 'hasMoved' de la unidad original SÍ habrá cambiado a 'true'
            // pero `resetUnitsForNewTurn` lo pondrá a 'false' al inicio del siguiente turno, permitiendo
            // que la unidad vuelva a huir si sigue desmoralizada.

        } else {
            logMessage(`¡${originalUnit.name} está rodeada y sin moral! ¡La unidad se rinde!`, "error");
            handleUnitDestroyed(originalUnit, null); // El atacante es nulo porque se rinde
        }
    });
}

function resetUnitsForNewTurn(playerNumber) { 
    console.log(`%c[TurnStart] Reseteando unidades para Jugador ${playerNumber}`, "color: blue; font-weight: bold;");
    if (!units || !Array.isArray(units)) {
        console.error("[TurnStart] El array 'units' no está disponible o no es un array.");
        return;
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
                                    console.log(`[Habilidad Movimiento] ${unit.name} gana +${bonusValue} de movimiento por la habilidad "${skillDef.name}". Mov. Total: ${unit.currentMovement}`);
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
                                console.log(`   [HABILIDAD] Comandante ${heroInstance.id} da +${bonusValue} a Moral Máxima por "${skillDef.name}".`);
                            } else if (skillDef.effect.stat === 'upkeep') {
                                upkeepReductionPercent += bonusValue;
                                console.log(`   [HABILIDAD] Comandante ${heroInstance.id} da +${bonusValue}% de Reducción de Consumo por "${skillDef.name}".`);
                            }
                        }
                    }
                });
            }
        } else {
            console.log("   [INFO] Sin comandante.");
        }

        // --- 2. LÓGICA DE MORAL CORREGIDA ---
        const baseMaxMorale = unit.maxMorale || 125;
        const finalMaxMorale = baseMaxMorale + maxMoraleBonus;
        unit.morale = Math.max(0, unit.morale + maxMoraleBonus);
        
        console.log(`   [MORAL] Moral al inicio del upkeep: ${unit.morale || 50}/${finalMaxMorale}.`);

        const isSupplied = isHexSupplied(unit.r, unit.c, unit.player);
        if (isSupplied) {
            const moraleGain = 5;
            unit.morale = Math.min(finalMaxMorale, (unit.morale || 50) + moraleGain);
            console.log(`   [MORAL] Con suministro. Gana ${moraleGain}. Moral Final: ${unit.morale}/${finalMaxMorale}.`);
        } else {
            const moraleLoss = 10;
            
            unit.morale = Math.max(0, (unit.morale || 50) - moraleLoss);
            logMessage(`¡${unit.name} está sin suministros y pierde ${moraleLoss} de moral!`, 'warning');
            console.log(`   [MORAL] Sin suministro. Pierde ${moraleLoss}. Moral Final: ${unit.morale}/${finalMaxMorale}.`);
        }
        
        // --- 3. LÓGICA DE MANTENIMIENTO---
        let unitUpkeep = 0;
        (unit.regiments || []).forEach(regiment => { unitUpkeep += REGIMENT_TYPES[regiment.type]?.cost?.upkeep || 0; });
         // Aplicar la reducción de consumo
        console.log(`   [CONSUMO] Coste base de la división: ${unitUpkeep} oro.`);
        if (upkeepReductionPercent >= 100) {
            unitUpkeep = 0;
            console.log(`   [CONSUMO] Reducción >= 100%. Coste final: 0 oro.`);
        } else if (upkeepReductionPercent > 0) {
            const reductionAmount = unitUpkeep * (upkeepReductionPercent / 100);
            unitUpkeep -= reductionAmount;
            console.log(`   [CONSUMO] Reducción de ${upkeepReductionPercent}% (${reductionAmount.toFixed(2)} oro). Coste final: ${Math.max(0, unitUpkeep).toFixed(2)} oro.`);
        }
        const finalUnitUpkeep = Math.round(Math.max(0, unitUpkeep));
        totalGoldUpkeep += finalUnitUpkeep;
        console.log(`   [CONSUMO] Coste final redondeado de esta división a sumar al total: ${finalUnitUpkeep} oro.`);
        console.groupEnd();
    });

    // --- 4. LÓGICA DE PAGO ---
    console.log(`[Upkeep] Coste TOTAL de mantenimiento para Jugador ${playerNum}: ${totalGoldUpkeep} oro.`);
    if (playerRes.oro < totalGoldUpkeep) {
        logMessage(`¡Jugador ${playerNum} no puede pagar el mantenimiento (${totalGoldUpkeep})! ¡Las tropas se desmoralizan!`, "error");
        playerUnits.forEach(unit => {
            // <<== La penalización ahora depende del número de regimientos ==>>
            // Se calcula la pérdida de moral como -1 por cada regimiento en la división.
            const moralePenalty = (unit.regiments || []).length;
            unit.morale = Math.max(0, unit.morale - moralePenalty);
            logMessage(`  -> ${unit.name} pierde ${moralePenalty} de moral por el impago.`);
            unit.isDemoralized = true;
        });
    } else {
        playerRes.oro -= totalGoldUpkeep;
        // Si pagan, se quita el estado desmoralizado
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

function handleHealingPhase(playerNum) {
    console.group(`[DEBUG CURACIÓN- ANÁLISIS PROFUNDO] Iniciando Fase de Curación para Jugador ${playerNum}`);

    // >>>>> CORRECCIÓN: Eliminada la condición `!unit.hasMoved` <<<<<
    const divisionsWithHealers = units.filter(unit => 
        unit.player === playerNum && 
        unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.is_healer)
    );

    if (divisionsWithHealers.length === 0) {
        console.log("No se encontraron divisiones con Hospitales de Campaña.");
        console.groupEnd();
        return;
    }
    
    //console.log(`[DEBUG CURACIÓN] Se encontraron ${divisionsWithHealers.length} divisiones con sanadores.`);

    divisionsWithHealers.forEach(healerUnit => {
       console.log(`--- Analizando División: ${healerUnit.name} (HP Total: ${healerUnit.currentHealth}/${healerUnit.maxHealth}) ---`);
        console.log("Estado de sus regimientos ANTES de intentar curar:");

        healerUnit.regiments.forEach((reg, index) => {
            const regInfo = REGIMENT_TYPES[reg.type];
            console.log(`- Regimiento #${index}: ${reg.type} | Salud: ${reg.health} / ${regInfo.health} | ¿Dañado?: ${reg.health < regInfo.health}`);
        });

        const hospitalRegs = healerUnit.regiments.filter(r => REGIMENT_TYPES[r.type]?.is_healer);
        const hospitalCount = hospitalRegs.length;
        if (hospitalCount === 0) {
            console.groupEnd(); return;
        }

        const totalHealPower = hospitalRegs.reduce((sum, r) => sum + (REGIMENT_TYPES[r.type]?.heal_power || 0), 0);
        console.log(`- Contiene ${hospitalCount} hospital(es), poder de curación: ${totalHealPower}.`);
        
        const damagedRegiments = healerUnit.regiments.filter(reg => {
            const maxHealth = REGIMENT_TYPES[reg.type]?.health;
            return reg.health < maxHealth && !REGIMENT_TYPES[reg.type]?.is_healer;
        });

        if (damagedRegiments.length === 0) {
            console.log("- No se encontraron regimientos dañados en esta división.");
            console.groupEnd();
            return;
        }

        if (damagedRegiments.length > 0) {
            console.log(`%cÉXITO: Se encontraron ${damagedRegiments.length} regimientos dañados para curar.`, 'color: lightgreen;');
            // Aquí iría tu lógica de curación, que por ahora podemos omitir para centrarnos en el bug.
        } else {
            console.error(`%cFALLO: NO se encontraron regimientos dañados. La condición 'reg.health < maxHealth' falló para todos.`, 'color: red;');
        }

        console.log(`- Se encontraron ${damagedRegiments.length} regimientos dañados.`);

        const maxTargets = hospitalCount * 2;
        const targetsToHealCount = Math.min(damagedRegiments.length, maxTargets);
        console.log(`- Máximo objetivos: ${maxTargets}. Se curarán: ${targetsToHealCount}.`);
        
        damagedRegiments.sort((a,b) => (a.health / REGIMENT_TYPES[a.type].health) - (b.health / REGIMENT_TYPES[b.type].health));

        for (let i = 0; i < targetsToHealCount; i++) {
            const regimentToHeal = damagedRegiments[i];
            const maxHealth = REGIMENT_TYPES[regimentToHeal.type].health;
            const previousHealth = regimentToHeal.health;
            
            regimentToHeal.health = Math.min(maxHealth, regimentToHeal.health + totalHealPower);
            const healthRestored = regimentToHeal.health - previousHealth;

            if (healthRestored > 0) {
                console.log(`  - ¡ÉXITO! Curados ${healthRestored} HP a ${regimentToHeal.type}. Nueva salud: ${regimentToHeal.health}/${maxHealth}.`);
                logMessage(`${healerUnit.name} cura ${healthRestored} HP al regimiento de ${regimentToHeal.type}.`);
            }
        }
        
        recalculateUnitHealth(healerUnit);
        console.log(`- Salud total de ${healerUnit.name} actualizada a: ${healerUnit.currentHealth}.`);
        
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
            console.log(`  - Ingreso base de oro: ${incomeFromHex.oro}`);

            if (hex.resourceNode && RESOURCE_NODES_DATA[hex.resourceNode]) {
                const nodeInfo = RESOURCE_NODES_DATA[hex.resourceNode];
                const resourceType = nodeInfo.name.toLowerCase().replace('_mina', '');
                
                if (resourceType !== 'oro') {
                    incomeFromHex[resourceType] += nodeInfo.income || 0;
                    console.log(`  - Ingreso por nodo de '${resourceType}': +${nodeInfo.income || 0}`);
                }
            }

            let techBonusLog = "";
            if (incomeFromHex.oro > 0 && playerTechs.includes('PROSPECTING')) { incomeFromHex.oro += 1; techBonusLog += "PROSPECTING, "; }
            if (incomeFromHex.hierro > 0 && playerTechs.includes('IRON_WORKING')) { incomeFromHex.hierro += 1; techBonusLog += "IRON_WORKING, "; }
            if (incomeFromHex.piedra > 0 && playerTechs.includes('MASONRY')) { incomeFromHex.piedra += 1; techBonusLog += "MASONRY, "; }
            if (incomeFromHex.madera > 0 && playerTechs.includes('FORESTRY')) { incomeFromHex.madera += 1; techBonusLog += "FORESTRY, "; }
            if (incomeFromHex.comida > 0 && playerTechs.includes('SELECTIVE_BREEDING')) { incomeFromHex.comida += 1; techBonusLog += "SELECTIVE_BREEDING, "; }
            if (techBonusLog) console.log(`  - Ingresos tras bonus de Tech (${techBonusLog}): Oro=${incomeFromHex.oro}, Hierro=${incomeFromHex.hierro}, ...`);


            console.log("  - Aplicando multiplicadores de Estabilidad y Nacionalidad...");
            for (const res in incomeFromHex) {
                const baseIncome = incomeFromHex[res];
                const finalIncome = baseIncome * stabilityMultiplier * nationalityMultiplier;
                if(finalIncome > 0) console.log(`    - Recurso '${res}': ${baseIncome.toFixed(2)} * ${stabilityMultiplier.toFixed(2)} * ${nationalityMultiplier.toFixed(2)} = ${finalIncome.toFixed(2)}`);
                totalIncome[res] = (totalIncome[res] || 0) + finalIncome;
            }
        }); 
    });

    console.log("--- Resumen de Ingresos Totales (antes de redondear) ---");
    console.log(JSON.stringify(totalIncome, null, 2));

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

    console.log(`[RECURSOS] Fin de recolección para Jugador ${playerNum}. Recursos finales: ${JSON.stringify(playerRes)}`);
    console.groupEnd();
}

function updateFogOfWar() {
        if (!board || board.length === 0) return;
        if (gameState.isTutorialActive) return;
        // Usar las dimensiones del tablero actual
        const currentRows = board.length;
        const currentCol = board[0] ? board[0].length : 0;
        const playerKey = `player${gameState.currentPlayer}`;

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCol; c++) {
                const hexData = board[r]?.[c];
                if (!hexData || !hexData.element) continue;
                
                const hexElement = hexData.element;
                const unitOnThisHex = getUnitOnHex(r, c);

                // Reseteo visual básico
                hexElement.classList.remove('fog-hidden', 'fog-partial');
                if (unitOnThisHex?.element) {
                    unitOnThisHex.element.style.display = 'none';
                    unitOnThisHex.element.classList.remove('player-controlled-visible');
                }
                
                // ==========================================================
                // === CAMBIO CLAVE: Lógica para el mapa revelado ========
                // ==========================================================
                if (gameState.isMapRevealed) {
                    // Si el mapa está revelado, forzamos todo a ser visible y saltamos el resto.
                    hexData.visibility[playerKey] = 'visible';
                    if (unitOnThisHex?.element) {
                        unitOnThisHex.element.style.display = 'flex';
                    }
                    continue; // <-- Saltamos al siguiente hexágono del bucle.
                }
                // ==========================================================

                // El resto de la lógica de Niebla de Guerra normal
                if (gameState.currentPhase === "deployment" || gameState.currentPhase === "setup" || gameState.currentPhase === "tutorial_setup") {
                    hexData.visibility.player1 = 'visible';
                    hexData.visibility.player2 = 'visible';
                } else if (gameState.currentPhase === "play") {
                    if (hexData.visibility[playerKey] === 'visible') {
                        hexData.visibility[playerKey] = 'partial';
                    }
                }
            }
        }

        // Si el mapa está revelado, ya hemos hecho todo lo necesario, así que salimos.
        if (gameState.isMapRevealed) return;

        // Lógica normal de cálculo de visión
        if (gameState.currentPhase === "play") {
            const visionSources = [];
            units.forEach(unit => {
                if (unit.player === gameState.currentPlayer && unit.currentHealth > 0 && unit.r !== -1) {
                    visionSources.push({r: unit.r, c: unit.c, range: unit.visionRange});
                }
            });
            gameState.cities.forEach(city => {
                if (city.owner === gameState.currentPlayer && board[city.r]?.[city.c]) {
                    let range = board[city.r][city.c].isCapital ? 2 : 1;
                    if (board[city.r][city.c].structure === 'Fortaleza') range = Math.max(range, 3);
                    visionSources.push({r: city.r, c: city.c, range: range });
                }
            });

            visionSources.forEach(source => {
                for (let r_scan = 0; r_scan < currentRows; r_scan++) {
                    for (let c_scan = 0; c_scan < currentCol; c_scan++) {
                        if (hexDistance(source.r, source.c, r_scan, c_scan) <= source.range) {
                            if(board[r_scan]?.[c_scan]) board[r_scan][c_scan].visibility[playerKey] = 'visible';
                        }
                    }
                }
            });

            for (let r = 0; r < currentRows; r++) {
                for (let c = 0; c < currentCol; c++) {
                    const hexData = board[r]?.[c];
                    if (!hexData || !hexData.element) continue;
                    const hexVisStatus = hexData.visibility[playerKey];
                    const unitOnThisHex = getUnitOnHex(r,c);

                    if (hexVisStatus === 'hidden') {
                        hexData.element.classList.add('fog-hidden');
                    } else if (hexVisStatus === 'partial') {
                        hexData.element.classList.add('fog-partial');
                        if (unitOnThisHex?.player === gameState.currentPlayer && unitOnThisHex.element) {
                            unitOnThisHex.element.style.display = 'flex';
                            unitOnThisHex.element.classList.add('player-controlled-visible');
                        }
                    } else { // 'visible'
                        if (unitOnThisHex?.element) {
                            unitOnThisHex.element.style.display = 'flex';
                            if (unitOnThisHex.player === gameState.currentPlayer) {
                                unitOnThisHex.element.classList.add('player-controlled-visible');
                            }
                        }
                    }
                }
            }
        }
}

function checkVictory() {
   if (gameState.isTutorialActive) {
        // Durante el tutorial, la victoria solo la dicta el propio tutorial.
        // No se debe declarar una victoria normal.
        return false;
    }
    if (gameState.currentPhase !== 'play') return false;

    let winner = null; // 1 para jugador humano, 2 para IA u oponente

    // --- 1. Condiciones de Victoria/Derrota Específicas del Escenario ---
    if (gameState.isCampaignBattle && gameState.currentScenarioData) {
        const scenario = gameState.currentScenarioData;
        const playerHuman = 1; // Asumimos que el jugador humano es siempre el jugador 1
        const enemyPlayer = 2; // Asumimos que el oponente IA es jugador 2 (esto podría necesitar ser más flexible)

        // Chequear condiciones de victoria del jugador
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
function endTacticalBattle(winningPlayerNumber) {
    if (gameState.currentPhase === "gameOver") {
        console.warn("[endTacticalBattle] La batalla ya había terminado. Saliendo.");
        return; // Evitar múltiples ejecuciones si checkVictory se llama varias veces
    }

    TurnTimerManager.stop(); 
    
    logMessage(`Fin de la batalla. Jugador ${winningPlayerNumber} es el vencedor.`);
    gameState.currentPhase = "gameOver";
    gameState.winner = winningPlayerNumber;

    // --- AÑADIR LÓGICA DE BONUS DE ORO POR VICTORIA ---
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
    // --- FIN LÓGICA DE BONUS DE ORO ---

    if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') {
        UIManager.updateAllUIDisplays();
    } else { /* ... fallback ... */ }

    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function'){
        UIManager.hideContextualPanel();
    }

    // Mostrar un resumen de la partida (Tarea B10) - Lo dejamos pendiente por ahora
    // if (typeof UIManager !== 'undefined' && UIManager.showGameSummaryModal) { 
    //     UIManager.showGameSummaryModal(winningPlayerNumber, goldBonus);
    // } else {
         // alert(victoryMessage); // Movido el alert para que no se repita si hay modal
    // }
    if (!gameState.isCampaignBattle) { // Solo mostrar alert para escaramuza si no hay un flujo de campaña que lo maneje
         setTimeout(() => alert(victoryMessage), 100); // Pequeño delay para que los logs se asienten
    }


    if (gameState.isCampaignBattle) {
        if (typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
            const playerHumanWon = (winningPlayerNumber === 1);
            logMessage("Preparando para volver al mapa de campaña...");
            setTimeout(() => {
                campaignManager.handleTacticalBattleResult(playerHumanWon, gameState.currentCampaignTerritoryId, { goldEarnedFromBattle: goldBonus }); // Pasar oro como parte de los resultados
            }, 2000); // Reducido un poco el delay
        } else { /* ... error ... */ }
    } else { 
        // Para escaramuza, podrías tener un botón "Volver al Menú" en un modal de resumen
        // o simplemente dejar que el jugador cierre el alert y luego use el menú flotante.
    }

    if (PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.username) {
        // Usamos un timeout para que la pregunta no aparezca instantáneamente
        setTimeout(() => {
            if (confirm(`¿Quieres guardar una copia de seguridad de tu perfil '${PlayerDataManager.currentPlayer.username}' en tu ordenador?`)) {
                exportProfile();
            }
        }, 2000); // 2 segundos después de que termine la batalla
    }

}

/**
 * Inicia el turno de despliegue para un jugador de IA.
 * Es una función simple que llama al manager de despliegue.
 */
function simpleAiDeploymentTurn() {
    const aiPlayerNumber = gameState.currentPlayer;
    console.log(`[simpleAiDeploymentTurn] INICIO para Jugador IA ${aiPlayerNumber}.`);

    // Llama al manager de despliegue que ya existe y funciona.
    if (typeof AiDeploymentManager !== 'undefined' && AiDeploymentManager.deployUnitsAI) {
        AiDeploymentManager.deployUnitsAI(aiPlayerNumber);
    } else {
        console.error("[simpleAiDeploymentTurn] AiDeploymentManager no está definido. Revisa que ai_deploymentLogic.js esté cargado.");
    }
    
    /* RRC
    // La IA de despliegue termina su turno automáticamente después de colocar sus unidades.
    if (domElements.endTurnBtn && !domElements.endTurnBtn.disabled) {
        // Usamos un pequeño retardo para que la colocación visual termine antes de pasar al siguiente.
        setTimeout(() => {
            if(domElements.endTurnBtn) domElements.endTurnBtn.click();
        }, 1000); 
    }
    */
}

function simpleAiTurn() {
    console.log(`[simpleAiTurn] INICIO para Jugador IA ${gameState.currentPlayer}.`);
    const aiPlayerIdString = `player${gameState.currentPlayer}`;
    const aiActualPlayerNumber = gameState.currentPlayer;
    const aiLevel = gameState.playerAiLevels?.[aiPlayerIdString] || 'normal';

    // Verificación robusta: Solo procede si realmente es el turno de la IA.
    if (gameState.currentPhase !== 'play' || !gameState.playerTypes[aiPlayerIdString]?.startsWith('ai_')) {
        console.warn(`[simpleAiTurn] Se intentó ejecutar el turno de la IA en una fase o para un jugador incorrecto.`);
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
        console.log(`%c[Tutorial] Nuevo paso: ${currentStep.id}`, "color: blue; font-weight: bold;");

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
    console.log(`%c[Metrics v11] INICIO para turno que finaliza J${playerEndingTurn}`, "color: #00BFFF; font-weight: bold;");

    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            const hex = board[r][c];
            if (!hex) continue; // Ignorar hexágonos inválidos

            const unitOnHex = getUnitOnHex(r, c);

            // --- LÓGICA DE OCUPACIÓN ENEMIGA ---
            // Si hay una unidad, y NO es del dueño del hexágono.
            if (unitOnHex && hex.owner !== null && unitOnHex.player !== hex.owner) {
                const originalOwner = hex.owner;
                
                // Si la estabilidad es suficiente (umbral de 3), se reduce la nacionalidad.
                if (hex.estabilidad >= 3) {
                    if (hex.nacionalidad[originalOwner] > 0) {
                        hex.nacionalidad[originalOwner]--;
                        //console.log(`Hex (${r},${c}): Estabilidad es ${hex.estabilidad}. Baja nación de J${originalOwner} a ${hex.nacionalidad[originalOwner]}`);

                        // Si la nacionalidad llega a 0, se produce la conquista.
                        if (hex.nacionalidad[originalOwner] === 0) {
                            console.log(`%cHex (${r},${c}): ¡CONQUISTADO por J${unitOnHex.player}!`, 'color: orange; font-weight:bold;');
                            hex.owner = unitOnHex.player;
                            hex.nacionalidad[unitOnHex.player] = 1;
                            // La estabilidad NO se resetea.
                            renderSingleHexVisuals(r, c);
                        }
                    }
                } else {
                     console.log(`Hex (${r},${c}): Ocupado por enemigo, pero Estabilidad (${hex.estabilidad}) es muy baja para afectar la nacionalidad.`);
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
    console.log(`%c[Metrics v11] FIN`, "color: #00BFFF; font-weight: bold;");
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
        selectUnit(nextUnitToSelect);
        // Idealmente, aquí llamaríamos a una función para centrar el mapa en (nextUnitToSelect.r, nextUnitToSelect.c)
        console.log(`Centrando en la siguiente unidad inactiva: ${nextUnitToSelect.name}`);
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
        console.log(`[Capital Change - Network] Solicitando cambio de capital a (${r},${c}) para J${currentPlayer}.`);
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
        console.log(`[Capital Change - Local] Ejecutando cambio de capital a (${r},${c}) para J${currentPlayer}.`);
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
        console.log(`[Capital Change] Capital antigua en (${oldR},${oldC}) desmarcada.`);
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(oldR, oldC);
    }
    // Si no la encontramos en gameState.cities, como fallback, la buscamos en el tablero (tu código anterior).
    else {
        for (let row of board) {
            for (const hex of row) {
                if (hex && hex.owner === currentPlayer && hex.isCapital) {
                    oldCapitalData = hex;
                    oldCapitalData.isCapital = false;
                    console.log(`[Capital Change] Capital antigua en (${hex.r},${hex.c}) desmarcada (encontrada por fallback).`);
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
        console.log(`[Capital Change] La nueva capital (${r},${c}) fue añadida a gameState.cities.`);
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

// --- EJEMPLO DE CÓMO SE USARÍA DESDE UN BOTÓN DE LA UI ---
/*
// Suponiendo que tienes un botón en el HTML: <button id="setAsCapitalBtn">Establecer como Capital</button>
// Y que este botón está dentro de un contexto donde se muestra información de una ciudad propia seleccionada.

const setCapitalBtn = document.getElementById('setAsCapitalBtn');
if (setCapitalBtn) {
    // Asegúrate de que 'selectedCityData' tenga la información de la ciudad del jugador
    // Esto podría venir de un click en el mapa, o de la información mostrada en el panel contextual.
    let selectedCityData = null; // Esto se obtendría de otra parte del código

    setCapitalBtn.addEventListener('click', () => {
        if (selectedCityData) {
            requestChangeCapital(selectedCityData.r, selectedCityData.c);
            
            // Ocultar el botón/panel después de la acción
            if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function') {
                UIManager.hideContextualPanel();
            }
        }
    });
}
*/
let handleEndTurnCallCount = 0; // Se pondría fuera de la función

/*
async function handleEndTurn(isHostProcessing = false) {

    //audio
    if (typeof AudioManager !== 'undefined') {
        AudioManager.playSound('turn_start');
    }

    handleEndTurnCallCount++;
    console.error(`handleEndTurn ha sido llamada ${handleEndTurnCallCount} veces.`);
    
    console.log(`[handleEndTurn V4 - COMPLETA Y CORREGIDA] INICIO. Fase: ${gameState.currentPhase}, Jugador: ${gameState.currentPlayer}, Host?: ${isHostProcessing}`);

    // Esto evita que la lógica de fin de turno del juego se ejecute al mismo tiempo que el tutorial avanza.
    if (gameState.isTutorialActive && !isHostProcessing) {
        console.log("[handleEndTurn] MODO TUTORIAL: Notificando al manager y deteniendo la ejecución normal del turno.");
        TutorialManager.notifyActionCompleted('turnEnded');
        return; // Detiene la función aquí mismo.
    }
    
    // --- CAPA DE RED (PUNTO DE ENTRADA) ---
    // Este bloque se ejecuta cuando un jugador (anfitrión o cliente) hace clic en el botón de fin de turno.
    if (!isHostProcessing && isNetworkGame()) {
        if (gameState.currentPlayer !== gameState.myPlayerNumber) {
            logMessage("No es tu turno.");
            return;
        }
        const endTurnAction = { type: 'endTurn', payload: { playerId: gameState.myPlayerNumber } };
        
        // El cliente SIEMPRE envía una petición.
        if (!NetworkManager.esAnfitrion) {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: endTurnAction });
        } else {
            // El anfitrión se procesa a sí mismo. La llamada a processActionRequest
            // desencadenará la ejecución de este MISMO handleEndTurn, pero con isHostProcessing = true.
            await processActionRequest(endTurnAction);
        }
        
        if (domElements.endTurnBtn) domElements.endTurnBtn.disabled = true;
        return; // La acción ya ha sido enviada o procesada, no continuar con la lógica local.
    }
    // --- FIN CAPA DE RED ---

    // --- LÓGICA DE VALIDACIÓN DEL TUTORIAL ---
    // (Este bloque está duplicado, pero lo dejo porque pediste no quitar nada)
    if (window.TUTORIAL_MODE_ACTIVE === true) {
        console.log("[TUTORIAL] Clic en 'Finalizar Turno' interceptado. Notificando al manager.");
        TutorialManager.notifyActionCompleted('turnEnded');
    }

    // --- LÓGICA DE EJECUCIÓN DEL CAMBIO DE TURNO ---
    if (typeof deselectUnit === "function") deselectUnit();
    if (gameState.currentPhase === "gameOver") {
        logMessage("La partida ya ha terminado.");
        return;
    }
    // Al inicio del proceso de cambio de turno, detenemos cualquier temporizador activo.
    TurnTimerManager.stop();

    const playerEndingTurn = gameState.currentPlayer;

    // <<== INICIO DE LA LÓGICA SEGURA PARA EL TUTORIAL ==>>
    // (Este bloque también está duplicado, pero lo dejo para respetar tu código)
    if (gameState.isTutorialActive) {
        console.log("[handleEndTurn] MODO TUTORIAL DETECTADO. Flujo de turno especial activado.");

        // 3. Preparar al jugador para su nuevo turno
        resetUnitsForNewTurn(gameState.currentPlayer);

        // Avisa al tutorial de que el turno terminó
        TutorialManager.notifyActionCompleted('turnEnded');

        units.forEach(u => {
            if (u.player === 1) {
                u.hasMoved = false;
                u.hasAttacked = false;
                // Si por algún error la unidad no tiene puntos de movimiento, le damos 2 por defecto
                u.currentMovement = (u.movement > 0) ? u.movement : 2; 
            }
        });

        // 1. Ejecutar las tareas de mantenimiento del jugador
        updateTerritoryMetrics(playerEndingTurn);
        collectPlayerResources(playerEndingTurn);
        handleUnitUpkeep(playerEndingTurn);
        handleHealingPhase(playerEndingTurn);
        const tradeGold = calculateTradeIncome(playerEndingTurn);
        if (tradeGold > 0) gameState.playerResources[playerEndingTurn].oro += tradeGold;
        
        // 2. SALTAR EL TURNO DE LA IA COMPLETAMENTE
        // Directamente volvemos al jugador 1 y aumentamos el número de turno del juego.
        gameState.currentPlayer = 1;
        gameState.turnNumber++;

        logMessage(`Comienza el turno del Jugador ${gameState.currentPlayer} (Turno ${gameState.turnNumber}).`);
        
        units.forEach(u => { u.hasMoved = false; u.hasAttacked = false; u.currentMovement = u.movement || 2; });
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
                if (turnBlocker2) {
                    turnBlocker2.style.display = 'none';
                }
            }, 500);

        }
        
        // El resto de la lógica de preparación (moral, experiencia, comida)
        if (gameState.currentPlayer === 1) {
             units.forEach(unit => { if (unit.player === 1) unit.experience++; });
             gameState.playerResources[1].researchPoints += BASE_INCOME.RESEARCH_POINTS_PER_TURN;
        }
        if (UIManager) UIManager.updateAllUIDisplays();
        return; // Detenemos aquí para el tutorial
    }

    // --- LÓGICA NORMAL PARA N JUGADORES ---
    if (gameState.currentPhase === "deployment") {
        // Si el jugador actual NO es el último jugador, simplemente pasa al siguiente
        if (playerEndingTurn < gameState.numPlayers) {
            console.error(`¡CAMBIO DE FASE EJECUTADO! Se va a cambiar de '${gameState.currentPhase}' a 'play'. Jugador 1 comenzará.`);
            gameState.currentPlayer++;
            // Resetear el contador de unidades desplegadas para el nuevo jugador
            if (!gameState.unitsPlacedByPlayer) gameState.unitsPlacedByPlayer = {};
            gameState.unitsPlacedByPlayer[gameState.currentPlayer] = 0;
            logMessage(`Despliegue: Turno del Jugador ${gameState.currentPlayer}.`);
        } else {
            // Si es el último jugador, termina la fase de despliegue y empieza el juego
            gameState.currentPhase = "play";
            gameState.currentPlayer = 1; // El juego siempre empieza con el jugador 1
            gameState.turnNumber = 1;
            resetUnitsForNewTurn(1); // Prepara las unidades del J1 para el primer turno
            logMessage("¡Comienza la Batalla! Turno del Jugador 1.");
        }
    } // --- SECCIÓN 2: LÓGICA DE FASE DE JUEGO ---
    else if (gameState.currentPhase === "play") {
        

        // A. Tareas de MANTENIMIENTO del jugador que TERMINA el turno
        updateTerritoryMetrics(playerEndingTurn);
        collectPlayerResources(playerEndingTurn); 
        handleUnitUpkeep(playerEndingTurn);
        handleHealingPhase(playerEndingTurn);

        updateTradeRoutes(playerEndingTurn); // Mueve las caravanas del jugador
        
        const tradeGold = calculateTradeIncome(playerEndingTurn);
        if (tradeGold > 0) gameState.playerResources[playerEndingTurn].oro += tradeGold;

        // <<== CORRECCIÓN 2 de 2: Se REEMPLAZA el bloque 'B' por uno que funciona ==>>
        // B. LÓGICA DE CAMBIO DE JUGADOR (VERSIÓN FINAL Y CORRECTA PARA N JUGADORES)
        let nextPlayer = playerEndingTurn; // Empezamos desde el jugador que acaba de terminar.
        let foundValidPlayer = false;
        let attempts = 0;

        // Bucle para encontrar el siguiente jugador VÁLIDO.
        do {
            // 1. Avanza al siguiente jugador en el ciclo.
            nextPlayer = (nextPlayer % gameState.numPlayers) + 1;

            // 2. Si volvemos al jugador 1, es una nueva ronda. (Se comprueba solo al principio del ciclo)
            if (nextPlayer === 1 && attempts === 0) { 
                gameState.turnNumber++;
                if (typeof Chronicle !== 'undefined') Chronicle.logEvent('turn_start');

                // Justo aquí, cuando una ronda completa ha terminado, ejecutamos el turno de La Banca.
                if (typeof BankManager !== 'undefined' && BankManager.executeTurn) {
                    BankManager.executeTurn();
                }

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
            console.warn("[Fin de Turno] No se encontró ningún jugador activo. Terminando juego.");
            gameState.currentPhase = "gameOver"; // Condición de fin de partida.
        }

        // En partidas locales, actualizamos quién es el "jugador humano activo".
        if (!isNetworkGame()) {
            const nextPlayerType = gameState.playerTypes[`player${gameState.currentPlayer}`];
            if (nextPlayerType === 'human') {
                gameState.myPlayerNumber = gameState.currentPlayer;
            }
        }
    }
    
    // Tras determinar el nuevo jugador (sea cual sea la fase), log y preparación
    logMessage(`Comienza el turno del Jugador ${gameState.currentPlayer}.`);
    resetUnitsForNewTurn(gameState.currentPlayer);

        // C. Tareas de PREPARACIÓN para el jugador que EMPIEZA el turno.
        resetUnitsForNewTurn(gameState.currentPlayer);
        handleBrokenUnits(gameState.currentPlayer);
        // D. Lógica de ingresos pasivos (XP, investigación, comida) para el jugador que EMPIEZA.
        units.forEach(unit => {
            if (unit.player === gameState.currentPlayer && unit.currentHealth > 0) {
                unit.experience = Math.min(unit.maxExperience || 500, (unit.experience || 0) + 1);
                if (typeof checkAndApplyLevelUp === "function") checkAndApplyLevelUp(unit);
            }
        });

        if (gameState.playerResources[gameState.currentPlayer]) {
            const baseResearchIncome = BASE_INCOME.RESEARCH_POINTS_PER_TURN || 5;
            gameState.playerResources[gameState.currentPlayer].researchPoints = (gameState.playerResources[gameState.currentPlayer].researchPoints || 0) + baseResearchIncome;
            logMessage(`Jugador ${gameState.currentPlayer} obtiene ${baseResearchIncome} Puntos de Investigación.`);
        }

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
                    if (regimentToDamage) {
                        regimentToDamage.health = Math.max(0, regimentToDamage.health - damage);
                    }

                    // 3. Recalculamos la salud total de la división a partir de la suma de sus regimientos.
                    //    Esto garantiza la consistencia.
                    recalculateUnitHealth(unit); 
                    // --- FIN DE LA SOLUCIÓN ---

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
                const unit = units.find(u => u.id === unitId); 
                if (unit && handleUnitDestroyed) handleUnitDestroyed(unit, null); 
            });
            if (foodActuallyConsumed > 0 || unitsSufferingAttrition > 0) logMessage(`Comida consumida: ${foodActuallyConsumed}.`);
            if (playerRes.comida < 0) playerRes.comida = 0;
        }

    // --- SINCRONIZACIÓN FINAL (SOLO PARA ANFITRIÓN) ---
    // Este es el bloque que te causaba confusión. Se ejecuta DESPUÉS de toda la lógica de cambio de turno.
    if (isNetworkGame() && NetworkManager.esAnfitrion) {
        console.log(`[Red - Anfitrión] Fin de turno procesado. Retransmitiendo estado y FORZANDO reconstrucción local.`);
        NetworkManager.broadcastFullState();

        const replacer = (key, value) => (key === 'element' ? undefined : value);
        const selfData = {
            gameState: JSON.parse(JSON.stringify(gameState, replacer)),
            board: JSON.parse(JSON.stringify(board, replacer)),
            units: JSON.parse(JSON.stringify(units, replacer)),
            unitIdCounter: unitIdCounter
        };
        // El anfitrión se fuerza a reconstruir su propia vista para evitar desincronización visual.
        reconstruirJuegoDesdeDatos(selfData);
    }
    
    // PASO 1: Actualizar la Interfaz Gráfica para reflejar el nuevo turno.
    if (UIManager) {
        UIManager.updateAllUIDisplays();
        if (isNetworkGame()) {
            UIManager.updateTurnIndicatorAndBlocker();
        }
    }



    // PASO 2: Después de actualizar la UI, llamar a la IA SI ES SU TURNO.
    // comprueba explícitamente el gameState actual.

    // PASO 1: Actualizar toda la interfaz para reflejar el estado del nuevo turno.
    if (UIManager) UIManager.updateAllUIDisplays();
    
    // PASO 2: Comprobar si el NUEVO jugador actual es una IA.
    const isNextPlayerAI = gameState.playerTypes[`player${gameState.currentPlayer}`]?.startsWith('ai_');
    console.log(`[handleEndTurn] Verificación final: Turno de J${gameState.currentPlayer}. ¿Es IA? ${isNextPlayerAI}`);
    
    // Si no hay jugadores eliminados y es el turno de la IA
    if (isNextPlayerAI && gameState.currentPhase !== "gameOver") {
    if (checkVictory && checkVictory()) return;

        const turnBlocker3 = document.getElementById('turnBlocker');
        if (turnBlocker3) {
            turnBlocker3.textContent = `Turno de la IA (Jugador ${gameState.currentPlayer})...`;
            turnBlocker3.style.display = 'flex';
        }
        // Damos un respiro a la UI para que se renderice
        setTimeout(async () => {
            // Esta es la nueva línea. Guarda el número del jugador actual de forma segura.
            const playerNumberForAI = gameState.currentPlayer;

            if (gameState.currentPhase === 'deployment') {
                // Y aquí pasamos ese número a la función.
                await simpleAiDeploymentTurn(playerNumberForAI);
            } else {
                // Y aquí también.
                await simpleAiTurn(playerNumberForAI); 
            }
            // ...
        }, 700);
    } else {
        // ...¡Iniciamos el temporizador con la duración que guardamos en gameState!
        console.log(`[handleEndTurn] Turno de jugador humano (Jugador ${gameState.currentPlayer}). Iniciando temporizador.`);
        TurnTimerManager.start(gameState.turnDurationSeconds); 
        // Si es un jugador humano, simplemente comprobamos si ha ganado.
        if (checkVictory) checkVictory();
    }
}
*/

async function handleEndTurn(isHostProcessing = false) {

    //audio
    if (typeof AudioManager !== 'undefined') {
        AudioManager.playSound('turn_start');
    }

    handleEndTurnCallCount++;
    console.error(`handleEndTurn ha sido llamada ${handleEndTurnCallCount} veces.`);
    
    console.log(`[handleEndTurn V4 - COMPLETA Y CORREGIDA] INICIO. Fase: ${gameState.currentPhase}, Jugador: ${gameState.currentPlayer}, Host?: ${isHostProcessing}`);


    // --- LÓGICA DE EJECUCIÓN DEL CAMBIO DE TURNO ---
    if (typeof deselectUnit === "function") deselectUnit();
    if (gameState.currentPhase === "gameOver") {
        logMessage("La partida ya ha terminado.");
        return;
    }
    // Al inicio del proceso de cambio de turno, detenemos cualquier temporizador activo.
    TurnTimerManager.stop();

    const playerEndingTurn = gameState.currentPlayer;

    // <<== LÓGICA SEGURA PARA EL TUTORIAL (RESTAURADA Y CORREGIDA) ==>>
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
        return; // Detenemos aquí para el tutorial
    }

    // --- LÓGICA NORMAL PARA N JUGADORES (TU CÓDIGO ORIGINAL INTACTO) ---
    
    // Capa de Red
    if (!isHostProcessing && isNetworkGame()) {
        if (gameState.currentPlayer !== gameState.myPlayerNumber) {
            logMessage("No es tu turno.");
            return;
        }
        const endTurnAction = { type: 'endTurn', payload: { playerId: gameState.myPlayerNumber } };
        if (!NetworkManager.esAnfitrion) {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: endTurnAction });
        } else {
            await processActionRequest(endTurnAction);
        }
        return; 
    }

    if (gameState.currentPhase === "deployment") {
        // Si el jugador actual NO es el último jugador, simplemente pasa al siguiente
        if (playerEndingTurn < gameState.numPlayers) {
            gameState.currentPlayer++;
            // Resetear el contador de unidades desplegadas para el nuevo jugador
            if (!gameState.unitsPlacedByPlayer) gameState.unitsPlacedByPlayer = {};
            gameState.unitsPlacedByPlayer[gameState.currentPlayer] = 0;
            logMessage(`Despliegue: Turno del Jugador ${gameState.currentPlayer}.`);
        } else {
            // Si es el último jugador, termina la fase de despliegue y empieza el juego
            gameState.currentPhase = "play";
            gameState.currentPlayer = 1; 
            gameState.turnNumber = 1;
            resetUnitsForNewTurn(1); 
            logMessage("¡Comienza la Batalla! Turno del Jugador 1.");
        }
    } 
    else if (gameState.currentPhase === "play") {
        

        // A. Tareas de MANTENIMIENTO del jugador que TERMINA el turno
        updateTerritoryMetrics(playerEndingTurn);
        collectPlayerResources(playerEndingTurn); 
        handleUnitUpkeep(playerEndingTurn);
        handleHealingPhase(playerEndingTurn);

        updateTradeRoutes(playerEndingTurn); // Mueve las caravanas del jugador
        
        const tradeGold = calculateTradeIncome(playerEndingTurn);
        if (tradeGold > 0) gameState.playerResources[playerEndingTurn].oro += tradeGold;

        // <<== CORRECCIÓN 2 de 2: Se REEMPLAZA el bloque 'B' por uno que funciona ==>>
        // B. LÓGICA DE CAMBIO DE JUGADOR (VERSIÓN FINAL Y CORRECTA PARA N JUGADORES)
        let nextPlayer = playerEndingTurn; // Empezamos desde el jugador que acaba de terminar.
        let foundValidPlayer = false;
        let attempts = 0;

        // Bucle para encontrar el siguiente jugador VÁLIDO.
        do {
            // 1. Avanza al siguiente jugador en el ciclo.
            nextPlayer = (nextPlayer % gameState.numPlayers) + 1;

            // 2. Si volvemos al jugador 1, es una nueva ronda. (Se comprueba solo al principio del ciclo)
            if (nextPlayer === 1 && attempts === 0) { 
                gameState.turnNumber++;
                if (typeof Chronicle !== 'undefined') Chronicle.logEvent('turn_start');

                // Justo aquí, cuando una ronda completa ha terminado, ejecutamos el turno de La Banca.
                if (typeof BankManager !== 'undefined' && BankManager.executeTurn) {
                    BankManager.executeTurn();
                }

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

        // En partidas locales, actualizamos quién es el "jugador humano activo".
        if (!isNetworkGame()) {
            const nextPlayerType = gameState.playerTypes[`player${gameState.currentPlayer}`];
            if (nextPlayerType === 'human') {
                gameState.myPlayerNumber = gameState.currentPlayer;
            }
        }
    }
    
    // Tras determinar el nuevo jugador (sea cual sea la fase), log y preparación
    logMessage(`Comienza el turno del Jugador ${gameState.currentPlayer}.`);

        // C. Tareas de PREPARACIÓN para el jugador que EMPIEZA el turno.
        resetUnitsForNewTurn(gameState.currentPlayer);
        handleBrokenUnits(gameState.currentPlayer);

        // D. Lógica de ingresos pasivos (XP, investigación, comida) para el jugador que EMPIEZA.
        units.forEach(unit => {
            if (unit.player === gameState.currentPlayer && unit.currentHealth > 0) {
                unit.experience = Math.min(unit.maxExperience || 500, (unit.experience || 0) + 1);
                if (typeof checkAndApplyLevelUp === "function") checkAndApplyLevelUp(unit);
            }
        });

        if (gameState.playerResources[gameState.currentPlayer]) {
            const baseResearchIncome = BASE_INCOME.RESEARCH_POINTS_PER_TURN || 5;
            gameState.playerResources[gameState.currentPlayer].researchPoints = (gameState.playerResources[gameState.currentPlayer].researchPoints || 0) + baseResearchIncome;
            logMessage(`Jugador ${gameState.currentPlayer} obtiene ${baseResearchIncome} Puntos de Investigación.`);
        }

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
            const unit = units.find(u => u.id === unitId); 
            if (unit) handleUnitDestroyed(unit, null); 
        });
            if (foodActuallyConsumed > 0 || unitsSufferingAttrition > 0) logMessage(`Comida consumida: ${foodActuallyConsumed}.`);
            if (playerRes.comida < 0) playerRes.comida = 0;
    }

    // --- SINCRONIZACIÓN FINAL (SOLO PARA ANFITRIÓN) ---
    // Este es el bloque que te causaba confusión. Se ejecuta DESPUÉS de toda la lógica de cambio de turno.
    if (isNetworkGame() && NetworkManager.esAnfitrion) {
        NetworkManager.broadcastFullState();
    }
    
    // PASO 1: Actualizar toda la interfaz para reflejar el estado del nuevo turno.
    if (UIManager) UIManager.updateAllUIDisplays();
    
    // PASO 2: Comprobar si el NUEVO jugador actual es una IA.
    const isNextPlayerAI = gameState.playerTypes[`player${gameState.currentPlayer}`]?.startsWith('ai_');
    if (isNextPlayerAI && gameState.currentPhase !== "gameOver") {
        if (checkVictory && checkVictory()) return;
        const turnBlocker3 = document.getElementById('turnBlocker');
        if (turnBlocker3) {
            turnBlocker3.textContent = `Turno de la IA (Jugador ${gameState.currentPlayer})...`;
            turnBlocker3.style.display = 'flex';
        }
        // Damos un respiro a la UI para que se renderice
        setTimeout(async () => {
            // Esta es la nueva línea. Guarda el número del jugador actual de forma segura.
            const playerNumberForAI = gameState.currentPlayer;
            if (gameState.currentPhase === 'deployment') await simpleAiDeploymentTurn(playerNumberForAI);
            else await simpleAiTurn(playerNumberForAI); 
        }, 700);
    } else {
        // ...¡Iniciamos el temporizador con la duración que guardamos en gameState!
        console.log(`[handleEndTurn] Turno de jugador humano (Jugador ${gameState.currentPlayer}). Iniciando temporizador.`);
        TurnTimerManager.start(gameState.turnDurationSeconds); 
        // Si es un jugador humano, simplemente comprobamos si ha ganado.
        if (checkVictory) checkVictory();
    }
}

/**
 * Actualiza la posición y estado de todas las unidades en modo ruta comercial.
 * @param {number} playerNum - El número del jugador cuyo turno está terminando.
 */
function updateTradeRoutes(playerNum) {
    const tradeUnits = units.filter(u => u.player === playerNum && u.tradeRoute);
    if (tradeUnits.length === 0) return;

    if (playerNum === BankManager.PLAYER_ID) {
        console.log(`[Banca] Moviendo ${tradeUnits.length} caravana(s)...`);
    }

    tradeUnits.forEach(unit => {
        const route = unit.tradeRoute;
        if (!route || !route.path || route.path.length === 0) {
            console.warn(`Ruta comercial inválida para "${unit.name}". Se detiene la ruta.`);
            delete unit.tradeRoute;
            return;
        }

        let movesLeft = unit.movement;
        while (movesLeft > 0) {
            // Condición de parada 1: Ya ha llegado al final de su camino.
            if (route.position >= route.path.length - 1) {
                
                // --- INICIO DE LA SECCIÓN DE DEBUG ---
                console.group(`[Debug Entrega] Caravana "${unit.name}" ha llegado.`);
                const destinationCity = route.destination;
                const cityOwner = board[destinationCity.r]?.[destinationCity.c]?.owner;
                
                console.log(`  - Destino: ${destinationCity.name} (Dueño: J${cityOwner})`);
                console.log(`  - Oro transportado: ${route.goldCarried}`);
                console.log(`  - Verificando condiciones: cityOwner !== null (${cityOwner !== null}), cityOwner !== BankManager.PLAYER_ID (${cityOwner !== BankManager.PLAYER_ID}), goldCarried > 0 (${route.goldCarried > 0})`);

                if (cityOwner !== null && cityOwner !== BankManager.PLAYER_ID && route.goldCarried > 0) {
                    console.log(`%c  -> CONDICIONES CUMPLIDAS. Entregando oro...`, "color: green");
                    gameState.playerResources[cityOwner].oro += route.goldCarried;
                    logMessage(`La caravana "${unit.name}" entregó ${route.goldCarried} oro en ${destinationCity.name}.`);
                } else {
                    console.log(`%c  -> CONDICIONES NO CUMPLIDAS. No se entrega oro.`, "color: orange");
                }
                
                console.log("  - Estado ANTES de invertir: ", { origin: route.origin.name, destination: route.destination.name });
                // --- FIN DE LA SECCIÓN DE DEBUG ---

                // Curación y Recomposición al llegar
                unit.currentHealth = unit.maxHealth;
                unit.regiments.forEach(reg => reg.health = REGIMENT_TYPES[reg.type].health);

                if (unit.player === BankManager.PLAYER_ID) {
                    BankManager.recomposeCaravan(unit);
                    logMessage(`La caravana de La Banca se ha reabastecido y recompuesto en ${destinationCity.name}.`);
                } else {
                    logMessage(`La caravana "${unit.name}" ha sido reabastecida en ${destinationCity.name}.`);
                }

                // Invertir ruta para el viaje de regreso
                route.goldCarried = 0;
                route.position = 0;
                [route.origin, route.destination] = [route.destination, route.origin];
                
                console.log("  - Estado DESPUÉS de invertir: ", { origin: route.origin.name, destination: route.destination.name }); // DEBUG
                
                route.path = findInfrastructurePath(route.origin, route.destination);
                
                if (!route.path) {
                    logMessage(`Ruta de regreso no encontrada para "${unit.name}". Se detiene el comercio.`);
                    delete unit.tradeRoute;
                    console.groupEnd();
                    break; 
                }
                logMessage(`"${unit.name}" inicia viaje de regreso a ${route.destination.name}.`);
                console.groupEnd();
            }

            // Si no ha llegado, avanza.
            if (route.position >= route.path.length - 1) break; // Seguridad extra
            
            const nextStepCoords = route.path[route.position + 1];
            if (!nextStepCoords) { // Seguridad por si el path es corto
                break;
            }
            const unitOnNextStep = getUnitOnHex(nextStepCoords.r, nextStepCoords.c);
            // Si hay una unidad, no es la propia caravana, y NO es la casilla final del path
            if (unitOnNextStep && unitOnNextStep.id !== unit.id && (route.position + 1 < route.path.length - 1)) {
                 logMessage(`Caravana "${unit.name}" espera porque la ruta está bloqueada.`);
                 break; // Detener el movimiento de esta caravana en este turno
            }
            
            // Si pasa las condiciones, avanza un paso
            route.position++;
            
            const incomePerHex = GOLD_INCOME.PER_ROAD || 20;
            if (route.goldCarried < route.cargoCapacity) {
                route.goldCarried = Math.min(route.cargoCapacity, route.goldCarried + incomePerHex);
            }
            movesLeft--;
        }

        // Actualizar la posición lógica de la unidad en el tablero
        if (route && route.path && route.path[route.position]) {
             const newCoords = route.path[route.position];
             if (board[unit.r]?.[unit.c]?.unit?.id === unit.id) {
                 board[unit.r][unit.c].unit = null;
             }
             unit.r = newCoords.r;
             unit.c = newCoords.c;
             if (board[unit.r]?.[unit.c]) {
                 board[unit.r][unit.c].unit = unit;
             }
        }
         // Las unidades en ruta comercial siempre están listas para su siguiente movimiento automático
        if (unit.player !== BankManager.PLAYER_ID) {
            unit.hasMoved = false;
            unit.hasAttacked = false;
        }
    });

    if (UIManager && UIManager.renderAllUnitsFromData) {
        UIManager.renderAllUnitsFromData();
    }
}

/**
 * Calcula y asigna los Puntos de Victoria al final de una ronda.
 */
function calculateVictoryPoints() {

    if (gameState.turnNumber < 11) return;

    // Bloque de seguridad: Si playerStats no existe, lo inicializamos.
    ensureFullGameState();

    console.log("%c[Victoria por Puntos] Calculando PV para el final de la ronda " + (gameState.turnNumber -1), "background: gold; color: black;");

    const players = Array.from({ length: gameState.numPlayers }, (_, i) => i + 1);
    const metrics = {};

    // 1. Recopilar métricas de todos los jugadores
    players.forEach(p => {
        const playerKey = `player${p}`;
        const playerUnits = units.filter(u => u.player === p);
        metrics[p] = {
            cities: gameState.cities.filter(c => c.owner === p).length,
            armySize: playerUnits.reduce((sum, u) => sum + u.maxHealth, 0),
            longestRoute: playerUnits.filter(u => u.tradeRoute).reduce((max, u) => Math.max(max, u.tradeRoute.path.length), 0),
            kills: gameState.playerStats.unitsDestroyed[playerKey] || 0,
            techs: gameState.playerResources[p].researchedTechnologies.length,
            heroes: playerUnits.filter(u => u.commander).length,
            resources: Object.values(gameState.playerResources[p]).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0),
            trades: gameState.playerStats.sealTrades[playerKey] || 0
        };
    });
    
    const vp = gameState.victoryPoints;
    const oldHolders = { ...vp.holders };

    // 2. Determinar quién ostenta cada título
    const findWinner = (metric) => {
        let maxVal = -1;
        let winner = null;
        players.forEach(p => {
            if (metrics[p][metric] > maxVal) {
                maxVal = metrics[p][metric];
                winner = `player${p}`;
            } else if (metrics[p][metric] === maxVal) {
                winner = null; // Empate anula el punto
            }
        });
        // Aplicar condiciones mínimas
        if (metric === 'longestRoute' && maxVal < 5) return null;
        if (metric === 'resources' && maxVal < 25000) return null; // 5000 * 5 recursos
        return winner;
    };

    vp.holders.mostCities = findWinner('cities');
    vp.holders.largestArmy = findWinner('armySize');
    vp.holders.longestRoute = findWinner('longestRoute');
    vp.holders.mostKills = findWinner('kills');
    vp.holders.mostTechs = findWinner('techs');
    vp.holders.mostHeroes = findWinner('heroes');
    vp.holders.mostResources = findWinner('resources');

    // Lógica especial para empates en comercio
    let maxTrades = -1;
    players.forEach(p => { maxTrades = Math.max(maxTrades, metrics[p].trades); });
    vp.holders.mostTrades = [];
    if (maxTrades > 0) {
        players.forEach(p => {
            if (metrics[p].trades === maxTrades) {
                vp.holders.mostTrades.push(`player${p}`);
            }
        });
    }

    // 3. Recalcular totales y anunciar cambios
    players.forEach(p => {
        const playerKey = `player${p}`;
        let totalPoints = vp.ruins[playerKey] || 0;
        for (const holder in vp.holders) {
            if (Array.isArray(vp.holders[holder])) {
                if (vp.holders[holder].includes(playerKey)) totalPoints++;
            } else {
                if (vp.holders[holder] === playerKey) totalPoints++;
            }
        }
        vp[playerKey] = totalPoints;
    });

    // Anunciar cambios de titularidad
    for (const holder in vp.holders) {
        if (vp.holders[holder] !== oldHolders[holder]) {
            if (vp.holders[holder]) {
                 logMessage(`¡${vp.holders[holder]} ahora ostenta el título de "${holder}"!`, "event");
            }
        }
    }
    
    // 4. Comprobar victoria
    players.forEach(p => {
        if (vp[`player${p}`] >= 9) {
            logMessage(`¡El Jugador ${p} ha alcanzado 9 Puntos de Victoria y gana la partida!`, "victory");
            endTacticalBattle(p);
        }
    });

    // Llamar a la UI para que actualice el display
    if (typeof UIManager !== 'undefined' && UIManager.updateVictoryPointsDisplay) {
        UIManager.updateVictoryPointsDisplay();
    }

    console.log("[Victoria por Puntos] Estado actualizado:", JSON.parse(JSON.stringify(vp)));
}