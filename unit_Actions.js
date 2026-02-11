/// unit_Actions.js
// Lógica relacionada con las acciones de las unidades (selección, movimiento, ataque, colocación).

// ========== VERSIÓN DE CÓDIGO: v3.2 - ANTI-RACE CONDITION MEJORADA ==========
console.log("%c[SISTEMA] unit_Actions.js v3.2 CARGADO - actionId con validación de timestamp", "background: #00FF00; color: #000; font-weight: bold; padding: 4px;");

// Sistema de prevención de race conditions
const ActionValidator = {
    pendingActions: new Map(), // Key: unitId, Value: {actionId, timestamp}
    ACTION_TIMEOUT: 1000, // 1 segundo de timeout
    
    canPerformAction(unitId, newActionId) {
        const pending = this.pendingActions.get(unitId);
        const now = Date.now();
        
        if (!pending) return true;
        
        // Si la acción pendiente expiró, permitir nueva acción
        if (now - pending.timestamp > this.ACTION_TIMEOUT) {
            this.pendingActions.delete(unitId);
            return true;
        }
        
        // Si es la misma actionId, es duplicada
        if (pending.actionId === newActionId) {
            console.warn(`[ActionValidator] Acción duplicada detectada para unidad ${unitId}`);
            return false;
        }
        
        // Hay otra acción reciente en progreso
        console.warn(`[ActionValidator] Acción bloqueada: otra acción en progreso para unidad ${unitId}`);
        return false;
    },
    
    registerAction(unitId, actionId) {
        this.pendingActions.set(unitId, {
            actionId,
            timestamp: Date.now()
        });
    },
    
    completeAction(unitId) {
        this.pendingActions.delete(unitId);
    },
    
    cleanup() {
        const now = Date.now();
        for (const [unitId, action] of this.pendingActions) {
            if (now - action.timestamp > this.ACTION_TIMEOUT * 2) {
                this.pendingActions.delete(unitId);
            }
        }
    }
};

function showFloatingDamage(target, damageAmount) {
    // Verificación robusta. gameBoard se obtiene directamente del DOM por seguridad.
    const gameBoardElement = document.getElementById('gameBoard');
    if (!target?.element || !gameBoardElement) {
        console.error("showFloatingDamage: No se puede mostrar el daño. Target, su elemento, o el gameBoard no existen.");
        return;
    }

    const damageText = document.createElement('span');
    damageText.className = 'damage-dealt-text';
    damageText.textContent = `-${damageAmount}`;

    // Lo añadimos al gameBoard para que se posicione relativo a él.
    gameBoardElement.appendChild(damageText);

    // Obtenemos el centro de la unidad atacada, relativo al gameBoard
    const unitCenterX = target.element.offsetLeft + target.element.offsetWidth / 2;
    const unitCenterY = target.element.offsetTop + target.element.offsetHeight / 2;

    // Ahora que está en el DOM, su `offsetWidth` es válido. Centramos el texto.
    damageText.style.left = `${unitCenterX - damageText.offsetWidth / 2}px`;
    damageText.style.top = `${unitCenterY - damageText.offsetHeight / 2}px`;

    // La animación CSS se encarga del resto. Lo eliminamos después.
    setTimeout(() => {
        damageText.remove();
    }, 1200); // Duración de la animación.
}

function getHexDistance(startCoords, endCoords) {
    if (!startCoords || !endCoords) return Infinity;
    if (startCoords.r === endCoords.r && startCoords.c === endCoords.c) return 0;

    let queue = [{ r: startCoords.r, c: startCoords.c, dist: 0 }];
    let visited = new Set();
    visited.add(`${startCoords.r},${startCoords.c}`);
    
    const maxDistanceToSearch = startCoords.attackRange ? startCoords.attackRange + 2 : 30;
    let iterations = 0;

    while(queue.length > 0 && iterations < maxDistanceToSearch * 7) { 
        iterations++;
        let curr = queue.shift();
        if (curr.r === endCoords.r && curr.c === endCoords.c) return curr.dist;
        if (curr.dist >= maxDistanceToSearch) continue;

        let neighbors = getHexNeighbors(curr.r, curr.c);
        for (const n of neighbors) {
            const key = `${n.r},${n.c}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ r: n.r, c: n.c, dist: curr.dist + 1});
            }
        }
    }
    return Infinity; 
}

function checkAndApplyLevelUp(unit) {
    if (!unit || !XP_LEVELS) return false; 
    if (XP_LEVELS[unit.level]?.nextLevelXp === 'Max') return false; 

    let newLevelAssigned = false;
    while (true) {
        const currentLevelData = XP_LEVELS[unit.level];
        if (!currentLevelData || currentLevelData.nextLevelXp === 'Max') {
            break; 
        }
        let awardedLevel = 0;
        for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
            if (XP_LEVELS[i].nextLevelXp === 'Max' && XP_LEVELS[i-1] && unit.experience >= XP_LEVELS[i-1].nextLevelXp) { 
                 awardedLevel = i;
                 break;
            }
            if (typeof XP_LEVELS[i].nextLevelXp === 'number' && unit.experience >= XP_LEVELS[i].nextLevelXp) {
                awardedLevel = i;
                break;
            }
        }
        if (unit.experience < XP_LEVELS[1].nextLevelXp ) { 
             awardedLevel = 0;
        }

        if (awardedLevel > unit.level) {
            unit.level = awardedLevel;
            const newLevelData = XP_LEVELS[unit.level];
            newLevelAssigned = true;
            if (typeof logMessage === "function") logMessage(`${unit.name} ha subido a Nivel ${unit.level} (${newLevelData.currentLevelName})!`);
            if (newLevelData.nextLevelXp === 'Max') break;
        } else {
            break;
        }
    }

    if (newLevelAssigned) {
        if (selectedUnit && selectedUnit.id === unit.id && typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) {
            UIManager.showUnitContextualInfo(selectedUnit, true);
        }
    }
    return newLevelAssigned;
}

function placeFinalizedDivision(unitData, r, c) {
    if (!unitData) { console.error("[placeFinalizedDivision] Intento de colocar unidad con datos nulos."); return; }
    const targetHexData = board[r]?.[c];
    if (targetHexData?.unit && targetHexData.unit.id !== unitData.id) {
        console.error(`[placeFinalizedDivision] Hex (${r},${c}) ya ocupado por ${targetHexData.unit.name || targetHexData.unit.id}. Abortando colocacion.`);
        return;
    }
    if (!unitData.id) unitData.id = `u${unitIdCounter++}`;
    unitData.r = r; unitData.c = c; unitData.element = null;
    if (Array.isArray(unitData.regiments)) {
        const maxRegs = Number.isFinite(MAX_REGIMENTS_PER_DIVISION) ? MAX_REGIMENTS_PER_DIVISION : 20;
        if (unitData.regiments.length > maxRegs) {
            console.warn(`[placeFinalizedDivision] ${unitData.name || unitData.id} excede el limite de ${maxRegs} regimientos. Recortando.`);
            unitData.regiments = unitData.regiments.slice(0, maxRegs);
        }
        unitData.regiments.forEach(reg => {
            if (!reg) return;
            if (reg.health == null) {
                const baseHealth = REGIMENT_TYPES?.[reg.type]?.health;
                if (baseHealth != null) reg.health = baseHealth;
            }
        });
    }
    const existingIndex = units.findIndex(u => u.id === unitData.id);
    if (existingIndex > -1) {
        if (typeof UnitGrid !== 'undefined') {
            UnitGrid.unindex(units[existingIndex]);
        }
        if(units[existingIndex].element) units[existingIndex].element.remove();
        units.splice(existingIndex, 1);
    }
    units.push(unitData);

    if (typeof UnitGrid !== 'undefined') {
        UnitGrid.index(unitData);
    }

    if (targetHexData) {
        targetHexData.unit = unitData;
        const bankPlayerId = typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : null;
        if (targetHexData.owner === null && unitData.player !== bankPlayerId) {
            const placingPlayer = unitData.player; targetHexData.owner = placingPlayer; targetHexData.estabilidad = 1;
            targetHexData.nacionalidad = { 1: 0, 2: 0 }; targetHexData.nacionalidad[placingPlayer] = 1;
            const city = gameState.cities.find(ci => ci.r === r && ci.c === c);
            if (city?.owner === null) { city.owner = placingPlayer; logMessage(`Ciudad neutral capturada!`); }
        }
    }
    
    calculateRegimentStats(unitData);

    if (Array.isArray(unitData.regiments) && unitData.regiments.length > 0) {
        const healthFromRegs = unitData.regiments.reduce((sum, reg) => {
            const baseHealth = REGIMENT_TYPES?.[reg.type]?.health || 0;
            return sum + (reg?.health ?? baseHealth);
        }, 0);
        if (!Number.isFinite(unitData.currentHealth) || unitData.currentHealth > healthFromRegs) {
            unitData.currentHealth = healthFromRegs;
        }
    } else if (!Number.isFinite(unitData.currentHealth)) {
        unitData.currentHealth = unitData.maxHealth || 0;
    }
    
    // <<== LÍNEA PROBLEMÁTICA ELIMINADA ==>>
    // Se eliminó la línea: if (!unitData.isSplit) { unitData.currentHealth = unitData.maxHealth; }
    // Ahora se respetará la vida actual que ya trae el objeto `unitData`.
    
    if (UIManager && typeof UIManager.renderAllUnitsFromData === 'function') {
        UIManager.renderAllUnitsFromData();
    } else {
        console.error("CRÍTICO: UIManager.renderAllUnitsFromData no está disponible.");
    }
    
    renderSingleHexVisuals(r, c);
    
    if (typeof updateFogOfWar === 'function') updateFogOfWar();

    if (gameState.currentPhase === "deployment") {
        if (!gameState.unitsPlacedByPlayer[unitData.player]) gameState.unitsPlacedByPlayer[unitData.player] = 0;
        gameState.unitsPlacedByPlayer[unitData.player]++;
        logMessage(`J${unitData.player} desplegó ${gameState.unitsPlacedByPlayer[unitData.player]}/${gameState.deploymentUnitLimit === Infinity ? '∞' : gameState.deploymentUnitLimit}.`);
        
        // CORRECCIÓN: Actualizar la UI para ocultar el botón si se alcanzó el límite
        if (UIManager && typeof UIManager.updateActionButtonsBasedOnPhase === 'function') {
            UIManager.updateActionButtonsBasedOnPhase();
        }
    }
}

function splitUnit(originalUnit, targetR, targetC) {
    if (!originalUnit || !originalUnit.regiments || !gameState.preparingAction) return false;
    const actionData = gameState.preparingAction;
    const targetHexData = board[targetR]?.[targetC];
    if (!targetHexData || targetHexData.unit) return false;

    const newUnitRegiments = actionData.newUnitRegiments;
    const remainingOriginalRegiments = actionData.remainingOriginalRegiments;

    originalUnit.regiments = remainingOriginalRegiments;
    calculateRegimentStats(originalUnit);
    originalUnit.currentHealth = originalUnit.regiments.reduce((s, r) => s + (r.health || 0), 0);
    originalUnit.currentMovement = originalUnit.movement;

    const newUnitData = {
        id: `u${unitIdCounter++}`,
        player: originalUnit.player,
        name: `${getAbbreviatedName(newUnitRegiments[0].type)} (Div.)`, 
        regiments: newUnitRegiments,
        r: -1, c: -1, hasMoved: false, hasAttacked: false,
        isSplit: true,
        // (el resto de tus propiedades iniciales...)
        
    };
    
    calculateRegimentStats(newUnitData);
    newUnitData.currentHealth = newUnitData.regiments.reduce((s, r) => s + (r.health || 0), 0);
    newUnitData.currentMovement = newUnitData.movement; // Asignar el movimiento a la nueva unidad

    placeFinalizedDivision(newUnitData, targetR, targetC);

    // Otorgar puntos de investigación por división creada
    if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.onUnitSplit) {
        ResearchRewardsManager.onUnitSplit(originalUnit.player);
    }

    if (UIManager) {
        UIManager.updateUnitStrengthDisplay(originalUnit);
        UIManager.showUnitContextualInfo(originalUnit, true);
    }

    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('unit_split');
    }
    logMessage(`División completada.`);

    deselectUnit();
    return true; 
}

function recalculateUnitHealth(unit) {
    if (!unit || !unit.regiments) return;
    const newTotalHealth = unit.regiments.reduce((sum, reg) => sum + (reg.health || 0), 0);
    unit.currentHealth = newTotalHealth;
    if (UIManager) UIManager.updateUnitStrengthDisplay(unit);
}

async function mergeUnits(mergingUnit, targetUnit) {
    if (!mergingUnit || !targetUnit || mergingUnit.player !== targetUnit.player || mergingUnit.id === targetUnit.id) {
        return false;
    }
    const isEmbarking = REGIMENT_TYPES[targetUnit.regiments[0]?.type]?.is_naval && !REGIMENT_TYPES[mergingUnit.regiments[0]?.type]?.is_naval;
    const isLandMerge = !REGIMENT_TYPES[targetUnit.regiments[0]?.type]?.is_naval && !REGIMENT_TYPES[mergingUnit.regiments[0]?.type]?.is_naval;
    const isNavalMerge = REGIMENT_TYPES[targetUnit.regiments[0]?.type]?.is_naval && REGIMENT_TYPES[mergingUnit.regiments[0]?.type]?.is_naval;
    if (!isEmbarking && !isLandMerge && !isNavalMerge) {
        logMessage("Esta combinación de unidades no se puede fusionar.", "warning");
        return false;
    }
    const totalRegiments = (targetUnit.regiments?.length || 0) + (mergingUnit.regiments?.length || 0);
    if (totalRegiments > MAX_REGIMENTS_PER_DIVISION) {
        logMessage(`Límite de regimientos excedido.`, "warning");
        return false;
    }
    
    // CORRECCIÓN: La confirmación ya se hizo en RequestMergeUnits antes de enviar la acción
    // Por lo tanto, cuando esta función se ejecuta, ya está confirmado
    // Eliminamos el window.confirm para evitar que aparezca en el anfitrión
    
    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('unit_merged');
    }
    if (mergingUnit.commander && !targetUnit.commander) {
        targetUnit.commander = mergingUnit.commander;
    }
    const oldTargetHealth = targetUnit.currentHealth;
    mergingUnit.regiments.forEach(reg => targetUnit.regiments.push(reg));

    calculateRegimentStats(targetUnit);
    // La salud se suma, sin exceder el nuevo máximo
    targetUnit.currentHealth = Math.min(oldTargetHealth + mergingUnit.currentHealth, targetUnit.maxHealth);

    // CORRECCIÓN CRÍTICA: Esperar a que handleUnitDestroyed complete la eliminación
    // antes de continuar con la actualización de la UI y el broadcast del estado
    await handleUnitDestroyed(mergingUnit, null);
    
    // <<==El movimiento actual se recarga ==>
    targetUnit.hasMoved = false;
    targetUnit.hasAttacked = false;
    targetUnit.currentMovement = targetUnit.movement; // Se recarga el movimiento de la nueva mega-unidad

    if (UIManager) {
        UIManager.showUnitContextualInfo(targetUnit, true);
        UIManager.renderAllUnitsFromData();
    }

    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('unitHasMerge');
    }

    logMessage(`Fusión completa.`, "success");
    return true;
}

function prepareSplitOrDisembark(unit) {
    if (!unit || unit.player !== gameState.currentPlayer) {
        console.error("[Disembark/Split] Intento de actuar sobre unidad inválida.");
        return;
    }
    
    // Si la unidad ya ha actuado, no puede ni dividir ni desembarcar
    if (unit.hasMoved || unit.hasAttacked) {
        logMessage("Esta unidad ya ha actuado este turno.");
        return;
    }

    // Comprobamos la composición de la unidad
    const hasNavalRegiments = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
    const hasLandRegiments = unit.regiments.some(reg => !REGIMENT_TYPES[reg.type]?.is_naval);

    

    // CASO 1: Es una unidad mixta (transporte con tropas). DEBE desembarcar/dividir.
    if (hasNavalRegiments && hasLandRegiments) {
        if (typeof openAdvancedSplitUnitModal === "function") openAdvancedSplitUnitModal(unit);
    } 
    // CASO 2: Es una unidad de tierra con múltiples regimientos. Puede dividirse en tierra.
    else if (!hasNavalRegiments && unit.regiments.length > 1) {
        if (typeof openAdvancedSplitUnitModal === "function") openAdvancedSplitUnitModal(unit);
    }
    // CASO 3: Es una flota naval pura con múltiples regimientos. Puede dividirse en agua.
    else if (hasNavalRegiments && !hasLandRegiments && unit.regiments.length > 1) {
        if (typeof openAdvancedSplitUnitModal === "function") openAdvancedSplitUnitModal(unit);
    }
    // CASO 4: Unidad con un solo regimiento.
    else {
        logMessage("Esta unidad no se puede dividir.");
    }
}

let _currentPreparingAction = null; 

function cancelPreparingAction() {
    // Si realmente hay una acción preparada (y no está en mitad de la ejecución), la cancelamos.
    if (gameState.preparingAction) {
        console.log("[Acción Cancelada] Limpiando estado 'preparingAction'.");
        gameState.preparingAction = null;
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) {
            UIManager.clearHighlights();
        }
    }
}

function handleActionWithSelectedUnit(r_target, c_target, clickedUnitOnTargetHex) {
    // Log de Entrada (se mantiene sin cambios)
    console.log(`--- DENTRO DE handleActionWithSelectedUnit ---`);
    console.log(`Objetivo del Clic: ${clickedUnitOnTargetHex ? clickedUnitOnTargetHex.name : 'Casilla Vacía'} en (${r_target},${c_target})`);

    if (!selectedUnit) {
        console.error("[handleAction] ERROR FATAL: Se llamó a la función pero 'selectedUnit' es nulo.");
        return false;
    }

    // --- MANEJO DE ACCIÓN PREPARADA (AQUÍ ESTÁ LA CORRECCIÓN) ---
    if (gameState.preparingAction && gameState.preparingAction.unitId === selectedUnit.id) {
        if (gameState.preparingAction.type === 'split_unit') {
            if (isNetworkGame()) {
                // En partidas de red, usar el sistema de red
                RequestSplitUnit(selectedUnit, r_target, c_target);
                cancelPreparingAction();
                return true;
            } else {
                // En partidas locales, usar el método directo
                if (splitUnit(selectedUnit, r_target, c_target)) {
                    success = true;
                    console.log("[handleAction] División exitosa. Finalizando y limpiando acción preparada.");
                    cancelPreparingAction();
                    return true;
                }
            }
        }
        
        // Si la acción preparada no se pudo completar (p.ej. clic en casilla inválida),
        // devolvemos false, pero NO limpiamos la acción, permitiendo al jugador intentarlo de nuevo en otra casilla.
        return false;
    }

    // --- MANEJO DE CLIC DIRECTO ---
    
    // CASO 1: Se hizo clic sobre una unidad.
    if (clickedUnitOnTargetHex) {
        
        // Subcaso 1.1: Es una unidad ENEMIGA.
        if (clickedUnitOnTargetHex.player !== selectedUnit.player) {
            if (isValidAttack(selectedUnit, clickedUnitOnTargetHex)) {
                console.log(`[handleAction] ¡ATAQUE VÁLIDO! Iniciando RequestAttackUnit...`);
                RequestAttackUnit(selectedUnit, clickedUnitOnTargetHex);
                return true; 
            } else {
                logMessage(`${selectedUnit.name} no puede atacar a ${clickedUnitOnTargetHex.name}.`);
            }
        }
        // Subcaso 1.2: Es una unidad AMIGA.
        else {
            if (clickedUnitOnTargetHex.id === selectedUnit.id) return false;
            
            if (isValidMove(selectedUnit, r_target, c_target, true)) {
                console.log(`[handleAction] ¡FUSIÓN VÁLIDA! Iniciando RequestMergeUnits...`);
                RequestMergeUnits(selectedUnit, clickedUnitOnTargetHex);
                return true;
            }
        }
    }
    // CASO 2: Se hizo clic sobre una casilla VACÍA.
    else {
        if (isValidMove(selectedUnit, r_target, c_target, false)) {
         // Ahora decidimos qué función llamar basándonos en si es una partida en red o no.   
            if (isNetworkGame()) {
                RequestMoveUnit(selectedUnit, r_target, c_target);
            } else {
                _executeMoveUnit(selectedUnit, r_target, c_target);
            }
            return true;
        }
    }
    
    // Si ninguna de las condiciones anteriores se cumplió, entonces sí, ninguna acción fue posible.
    console.log(`[handleAction] Ninguna acción válida se pudo iniciar. Devolviendo 'false'.`);
    return false;
}

function selectUnit(unit) {
    if (!unit) {
        // Si intentamos seleccionar algo nulo, deseleccionamos lo actual y salimos
        if (typeof deselectUnit === "function") deselectUnit();
        return;
    }

    // 1. REGLA: Bloqueo de Control (Unidades Zombis/Desorganizadas)
    // Si es mi unidad pero está desorganizada (Moral 0), no puedo controlarla.
    if (unit.isDisorganized && unit.player === gameState.currentPlayer) {
        logMessage(`No puedes dar órdenes a "${unit.name}". ¡Está desorganizada! (Moral 0)`, "error");
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click'); 
        return; 
    }

    // 2. REGLA: Turno y Propiedad
    // Si estamos en fase de juego y no es mi turno o no es mi unidad,
    // solo permitimos seleccionarla para ver sus stats, pero no la activamos como "selectedUnit" para mover.
    if (gameState.currentPhase === 'play' && unit.player !== gameState.currentPlayer) {
        // Mostramos info pero no la seleccionamos como "activa"
        if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) {
            UIManager.showUnitContextualInfo(unit, false); // false = sin botones de acción
        }
        // Aseguramos que no se quede nada seleccionado
        if (typeof deselectUnit === "function") deselectUnit();
        return; 
    }

    // 3. REGLA: Caso especial de División (Split)
    // Si estoy en medio de dividir esta misma unidad, refrescamos los highlights
    if (selectedUnit && selectedUnit.id === unit.id && gameState.preparingAction?.type === 'split_unit') {
        if (typeof highlightPossibleActions === "function") highlightPossibleActions(selectedUnit);
        return; 
    }
    
    // Si selecciono una unidad diferente a la que ya tenía, deselecciono la anterior
    if (selectedUnit && selectedUnit.id !== unit.id) {
        if (typeof deselectUnit === "function") deselectUnit();
    }

    // --- ASIGNACIÓN DE SELECCIÓN ---
    selectedUnit = unit;
    
    if (gameState) {
        gameState.selectedHexR = unit.r;
        gameState.selectedHexC = unit.c;
    }

    // Resaltado visual (círculo dorado)
    if (unit.element) {
        unit.element.classList.add('selected-unit');
    } else {
        console.warn(`[selectUnit] La unidad ${unit.name} no tiene elemento DOM. Intentando reposicionar...`);
        if (typeof positionUnitElement === 'function') positionUnitElement(unit);
    }
    
    // Feedback de audio/texto
    logMessage(`${unit.name} seleccionada.`);

    // 4. GESTIÓN DE UI (Panel Contextual)
    const isBroken = unit.morale <= 0;
    const canAct = gameState.currentPhase !== 'play' || (!unit.hasMoved && !unit.hasAttacked);

    if (typeof UIManager !== 'undefined') {
        // Mostrar panel inferior
        if (UIManager.showUnitContextualInfo) {
            UIManager.showUnitContextualInfo(unit, true); // true = mostrar botones
        }

        // Resaltar hexágonos válidos (Movimiento/Ataque)
        if (isBroken) {
            if (UIManager.clearHighlights) UIManager.clearHighlights();
        } else if (canAct) {
            if (UIManager.highlightPossibleActions) UIManager.highlightPossibleActions(unit);
        } else {
            // Si ya actuó, limpiamos highlights
            if (UIManager.clearHighlights) UIManager.clearHighlights();
        }
    }

    // Notificar al tutorial si está activo
    if (gameState.isTutorialActive && typeof TutorialManager !== 'undefined') {
        TutorialManager.notifyActionCompleted('unit_selected_by_objective');
    }

    // --- 5. NUEVO: ABRIR MENÚ RADIAL ---
    console.log('RADIAL CODE REACHED');
    // Solo si es mi unidad, es fase de juego y no está "zombi"
    console.log(`[RADIAL MENU] Verificando condiciones: player=${unit.player}, currentPlayer=${gameState.currentPlayer}, phase=${gameState.currentPhase}, disorganized=${unit.isDisorganized}`);
    if (unit.player === gameState.currentPlayer && gameState.currentPhase === 'play' && !unit.isDisorganized) {
        
        if (unit.element) {
            // Usamos getBoundingClientRect para obtener la posición exacta en pantalla (píxeles)
            // Esto es compatible con zoom y paneo si el menú radial tiene position: fixed
            const rect = unit.element.getBoundingClientRect();
            
            // Calculamos el centro visual de la unidad
            const screenX = rect.left + rect.width / 2;
            const screenY = rect.top + rect.height / 2;
            
            console.log(`[RADIAL MENU] Unidad element rect: left=${rect.left}, top=${rect.top}, width=${rect.width}, height=${rect.height}`);
            console.log(`[RADIAL MENU] Centro calculado: (${screenX}, ${screenY})`);
            
            // Verificar si la unidad está visible en la pantalla
            if (screenX < 0 || screenY < 0 || screenX > window.innerWidth || screenY > window.innerHeight) {
                console.log('[RADIAL MENU] Unidad fuera de la vista, no mostrar menú');
                return;
            }
            
            // Llamar al UIManager para pintar los botones
            if (UIManager && UIManager.showRadialMenu) {
                console.log(`[RADIAL MENU] Llamando a showRadialMenu para unidad ${unit.name} en pantalla (${screenX}, ${screenY})`);
                UIManager.showRadialMenu(unit, screenX, screenY);
            } else {
                console.error('[RADIAL MENU] UIManager.showRadialMenu no está definido');
            }
        } else {
            console.error(`[RADIAL MENU] La unidad ${unit.name} no tiene element DOM`);
        }
    } else {
        console.log('[RADIAL MENU] Condiciones no cumplidas para mostrar menú radial');
    }
}

function deselectUnit() {
    if (selectedUnit && selectedUnit.element) {
        selectedUnit.element.classList.remove('selected-unit');
    }
    selectedUnit = null;
    
    // Si deseleccionas una unidad, cualquier acción que estuvieras preparando
    // con ella debe ser cancelada.
    cancelPreparingAction(); 

    // ... radial táctico ...
    if (UIManager && UIManager.hideRadialMenu) UIManager.hideRadialMenu();
}

/**
 * Valida si un movimiento es legal
 */
function isValidMove(unit, toR, toC, isPotentialMerge = false) {
    // --- 1. VALIDACIONES BÁSICAS ---
    if (!unit) return false;
    if (gameState.currentPhase === 'play' && unit.hasMoved) return false;
    if ((unit.currentMovement || 0) <= 0 && !isPotentialMerge) return false;
    if (unit.r === toR && unit.c === toC) return false;
    
    const targetHexData = board[toR]?.[toC];
    if (!targetHexData) return false;

    // --- 2. VALIDACIONES DE TERRENO, NAVAL Y OCUPACIÓN ---
    const unitRegimentData = REGIMENT_TYPES[unit.regiments[0]?.type];
    const targetUnitOnHex = getUnitOnHex(toR, toC);

    // Regla #1: Unidades navales
    if (unitRegimentData?.is_naval) {
        if (isPotentialMerge) {
            if (!targetUnitOnHex || targetUnitOnHex.player !== unit.player) return false;
            const targetIsNaval = REGIMENT_TYPES[targetUnitOnHex.regiments[0]?.type]?.is_naval;
            if (!targetIsNaval) return false;
            if (targetHexData.terrain !== 'water') return false;
        } else {
            // Solo pueden moverse a casillas de agua vacías
            if (targetHexData.terrain !== 'water' || targetUnitOnHex) {
                return false;
            }
        }
    } 

        // Regla #2: Unidades terrestres
    else {
        // Sub-regla 2.1: ¿Es para fusionar/embarcar?
        if (isPotentialMerge) {
            if (!targetUnitOnHex || targetUnitOnHex.player !== unit.player) return false;
            // Permite movimiento si el objetivo es un barco en agua O una unidad terrestre en tierra
            const targetIsNaval = REGIMENT_TYPES[targetUnitOnHex.regiments[0]?.type]?.is_naval;
            if (targetIsNaval && targetHexData.terrain !== 'water') return false; // Barco debe estar en agua
            if (!targetIsNaval && targetHexData.terrain === 'water') return false; // Unidad de tierra debe estar en tierra
        } 
        // Sub-regla 2.2: ¿Es un movimiento normal a una casilla vacía?
        else {
            if (targetUnitOnHex) return false; // No se puede mover a casillas vacías si están ocupadas

            const unitCategory = unitRegimentData.category;
            const isImpassable = (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land.includes(targetHexData.terrain)) ||
                                 (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[unitCategory] || []).includes(targetHexData.terrain);
            if (isImpassable) return false;
        }
    }
    
    // Comprobar el coste de movimiento
    const cost = getMovementCost(unit, unit.r, unit.c, toR, toC, isPotentialMerge);
    return cost !== Infinity && cost <= (unit.currentMovement || 0);
}

function getMovementCost(unit, r_start, c_start, r_target, c_target, isPotentialMerge = false) {
    if (!unit) return Infinity;
    if (r_start === r_target && c_start === c_target) return 0;

    // --- ZOC Block ---
    let ignoresRule = unit.regiments.every(reg => REGIMENT_TYPES[reg.type]?.abilities?.includes("Jump"));

    const lockingEnemies = getHexNeighbors(r_start, c_start)
        .map(coords => getUnitOnHex(coords.r, coords.c))
        .filter(u => u && u.player !== unit.player);

    if (!ignoresRule && lockingEnemies.length > 0) {
        const isAttackOrMerge = isPotentialMerge || (!!getUnitOnHex(r_target, c_target) && getUnitOnHex(r_target, c_target).player !== unit.player);
            
        if (!isAttackOrMerge) {
            const isMovingTowardsEnemy = lockingEnemies.some(enemy => 
                hexDistance(r_target, c_target, enemy.r, enemy.c) < hexDistance(r_start, c_start, enemy.r, enemy.c)
            );
            if (isMovingTowardsEnemy) return Infinity; 
        }
    }
    // --- End ZOC Block ---

    const unitRegimentData = REGIMENT_TYPES[unit.regiments[0]?.type];
        if (!unitRegimentData) return Infinity; // No se puede mover si no hay datos del regimiento

    // Se detecta si la unidad que se mueve tiene la habilidad.
    const hasJumpAbility = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.abilities?.includes("Jump"));

    let queue = [{ r: r_start, c: c_start, cost: 0 }];
    let visited = new Map([[`${r_start},${c_start}`, 0]]);

    while (queue.length > 0) {
        // No es necesario ordenar la cola para un BFS simple de coste, procesamos en orden de llegada.
        let current = queue.shift();
        
        // Condición de éxito: hemos llegado al hexágono de destino
        if (current.r === r_target && current.c === c_target) return current.cost;
        // No buscar caminos absurdamente largos
        if (current.cost > (unit.movement || 1) * 3) continue;

        let neighbors = getHexNeighbors(current.r, current.c);
        for (const neighbor of neighbors) {
            const neighborHexData = board[neighbor.r]?.[neighbor.c];
            if (!neighborHexData) continue;
            
            const neighborKey = `${neighbor.r},${neighbor.c}`;
            const unitAtNeighbor = getUnitOnHex(neighbor.r, neighbor.c);
            
                // --- INICIO LÓGICA DE VALIDEZ DE MOVIMIENTO ---
            let canPassThrough = false;

            // CASO 1: Movimiento a un hexágono vacío.
            const isMyTrade = !!unit.tradeRoute;
            const isNeighborTrade = unitAtNeighbor && !!unitAtNeighbor.tradeRoute;

            if (!unitAtNeighbor) {
                // Si la casilla está vacía, se verifican las reglas normales de terreno.
                if (unitRegimentData.is_naval) canPassThrough = neighborHexData.terrain === 'water';
                else {
                    const unitCategory = unitRegimentData.category;
                    const isImpassable = (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land.includes(neighborHexData.terrain)) ||
                                        (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[unitCategory] || []).includes(neighborHexData.terrain);
                    canPassThrough = !isImpassable;
                }
            } 
            // Si la casilla está ocupada, se comprueba si es un aliado y si tenemos "Jump".
            else if (isMyTrade && isNeighborTrade) {
                canPassThrough = true;
            }
            else if (unitAtNeighbor.player === unit.player && (hasJumpAbility || isPotentialMerge)) {
                 // Solo permitimos entrar si el vecino es el hexágono exacto de nuestro objetivo de fusión.
                canPassThrough = true;
            }
            
                // Un movimiento NUNCA puede terminar en una casilla ocupada, aunque se pueda pasar por ella.
            if (isPotentialMerge === false && neighbor.r === r_target && neighbor.c === c_target && unitAtNeighbor) {
                canPassThrough = false;
            }

            if (canPassThrough) { 
                let moveCost = 1.0; 

                    // 1. PRIORIDAD MÁXIMA: Comprobar si hay una ESTRUCTURA y no es una unidad naval.
                if (neighborHexData.structure && !unitRegimentData.is_naval) {
                    const structureData = STRUCTURE_TYPES[neighborHexData.structure];
                        // Si la estructura define un coste de movimiento, lo usamos.
                        if (structureData && typeof structureData.movementCost === 'number') {
                            moveCost = structureData.movementCost;
                    } 
                } 
                    // 2. SI NO HAY ESTRUCTURA: Usamos el coste del TERRENO.
                else if (TERRAIN_TYPES[neighborHexData.terrain]) {
                    moveCost = TERRAIN_TYPES[neighborHexData.terrain].movementCostMultiplier;
                }
                
                const newCost = current.cost + moveCost;

                    // La validación de coste ahora debe usar el movimiento TOTAL, no el actual, para el pathfinding.
                if ((!visited.has(neighborKey) || newCost < visited.get(neighborKey)) && newCost <= (unit.movement || 0) * 2 ) { 
                    visited.set(neighborKey, newCost);
                    queue.push({ r: neighbor.r, c: neighbor.c, cost: newCost });
                }
            }
        }
    }

        // Si la cola se agota y no se encontró el destino, es inalcanzable.
    return Infinity;
}

async function moveUnit(unit, toR, toC) {
    const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;

    if (isNetworkGame()) {
        console.error("Llamada inválida a moveUnit() en juego de red. Usa RequestMoveUnit() en su lugar.");
        return;
    }

    // --- EL CÓDIGO ORIGINAL SE EJECUTA SOLO PARA PARTIDAS LOCALES ---
    const fromR = unit.r;
    const fromC = unit.c;
    const targetHexData = board[toR]?.[toC];

    // Guardar estado para la función "deshacer"
    unit.lastMove = {
        fromR: fromR,
        fromC: fromC,
        initialCurrentMovement: unit.currentMovement, 
        initialHasMoved: unit.hasMoved,              
        initialHasAttacked: unit.hasAttacked,         
        movedToHexOriginalOwner: targetHexData ? targetHexData.owner : null 
    };
    
    let costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC);
    if (costOfThisMove === Infinity) return;

    // Quitar la unidad del hexágono original
    if (board[fromR]?.[fromC]) {
        board[fromR][fromC].unit = null;
        renderSingleHexVisuals(fromR, fromC);
    }
    
    // Mover la unidad al nuevo hexágono
    unit.r = toR;
    unit.c = toC;
    unit.currentMovement -= costOfThisMove;
    unit.hasMoved = true;

    if (typeof UnitGrid !== 'undefined' && Array.isArray(units) && units.includes(unit)) {
        const moved = UnitGrid.move(unit, fromR, fromC);
        if (!moved) {
            UnitGrid.index(unit);
        }
    }
    
    if (targetHexData) {
        targetHexData.unit = unit;

        // <<== SOLUCIÓN PROBLEMA 1 (Parte A): CAPTURA DE HEXÁGONO NEUTRAL ==>>
        const originalOwner = targetHexData.owner;
        const movingPlayer = unit.player;
        const bankPlayerId = typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : null;

        // Si la casilla era Neutral, la capturas inmediatamente.
        if (originalOwner === null && movingPlayer !== bankPlayerId) {
            targetHexData.owner = movingPlayer;
            // Inicializar estabilidad y nacionalidad a 1.
            targetHexData.estabilidad = 1;
            targetHexData.nacionalidad = { 1: 0, 2: 0 }; // Reiniciar ambas
            targetHexData.nacionalidad[movingPlayer] = 1; // Poner la tuya a 1

            logMessage(`¡Has ocupado un territorio neutral en (${toR}, ${toC})!`);

            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city && city.owner === null) {
                city.owner = movingPlayer;
                logMessage(`¡La ciudad neutral '${city.name}' se une a tu imperio!`);
            }
            renderSingleHexVisuals(toR, toC);

            if (typeof Chronicle !== 'undefined') {
                Chronicle.logEvent('conquest', { unit: unit, toR: toR, toC: toC });
            }
            if (typeof StatTracker !== 'undefined') {
                const turn = gameState.turnNumber || 1;
                StatTracker.recordEvent(
                    turn,
                    'conquer',
                    unit.player,
                    `Conquista en (${toR},${toC})`,
                    { location: `(${toR},${toC})` }
                );
            }

            // <<== CAPTURA DE EVENTO CONQUISTA PARA REPLAY ==>>
            if (typeof ReplayIntegration !== 'undefined') {
                ReplayIntegration.recordConquest(toR, toC, unit.player, `Jugador ${unit.player}`);
            }
        }

    } else { 
        console.error(`[moveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += costOfThisMove; unit.hasMoved = false;
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit;
        renderSingleHexVisuals(fromR, fromC); 
        return;
    }
    if (gameState.isTutorialActive) gameState.tutorial.unitHasMoved = true;
    logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);
    if (typeof positionUnitElement === "function") positionUnitElement(unit); 
    if (UIManager) {
        UIManager.updateSelectedUnitInfoPanel();
        UIManager.updatePlayerAndPhaseInfo();
    }
    
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") {
        if (checkVictory()) return;
    }
    
    // Si la unidad que se movió sigue siendo la unidad seleccionada,
    if (selectedUnit && selectedUnit.id === unit.id) {
        // llama al UIManager para actualizar el resaltado de acciones desde su nueva posición.
        UIManager.highlightPossibleActions(unit);
    }
}

function positionUnitElement(unit) {
    if (!unit || !unit.element || !(unit.element instanceof HTMLElement)) {
        console.error("[positionUnitElement] Error: Unidad o elemento DOM no válido.", unit);
        return;
    }

    // Usamos setTimeout con un retardo de 0. Esto empuja la ejecución de este bloque
    // al final de la cola de eventos actual del navegador, dándole tiempo a renderizar el
    // elemento que acabamos de añadir al DOM en 'placeFinalizedDivision'.
    setTimeout(() => {
        // Ponemos toda la lógica de posicionamiento DENTRO del setTimeout.
        // Nos aseguramos de tener una referencia fresca al elemento, por si acaso.
        const elementToPosition = unit.element; 
        if (!elementToPosition) return;

        // Comprobación de constantes 
        if (typeof HEX_WIDTH === 'undefined') {
            elementToPosition.style.left = (unit.c * 60) + 'px';
            elementToPosition.style.top = (unit.r * 70) + 'px';
            elementToPosition.style.display = 'flex';
            return;
        }

        // Cálculo de posición 
        const unitWidth = elementToPosition.offsetWidth || 36;
        const unitHeight = elementToPosition.offsetHeight || 36;
        const xPos = unit.c * HEX_WIDTH + (unit.r % 2 !== 0 ? HEX_WIDTH / 2 : 0) + (HEX_WIDTH - unitWidth) / 2;
        const yPos = unit.r * HEX_VERT_SPACING + (HEX_HEIGHT - unitHeight) / 2;

        if (isNaN(xPos) || isNaN(yPos)) {
            console.error(`[positionUnitElement async] xPos o yPos es NaN para ${unit.name}.`);
            return;
        }

        // Aplicación de estilos 
        elementToPosition.style.left = `${xPos}px`;
        elementToPosition.style.top = `${yPos}px`;
        elementToPosition.style.display = 'flex';
    }, 0); 
}

function isValidAttack(attacker, defender) {
    if (!attacker || !defender) return false;
    if (attacker.player === defender.player) return false;
    
    if (gameState.isTutorialActive && gameState.tutorial.force_attack_allowed) {
        // Permitido en tutorial
    } else {
        if (gameState.currentPhase === 'play' && attacker.player === gameState.currentPlayer && attacker.hasAttacked) {
            return false;
        }
    }

    // --- 2. CÁLCULO DEL RANGO FINAL CON HABILIDADES ---
    let finalRange = attacker.attackRange || 1;

    // <<== INICIO DE LA INTEGRACIÓN DE TALENTOS ==>>
    const talentBonuses = calculateTalentBonuses(attacker);
    if (talentBonuses && talentBonuses.attackRange_flat) {
        finalRange += talentBonuses.attackRange_flat;
    }
    // <<== FIN DE LA INTEGRACIÓN DE TALENTOS ==>>

    if (attacker.commander) {
        const commanderData = COMMANDERS[attacker.commander];
        const playerProfile = PlayerDataManager.getCurrentPlayer();
        const heroInstance = playerProfile?.heroes.find(h => h.id === attacker.commander);

        if (commanderData && heroInstance) {
            commanderData.skills.forEach((skill, index) => {
                const skillDef = SKILL_DEFINITIONS[skill.skill_id];
                const starsRequired = index + 1;
                
                if (heroInstance.stars >= starsRequired && skillDef?.scope === 'ataque' && skillDef.effect?.stat === 'attackRange') {
                    const typeFilter = skillDef.filters?.type;
                    if (typeFilter) {
                        const canBenefit = attacker.regiments.some(reg => typeFilter.includes(reg.type));
                        if (canBenefit) {
                            const skillLevel = heroInstance.skill_levels[index] || (index === 0 ? 1 : 0);
                            if (skillLevel > 0 && skill.scaling_override) {
                                const bonusValue = skill.scaling_override[skillLevel - 1];
                                finalRange += bonusValue;
                            }
                        }
                    }
                }
            });
        }
    }

    // --- 3. TUS LOGS DE DEPURACIÓN (INTACTOS) ---
    const attackerName = attacker.name || 'Sin Nombre';
    const defenderName = defender.name || 'Sin Nombre';
    const attackerPosition = `(${attacker.r},${attacker.c})`;
    const defenderPosition = `(${defender.r},${defender.c})`;
    const distance = hexDistance(attacker.r, attacker.c, defender.r, defender.c);

    // --- 4. LÓGICA NAVAL ---
    // Las unidades navales solo pueden ser atacadas por unidades a rango > 1, EXCEPTO si ambas son navales
    const attackerRegimentData = REGIMENT_TYPES[attacker.regiments[0]?.type];
    const defenderRegimentData = REGIMENT_TYPES[defender.regiments[0]?.type];
    const attackerIsNaval = attacker.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
    const defenderIsNaval = defender.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
    const defenderHasRangedOnly = defender.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.canOnlyBeAttackedByRanged);
    
    // Si el defensor es naval y SOLO puede ser atacado por rango, verificar
    if ((defenderRegimentData?.canOnlyBeAttackedByRanged || defenderHasRangedOnly) && defenderIsNaval) {
        // Permitir si ambas unidades son navales (combate naval 1v1)
        if (attackerIsNaval) {
            // Combate naval, permitido a cualquier rango
        } else {
            // Atacante terrestre contra defensor naval: debe estar a rango > 1
            if (finalRange <= 1) {
                return false;
            }
        }
    }
    
    // --- 5. COMPROBACIÓN FINAL DE RANGO ---
    const canAttack = distance <= finalRange;
    return canAttack;
}

/**
 * COMBATE NAVAL: Calcula qué flota gana el Barlovento
 * @returns {object} { winner: 'attacker'|'defender', attackerScore: number, defenderScore: number }
 */
function calculateBarlovento(attackerDivision, defenderDivision) {
    // 1. Composición (Factor Patache)
    const attackerPataches = attackerDivision.regiments.filter(r => 
        REGIMENT_TYPES[r.type]?.abilities?.includes('barlovento')
    ).length;
    const defenderPataches = defenderDivision.regiments.filter(r => 
        REGIMENT_TYPES[r.type]?.abilities?.includes('barlovento')
    ).length;
    
    const patacheDiff = Math.min(2, Math.abs(attackerPataches - defenderPataches));
    const attackerPatacheBonus = attackerPataches > defenderPataches ? patacheDiff * 15 : 0;
    const defenderPatacheBonus = defenderPataches > attackerPataches ? patacheDiff * 15 : 0;
    
    // 2. Héroe (Navegación) - Buscar talento de navegación
    const getNavegacionLevel = (division) => {
        if (!division.commander) return 0;
        const playerProfile = PlayerDataManager.getCurrentPlayer();
        if (!playerProfile) return 0;
        const heroInstance = playerProfile.heroes?.find(h => h.id === division.commander);
        if (!heroInstance || !heroInstance.talents) return 0;
        
        // Buscar talento de navegación (puedes ajustar el ID del talento)
        const navegacionTalent = heroInstance.talents.find(t => t.includes('navegacion') || t.includes('naval'));
        return navegacionTalent ? (heroInstance.talentLevels?.[navegacionTalent] || 0) : 0;
    };
    
    const attackerNavLevel = getNavegacionLevel(attackerDivision);
    const defenderNavLevel = getNavegacionLevel(defenderDivision);
    const attackerNavBonus = attackerNavLevel * 5;
    const defenderNavBonus = defenderNavLevel * 5;
    
    // 3. Salud (Estado del Barco)
    const getFleetHealthBonus = (division) => {
        const healthPercentage = (division.currentHealth / division.maxHealth) * 100;
        if (healthPercentage >= 100) return 20;
        if (healthPercentage >= 80) return 15;
        if (healthPercentage >= 60) return 10;
        return 5;
    };
    
    const attackerHealthBonus = getFleetHealthBonus(attackerDivision);
    const defenderHealthBonus = getFleetHealthBonus(defenderDivision);
    
    // 4. Suerte (Factor Caos) - d20
    const attackerLuck = Math.floor(Math.random() * 21); // 0-20
    const defenderLuck = Math.floor(Math.random() * 21); // 0-20
    
    // Calcular totales
    const attackerScore = attackerPatacheBonus + attackerNavBonus + attackerHealthBonus + attackerLuck;
    const defenderScore = defenderPatacheBonus + defenderNavBonus + defenderHealthBonus + defenderLuck;
    
    console.log(`[Barlovento] Atacante: Pataches(${attackerPatacheBonus}) + Nav(${attackerNavBonus}) + Salud(${attackerHealthBonus}) + Suerte(${attackerLuck}) = ${attackerScore}`);
    console.log(`[Barlovento] Defensor: Pataches(${defenderPatacheBonus}) + Nav(${defenderNavBonus}) + Salud(${defenderHealthBonus}) + Suerte(${defenderLuck}) = ${defenderScore}`);
    
    return {
        winner: attackerScore > defenderScore ? 'attacker' : 'defender',
        attackerScore,
        defenderScore
    };
}

/**
 * COMBATE NAVAL: Calcula si un barco individual evade un ataque
 * @param {object} attackerRegiment - Regimiento atacante
 * @param {object} defenderRegiment - Regimiento defensor
 * @param {object} attackerDivision - División atacante
 * @param {object} defenderDivision - División defensora
 * @param {string} barloventoWinner - 'attacker' o 'defender'
 * @returns {boolean} true si el defensor evade el ataque
 */
function checkNavalEvasion(attackerRegiment, defenderRegiment, attackerDivision, defenderDivision, barloventoWinner) {
    // Solo aplicar evasión en combates navales
    const attackerData = REGIMENT_TYPES[attackerRegiment.type];
    const defenderData = REGIMENT_TYPES[defenderRegiment.type];
    
    if (!attackerData?.is_naval || !defenderData?.is_naval) return false;
    
    // 1. Barlovento Ganado
    const defenderBarloventoBonus = barloventoWinner === 'defender' ? 15 : 0;
    const attackerBarloventoBonus = barloventoWinner === 'attacker' ? 15 : 0;
    
    // 2. Variable de Evasión del barco
    const defenderEvasion = (defenderData.evasion || 0) * 10;
    const attackerEvasion = (attackerData.evasion || 0) * 10;
    
    // 3. Héroe (Navegación)
    const getNavegacionLevel = (division) => {
        if (!division.commander) return 0;
        const playerProfile = PlayerDataManager.getCurrentPlayer();
        if (!playerProfile) return 0;
        const heroInstance = playerProfile.heroes?.find(h => h.id === division.commander);
        if (!heroInstance || !heroInstance.talents) return 0;
        
        const navegacionTalent = heroInstance.talents.find(t => t.includes('navegacion') || t.includes('naval'));
        return navegacionTalent ? (heroInstance.talentLevels?.[navegacionTalent] || 0) : 0;
    };
    
    const defenderNavLevel = getNavegacionLevel(defenderDivision);
    const attackerNavLevel = getNavegacionLevel(attackerDivision);
    const defenderNavBonus = defenderNavLevel * 5;
    const attackerNavBonus = attackerNavLevel * 5;
    
    // 4. Suerte (Factor Caos) - d20
    const defenderLuck = Math.floor(Math.random() * 21); // 0-20
    const attackerLuck = Math.floor(Math.random() * 21); // 0-20
    
    // Calcular totales
    const defenderEvasionScore = defenderBarloventoBonus + defenderEvasion + defenderNavBonus + defenderLuck;
    const attackerAccuracyScore = attackerBarloventoBonus + attackerEvasion + attackerNavBonus + attackerLuck;
    
    const evaded = defenderEvasionScore > attackerAccuracyScore;
    
    if (evaded) {
        console.log(`[Evasión Naval] ${defenderRegiment.type} EVADE! (${defenderEvasionScore} vs ${attackerAccuracyScore})`);
    } else {
        console.log(`[Evasión Naval] ${attackerRegiment.type} acierta. (${attackerAccuracyScore} vs ${defenderEvasionScore})`);
    }
    
    return evaded;
}

/**
 * Orquesta un combate completo entre dos divisiones, resolviéndolo a nivel de regimientos.
 * Crea una cola de acciones basada en la iniciativa y el rango de ataque de cada regimiento,
 * y luego procesa cada acción de forma secuencial.
 **/
async function attackUnit(attackerDivision, defenderDivision) {

    //audio
    if (typeof AudioManager !== 'undefined') AudioManager.playSound('attack_swords');
    
    if (gameState.isTutorialActive && typeof TutorialManager !== 'undefined') {
        TutorialManager.notifyActionCompleted('attack_completed');
        
        // Ahora, una comprobación específica y segura para el paso 10.
        // Si el paso actual del tutorial está esperando la condición "flank_attack_completed",
        // entonces CUALQUIER ataque cumplirá la condición.
        const currentTutorialStep = TutorialManager.currentSteps[TutorialManager.currentIndex];
        if (currentTutorialStep && currentTutorialStep.actionCondition && currentTutorialStep.actionCondition.toString().includes('flank_attack_completed')) {
            const neighbors = getHexNeighbors(defenderDivision.r, defenderDivision.c);
            const isFlankedByAlly = neighbors.some(n => {
                const unit = getUnitOnHex(n.r, n.c);
                return unit && unit.player === attackerDivision.player && unit.id !== attackerDivision.id;
            });
            if (isFlankedByAlly) TutorialManager.notifyActionCompleted('flank_attack_completed');
        }
        TutorialManager.notifyActionCompleted('attack_completed');
    }
        
    if (typeof Chronicle !== 'undefined') {
        Chronicle.logEvent('battle_start', { 
            attacker: { id: attackerDivision.id, name: attackerDivision.name, player: attackerDivision.player, r: attackerDivision.r, c: attackerDivision.c },
            defender: { id: defenderDivision.id, name: defenderDivision.name, player: defenderDivision.player, r: defenderDivision.r, c: defenderDivision.c }
        });
    }
    if (typeof StatTracker !== 'undefined') {
        const turn = gameState.turnNumber || 1;
        StatTracker.recordEvent(
            turn,
            'battle',
            attackerDivision.player,
            `Batalla entre ${attackerDivision.name} y ${defenderDivision.name}`,
            { location: `(${defenderDivision.r},${defenderDivision.c})` }
        );
    }

    // Declarar fuera del try para que esté disponible en finally
    let wasMonitoring = false;

    try {
        if (!attackerDivision || !defenderDivision) return;
        logMessage(`¡COMBATE! ${attackerDivision.name} (J${attackerDivision.player}) vs ${defenderDivision.name} (J${defenderDivision.player})`);
        
        // === PROTECCIÓN PARA RAIDS: Bloquear actualizaciones durante combate ===
        if (gameState.isRaid && defenderDivision.isBoss && typeof RaidManager !== 'undefined') {
            wasMonitoring = !!RaidManager.hpMonitoringInterval;
            // Activar flag para bloquear monitoreo (sin detener el intervalo)
            console.log("[Raid Combat] 🔒 Bloqueando actualizaciones de HP durante el combate");
            RaidManager.isUpdatingHP = true;
        }
        
        // === DETECCIÓN DE COMBATE NAVAL ===
        const attackerIsNaval = attackerDivision.regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval);
        const defenderIsNaval = defenderDivision.regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval);
        const isPureNavalCombat = attackerIsNaval && defenderIsNaval;
        
        // === CÁLCULO DE BARLOVENTO (Solo para combates navales) ===
        let barloventoWinner = null;
        if (isPureNavalCombat) {
            const barloventoResult = calculateBarlovento(attackerDivision, defenderDivision);
            barloventoWinner = barloventoResult.winner;
            logMessage(`⚓ BARLOVENTO: ${barloventoResult.winner === 'attacker' ? attackerDivision.name : defenderDivision.name} gana la posición ventajosa! (${barloventoResult.attackerScore} vs ${barloventoResult.defenderScore})`, "event");
        }
        
        // <<== FLANQUEO ==>>
        // 1. Llamar a la función de detección de flanqueo ANTES de cualquier cálculo de daño.
        // Le pasamos el defensor y el atacante principal.
        applyFlankingPenalty(defenderDivision, attackerDivision);

        // --- MODIFICACIÓN DE INTEGRIDAD ---
        const defenderHex = board[defenderDivision.r]?.[defenderDivision.c];
        let battleIntegrity = 0;
        
        if (defenderHex && defenderHex.structure) {
            const structureData = STRUCTURE_TYPES[defenderHex.structure];
            // Comprueba si la ESTRUCTURA en sí misma tiene un valor de integridad.
            if (structureData && structureData.integrity > 0) {
                // Usa la integridad actual del hex si existe, si no, usa el valor máximo por defecto.
                battleIntegrity = defenderHex.currentIntegrity ?? structureData.integrity;
                
                if (battleIntegrity > 0) {
                    logMessage(`¡La estructura defensiva (${defenderHex.structure}) aporta +${battleIntegrity} de defensa!`);
                }
            }
        }

        const initialHealthAttacker = attackerDivision.currentHealth;
        const initialHealthDefender = defenderDivision.currentHealth;
        const distance = hexDistance(attackerDivision.r, attackerDivision.c, defenderDivision.r, defenderDivision.c);
        
        // Asignar IDs de log temporales para esta batalla
        attackerDivision.regiments.forEach((r, i) => r.logId = `A-${i}`);
        defenderDivision.regiments.forEach((r, i) => r.logId = `D-${i}`);

        console.log("Regimientos Atacantes:", attackerDivision.regiments.map(r => `${r.type}[${r.logId}](${r.health} HP)`));
        console.log("Regimientos Defensores:", defenderDivision.regiments.map(r => `${r.type}[${r.logId}](${r.health} HP)`));

        const actionQueue = [];

        // Función auxiliar mejorada para calcular bonus y añadir acciones
        const addActions = (division, isAttacker) => {
            // REGLA: Si la moral es <= 0, la unidad está en pánico y NO ataca.
            if (division.morale <= 0) {
                console.log(`[Combate] ${division.name} tiene Moral 0 y no devuelve el golpe.`);
                return;
            }

            if (!division.regiments) return;

            let commanderSkills = [];
            let heroInstance = null;
            if (division.commander) {
                const commanderData = COMMANDERS[division.commander];
                const playerProfile = PlayerDataManager.getCurrentPlayer();
                heroInstance = playerProfile.heroes.find(h => h.id === division.commander);
                if (commanderData && heroInstance) {
                    commanderSkills = commanderData.skills;
                }
            }
            
             division.regiments.forEach(reg => {
                const regData = REGIMENT_TYPES[reg.type];
                if (!regData || reg.health <= 0) return;

                let finalInitiative = regData.initiative || 0;
                let finalRange = regData.attackRange || 1;

                //revisión de habilidad 

                commanderSkills.forEach((skill, index) => {
                    const skillDef = SKILL_DEFINITIONS[skill.skill_id];
                    // Asegurarse de que el héroe y la habilidad existen
                    if (!heroInstance || !skillDef) return;

                    const starsRequired = index + 1;
                    if (heroInstance.stars < starsRequired || skillDef?.scope !== 'ataque') return;
                    
                    const categoryFilter = skillDef.filters?.category;
                    const typeFilter = skillDef.filters?.type;
                    let filterMatch = false;

                    if (categoryFilter) {
                        if (categoryFilter.includes('all') || categoryFilter.includes(regData.category)) {
                            filterMatch = true;
                        }
                    } else if (typeFilter) {
                        // <<== USA "reg.type" EN LUGAR DE "attackerRegiment.type" ==>>
                        if (typeFilter.includes(reg.type)) {
                            filterMatch = true;
                        }
                    } else {
                        filterMatch = true;
                    }

                    if (filterMatch) {
                        const skillLevel = heroInstance.skill_levels[index] || (index === 0 ? 1 : 0);
                        // Asegurarse de que el nivel es válido para el array de escalado
                        if (skillLevel > 0 && skill.scaling_override && skillLevel <= skill.scaling_override.length) {
                             const bonusValue = skill.scaling_override[skillLevel - 1];
                            if (skillDef.effect.stat === 'initiative') {
                                finalInitiative += bonusValue;
                            } else if (skillDef.effect.stat === 'attackRange') {
                                finalRange += bonusValue;
                            }
                        }
                    }
                });
                
                // fin revisión de habilidad
                
                if (distance <= finalRange) {
                    const numAttacks = 1;
                    for (let i = 0; i < numAttacks; i++) {
                        actionQueue.push({ 
                            regiment: reg, 
                            division: division, 
                            initiative: finalInitiative, 
                            isAttackerTurn: isAttacker 
                        });
                    }
                }
             });
        };

        addActions(attackerDivision, true);
        addActions(defenderDivision, false);

        if (actionQueue.length === 0) {
            logMessage("Ninguna unidad tiene rango para el combate.");
            console.groupEnd(); return;
        }
        
        actionQueue.sort((a, b) => b.initiative - a.initiative || b.isAttackerTurn - a.isAttackerTurn);
        console.log(`Secuencia de batalla con ${actionQueue.length} acciones.`);
        console.groupEnd();
        
        console.group("--- SECUENCIA DE DUELOS ---");
        
        // --- INICIO DE LA MODIFICACIÓN ---
        // Mapa para asignar un objetivo FIJO a cada regimiento al inicio del combate.
        const targetAssignments = new Map();
        
        // Asignar objetivos 1 a 1 antes de que empiecen los duelos
        const liveAttackersInitial = attackerDivision.regiments.filter(r => r.health > 0);
        const liveDefendersInitial = defenderDivision.regiments.filter(r => r.health > 0);
        
        liveAttackersInitial.forEach((attackerReg, index) => {
                const target = liveDefendersInitial[index % liveDefendersInitial.length];
                targetAssignments.set(attackerReg.logId, target);
        });
        liveDefendersInitial.forEach((defenderReg, index) => {
                const target = liveAttackersInitial[index % liveAttackersInitial.length];
                targetAssignments.set(defenderReg.logId, target);
        });

        for (const action of actionQueue) {
            const { regiment, division, isAttackerTurn } = action;
            const opposingDivision = isAttackerTurn ? defenderDivision : attackerDivision;
            if (regiment.health <= 0 || opposingDivision.currentHealth <= 0) continue;

            // Obtener el objetivo FIJO que se le asignó a este regimiento
            let targetRegiment = targetAssignments.get(regiment.logId);

            // Si el objetivo fijo ya ha sido destruido, el regimiento ataca al primer objetivo vivo disponible
            if (!targetRegiment || targetRegiment.health <= 0) {
                const newTarget = selectTargetRegiment(opposingDivision);
                if (newTarget) {
                    // La llamada a applyDamage DEBE estar aquí dentro
                    console.log(`[DEBUG] Llamando a applyDamage (newTarget). battleIntegrity = ${battleIntegrity}`);
                    applyDamage(regiment, newTarget, division, opposingDivision, battleIntegrity, defenderHex, isPureNavalCombat, barloventoWinner);
                    recalculateUnitHealth(opposingDivision);
                    if (UIManager) UIManager.updateUnitStrengthDisplay(opposingDivision);
                }
            } else {
                // Si el objetivo fijo sigue vivo, lo ataca
                console.log(`[DEBUG] Llamando a applyDamage (newTarget). battleIntegrity = ${battleIntegrity}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                applyDamage(regiment, targetRegiment, division, opposingDivision, battleIntegrity, defenderHex, isPureNavalCombat, barloventoWinner);
                
                if (defenderHex && defenderHex.currentIntegrity <= 0) {
                    battleIntegrity = 0;
                }
                 // La actualización de salud ahora se hace dentro de applyDamage, pero
                // recalcular la salud total de la división aquí sigue siendo una buena práctica.
                recalculateUnitHealth(opposingDivision);
                if (UIManager) UIManager.updateUnitStrengthDisplay(opposingDivision);
            }
        }
        console.groupEnd();

        // === FASE DE RESOLUCIÓN FINAL =====
        console.group("--- RESULTADOS DEL COMBATE ---");
        
        recalculateUnitHealth(attackerDivision);
        recalculateUnitHealth(defenderDivision);
        
        const finalHealthAttacker = attackerDivision.currentHealth;
        const finalHealthDefender = defenderDivision.currentHealth;

         // 1. Calcular daño y eficiencia (TU LÓGICA ORIGINAL RESTAURADA)
        const damageDealtByAttacker = initialHealthDefender - finalHealthDefender;
        const damageDealtByDefender = initialHealthAttacker - finalHealthAttacker;
        const attackerEfficiency = damageDealtByAttacker / (damageDealtByDefender || 1);
        const defenderEfficiency = damageDealtByDefender / (damageDealtByAttacker || 1);

        // 2. Calcular XP base por participar en el combate
        let attackerXP = 5 + Math.round(attackerEfficiency * 2);
        let defenderXP = 5 + Math.round(defenderEfficiency * 2);

        // Detectar muerte por daño directo
        const defenderDestroyed = finalHealthDefender <= 0;
        const attackerDestroyed = finalHealthAttacker <= 0;

        // --- LÓGICA DE RETIRADA / DESTRUCCIÓN POR RODEO ---
        
        // CASO: Defensor sobrevive al daño, pero podría tener que huir
        if (!defenderDestroyed) {
            // Condición de Retirada Obligatoria:
            // 1. Ya tenía moral 0 (estaba desorganizada)
            // 2. O perdió tanta vida que entra en pánico (ej: perdió > 20% de su total)
            const panicMoral = defenderDivision.morale <= 0;
            // Cálculo simple de derrota táctica (perdió más vida que el atacante)
            const damageTaken = defenderDivision.maxHealth - finalHealthDefender;
            const damageDealt = attackerDivision.maxHealth - finalHealthAttacker;
            const tacticalDefeat = damageTaken > damageDealt * 1.5; // Perdió por paliza

            if (panicMoral || tacticalDefeat) {
                logMessage(`${defenderDivision.name} intenta retirarse del combate...`);
                
                // Buscamos salida física
                const retreatHex = findSafeRetreatHex(defenderDivision, attackerDivision);

                if (retreatHex) {
                    // ESCENARIO A: Hay salida. Se retira.
                    // Usamos _executeMoveUnit para moverla físicamente.
                    // Nota: Si estaba desorganizada, sigue estándolo.
                    logMessage(`... y logra huir hacia (${retreatHex.r}, ${retreatHex.c}).`);
                    await _executeMoveUnit(defenderDivision, retreatHex.r, retreatHex.c);
                    
                    // Penalización extra de moral por la huida vergonzosa
                    defenderDivision.morale = Math.max(0, defenderDivision.morale - 20);
                    if(defenderDivision.morale <= 0) defenderDivision.isDisorganized = true;

                } else {
                    // ESCENARIO B: NO hay salida (Rodeada por enemigos o terreno).
                    const defenderIsNaval = defenderDivision.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
                    if (defenderIsNaval) {
                        logMessage(`¡${defenderDivision.name} no puede retirarse, pero se mantiene en su posición!`, "warning");
                        defenderDivision.morale = 0;
                        defenderDivision.isDisorganized = true;
                    } else {
                        logMessage(`¡${defenderDivision.name} está RODEADA y no puede retirarse!`, "important");
                        await attemptDefectionOrDestroy(defenderDivision, "aniquilación tras cerco en combate");
                        
                        // Como el defensor ha desaparecido, salimos.
                        // (Pero procesamos XP del atacante si quieres)
                        if (!attackerDestroyed) {
                            // (Tu código de recompensa para el atacante aquí, si lo tienes separado)
                            // Normalmente handleUnitDestroyed ya maneja la XP del vencedor si se le pasa.
                        }
                        return; // Salir de la función
                    }
                }
            }
        }

        // 4. Aplicar resultados
        if (defenderDestroyed) {
            if (gameState.isTutorialActive && defenderDivision.player === 2) {
                    gameState.tutorial.enemyDefeated = true; // Flag para el tutorial
            }
            // Se pasa el atacante original como vencedor
            await handleUnitDestroyed(defenderDivision, attackerDivision); // <<== AWAIT
            // <<== CRÓNICA: Registrar destrucción ==>> 
            if (typeof Chronicle !== 'undefined') {
                Chronicle.logEvent('unit_destroyed', {
                    destroyedUnit: { id: defenderDivision.id, name: defenderDivision.name, player: defenderDivision.player },
                    victorUnit: { id: attackerDivision.id, name: attackerDivision.name, player: attackerDivision.player }
                });
            }
        }
        if (attackerDestroyed) {
            // Se pasa el defensor original como vencedor
            await handleUnitDestroyed(attackerDivision, defenderDivision); // <<== AWAIT
            // <<== CRÓNICA: Registrar destrucción ==>> 
            if (typeof Chronicle !== 'undefined') {
                Chronicle.logEvent('unit_destroyed', {
                    destroyedUnit: { id: attackerDivision.id, name: attackerDivision.name, player: attackerDivision.player },
                    victorUnit: { id: defenderDivision.id, name: defenderDivision.name, player: defenderDivision.player }
                });
            }
        }

        if (typeof StatTracker !== 'undefined') {
            const turn = gameState.turnNumber || 1;
            const winnerPlayer = defenderDestroyed
                ? attackerDivision.player
                : attackerDestroyed
                    ? defenderDivision.player
                    : (damageDealtByAttacker >= damageDealtByDefender ? attackerDivision.player : defenderDivision.player);

            StatTracker.recordBattle(
                turn,
                attackerDivision.player,
                defenderDivision.player,
                { r: defenderDivision.r, c: defenderDivision.c },
                winnerPlayer,
                {
                    attackerLosses: Math.max(0, damageDealtByDefender),
                    defenderLosses: Math.max(0, damageDealtByAttacker)
                }
            );
        }

        // 5. Asignar experiencia de combate a los SUPERVIVIENTES (TU LÓGICA RESTAURADA)
        if (!attackerDestroyed) {
            logMessage(`${attackerDivision.name} gana ${attackerXP} XP por su eficiencia.`);
            attackerDivision.experience = (attackerDivision.experience || 0) + attackerXP;
            checkAndApplyLevelUp(attackerDivision);
            
            // Si además ganó (destruyó al defensor), recibe el bonus de moral.
            // Esto ahora está dentro de handleUnitDestroyed, pero lo dejamos por si acaso no gana.
            if(defenderDestroyed){
                const moraleGain = 15;
                attackerDivision.morale = Math.min(attackerDivision.maxMorale, (attackerDivision.morale || 50) + moraleGain);
            }
        }
        
        if (!defenderDestroyed) {
            logMessage(`${defenderDivision.name} gana ${defenderXP} XP por su resistencia.`);
            defenderDivision.experience = (defenderDivision.experience || 0) + defenderXP;
            checkAndApplyLevelUp(defenderDivision);
        }

        // 6. Marcar acción del atacante
        if (attackerDivision.currentHealth > 0) {
            // Marcar la unidad SOLO como que ha atacado.
           // attackerDivision.hasMoved = true;
            attackerDivision.hasAttacked = true;
        }

        // === INTEGRACIÓN CON SISTEMA DE RAIDS ===
        // Si estamos en un Raid y atacamos a la caravana (boss), registrar el daño
        if (gameState.isRaid && defenderDivision.isBoss && typeof RaidManager !== 'undefined') {
            console.log("%c[Raid Combat v2.0] === REGISTRO FINAL DE DAÑO ===", 'background: #ff00ff; color: #fff; font-weight: bold;');
            // IMPORTANTE: Asegurar que el daño sea positivo (el valor puede ser negativo si hay race conditions)
            const actualDamage = Math.abs(damageDealtByAttacker);
            console.log("[Raid Combat] Daño calculado:", damageDealtByAttacker, "→ Daño absoluto:", actualDamage);
            if (actualDamage > 0) {
                try {
                    // CRÍTICO: Pasar los regimientos actualizados para persistir el daño real
                    await RaidManager.recordDamage(actualDamage, defenderDivision.regiments);
                } catch (err) {
                    console.error("[Raid Combat] Error al registrar daño:", err);
                }
            } else {
                console.warn("[Raid Combat] ⚠️ Daño es 0, no se registra");
            }
        }

        console.groupEnd();
        
        // <<== CAPTURA DE EVENTO BATALLA PARA REPLAY ==>> 
        // Registrar el resultado de la batalla en el Replay
        if (typeof ReplayIntegration !== 'undefined') {
            const terrain = board[defenderDivision.r]?.[defenderDivision.c]?.terrain || 'unknown';
            const battleWinner = defenderDestroyed ? attackerDivision.player : (attackerDestroyed ? defenderDivision.player : null);
            const location = [defenderDivision.r, defenderDivision.c];
            ReplayIntegration.recordBattle(
                attackerDivision.id,
                attackerDivision.name,
                defenderDivision.id,
                defenderDivision.name,
                location,
                battleWinner,
                terrain,
                { damageDone: damageDealtByAttacker, damageReceived: damageDealtByDefender }
            );
        }
        
        // Otorgar puntos de investigación por batalla ocurrida
        if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.onBattleOccurred) {
            ResearchRewardsManager.onBattleOccurred(attackerDivision.player, defenderDivision.player);
        }
        
        if (UIManager) {
            UIManager.updateAllUIDisplays();
            // Refrescar el panel si la unidad que atacó es la seleccionada
            if(selectedUnit && selectedUnit.id === attackerDivision.id){
                UIManager.showUnitContextualInfo(selectedUnit, true);
                UIManager.highlightPossibleActions(selectedUnit); // Esto mostrará los hex de movimiento disponibles!
            }
        }
        if(typeof checkVictory === 'function') checkVictory();
        
    } catch (error) {
        console.error(`ERROR CATASTRÓFICO DENTRO DE attackUnit:`, error);
        logMessage("Error crítico durante el combate.", "error");
        if (attackerDivision?.currentHealth > 0) {
           // attackerDivision.hasMoved = true;
            attackerDivision.hasAttacked = true;
        }
        if(UIManager) UIManager.updateAllUIDisplays();
    } finally {
        // Siempre liberar el flag de actualización si era un combate de raid
        if (gameState.isRaid && defenderDivision?.isBoss && typeof RaidManager !== 'undefined' && wasMonitoring) {
            console.log("[Raid Combat] 🔓 Liberando flag de actualización (finally)");
            RaidManager.isUpdatingHP = false;
        }
    }
}

/**
 * Calcula los stats combinados de una división a partir de sus regimientos,
 * aplicando los bonus de la Civilización y del General asignado.
 */
function calculateRegimentStats(unit) {
    if (!unit || !Array.isArray(unit.regiments)) {
        console.error("calculateRegimentStats recibió una unidad inválida.", unit);
        Object.assign(unit, { attack: 0, defense: 0, maxHealth: 0, movement: 0, visionRange: 0, attackRange: 1 });
        return;
    }

    // 2. INICIALIZACIÓN (Sin cambios, tuya es correcta)
    let finalStats = { attack: 0, defense: 0, maxHealth: 0, movement: Infinity, visionRange: 0, attackRange: 0, sprite: '❓' };
    if (unit.regiments.length === 0) {
        finalStats.movement = 0; Object.assign(unit, finalStats); return;
    }
   
// 3. OBTENCIÓN DE DATOS DESDE LA UNIDAD: Ahora sacamos la info del propio objeto 'unit'.    
    const playerNum = unit.player;
    //const playerCivName = gameState?.playerCivilizations?.[playerNum] || 'ninguna';
    const playerCivName = (playerNum && gameState?.playerCivilizations?.[playerNum]) ? gameState.playerCivilizations[playerNum] : 'ninguna';
    const civBonuses = CIVILIZATIONS[playerCivName]?.bonuses || {};
    
    // --- LÓGICA DE HÉROE (dentro de la función principal) ---
    let commanderData = null, heroInstance = null;
    if (unit.commander) {
        commanderData = COMMANDERS[unit.commander];
        heroInstance = PlayerDataManager.currentPlayer?.heroes?.find(h => h.id === unit.commander) || null;
    }
    unit.base_regiment_stats = {};

    unit.regiments.forEach((reg, index) => {
        const baseRegData = REGIMENT_TYPES[reg.type];
        if (!baseRegData) return;
        
        // --- LÓGICA DE CÁLCULO  ---
        let regAttack = baseRegData.attack || 0;
        let regDefense = baseRegData.defense || 0;
        let regHealth = baseRegData.health || 0;
        let regMovement = baseRegData.movement || 0;
        let regAttackRange = baseRegData.attackRange || 1;

        // APLICAR BONUS DE CIVILIZACIÓN
        const civUnitBonus = civBonuses.unitTypeBonus?.[reg.type] || {};
        if (civUnitBonus.attackBonus) {
            console.log(`[Civ Bonus] Aplicando +${civUnitBonus.attackBonus} Atk a ${reg.type}`);
            regAttack += civUnitBonus.attackBonus;
        }
        if (civUnitBonus.defenseBonus) {
            console.log(`[Civ Bonus] Aplicando +${civUnitBonus.defenseBonus} Def a ${reg.type}`);
            regDefense += civUnitBonus.defenseBonus;
        }
        regMovement += civUnitBonus.movementBonus || 0;
        regAttackRange += civUnitBonus.attackRange || 0; 
        
        const regId = `reg_${index}`; // Usar un ID consistente
        reg.logId = regId;
        
        // Guarda los stats calculados (con bonus de civ) para este regimiento.
        unit.base_regiment_stats[regId] = { attack: regAttack, defense: regDefense };

        // Sumar stats finales
        finalStats.attack += regAttack;
        finalStats.defense += regDefense;
        finalStats.maxHealth += regHealth;
        finalStats.movement = Math.min(finalStats.movement, baseRegData.movement || 0);
        finalStats.visionRange = Math.max(finalStats.visionRange, baseRegData.visionRange || 0);
        finalStats.attackRange = Math.max(finalStats.attackRange, baseRegData.attackRange || 1);
        finalStats.initiative = Math.max(finalStats.initiative, baseRegData.initiative || 1);
        if (finalStats.sprite === '❓') finalStats.sprite = baseRegData.sprite;
    });
       
    // <<== INICIO DE LA INTEGRACIÓN DE TALENTOS ==>>
    const talentBonuses = calculateTalentBonuses(unit);
    if (talentBonuses) {
        console.log(`[Talent Bonus] Aplicando talentos de ${unit.commander} a ${unit.name}:`, talentBonuses);

        // Aplicar bonus planos (se suman directamente)
        finalStats.attack += talentBonuses.attack_flat || 0;
        finalStats.defense += talentBonuses.defense_flat || 0;
        finalStats.maxHealth += talentBonuses.health_flat || 0;
        
        // Aplicar bonus porcentuales (se multiplican sobre la suma actual)
        finalStats.attack *= (1 + (talentBonuses.attack_percentage || 0) / 100);
        finalStats.defense *= (1 + (talentBonuses.defense_percentage || 0) / 100);
        finalStats.maxHealth *= (1 + (talentBonuses.health_percentage || 0) / 100);

        // Redondear para evitar decimales extraños
        finalStats.attack = Math.round(finalStats.attack);
        finalStats.defense = Math.round(finalStats.defense);
        finalStats.maxHealth = Math.round(finalStats.maxHealth);

        // Aplicar bonus a stats tácticos (siempre son planos)
        finalStats.movement += talentBonuses.movement_flat || 0;
        finalStats.attackRange += talentBonuses.attackRange_flat || 0;
        finalStats.initiative += talentBonuses.initiative_flat || 0;
    }
    // <<== FIN DE LA INTEGRACIÓN DE TALENTOS ==>>

    finalStats.movement = (finalStats.movement === Infinity) ? 0 : finalStats.movement;
    Object.assign(unit, finalStats);
    if (typeof unit.currentHealth === 'undefined') {
        unit.currentHealth = unit.maxHealth;
    }
}

/**
 * Calcula y aplica el daño de un duelo 1vs1 entre regimientos,
 * considerando todos los modificadores de sus divisiones y del terreno.
 * Calcula y aplica el daño de un duelo 1vs1 entre regimientos,
 * considerando todos los modificadores (terreno, moral, experiencia, desgaste, etc.)
 * y generando logs detallados para cada paso.
 */

function applyDamage(attackerRegiment, targetRegiment, attackerDivision, targetDivision, battleIntegrity, defenderHex, isPureNavalCombat = false, barloventoWinner = null) {
    // 1. OBTENCIÓN DE DATOS BASE
    const attackerData = REGIMENT_TYPES[attackerRegiment.type];
    const targetData = REGIMENT_TYPES[targetRegiment.type];
    if (!attackerData || !targetData) return 0;
    
    // === EVASIÓN NAVAL ===
    // Si es combate naval puro, verificar si el defensor evade
    if (isPureNavalCombat && barloventoWinner) {
        const evaded = checkNavalEvasion(attackerRegiment, targetRegiment, attackerDivision, targetDivision, barloventoWinner);
        if (evaded) {
            console.log(`⚓ ${targetRegiment.type} evade el ataque de ${attackerRegiment.type}!`);
            logMessage(`⚓ ${targetDivision.name} evade el ataque!`, "combat");
            return 0; // No hay daño
        }
    }
    
        // --- CONTEXTO DEL DUELO ---
    const isFirstHitOnTarget = (targetRegiment.hitsTakenThisRound || 0) === 0;

    // --- 1. OBTENER BONIFICACIONES (¡AQUÍ ESTÁ EL CAMBIO!) ---
    const attackerTalentBonuses = calculateTalentBonuses(attackerDivision, targetDivision, isFirstHitOnTarget) || {};
    const defenderTalentBonuses = calculateTalentBonuses(targetDivision, attackerDivision, false) || {};

    const attackerCivName = CIVILIZATIONS[gameState.playerCivilizations[attackerDivision.player]]?.name || 'Sin Civ';
    const defenderCivName = CIVILIZATIONS[gameState.playerCivilizations[targetDivision.player]]?.name || 'Sin Civ';
    console.groupCollapsed(`Duelo: [${attackerRegiment.type}] (${attackerCivName}) vs [${targetRegiment.type}] (${defenderCivName})`);

    // ====================================================================
    // --- ATACANTE ---
    // ====================================================================
    console.log(`%c--- ATACANTE ---`, 'color: lightcoral;');
    
    // Paso 1: Stats Base
    let baseAttack = attackerDivision.base_regiment_stats[attackerRegiment.logId]?.attack || attackerData.attack;
    console.log(`Ataque Base ("en papel"): ${baseAttack.toFixed(1)}`);

    // Paso 2: Bonus de Civilización
    let civAttackBonus = CIVILIZATIONS[gameState.playerCivilizations[attackerDivision.player]]?.bonuses?.unitTypeBonus?.[attackerRegiment.type]?.attackBonus || 0;
    console.log(`+ Bono Civilización (Ataque): ${civAttackBonus.toFixed(1)}`);

    let totalAttack = baseAttack + civAttackBonus;
    // Aplicar bonus de talentos (ya vienen calculados)
    totalAttack *= (1 + (attackerTalentBonuses.attack_percentage || 0) / 100);
    totalAttack += attackerTalentBonuses.attack_flat || 0;
    totalAttack *= (1 + (attackerTalentBonuses.damage_increase_percentage || 0) / 100);

    // Modificador de salud
    totalAttack *= (attackerRegiment.health / attackerData.health);
    
    // <<== INICIO: LÓGICA DE HABILIDADES DE ATAQUE ==>>
    if (attackerDivision.commander) {
        const commanderData = COMMANDERS[attackerDivision.commander];
        const playerProfile = PlayerDataManager.getCurrentPlayer();
        const heroInstance = playerProfile.heroes.find(h => h.id === attackerDivision.commander);

        if (commanderData && heroInstance) {
            commanderData.skills.forEach((skill, index) => {
                const skillDef = SKILL_DEFINITIONS[skill.skill_id];
                const starsRequired = index + 1;

                // Salir si la habilidad no está desbloqueada por estrellas
                if (heroInstance.stars < starsRequired) return;

                if (skillDef?.scope === 'combat' && skillDef.effect?.stat === 'attack') {
                    // Filtro de ubicación
                    const locationFilter = skill.filters?.location;
                    if (locationFilter) {
                        const hexOwner = board[attackerDivision.r][attackerDivision.c].owner;
                        const isOwnTerritory = hexOwner === attackerDivision.player;
                        if ((locationFilter === 'own_territory' && !isOwnTerritory) || (locationFilter === 'enemy_territory' && isOwnTerritory)) {
                        return; // No se cumple la condición de ubicación
                        }
                    }
                
                // 3. Comprobar filtro de tipo de tropa
                const categoryFilter = skillDef.filters?.category;
                if (categoryFilter && !categoryFilter.includes('all') && !categoryFilter.includes(attackerData.category)) {
                    return; // No se cumple la condición de categoría
                }

                // 4. Si todo pasa, aplicar el bonus
                const skillLevel = heroInstance.skill_levels[index] || 1;
                const bonusValue = skill.scaling_override[skillLevel - 1];

                if (skillDef.effect.is_percentage) {
                    totalAttack *= (1 + bonusValue / 100);
                } else {
                    totalAttack += bonusValue;
                    }
                }
            });
        }
    }
    console.log(`%c   = Ataque Total (con Habilidades): ${totalAttack.toFixed(1)}`, 'font-weight: bold;');
    // <<== FIN: LÓGICA DE HABILIDADES DE ATAQUE ==>>
  
    // --- DEFENSOR ---
    // ====================================================================
    console.log(`%c--- DEFENSOR ---`, 'color: lightblue;');
    
    // Paso 1: Stats Base
    let baseDefense = targetDivision.base_regiment_stats[targetRegiment.logId]?.defense || targetData.defense;
    console.log(`Defensa Base ("en papel"): ${baseDefense.toFixed(1)}`);
    let civDefenseBonus = CIVILIZATIONS[gameState.playerCivilizations[targetDivision.player]]?.bonuses?.unitTypeBonus?.[targetRegiment.type]?.defenseBonus || 0;
    console.log(`+ Bono Civilización (Defensa): ${civDefenseBonus.toFixed(1)}`);
    
    let totalDefense = baseDefense + civDefenseBonus;

    // Aplicar bonus de talentos
    totalDefense *= (1 + (defenderTalentBonuses.defense_percentage || 0) / 100);
    totalDefense += defenderTalentBonuses.defense_flat || 0;
    totalDefense *= (1 - (defenderTalentBonuses.damage_reduction_percentage || 0) / 100);
    
    // <<== INICIO: LÓGICA DE HABILIDADES DE DEFENSA/SALUD ==>>
    if (targetDivision.commander) {
        const commanderData = COMMANDERS[targetDivision.commander];
        const playerProfile = PlayerDataManager.getCurrentPlayer();
        const heroInstance = playerProfile.heroes.find(h => h.id === targetDivision.commander);
        
        if (commanderData && heroInstance) {
            commanderData.skills.forEach((skill, index) => {
                const skillDef = SKILL_DEFINITIONS[skill.skill_id];
                const starsRequired = index + 1;
                if (heroInstance.stars < starsRequired) return;

                if (skillDef?.scope === 'combat' && (skillDef.effect?.stat === 'defense' || skillDef.effect?.stat === 'health')) {
                    // (Lógica de filtros igual que la del atacante)
                    const locationFilter = skill.filters?.location;
                    if (locationFilter) {
                        const hexOwner = board[targetDivision.r][targetDivision.c].owner;
                        const isOwnTerritory = hexOwner === targetDivision.player;
                        if ((locationFilter === 'own_territory' && !isOwnTerritory) || (locationFilter === 'enemy_territory' && isOwnTerritory)) {
                            return;
                        }
                    }

                // 3. Filtro de tipo de tropa
                    const categoryFilter = skillDef.filters?.category;
                    if (categoryFilter && !categoryFilter.includes('all') && !categoryFilter.includes(targetData.category)) {
                        return;
                    }

                    const skillLevel = heroInstance.skill_levels[index] || 1;
                    const bonusValue = skill.scaling_override[skillLevel - 1];

                // Los bonus de salud se tratan como bonus de defensa en el cálculo de daño
                    if (skillDef.effect.is_percentage) {
                        totalDefense *= (1 + bonusValue / 100);
                    } else {
                        totalDefense += bonusValue;
                    }
                }
            });
        }
    }
    console.log(`%c   = Defensa Total (con Habilidades): ${totalDefense.toFixed(1)}`, 'font-weight: bold;');
    // <<== FIN: LÓGICA DE HABILIDADES DE DEFENSA/SALUD ==>>
    
    // ====================================================================
    // --- MODIFICADORES SITUACIONALES DE COMBATE ---
    // ====================================================================
    console.log(`%c--- MODIFICADORES DE COMBATE ---`, 'color: gold;');
    
    // Modificadores de Defensa (terreno, flanqueo, desgaste)
    const terrainBonus = TERRAIN_TYPES[board[targetDivision.r][targetDivision.c].terrain]?.defenseBonus || 1;
    if (terrainBonus > 1) {
        totalDefense *= terrainBonus;
        console.log(`Defensa con Bonus Terreno: *${terrainBonus.toFixed(2)} -> ${totalDefense.toFixed(1)}`);
    }

     // Lógica de Flanqueo
    if (targetDivision.isFlanked) {
        totalDefense *= 0.75;
        console.log(`* Penalizador Flanqueo: *0.75 -> ${totalDefense.toFixed(1)}`);
    }
    
    // === LÓGICA DE DESGASTE
    if (targetRegiment.hitsTakenThisRound === undefined) targetRegiment.hitsTakenThisRound = 0;
    const wearinessMultiplier = Math.max(0.25, 1 - (0.20 * targetRegiment.hitsTakenThisRound));
    if (wearinessMultiplier < 1) {
        totalDefense *= wearinessMultiplier;
        console.log(`Defensa con Desgaste: *${wearinessMultiplier.toFixed(2)} -> ${totalDefense.toFixed(1)}`);
    }

    // Modificador de Ataque (salud)
    totalAttack *= (attackerRegiment.health / attackerData.health);
    console.log(`Ataque Final (mod. salud): ${totalAttack.toFixed(1)}`);
    
    // --- RESOLUCIÓN ---

    if (battleIntegrity > 0) {
        totalDefense += battleIntegrity;
    }

    finalDefense = totalDefense; // Renombramos para claridad
    console.log(`Defensa Final (mod. situacionales): ${finalDefense.toFixed(1)}`);
    
    // --- SECCIÓN DE RESOLUCIÓN FINAL (CON EL CAMBIO) ---
    console.log(`%c--- RESOLUCIÓN FINAL ---`, 'color: lightgreen;');
    let rawDamage = totalAttack - finalDefense;
    let damageDealt;

    if (rawDamage <= 0) {
        damageDealt = 1; // DAÑO MÍNIMO GARANTIZADO
    } else {
        damageDealt = Math.round(rawDamage);
    }

    console.log(`Daño Bruto: ${rawDamage.toFixed(1)} -> Daño Aplicado: ${damageDealt}`);

    // --- LÓGICA DE DAÑO A ESTRUCTURA (SOLO UNIDADES DE ASEDIO) ---
    const isSiegeUnit = (attackerData.abilities || []).includes("Asedio");
    if (isSiegeUnit && defenderHex && defenderHex.currentIntegrity > 0) {
        const damageToStructure = damageDealt;
        defenderHex.currentIntegrity = Math.max(0, defenderHex.currentIntegrity - damageToStructure);
        console.log(`%c¡Unidad de Asedio! Daño a estructura: ${damageToStructure}. Integridad permanente: ${defenderHex.currentIntegrity}`, 'color: orange;');
        
        showFloatingDamage({element: defenderHex.element}, damageToStructure);

        if (defenderHex.currentIntegrity <= 0) {
            logMessage(`¡La ${defenderHex.structure} ha sido destruida!`, 'success');
            defenderHex.structure = null;
            defenderHex.feature = 'ruins';
            if (typeof renderSingleHexVisuals === 'function') {
                renderSingleHexVisuals(defenderHex.r, defenderHex.c);
            }
        }
    }

    // --- APLICACIÓN DE DAÑO AL REGIMIENTO ---
    const actualDamage = Math.min(targetRegiment.health, damageDealt);
    targetRegiment.health -= actualDamage;

    // === RAID: NO registrar daño aquí - se hace una sola vez al final del combate ===
    // (Eliminado para evitar registro duplicado por cada duelo)
    
    targetRegiment.hitsTakenThisRound = (targetRegiment.hitsTakenThisRound || 0) + 1;

    console.log(`%c>> DAÑO REAL: ${actualDamage}. Salud restante: ${targetRegiment.health}`, 'background: #333; color: #ff9999;');
    
    showFloatingDamage(targetDivision, actualDamage);
    console.groupEnd();
    
    return actualDamage;
}

/**
 * Selecciona un regimiento objetivo de la división oponente.
 * Acepta la división activa y la oponente, y aplica la estrategia correcta.
 * Incluye logs detallados para máxima transparencia.
 * @param {object} actingDivision - La división que está realizando el ataque.
 * @param {object} opposingDivision - La división que está siendo atacada.
 * @returns {object|null} El regimiento objetivo, o null si no hay objetivos válidos.
 */
function selectTargetRegiment(opposingDivision) {
    if (!opposingDivision || !opposingDivision.regiments || opposingDivision.regiments.length === 0) {
        return null; // No hay regimientos para atacar
    }

    // Filtra para obtener solo los regimientos que aún están vivos
    const liveRegiments = opposingDivision.regiments.filter(r => r.health > 0);

    if (liveRegiments.length === 0) {
        return null; // No hay regimientos vivos para atacar
    }

    // Estrategia de objetivo: Atacar al más débil
    // Ordena los regimientos vivos por su salud actual, de menor a mayor.
    liveRegiments.sort((a, b) => a.health - b.health);
    
    // Devuelve el primer regimiento de la lista ordenada (el que tiene menos salud).
    return liveRegiments[0];
}

function predictCombatOutcome(attacker, defender) {
    if (!attacker || !defender) {
        console.error("[PredictCombat] Error: Atacante u objetivo nulo para predicción.");
        return {
            damageToAttacker: 0,
            damageToDefender: 0,
            attackerDies: false,
            defenderDies: false,
            attackerDiesInRetaliation: false,
            log: "Error: Unidades inválidas para predicción."
        };
    }

    let prediction = {
        damageToAttacker: 0,
        damageToDefender: 0,
        attackerDies: false,
        defenderDies: false,
        attackerDiesInRetaliation: false, // El atacante muere por el contraataque
        log: []
    };

    // --- Simulación del ataque del 'attacker' al 'defender' ---
    let attackerAttackStat = attacker.attack || 0;
    let defenderDefenseStat = (defender.defense || 0) * (defender.currentHealth / defender.maxHealth);
    let defenderCurrentHealth = defender.currentHealth;

    // Considerar bonos de terreno para el defensor (similar a applyDamage)
    const defenderHexData = board[defender.r]?.[defender.c];
    let terrainDefenseBonusDefender = 0;
    let terrainRangedDefenseBonusDefender = 0;
    if (defenderHexData && TERRAIN_TYPES[defenderHexData.terrain]) {
        terrainDefenseBonusDefender = TERRAIN_TYPES[defenderHexData.terrain].defenseBonus || 0;
        terrainRangedDefenseBonusDefender = TERRAIN_TYPES[defenderHexData.terrain].rangedDefenseBonus || 0;
    }
    defenderDefenseStat += terrainDefenseBonusDefender;
    if ((attacker.attackRange || 1) > 1) { // Si el atacante es a distancia
        defenderDefenseStat += terrainRangedDefenseBonusDefender;
    }

    // Considerar flanqueo (simplificado para predicción, asumiendo que no se puede predecir el flanqueo activo sin más lógica)
    // Para una predicción precisa, se podría simular si el movimiento del atacante crea una situación de flanqueo,
    // pero por ahora no aplicamos el flanqueo en la predicción a menos que `target.isFlanked` ya sea true en el estado actual.
    // Esto se maneja en `applyDamage` real, pero aquí solo se tiene en cuenta si ya está flanqueada.
    let effectiveAttackerAttack = attackerAttackStat * (attacker.currentHealth / attacker.maxHealth);
    // Para predecir flanqueo, necesitarías una función `predictFlanking(attacker, defender)` que simule si la posición del atacante causaría flanqueo.
    // Por simplicidad, no lo implementamos en la predicción por ahora, solo en el daño real.

    let damageToDefenderCalc = Math.round(effectiveAttackerAttack - defenderDefenseStat);
    if (damageToDefenderCalc < 0) damageToDefenderCalc = 0;
    if (effectiveAttackerAttack > 0 && damageToDefenderCalc === 0) damageToDefenderCalc = 1; // Daño mínimo

    prediction.damageToDefender = Math.min(damageToDefenderCalc, defenderCurrentHealth);
    if (prediction.damageToDefender >= defenderCurrentHealth) {
        prediction.defenderDies = true;
    }
    prediction.log.push(`Predicción: ${attacker.name} (Atk:${attackerAttackStat}) vs ${defender.name} (Def:${defenderDefenseStat}). Daño Def: ${prediction.damageToDefender}. Defensor muere: ${prediction.defenderDies}`);


    // --- Simulación del contraataque del 'defender' al 'attacker' (si el defensor sobrevive y puede contraatacar) ---
    if (!prediction.defenderDies) {
        // ¿Puede el defensor contraatacar? (si tiene rango y no es un terreno intransitable)
        const attackerHexData = board[attacker.r]?.[attacker.c]; // Para obtener el terreno del atacante para defensa
        
        // No puede contraatacar si está en agua o terreno intransitable
        if (TERRAIN_TYPES[defenderHexData.terrain]?.isImpassableForLand || TERRAIN_TYPES[attackerHexData.terrain]?.isImpassableForLand) {
             prediction.log.push(`Predicción Retaliación: No hay contraataque debido a terreno intransitable.`);
        } else if (isValidAttack({ ...defender, hasAttacked: false }, attacker)) { // Pasar un clon sin hasAttacked para el chequeo de rango
            let defenderAttackStat = (defender.attack || 0) * (defender.currentHealth / defender.maxHealth);
            let attackerDefenseStat = (attacker.defense || 0) * (attacker.currentHealth / attacker.maxHealth);
            let terrainDefenseBonusAttacker = 0;
            let terrainRangedDefenseBonusAttacker = 0;
            
            if (attackerHexData && TERRAIN_TYPES[attackerHexData.terrain]) {
                terrainDefenseBonusAttacker = TERRAIN_TYPES[attackerHexData.terrain].defenseBonus || 0;
                terrainRangedDefenseBonusAttacker = TERRAIN_TYPES[attackerHexData.terrain].rangedDefenseBonus || 0;
            }
            attackerDefenseStat += terrainDefenseBonusAttacker;
            // Si el contraataque es a distancia, aplicar bonus de defensa a distancia al atacante.
            // Para la predicción, asumimos que el contraataque es un ataque "normal" desde el defensor.
            if ((defender.attackRange || 1) > 1) { 
                attackerDefenseStat += terrainRangedDefenseBonusAttacker;
            }
            
            // Si el contraatacante (defensor) está en Colinas y es cuerpo a cuerpo, aplicar bonus de ataque.
            let terrainMeleeAttackBonusDefender = 0;
            if (defenderHexData && TERRAIN_TYPES[defenderHexData.terrain]) {
                if (TERRAIN_TYPES[defenderHexData.terrain].name === "Colinas" && (defender.attackRange || 1) === 1) {
                    terrainMeleeAttackBonusDefender = TERRAIN_TYPES[defenderHexData.terrain].meleeAttackBonus || 0;
                }
            }
            defenderAttackStat += terrainMeleeAttackBonusDefender;


            let effectiveDefenderAttack = defenderAttackStat;
            let damageToAttackerCalc = Math.round(effectiveDefenderAttack - attackerDefenseStat);
            if (damageToAttackerCalc < 0) damageToAttackerCalc = 0;
            if (effectiveDefenderAttack > 0 && damageToAttackerCalc === 0) damageToAttackerCalc = 1;

            prediction.damageToAttacker = Math.min(damageToAttackerCalc, attacker.currentHealth);
            if (prediction.damageToAttacker >= attacker.currentHealth) {
                prediction.attackerDiesInRetaliation = true; 
                prediction.attackerDies = true; 
            }
        }
    }
    
    return prediction;
}

function handleReinforceUnitAction(unitToReinforce) {
    console.log("%c[Reinforce] Iniciando acción de refuerzo...", "color: darkviolet; font-weight:bold;");

    if (!unitToReinforce) { unitToReinforce = selectedUnit; if (!unitToReinforce) { logMessage("No hay unidad seleccionada para reforzar."); return; } }
    if (unitToReinforce.currentHealth >= unitToReinforce.maxHealth) { logMessage("La unidad ya tiene la salud máxima."); return; }

     if (typeof isHexSuppliedForReinforce !== "function" || !isHexSuppliedForReinforce(unitToReinforce.r, unitToReinforce.c, unitToReinforce.player)) {
        const msg = "La unidad no está en una Capital/Fortaleza propia o adyacente a una.";
        logMessage(msg);
        UIManager.showMessageTemporarily(msg, 4000, true);
        return;
    }
    
    const healthToRestore = unitToReinforce.maxHealth - unitToReinforce.currentHealth;
    let baseUnitCostOro = 20; 
    const costFactorForFullHeal = 0.3; 
    let totalCost = Math.ceil(baseUnitCostOro * costFactorForFullHeal * (healthToRestore / unitToReinforce.maxHealth));
    totalCost = Math.max(1, totalCost); 

    if (gameState.playerResources[gameState.currentPlayer].oro < totalCost) { 
        logMessage(`No tienes suficiente oro para reforzar. Necesitas ${totalCost} de oro.`);
        return; 
    }

    const confirmationMessage = `Reforzar ${unitToReinforce.name} por ${healthToRestore} HP costará ${totalCost} de oro. ¿Continuar?`;
    
    const performReinforcement = () => {
        gameState.playerResources[gameState.currentPlayer].oro -= totalCost;
        unitToReinforce.currentHealth = unitToReinforce.maxHealth;
        if (gameState.currentPhase === 'play') {
            unitToReinforce.hasMoved = true; 
            unitToReinforce.hasAttacked = true; 
        }
        const successMsg = `${unitToReinforce.name} reforzada a salud máxima. Costo: ${totalCost} oro.`;
        UIManager.showMessageTemporarily(successMsg, 3000);
        if (typeof UIManager !== 'undefined') {
            if (UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
            if (selectedUnit && selectedUnit.id === unitToReinforce.id && UIManager.showUnitContextualInfo) {
                 UIManager.showUnitContextualInfo(selectedUnit, true);
            }
            if (UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unitToReinforce);
            if (UIManager.clearHighlights && selectedUnit && selectedUnit.id === unitToReinforce.id) { 
                 UIManager.clearHighlights(); 
            }
            // CORRECCIÓN: Actualizar UI completa de recursos
            if (UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
        }
    };

    if (window.confirm(confirmationMessage)) {
        performReinforcement();
    } else {
        UIManager.showMessageTemporarily("Refuerzo cancelado.", 2000);
    }
}

/**
 * Helper: Encuentra una casilla adyacente segura para retirarse (no agua, no montaña, no enemigo).
 */
function findSafeRetreatHex(unit, attacker) {
    const neighbors = getHexNeighbors(unit.r, unit.c);
    const isNaval = unit?.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
    
    // Filtramos las casillas válidas
    const validRetreats = neighbors.filter(n => {
        const hex = board[n.r]?.[n.c];
        const unitOnHex = getUnitOnHex(n.r, n.c);
        
        // 1. Debe existir y ser terreno transitable segun el tipo de unidad
        if (!hex) return false;
        if (isNaval) {
            if (hex.terrain !== 'water') return false;
        } else if (TERRAIN_TYPES[hex.terrain]?.isImpassableForLand) {
            return false;
        }
        
        // 2. No debe haber unidad (ni amiga ni enemiga, para evitar fusiones accidentales en pánico)
        if (unitOnHex) return false;
        
        // 3. No debe ser territorio controlado por el enemigo (opcional, pero recomendado para huida segura)
        // Si prefieres que puedan huir a territorio enemigo si está vacío, quita esta línea.
        // if (hex.owner !== null && hex.owner !== unit.player) return false;

        return true;
    });

    if (validRetreats.length === 0) return null;

    // Estrategia: Elegir la casilla que más nos aleje del atacante
    validRetreats.sort((a, b) => {
        const distA = hexDistance(a.r, a.c, attacker.r, attacker.c);
        const distB = hexDistance(b.r, b.c, attacker.r, attacker.c);
        return distB - distA; // Mayor distancia primero
    });

    return validRetreats[0];
}

function handlePostBattleRetreat(unit, attacker) { 
    if (!unit || unit.currentHealth <= 0) return;

    const healthPercentage = unit.currentHealth / unit.maxHealth;
    let mustRetreat = false;

    if (healthPercentage < 0.25) { 
        mustRetreat = true;
        if (typeof logMessage === "function") logMessage(`${unit.name} tiene muy poca salud (${Math.round(healthPercentage*100)}%)! Chequeando retirada.`);
    }

    if (mustRetreat) {
        const hexData = board[unit.r]?.[unit.c];
        const inOwnDefensiveStructure = hexData && hexData.owner === unit.player && (hexData.isCity || hexData.structure === "Fortaleza");

        if (inOwnDefensiveStructure) {
            if (typeof logMessage === "function") logMessage(`${unit.name} está en una posición defensiva, no se retirará.`);
            return;
        }

        const retreatHexCoords = findSafeRetreatHex(unit, attacker);
        if (retreatHexCoords) {
            if (typeof logMessage === "function") logMessage(`${unit.name} se retira a (${retreatHexCoords.r},${retreatHexCoords.c})!`);
            
            const fromR = unit.r;
            const fromC = unit.c;

            if (board[fromR]?.[fromC]) board[fromR][fromC].unit = null;
            
            unit.r = retreatHexCoords.r;
            unit.c = retreatHexCoords.c;
            
            if (board[unit.r]?.[unit.c]) board[unit.r][unit.c].unit = unit;
            else { console.error(`[Retreat] Hex de retirada (${unit.r},${unit.c}) inválido.`); return; }

            if (typeof positionUnitElement === "function") positionUnitElement(unit);
            if (typeof renderSingleHexVisuals === "function") {
                renderSingleHexVisuals(fromR, fromC);
                renderSingleHexVisuals(unit.r, unit.c);
            }
            if (selectedUnit && selectedUnit.id === unit.id) {
                if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
                if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights(); 
            }

        } else {
            if (typeof logMessage === "function") logMessage(`${unit.name} no pudo encontrar un lugar seguro para retirarse y debe luchar! (O se rinde/destruye si la moral es 0)`);
        }
    }
}

function applyFlankingPenalty(targetUnit, mainAttacker) {
    if (!targetUnit || !mainAttacker || !board) return;

    targetUnit.isFlanked = false; 
    let flankingAttackersCount = 0;
    const neighbors = getHexNeighbors(targetUnit.r, targetUnit.c);

    for (const n_coord of neighbors) {
        const neighborUnit = getUnitOnHex(n_coord.r, n_coord.c);
        if (neighborUnit && neighborUnit.player !== targetUnit.player && neighborUnit.id !== mainAttacker.id) {
            flankingAttackersCount++;
        }
    }

    if (flankingAttackersCount > 0) {
        targetUnit.isFlanked = true;
        const moraleLoss = 10;
        targetUnit.morale = Math.max(0, targetUnit.morale - moraleLoss);
        
        // <<< Un único mensaje claro >>>
        logMessage(`¡${targetUnit.name} es flanqueada, sufre daño extra y pierde ${moraleLoss} de moral!`);
    }
}

async function handleUnitDestroyed(destroyedUnit, victorUnit) {
    if (!destroyedUnit) return;

    // Guardamos las coordenadas antes de cualquier proceso
    const savedCoords = { r: destroyedUnit.r, c: destroyedUnit.c };

    // <<== CAPTURA DE EVENTO MUERTE DE UNIDAD PARA REPLAY ==>>
    if (typeof ReplayIntegration !== 'undefined') {
        ReplayIntegration.recordUnitDeath(
            destroyedUnit.id,
            destroyedUnit.name,
            destroyedUnit.player,
            [destroyedUnit.r, destroyedUnit.c]
        );
    }

    // Intentamos aplicar recompensas, pero rodeado de un try/catch para que un error aquí
    // no impida que la unidad desaparezca del mapa.
    try {
        _applyDestructionRewards(destroyedUnit, victorUnit);
    } catch (e) {
        console.error("Error al procesar recompensas de destrucción:", e);
    }

    // Lógica del Tutorial
    if (window.TUTORIAL_MODE_ACTIVE === true && destroyedUnit.player === 2) {
        if (destroyedUnit.element) destroyedUnit.element.style.display = 'none';
        if (typeof TutorialManager !== 'undefined') TutorialManager.notifyActionCompleted('enemy_defeated');
    }

    // Ejecución de limpieza lógica de DATOS inmediata (Fundamental para evitar el "0")
    _executeUnitCleanup(destroyedUnit);

    // Animación y borrado del elemento DOM
    await _playDestructionVisuals(destroyedUnit);

    // Generación de Ruinas
    if (victorUnit) {
        _generateRuinAt(savedCoords.r, savedCoords.c);
    }

    if (typeof BattlePassManager !== 'undefined') {
        BattlePassManager.updateProgress('unit_kill', 1);
    }

    // Actualización visual final
    if (UIManager) UIManager.updateAllUIDisplays();
    if (typeof checkVictory === 'function' && !gameState.isTutorialActive) checkVictory();
}

function _applyDestructionRewards(destroyedUnit, victorUnit) {
    
    

    // 1. Validaciones de seguridad iniciales
    if (!victorUnit || !gameState || !destroyedUnit) return;
    const isCombatDestruction = victorUnit.player !== destroyedUnit.player;
    if (!isCombatDestruction) return;

    const victorPlayerKey = `player${victorUnit.player}`;

    if (!gameState.playerStats) gameState.playerStats = { unitsDestroyed: {}, sealTrades: {}, navalVictories: {} };
    if (!gameState.playerStats.unitsDestroyed[victorPlayerKey]) gameState.playerStats.unitsDestroyed[victorPlayerKey] = 0;
    if (!gameState.playerStats.navalVictories[victorPlayerKey]) gameState.playerStats.navalVictories[victorPlayerKey] = 0;

    gameState.playerStats.unitsDestroyed[victorPlayerKey]++;
    
    // Verificar si fue una batalla naval (ambas unidades son navales)
    const victorIsNaval = victorUnit.regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval);
    const destroyedIsNaval = destroyedUnit.regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval);
    if (victorIsNaval && destroyedIsNaval) {
        gameState.playerStats.navalVictories[victorPlayerKey]++;
        logMessage(`¡Victoria naval para J${victorUnit.player}! (Total: ${gameState.playerStats.navalVictories[victorPlayerKey]})`, "success");
    }


    // 2. Registro de bajas (con protección contra objetos no definidos)
    if (gameState.playerStats && gameState.playerStats.unitsDestroyed) {
        if (gameState.playerStats.unitsDestroyed[victorPlayerKey] !== undefined) {
            gameState.playerStats.unitsDestroyed[victorPlayerKey]++;
        }
    }

    logMessage(`¡${destroyedUnit.name} ha sido destruida por ${victorUnit.name}!`);

    // 3. Habilidades de fin de batalla
    let xpGainBonusPercent = 0, bookDropBonusChance = 0, fragmentDropBonusChance = 0;
    if (victorUnit.commander && COMMANDERS[victorUnit.commander]) {
        const playerProfile = PlayerDataManager.getCurrentPlayer();
        const heroInstance = playerProfile?.heroes.find(h => h.id === victorUnit.commander);
        
        if (heroInstance && Array.isArray(heroInstance.skill_levels)) {
            COMMANDERS[victorUnit.commander].skills.forEach((skill, index) => {
                const skillDef = SKILL_DEFINITIONS[skill.skill_id];
                const starsRequired = index + 1;
                if (heroInstance.stars >= starsRequired && skillDef?.scope === 'fin') {
                    const skillLevel = heroInstance.skill_levels[index];
                    if (skillLevel > 0) {
                        const bonus = skill.scaling_override[skillLevel - 1] || 0;
                        if (skillDef.effect.stat === 'xp_gain') xpGainBonusPercent += bonus;
                        else if (skillDef.effect.stat === 'book_drop') bookDropBonusChance += bonus;
                        else if (skillDef.effect.stat === 'fragment_drop') fragmentDropBonusChance += bonus;
                    }
                }
            });
        }
    }

    // 4. Recompensa de XP y Oro
    let xpGained = Math.round((10 + Math.floor((destroyedUnit.maxHealth || 0) / 10)) * (1 + xpGainBonusPercent / 100));
    victorUnit.experience = (victorUnit.experience || 0) + xpGained;
    if (typeof checkAndApplyLevelUp === 'function') checkAndApplyLevelUp(victorUnit);

    const baseGold = REGIMENT_TYPES[destroyedUnit.regiments[0]?.type]?.goldValueOnDestroy || 10;
    const tradeGold = (destroyedUnit.tradeRoute && destroyedUnit.tradeRoute.goldCarried) ? destroyedUnit.tradeRoute.goldCarried : 0;
    const totalGold = baseGold + tradeGold;

    if (gameState.playerResources && gameState.playerResources[victorUnit.player]) {
        gameState.playerResources[victorUnit.player].oro += totalGold;
        // CORRECCIÓN: Actualizar UI cuando el jugador humano gana oro
        if (victorUnit.player === gameState.currentPlayer && typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
    }

    // 5. Inventario de Perfil
    if (PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.inventory) {
        if (Math.random() * 100 < (35 + bookDropBonusChance)) {
            PlayerDataManager.currentPlayer.inventory.xp_books = (PlayerDataManager.currentPlayer.inventory.xp_books || 0) + 1;
        }
        PlayerDataManager.saveCurrentPlayer();
    }
}

async function _playDestructionVisuals(unit) {
    if (!unit.element) return;
    
    const explosionEl = document.createElement('div');
    explosionEl.classList.add('explosion-animation');
    const boardRect = document.getElementById('gameBoard').getBoundingClientRect();
    const unitRect = unit.element.getBoundingClientRect();
    
    explosionEl.style.left = `${(unitRect.left - boardRect.left) + unitRect.width / 2}px`;
    explosionEl.style.top = `${(unitRect.top - boardRect.top) + unitRect.height / 2}px`;
    document.getElementById('gameBoard').appendChild(explosionEl);
    
    setTimeout(() => explosionEl.remove(), 1200);
    unit.element.style.transition = "opacity 0.5s";
    unit.element.style.opacity = "0";
    
    await new Promise(resolve => setTimeout(resolve, 500));
    unit.element.remove();
}

function _executeUnitCleanup(unit) {
    // Limpieza lógica del tablero
    const hex = board[unit.r]?.[unit.c];
    if (hex && hex.unit?.id === unit.id) {
        hex.unit = null;
    }

    if (typeof UnitGrid !== 'undefined') {
        UnitGrid.unindex(unit);
    }

    // Eliminación del array global
    const index = units.findIndex(u => u.id === unit.id);
    if (index > -1) units.splice(index, 1);

    // Deselección si era la unidad activa
    if (selectedUnit?.id === unit.id) {
        selectedUnit = null;
        if (UIManager) UIManager.hideContextualPanel();
    }
}

function _generateRuinAt(r, c) {
    const hex = board[r]?.[c];
    if (!hex || hex.structure || hex.feature) return;

    if (Math.random() * 100 < (RUIN_GENERATION_CHANCE.ON_UNIT_DESTROYED || 50)) {
        hex.feature = 'ruins';
        renderSingleHexVisuals(r, c);
        logMessage(`Restos de batalla en (${r},${c}) se convierten en ruinas.`);
    }
}

async function undoLastUnitMove(unit) {
    if (!unit || !unit.lastMove) {
        logMessage("No hay movimiento para deshacer en esta unidad.");
        return;
    }
    if (unit.hasAttacked) { 
        logMessage("No se puede deshacer: la unidad ya ha atacado.");
        return;
    }
    if (unit.player !== gameState.currentPlayer) { 
        logMessage("No puedes deshacer el movimiento de una unidad enemiga.");
        return;
    }

    const prevR = unit.lastMove.fromR;
    const prevC = unit.lastMove.fromC;
    const currentR = unit.r; 
    const currentC = unit.c;

    logMessage(`Deshaciendo movimiento de ${unit.name} de (${currentR},${currentC}) a (${prevR},${prevC}).`);

    if (board[currentR]?.[currentC]) {
        board[currentR][currentC].unit = null;
        board[currentR][currentC].owner = unit.lastMove.movedToHexOriginalOwner;
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(currentR, currentC);
    }

    unit.r = prevR;
    unit.c = prevC;
    
    if (board[prevR]?.[prevC]) {
        board[prevR][prevC].unit = unit;
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(prevR, prevC);
    }

    unit.currentMovement = unit.lastMove.initialCurrentMovement;
    unit.hasMoved = unit.lastMove.initialHasMoved;
    unit.hasAttacked = unit.lastMove.initialHasAttacked;
    
    unit.lastMove = null;

    if (typeof UnitGrid !== 'undefined') {
        const moved = UnitGrid.move(unit, currentR, currentC);
        if (!moved) {
            UnitGrid.index(unit);
        }
    }

    if (typeof positionUnitElement === "function") positionUnitElement(unit);
    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
    if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit); 
}

function checkAndProcessBrokenUnit(unit) {
    if (!unit || unit.morale > 0) {
        return false; // No está rota, no hacemos nada.
    }

    // Si llegamos aquí, la unidad está rota.
    logMessage(`¡${unit.name} tiene la moral rota!`, "error");

    unit.hasMoved = true;
    unit.hasAttacked = true;

    const isNaval = unit.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
    const safeHavens = gameState.cities.filter(c => c.owner === unit.player).sort((a,b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
    const nearestSafeHaven = safeHavens[0] || null;

    let retreatHex = null;
    if (nearestSafeHaven) {
        const neighbors = getHexNeighbors(unit.r, unit.c);
        let bestNeighbor = null;
        let minDistance = hexDistance(unit.r, unit.c, nearestSafeHaven.r, nearestSafeHaven.c);

        for (const n of neighbors) {
            const neighborHex = board[n.r]?.[n.c];
            if (!neighborHex) continue;
            if (getUnitOnHex(n.r, n.c)) continue;
            if (isNaval && neighborHex.terrain !== 'water') continue;
            if (!isNaval && TERRAIN_TYPES[neighborHex.terrain]?.isImpassableForLand) continue;

            const dist = hexDistance(n.r, n.c, nearestSafeHaven.r, nearestSafeHaven.c);
            if (dist < minDistance) {
                minDistance = dist;
                bestNeighbor = n;
            }
        }
        retreatHex = bestNeighbor;
    }

    if (retreatHex) {
        logMessage(`¡${unit.name} rompe filas y huye hacia (${retreatHex.r}, ${retreatHex.c})!`);
        const tempUnitForMove = { ...unit, currentMovement: 1, hasMoved: false };
        moveUnit(tempUnitForMove, retreatHex.r, retreatHex.c);
        unit.r = retreatHex.r;
        unit.c = retreatHex.c;
    } else {
        logMessage(`¡${unit.name} está desorganizada y no puede retirarse, pero mantiene su posición!`, "warning");
        unit.isDisorganized = true;
    }
    
    // Deseleccionar si era la unidad activa
    if (selectedUnit && selectedUnit.id === unit.id) {
        deselectUnit();
        UIManager.hideContextualPanel();
    }

    return true; // La unidad estaba rota y se ha procesado.
}

function calculateDivisionDiscipline(unit) {
    if (!unit.regiments || unit.regiments.length === 0) {
        return 0;
    }

    // 1. Bonus base por presencia de Cuartel General
    const hasHQ = unit.regiments.some(r => REGIMENT_TYPES[r.type]?.provides_morale_boost);
    let discipline = hasHQ ? 20 : 0; // Bonus base de 20 puntos por tener un HQ

    // 2. Bonus por el nivel de la división (promedio de la experiencia de los regimientos)
    const divisionLevel = unit.level || 0;
    if (XP_LEVELS[divisionLevel]) {
        discipline += XP_LEVELS[divisionLevel].disciplineBonus || 0;
    }

    // La disciplina no puede superar el 75%
    return Math.min(discipline, 75);
}

// Verifica si la unidad subió de nivel y aplica los cambios.
function checkAndApplyLevelUp(unit) {
    if (!unit || !XP_LEVELS || (unit.level !== undefined && XP_LEVELS[unit.level]?.nextLevelXp === 'Max')) {
        return false;
    }

    unit.level = unit.level ?? 0; // Si no tiene nivel, es 0
    const currentLevelData = XP_LEVELS[unit.level];
    const nextLevelXP = currentLevelData.nextLevelXp;

    if (nextLevelXP !== 'Max' && unit.experience >= nextLevelXP) {
        unit.level++;
        const newLevelData = XP_LEVELS[unit.level];
        logMessage(`¡${unit.name} ha subido a Nivel ${unit.level} (${newLevelData.currentLevelName})!`);
        recalculateUnitStats(unit); // Recalcular stats para aplicar los bonus
        return true;
    }
    return false;
}

// Recalcula TODOS los stats de una unidad (ataque, defensa, etc.) aplicando los bonus de nivel.
function recalculateUnitStats(unit) {
    if (!unit) return;

    // 1. Llama a la nueva función principal. Esta calculará y aplicará todos los bonus
    // de regimientos, civilización y el HÉROE recién asignado al objeto 'unit'.
    calculateRegimentStats(unit);

    // 2. Ahora, sobre los stats ya calculados, añadimos el bonus de NIVEL de la división.
    const levelBonuses = XP_LEVELS[unit.level || 0];
    if (levelBonuses) {
        unit.attack += (levelBonuses.attackBonus || 0);
        unit.defense += (levelBonuses.defenseBonus || 0);
    }

    unit.discipline = calculateDivisionDiscipline(unit);
}

function handleDisbandUnit(unitToDisband) {
    if (!unitToDisband) return;

    const confirmationMessage = `¿Estás seguro de que quieres disolver "${unitToDisband.name}"? Se recuperará el 50% de su coste en oro.`;
    if (window.confirm(confirmationMessage)) {
        RequestDisbandUnit(unitToDisband);
    }
}

function handlePlacementModeClick(r, c) {
    if (!placementMode.active || !placementMode.unitData) {
        console.error("[Placement] Error: Modo de colocación inactivo o sin datos de unidad. Se cancelará.");
        placementMode.active = false;
        if (UIManager) UIManager.clearHighlights();
        return;
    }
    
    const unitToPlace = placementMode.unitData;
    const hexData = board[r]?.[c];

    if (!hexData) {
        logMessage("Hexágono inválido.");
        return; // Mantenemos el modo activo para que el jugador pueda intentarlo en otro sitio.
    }

    if (getUnitOnHex(r, c)) {
        logMessage(`Ya hay una unidad en este hexágono.`);
        return; // Mantenemos el modo activo.
    }

    let canPlace = false;
    
    // <<== MODO INVASIÓN: Restricciones de deployment ==>>
    if (gameState.gameMode === 'invasion' && gameState.currentPhase === "deployment") {
        const currentPlayer = gameState.currentPlayer;
        
        // Determinar rol basado en número de ciudades controladas
        const playerCities = gameState.cities.filter(c => c.owner === currentPlayer);
        const isAttacker = playerCities.length === 1; // El que tiene solo 1 ciudad es atacante
        
        console.log(`[INVASION DEPLOY] Player ${currentPlayer}: ${playerCities.length} ciudades, isAttacker: ${isAttacker}`);
        
        // Determinar si la unidad es naval
        const isUnitNaval = unitToPlace.regiments && unitToPlace.regiments.some(reg => {
            const regType = REGIMENT_TYPES[reg.type];
            return regType && regType.is_naval === true;
        });
        
        console.log(`[INVASION DEPLOY] Unidad: ${unitToPlace.name}, Naval: ${isUnitNaval}`);

        if (isAttacker) {
            // ATACANTE: Solo puede desplegar cerca de su base de invasión (radio 1)
            const attackerBase = playerCities[0];
            
            if (attackerBase) {
                const distanceFromBase = hexDistance(attackerBase.r, attackerBase.c, r, c);
                console.log(`[INVASION DEPLOY] Atacante a base (${attackerBase.r},${attackerBase.c}): distancia=${distanceFromBase}, radio=${INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS}`);
                
                // Validar terreno según tipo de unidad
                let terrainValid = false;
                if (isUnitNaval) {
                    terrainValid = hexData.terrain === 'water';
                } else {
                    terrainValid = hexData.terrain !== 'water';
                }
                
                if (distanceFromBase <= INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS && terrainValid) {
                    canPlace = true;
                    console.log(`[INVASION DEPLOY] ✓ Distancia válida para colocar en (${r},${c})`);
                } else {
                    if (distanceFromBase > INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS) {
                        logMessage(`Solo puedes desplegar dentro de ${INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS} hex de tu base.`);
                    } else if (!terrainValid) {
                        logMessage(isUnitNaval ? "Unidades navales solo en agua." : "Unidades terrestres no en agua.");
                    }
                    canPlace = false;
                    console.log(`[INVASION DEPLOY] ✗ Distancia o terreno inválido`);
                }
            } else {
                console.error(`[INVASION DEPLOY] ERROR: Atacante sin ciudad base detectada`);
                logMessage(`Error: No se encontró tu base de invasión.`);
                canPlace = false;
            }
        } else {
            // DEFENSOR: Puede desplegar en cualquier ciudad propia y alrededores (radio 20)
            const defenderCities = playerCities;
            let nearCity = false;
            
            console.log(`[INVASION DEPLOY] Defensor con ${defenderCities.length} ciudades`);
            
            for (const city of defenderCities) {
                const distanceFromCity = hexDistance(city.r, city.c, r, c);
                console.log(`[INVASION DEPLOY] Distancia a ciudad (${city.r},${city.c}): ${distanceFromCity}, radio permitido: ${INVASION_MODE_CONFIG.DEFENDER_DEPLOYMENT_RADIUS}`);
                if (distanceFromCity <= INVASION_MODE_CONFIG.DEFENDER_DEPLOYMENT_RADIUS) {
                    nearCity = true;
                    break;
                }
            }
            
            // Validar terreno según tipo de unidad
            let terrainValid = false;
            if (isUnitNaval) {
                terrainValid = hexData.terrain === 'water';
            } else {
                terrainValid = hexData.terrain !== 'water';
            }
            
            if (nearCity && terrainValid) {
                canPlace = true;
                console.log(`[INVASION DEPLOY] ✓ Defensor puede colocar en (${r},${c})`);
            } else {
                if (!nearCity) {
                    logMessage(`El Defensor debe desplegar cerca de sus ciudades.`);
                } else if (!terrainValid) {
                    logMessage(isUnitNaval ? "Unidades navales solo en agua." : "Unidades terrestres no en agua.");
                }
                canPlace = false;
                console.log(`[INVASION DEPLOY] ✗ Defensor fuera de rango o terreno inválido`);
            }
        }
    }
    // <<== MODO INVASIÓN: Reclutamiento durante juego (fase "play") ==>>
    else if (gameState.gameMode === 'invasion' && gameState.currentPhase === "play" && placementMode.recruitHex) {
        // En fase de juego, el reclutamiento funciona igual que en modo normal
        // Debe estar a distancia 1 del hex de reclutamiento (ciudad/fortaleza)
        const distanceFromRecruitHex = hexDistance(placementMode.recruitHex.r, placementMode.recruitHex.c, r, c);
        
        // Determinar si la unidad es naval
        const isUnitNaval = unitToPlace.regiments && unitToPlace.regiments.some(reg => {
            const regType = REGIMENT_TYPES[reg.type];
            return regType && regType.is_naval === true;
        });
        
        console.log(`[INVASION RECRUIT] Unidad: ${unitToPlace.name}, Naval: ${isUnitNaval}, Terreno: ${hexData.terrain}, Distancia: ${distanceFromRecruitHex}`);
        
        // Validar posición según tipo de unidad
        let terrainValid = false;
        if (isUnitNaval) {
            terrainValid = hexData.terrain === 'water'; // Unidades navales SOLO en agua
        } else {
            terrainValid = hexData.terrain !== 'water'; // Unidades terrestres NO en agua
        }
        
        if (distanceFromRecruitHex <= 1 && terrainValid) {
            canPlace = true;
            console.log(`[INVASION RECRUIT] ✓ Reclutamiento permitido en (${r},${c})`);
        } else {
            if (distanceFromRecruitHex > 1) {
                logMessage("Debes reclutar cerca de tu ciudad o fortaleza.");
            } else if (!terrainValid) {
                if (isUnitNaval) {
                    logMessage("Las unidades navales solo se pueden colocar en agua.");
                } else {
                    logMessage("Las unidades terrestres no se pueden colocar en agua.");
                }
            }
            canPlace = false;
            console.log(`[INVASION RECRUIT] ✗ Reclutamiento rechazado: distancia=${distanceFromRecruitHex}, terrainValid=${terrainValid}`);
        }
    }
    // Lógica para MODOS NO-INVASIÓN
    else if (gameState.gameMode !== 'invasion') {
        console.log(`[DEPLOY] Modo no-invasión: ${gameState.gameMode}, fase: ${gameState.currentPhase}`);
        
        if (hexData && !getUnitOnHex(r,c)) {
            if (gameState.currentPhase === "deployment" && hexData.terrain !== 'water') {
                canPlace = true;
                console.log(`[DEPLOY] Despliegue normal permitido en (${r},${c})`);
            } else if (gameState.currentPhase === "play" && placementMode.recruitHex) {
                if (hexDistance(placementMode.recruitHex.r, placementMode.recruitHex.c, r, c) <= 1) {
                    canPlace = true;
                    console.log(`[DEPLOY] Reclutamiento permitido en (${r},${c})`);
                }
            }
        } else if (gameState.currentPhase === "deployment") {
            // En despliegue inicial, permite colocar en cualquier casilla no-agua
            if (hexData.terrain === 'water') {
                reasonForNoPlacement = "No se pueden desplegar unidades de tierra en el agua.";
                canPlace = false;
            } else {
                canPlace = true;
                console.log(`[DEPLOY] Despliegue inicial permitido en (${r},${c})`);
            }
        }
    }
    // Seguridad: Si gameMode es invasión pero llegó aquí, rechaza
    else {
        console.error(`[DEPLOY ERROR] gameMode=${gameState.gameMode} pero no procesado por lógica de invasión`);
        canPlace = false;
        logMessage("Error interno: modo invasión no procesado correctamente.");
    }
    
    if (canPlace) {
        // --- GESTIÓN DE RECURSOS (siempre se hace en el cliente antes de enviar) ---
        // ... (tu código de validación y resta de recursos se queda igual) ...
        
        // --- LLAMADA CENTRALIZADA A LA RED ---
        RequestPlaceUnit(unitToPlace, r, c);

        // --- LIMPIEZA DE UI ---
        placementMode.active = false;
        placementMode.unitData = null;
        placementMode.recruitHex = null;
        if (UIManager) UIManager.clearHighlights();
        logMessage(`Unidad ${unitToPlace.name} desplegada / petición enviada.`);

    } else {
        logMessage("No se puede colocar la unidad aquí.");
        // Lógica de reembolso de recursos (se mantiene)
        if (unitToPlace.cost) {
            for (const resourceType in unitToPlace.cost) {
                gameState.playerResources[gameState.currentPlayer][resourceType] += unitToPlace.cost[resourceType];
            }
            if (UIManager) UIManager.updatePlayerAndPhaseInfo();
            logMessage("Colocación cancelada. Recursos reembolsados.");
        }
        placementMode.active = false;
        placementMode.unitData = null;
        if (UIManager) UIManager.clearHighlights();
    }
}

async function RequestMoveUnit(unit, toR, toC) {
    // 1. Generamos el ID y la Acción
    const actionId = `move_${unit.id}_${toR}_${toC}_${Date.now()}`;
    const action = { type: 'moveUnit', actionId: actionId, payload: { playerId: unit.player, unitId: unit.id, toR, toC }};

    // 2. Si soy CLIENTE, intento enviar la orden por red (Fire & Forget)
    if (isNetworkGame() && !NetworkManager.esAnfitrion) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
    }

    // 3. EJECUCIÓN INMEDIATA (La solución):
    // Si soy el Anfitrión (siempre ejecuta local) O si soy Cliente y es MI unidad (ejecución optimista)
    if (NetworkManager.esAnfitrion || unit.player === gameState.myPlayerNumber) {
        
        await _executeMoveUnit(unit, toR, toC);
        
        // ¡ACTUALIZAMOS EL RELOJ! Esto es lo que permitirá sincronizar al volver de la llamada
        gameState.lastActionTimestamp = Date.now();

        // Si soy el Anfitrión, envío el estado nuevo a todos
        if (isNetworkGame() && NetworkManager.esAnfitrion) {
            NetworkManager.broadcastFullState();
        }
    }
}

async function RequestAttackUnit(attacker, defender) {
    const actionId = `attack_${attacker.id}_${defender.id}_${Date.now()}`;
    const action = { type: 'attackUnit', actionId: actionId, payload: { playerId: attacker.player, attackerId: attacker.id, defenderId: defender.id }};

    // Bloqueo simple por acción pendiente (doble clic / doble envío)
    const now = Date.now();
    if (attacker.pendingActionId && now - (attacker.pendingActionTimestamp || 0) < 1000) {
        console.warn(`[RequestAttackUnit] Acción duplicada detectada para unidad ${attacker.id}, ignorando.`);
        return;
    }
    attacker.pendingActionId = actionId;
    attacker.pendingActionTimestamp = now;

    // Prevención de race conditions: evitar acciones duplicadas del mismo atacante
    if (typeof ActionValidator !== 'undefined') {
        if (!ActionValidator.canPerformAction(attacker.id, actionId)) {
            return;
        }
        ActionValidator.registerAction(attacker.id, actionId);
    }

    try {
        // 1. Enviar por red si soy Cliente
        if (isNetworkGame() && !NetworkManager.esAnfitrion) {
            NetworkManager.enviarDatos({ type: 'actionRequest', action });
        }

        // 2. Ejecutar localmente si es mi unidad
        if (NetworkManager.esAnfitrion || attacker.player === gameState.myPlayerNumber) {
            
            await attackUnit(attacker, defender);
            
            // Actualizamos el reloj
            gameState.lastActionTimestamp = Date.now();

            if (isNetworkGame() && NetworkManager.esAnfitrion) {
                NetworkManager.broadcastFullState();
            }
        } else {
            // AÑADIR ESTE ELSE para saber si está fallando aquí
            console.warn(`[RequestAttackUnit] BLOQUEADO. Atacante(J${attacker.player}) !== MiJugador(J${gameState.myPlayerNumber}). ¿Eres Anfitrión? ${NetworkManager.esAnfitrion}`);
        }
    } finally {
        if (typeof ActionValidator !== 'undefined') {
            ActionValidator.completeAction(attacker.id);
        }

        if (attacker.pendingActionId === actionId) {
            attacker.pendingActionId = null;
            attacker.pendingActionTimestamp = null;
        }
    }
}

let _isMergingUnits = false;

async function RequestMergeUnits(mergingUnit, targetUnit, skipConfirm = false) {
    // PROTECCIÓN: Prevenir múltiples llamadas simultáneas
    if (_isMergingUnits) {
        logMessage("Ya hay una fusión en proceso.", "warning");
        return;
    }
    
    _isMergingUnits = true; // Bloquear nuevas solicitudes

    try {
        // La confirmación debe ocurrir ANTES de enviar la acción al anfitrión
        // para que el modal aparezca en el cliente que inicia la fusión
        if (!skipConfirm) {
            const confirmation = window.confirm(`¿Fusionar "${mergingUnit.name}" con "${targetUnit.name}"?`);
            if (!confirmation) {
                logMessage("Fusión cancelada.", "info");
                return;
            }
        }

        // ¡ACTUALIZAMOS EL RELOJ! Esto es lo que permitirá sincronizar al volver de la llamada
        gameState.lastActionTimestamp = Date.now();

        // Generar ID único para esta acción (para deduplicación en el anfitrión)
        const actionId = `merge_${mergingUnit.id}_${targetUnit.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`%c[RequestMergeUnits] ID único generado: ${actionId}`, 'background: #FFD700; color: #000; font-weight: bold;');
        const action = { type: 'mergeUnits', actionId: actionId, payload: { playerId: mergingUnit.player, mergingUnitId: mergingUnit.id, targetUnitId: targetUnit.id }};
        if (isNetworkGame()) {
            if (NetworkManager.esAnfitrion) {
                await processActionRequest(action);
            } else {
                NetworkManager.enviarDatos({ type: 'actionRequest', action });
            }
            return;
        }
        // CORRECCIÓN: Usar await también para juegos locales
        await mergeUnits(mergingUnit, targetUnit);
    } finally {
        // Desbloquear después de un breve delay para evitar clics accidentales
        setTimeout(() => { _isMergingUnits = false; }, 500);
    }
}

function RequestPlaceUnit(unitToPlace, r, c) {
    const action = {
        type: 'placeUnit',
        actionId: `place_${Date.now()}_${r}_${c}`,
        payload: {
            playerId: gameState.myPlayerNumber,
            unitData: JSON.parse(JSON.stringify(unitToPlace, (key, value) => key === 'element' ? undefined : value)),
            r, c
        }
    };

    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
    } else {
        // Para juego local, el ID se asigna dentro de placeFinalizedDivision
        placeFinalizedDivision(unitToPlace, r, c);
    }
}

function RequestSplitUnit(originalUnit, targetR, targetC) {
    const actionData = gameState.preparingAction;
    // Generar ID único para esta acción (para deduplicación en el anfitrión)
    const actionId = `split_${originalUnit.id}_${targetR}_${targetC}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action = { 
        type: 'splitUnit',
        actionId: actionId, 
        payload: { 
            playerId: originalUnit.player, 
            originalUnitId: originalUnit.id, 
            newUnitRegiments: actionData.newUnitRegiments, 
            remainingOriginalRegiments: actionData.remainingOriginalRegiments, 
            targetR, targetC 
        }
    };
    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action });
        }
        cancelPreparingAction();
        return;
    }
    splitUnit(originalUnit, targetR, targetC);
}

/**
 * [Punto de Entrada] Inicia la acción de Arrasar una estructura.
 * Es llamada desde el botón de la UI.
 */
function requestRazeStructure() {
    if (!selectedUnit) {
        logMessage("No hay una unidad seleccionada para arrasar la estructura.", "error");
        return;
    }

    const action = {
        type: 'razeStructure',
        actionId: `raze_${selectedUnit.id}_${Date.now()}`, 
        payload: {
            playerId: selectedUnit.player,
            unitId: selectedUnit.id,
            r: selectedUnit.r,
            c: selectedUnit.c
        }
    };

    // En un futuro, podrías añadir una confirmación:
    // if (!confirm("¿Seguro que quieres arrasar esta estructura? Se convertirá en ruinas.")) return;

    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) processActionRequest(action);
        else NetworkManager.enviarDatos({ type: 'actionRequest', action });
    } else {
        _executeRazeStructure(action.payload);
    }
}

function handlePillageAction() {
    RequestPillageAction();
}

/**
 * [Punto de Entrada] Inicia la acción de Saqueo.
 * Decide si ejecutar localmente o enviar una petición a la red.
 */
function RequestPillageAction() {
    if (!selectedUnit) return;
    
    const action = {
        type: 'pillageHex',
        actionId: `pillage_${selectedUnit.id}_${Date.now()}`, 
        payload: { playerId: selectedUnit.player, unitId: selectedUnit.id }
    };
    
    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action });
        }
    } else {
        // Para juegos locales, llama directamente a la función de ejecución.
        _executePillageAction(selectedUnit);
    }
}

function RequestUndoLastUnitMove(unit) {
    if (!unit) return;
    // Generar ID único para esta acción (para deduplicación en el anfitrión)
    const actionId = `undo_${unit.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action = { type: 'undoMove', actionId: actionId, payload: { playerId: unit.player, unitId: unit.id }};
    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action });
        }
    } else {
        // Juego local: ejecutar directamente
        undoLastUnitMove(unit);
    }
}

function RequestAssignGeneral(unit, generalId) {
    if (!unit) return;

    const action = {
        type: 'assignGeneral',
        actionId: `assignG_${unit.id}_${generalId}_${Date.now()}`,
        payload: {
            playerId: unit.player,
            unitId: unit.id,
            generalId: generalId
        }
    };

    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
    } else {
        // Lógica local
        _executeAssignGeneral(action.payload);
    }
}

/**
 * [Función de Ejecución] Contiene la lógica real de arrasar la estructura.
 * @param {object} payload - El objeto de datos de la acción.
 */
function _executeRazeStructure(payload) {
    const { playerId, unitId, r, c } = payload;
    const unit = getUnitById(unitId);
    const hex = board[r]?.[c];

    if (!unit || !hex) return;
    if (unit.player !== playerId) return;
    
    // CORRECCIÓN: Eliminado "|| unit.hasMoved". Solo bloquea si ya atacó.
    if (unit.hasAttacked) { 
        logMessage("La unidad ya ha realizado una acción de combate.", "warning");
        return; 
    }
    
    if (!hex.structure) return;

    logMessage(`${unit.name} ha arrasado la estructura ${hex.structure} en (${r},${c}).`, "important");

    const structureBefore = hex.structure;
    const featureBefore = hex.feature;

    // Convertimos la estructura en ruinas
    hex.structure = null;
    hex.feature = 'ruins'; 
    
    unit.hasMoved = true;
    unit.hasAttacked = true;

    // Actualizar la UI
    if (typeof renderSingleHexVisuals === 'function') {
        renderSingleHexVisuals(r, c);
    }
    
    if (UIManager) {
        UIManager.hideContextualPanel();
        UIManager.updateAllUIDisplays();
    }
}

/**
 * [Función de Ejecución] Lógica del Saqueo.
 * Permite saquear tras mover.
 */
function _executePillageAction(pillagerUnit) {
    if (!pillagerUnit) return;

    const hex = board[pillagerUnit.r]?.[pillagerUnit.c];

    // --- Validaciones de Lógica ---
    if (!hex || hex.owner === null || hex.owner === pillagerUnit.player) {
        logMessage("No se puede saquear un territorio propio o neutral.", "error");
        return;
    }
    
    // CORRECCIÓN: Eliminado "|| pillagerUnit.hasMoved".
    if (pillagerUnit.hasAttacked) {
        logMessage("Esta unidad ya ha realizado una acción de combate.", "error");
        return;
    }

    let goldGained = 15; // Ganancia base por saquear
    
    // Si hay una estructura, se daña y se obtiene más oro.
    if (hex.structure) {
        logMessage(`${pillagerUnit.name} está saqueando la estructura ${hex.structure}!`);
        hex.structure = null;
        goldGained += 50;
    } else {
        logMessage(`${pillagerUnit.name} está saqueando el territorio en (${hex.r}, ${hex.c})!`);
    }

    // El hexágono pierde estabilidad
    hex.estabilidad = Math.max(0, hex.estabilidad - 2);

    // Añadir el oro al jugador
    if (gameState.playerResources[pillagerUnit.player]) {
        gameState.playerResources[pillagerUnit.player].oro += goldGained;
        // CORRECCIÓN: Actualizar UI cuando el jugador humano saquea
        if (pillagerUnit.player === gameState.currentPlayer && typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
    }

    // Consumir la acción de la unidad
    pillagerUnit.hasAttacked = true;
    pillagerUnit.hasMoved = true; 

    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('pillage_completed');
    }

    logMessage(`¡Saqueo exitoso! Obtienes ${goldGained} de oro.`);

    // Actualizar la UI
    if (typeof renderSingleHexVisuals === 'function') {
        renderSingleHexVisuals(pillagerUnit.r, pillagerUnit.c);
    }
    
    if (UIManager) {
        UIManager.updateAllUIDisplays();
        // Ocultamos el panel para refrescar los botones (el botón de saqueo desaparecerá porque hasAttacked es true)
        UIManager.hideContextualPanel();
    }
}

// Función de ejecución pura (también nueva)
function _executeAssignGeneral(payload) {
    const { unitId, generalId } = payload;
    const unit = getUnitById(unitId);
    
    // Simplemente llamamos a la función principal que tiene toda la lógica.
    if (unit) {
        assignHeroToUnit(unit, generalId);
    }
}

/**
 * [Función Pura de Ejecución] Mueve la unidad en el estado del juego y la UI.
 * No contiene lógica de red. Asume que la acción ya ha sido validada y confirmada.
 * @private
 */
async function _executeMoveUnit(unit, toR, toC, isMergeMove = false) {
    // Prohibir entrar en La Banca
    if (board[toR]?.[toC]?.owner === BankManager.PLAYER_ID) {
        logMessage("La ciudad de La Banca es territorio neutral.", "warning");
        return;
    }

    const fromR = unit.r;
    const fromC = unit.c;
    const targetHexData = board[toR]?.[toC];

    // Calcular coste
    unit.lastMove = {
        fromR: fromR,
        fromC: fromC,
        initialCurrentMovement: unit.currentMovement,
        initialHasMoved: unit.hasMoved,
        initialHasAttacked: unit.hasAttacked,
        movedToHexOriginalOwner: targetHexData ? targetHexData.owner : null
    };
    const costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC, isMergeMove);
    if (costOfThisMove === Infinity && !isMergeMove) return;

    // --- 1. Limpiar origen ---
    if (board[fromR]?.[fromC]) {
        board[fromR][fromC].unit = null;
        renderSingleHexVisuals(fromR, fromC);
    }

    // --- 2. Actualizar datos unidad ---
    unit.r = toR;
    unit.c = toC;
    unit.currentMovement = Math.max(0, unit.currentMovement - costOfThisMove);
    unit.hasMoved = true; 

    if (typeof UnitGrid !== 'undefined') {
        const moved = UnitGrid.move(unit, fromR, fromC);
        if (!moved) {
            UnitGrid.index(unit);
        }
    }

    // --- 3. Actualizar destino ---
    if (targetHexData) {
        targetHexData.unit = unit;
        
        // A. Captura de territorio NEUTRAL (Lógica original)
        const bankPlayerId = typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : null;
        if (targetHexData.owner === null && unit.player !== bankPlayerId) {
            targetHexData.owner = unit.player;
            targetHexData.estabilidad = 1;
            targetHexData.nacionalidad = { 1: 0, 2: 0 };
            targetHexData.nacionalidad[unit.player] = 1;
            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city?.owner === null) { city.owner = unit.player; }
            renderSingleHexVisuals(toR, toC);
        }
        // B. Captura de Ciudad BÁRBARA/INDEPENDIENTE (NUEVO - BOOST EXPLOSIVO)
        // Usamos la constante BARBARIAN_PLAYER_ID (o el número 9 directamente si no definiste la constante)
        else if (targetHexData.owner === 9 && targetHexData.isCity) {
            
            // 1. Transferencia de Propiedad
            targetHexData.owner = unit.player;
            targetHexData.estabilidad = 2; // Un poco de inestabilidad inicial, pero controlada
            
            // Reseteamos nacionalidad y asignamos lealtad alta al conquistador (¡Libertadores!)
            targetHexData.nacionalidad = { 1: 0, 2: 0 }; 
            targetHexData.nacionalidad[unit.player] = 5; 

            // Actualizar array global de ciudades
            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city) {
                city.owner = unit.player;
                logMessage(`¡La ciudad independiente de ${city.name} ha sido anexionada!`, "success");
            }

            // 2. EL BOOST EXPLOSIVO (Recompensas)
            const lootGold = 1000;      // Mucho oro para construir rápido
            const lootResearch = 200;   // Un empujón tecnológico
            const lootRecruit = 500;    // Puntos para reponer tropas inmediatamente

            if (gameState.playerResources[unit.player]) {
                gameState.playerResources[unit.player].oro += lootGold;
                gameState.playerResources[unit.player].researchPoints += lootResearch;
                // Si usas puntos de reclutamiento en tu economía:
                if (gameState.playerResources[unit.player].puntosReclutamiento !== undefined) {
                    gameState.playerResources[unit.player].puntosReclutamiento += lootRecruit;
                }
            }

            // 3. Recuperación de la Unidad (Momentum de Victoria)
            // Se cura 250 HP (simbolizando reclutamiento local o moral alta)
            unit.currentHealth = Math.min(unit.maxHealth, unit.currentHealth + 250);
            // Moral al máximo por la victoria épica
            unit.morale = unit.maxMorale || 125;

            // 4. Feedback Visual
            if (typeof showFloatingDamage === 'function') {
                // Usamos la función de daño flotante para mostrar texto positivo
                showFloatingDamage(unit, "¡CONQUISTA!", "heal"); 
            }
            logMessage(`Botín de guerra: ${lootGold} Oro, ${lootResearch} Ciencia.`, "success");

            renderSingleHexVisuals(toR, toC);
        }
        // C. Captura de territorio de otro jugador Humano/IA (Opcional, si quieres lógica estándar aquí)
        else if (targetHexData.owner !== null && targetHexData.owner !== unit.player) {
            // Aquí iría la lógica de ocupación normal (bajar nacionalidad poco a poco),
            // pero como acabas de moverte encima (y asumimos que ganaste el combate),
            // la lógica de `updateTerritoryMetrics` (en gameFlow.js) se encargará de bajar la nacionalidad turno a turno.
            // O puedes forzar la captura inmediata si es una ciudad indefensa:
             if (targetHexData.isCity && !targetHexData.unit) {
                 // Lógica de captura inmediata si entras en ciudad enemiga vacía
                 // (Omitida para no alterar tu balance actual, pero es una opción)
             }
        }

    } else {
        // Fallback de seguridad (restaurado del original)
        console.error(`[_executeMoveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += costOfThisMove; unit.hasMoved = false;
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit;
        renderSingleHexVisuals(fromR, fromC);
        return;
    }

    // --- 4. Finalización ---
    // <<== CRONISTA ==>>
    if (typeof Chronicle !== 'undefined') {
        Chronicle.logEvent('move', { unit: unit, toR: toR, toC: toC });
    }

    // <<== TUTORIAL ==>>
    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('unit_moved');
    }

    // Consumir bonus si existe
    if (targetHexData.destroyedUnitBonus && targetHexData.destroyedUnitBonus.claimedBy === null) {
        const bonus = targetHexData.destroyedUnitBonus;
        unit.experience += bonus.experience;
        unit.morale = Math.min(unit.maxMorale || 125, (unit.morale || 50) + bonus.morale);
        logMessage(`¡Restos reclamados! +${bonus.experience} XP, +${bonus.morale} Moral.`);
        delete targetHexData.destroyedUnitBonus;
        renderSingleHexVisuals(toR, toC);
        
        // <<== LEVEL UP Y UI BONUS ==>>
        checkAndApplyLevelUp(unit);
        if(selectedUnit?.id === unit.id) { UIManager.showUnitContextualInfo(unit, true); }
    }

    // <<== LOG ==>>
    logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);

    positionUnitElement(unit);
    
    // <<== CAPTURA DE EVENTO PARA REPLAY ==>>
    if (typeof ReplayIntegration !== 'undefined') {
        ReplayIntegration.recordUnitMove(
            unit.id, 
            unit.name, 
            unit.player, 
            fromR, 
            fromC, 
            toR, 
            toC
        );
    }
    
    if (UIManager) { 
        UIManager.updateSelectedUnitInfoPanel(); 
        UIManager.updatePlayerAndPhaseInfo(); 
        // <<== CHECK VICTORY ==>>
        if (gameState.currentPhase === 'play' && typeof checkVictory === "function") {
            if (checkVictory()) return;
        }
        if (selectedUnit?.id === unit.id) UIManager.highlightPossibleActions(unit);
    }
}

function handleConfirmBuildStructure(actionData) {
    console.log(`%c[handleConfirmBuildStructure] INICIO.`, "background: #222; color: #bada55");

    const isPlayerAction = !actionData;
    
    const r = isPlayerAction ? parseInt(domElements.buildStructureModal.dataset.r) : actionData.r;
    const c = isPlayerAction ? parseInt(domElements.buildStructureModal.dataset.c) : actionData.c;
    const structureType = isPlayerAction ? selectedStructureToBuild : actionData.structureType;

    const playerId = isPlayerAction ? gameState.currentPlayer : actionData.playerId;

    if (!structureType || typeof r === 'undefined') {
        console.error(`   -> DIAGNÓSTICO: FALLO. Datos de construcción inválidos. Saliendo.`);
        return;
    }

    const data = STRUCTURE_TYPES[structureType];
    const playerRes = gameState.playerResources[playerId];
    const hexData = board[r]?.[c];

    if (!hexData || !data) {
        console.error(`   -> DIAGNÓSTICO: FALLO. Hex o estructura inválida. Saliendo.`);
        return;
    }

    const unitOnHex = getUnitOnHex(r, c);
    const requiresSettler = !!data.cost?.Colono;

    const isOwner = hexData.owner === playerId;

    if (!isOwner) {
        if (isPlayerAction) logMessage("No puedes construir fuera de tu territorio.", "error");
        console.warn(`[handleConfirmBuildStructure] Territorio no propio en (${r},${c}).`);
        return;
    }


    if (unitOnHex && unitOnHex.player !== playerId) {
        if (isPlayerAction) logMessage("No puedes construir sobre una unidad enemiga.", "error");
        console.warn(`[handleConfirmBuildStructure] Unidad enemiga en (${r},${c}).`);
        return;
    }

    if (!requiresSettler && unitOnHex) {
        if (isPlayerAction) logMessage("No puedes construir sobre una unidad.", "error");
        console.warn(`[handleConfirmBuildStructure] Casilla ocupada en (${r},${c}).`);
        return;
    }

    if (hexData.structure) {
        const nextUpgrade = STRUCTURE_TYPES[hexData.structure]?.nextUpgrade;
        if (nextUpgrade !== structureType) {
            if (isPlayerAction) logMessage("No puedes construir esta estructura aqui.", "error");
            console.warn(`[handleConfirmBuildStructure] Mejora invalida ${hexData.structure} -> ${structureType} en (${r},${c}).`);
            return;
        }
    }

    if (Array.isArray(data.buildableOn) && data.buildableOn.length > 0) {
        if (!data.buildableOn.includes(hexData.terrain)) {
            if (isPlayerAction) {
                logMessage(`No puedes construir ${data.name} en ${TERRAIN_TYPES[hexData.terrain]?.name || 'este terreno'}.`, "error");
            }
            console.warn(`[handleConfirmBuildStructure] Terreno inválido para ${structureType} en (${r},${c}).`);
            return;
        }
    }

    const playerTechs = playerRes?.researchedTechnologies || [];
    if (data.requiredTech && !playerTechs.includes(data.requiredTech)) {
        if (isPlayerAction) logMessage("No tienes la tecnologia requerida.", "error");
        console.warn(`[handleConfirmBuildStructure] Tecnologia requerida faltante (${data.requiredTech}).`);
        return;
    }

    // --- 1. Validación de Costes (sin cambios) ---
    for (const res in data.cost) {
        if (res === 'Colono') {
            // --- INICIO DE LA SOLUCIÓN ---
            // Lógica especial para validar la presencia de una unidad Colono.
            const unitOnHex = getUnitOnHex(r, c);
            const tieneRegimientoColono = unitOnHex?.regiments.some(reg => reg.type === 'Colono');

            if (!unitOnHex || !tieneRegimientoColono || unitOnHex.player !== playerId) {
                if (isPlayerAction) logMessage(`Error: Se requiere una unidad Colono en la casilla.`);
                return; // Detiene si no hay un Colono válido
            }
        } else {
            // Lógica normal para los demás recursos.
            if ((playerRes[res] || 0) < data.cost[res]) {
                if (isPlayerAction) logMessage(`Error: No tienes suficientes ${res}.`);
                return; // Detiene si no se puede pagar
            }
        }
    }

    // --- 2. Cobro de Recursos (sin cambios) ---
    for (const res in data.cost) {
        playerRes[res] -= data.cost[res];
    }
     // Consumir la unidad de colono
    if (data.cost['Colono']) {
        const unitOnHex = getUnitOnHex(r,c);
        if (unitOnHex && unitOnHex.isSettler) {
            handleUnitDestroyed(unitOnHex, null);
            logMessage("¡El Colono ha establecido una nueva Aldea!");
        }
    }

    // Otorgar puntos de investigación por estructura construida
    if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.onStructureBuilt) {
        ResearchRewardsManager.onStructureBuilt(playerId, structureType);
    }

    
    // AUDIO
    if (typeof AudioManager !== 'undefined') {
        AudioManager.playSound('structure_built');
    }

    // <<== CAPTURA DE EVENTO CONSTRUCCIÓN PARA REPLAY ==>>
    if (typeof ReplayIntegration !== 'undefined') {
        ReplayIntegration.recordBuild(structureType, r, c, playerId, `Jugador ${playerId}`);
    }

    // <<== CRÓNICA: Registrar construcción ==>>
    if (typeof Chronicle !== 'undefined') {
        const buildingName = data.name || structureType;
        const location = `(${r},${c})`;
        Chronicle.logEvent('construction', {
            structureType: structureType,
            location: [r, c],
            playerId: playerId,
            name: buildingName,
            isCity: data.isCity || false
        });
    }
    if (typeof StatTracker !== 'undefined') {
        const turn = gameState.turnNumber || 1;
        const buildingName = data.name || structureType;
        StatTracker.recordEvent(
            turn,
            'build',
            playerId,
            `Construcción de ${buildingName}`,
            { buildingType: buildingName }
        );
    }

    // --- 3. APLICACIÓN DE ESTRUCTURA Y CIUDAD  ---
    
    // Primero asignamos la estructura física al hexágono
    board[r][c].structure = structureType;

    // Si es una ciudad (Aldea, Ciudad, Metrópoli), usamos la función inteligente
    if (data.isCity) {
        board[r][c].isCity = true;
        
        // ¡ESTA ES LA CLAVE!
        // Pasamos 'null' como nombre para forzar a addCityToBoardData a buscar uno histórico (Gadir, etc).
        // addCityToBoardData se encarga de actualizar gameState.cities y board[r][c].cityName
        addCityToBoardData(r, c, playerId, null, false);
        
        // Log de confirmación
        const newName = board[r][c].cityName;
        logMessage(`¡Se ha fundado la ${structureType} de ${newName}!`, "success");
    } else {
        // Si no es ciudad (ej. Camino, Fortaleza simple), solo logueamos la estructura
        logMessage(`${data.name} construido en (${r},${c}).`);
    }

    // Integridad de estructura
    if (data.integrity) {
        board[r][c].currentIntegrity = data.integrity;
    } else {
        // Si no, nos aseguramos de que no haya un valor antiguo.
        delete board[r][c].currentIntegrity;
    }

    // --- 4. Actualización de UI ---
    if (typeof renderSingleHexVisuals === 'function') {
        renderSingleHexVisuals(r, c);
    }
    
    if (isPlayerAction) {
        // Si la acción fue de un jugador humano, actualizamos y cerramos sus ventanas.
        if(UIManager) {
            UIManager.updatePlayerAndPhaseInfo();
            UIManager.hideContextualPanel();
        }
        if(domElements.buildStructureModal) {
            domElements.buildStructureModal.style.display = 'none';
        }
    } else {
        // Si la acción fue de la IA, solo actualizamos la información de recursos.
        if (UIManager && UIManager.updatePlayerAndPhaseInfo) {
            UIManager.updatePlayerAndPhaseInfo();
        }
    }
}

/**
 * Reorganiza los regimientos dentro de una división para consolidar las bajas.
 * Agrupa los regimientos por tipo, suma su salud y crea nuevos regimientos a partir del total.
 * Esta acción consume el turno de la unidad.
 * @param {object} unit - La división que se va a reorganizar.
 */
function consolidateRegiments(unit) {
    if (!unit || unit.hasMoved || unit.hasAttacked) {
        logMessage("La unidad no puede reorganizarse porque ya ha actuado.", "warning");
        return;
    }

    if (!confirm(`¿Reorganizar la división "${unit.name}"? Esto consolidará los regimientos dañados y consumirá el turno de la unidad.`)) {
        logMessage("Reorganización cancelada.");
        return;
    }

    const newRegimentsList = [];
    const regimentsByType = new Map();

    // 1. Agrupar todos los regimientos por su tipo
    for (const reg of unit.regiments) {
        if (!regimentsByType.has(reg.type)) {
            regimentsByType.set(reg.type, []);
        }
        regimentsByType.get(reg.type).push(reg);
    }

    let consolidationHappened = false;

    // 2. Procesar cada grupo de regimientos
    for (const [type, regGroup] of regimentsByType.entries()) {
        const regData = REGIMENT_TYPES[type];
        const maxHealthPerReg = regData.health;

        // Si solo hay un regimiento de este tipo o ninguno está dañado, no hacemos nada.
        if (regGroup.length <= 1 && regGroup[0].health === maxHealthPerReg) {
            newRegimentsList.push(...regGroup);
            continue;
        }

        // Calcular la salud total del grupo
        const totalHealth = regGroup.reduce((sum, reg) => sum + reg.health, 0);

        if (totalHealth > 0) {
            consolidationHappened = true;
            const newFullRegimentsCount = Math.floor(totalHealth / maxHealthPerReg);
            const remainingHealth = totalHealth % maxHealthPerReg;

            // Añadir los nuevos regimientos a plena salud
            for (let i = 0; i < newFullRegimentsCount; i++) {
                const newFullReg = JSON.parse(JSON.stringify(regData));
                newFullReg.type = type;
                newFullReg.health = maxHealthPerReg;
                newFullReg.id = `r${Date.now()}${i}`;
                newRegimentsList.push(newFullReg);
            }

            // Añadir el regimiento final con la salud sobrante
            if (remainingHealth > 0) {
                const newDamagedReg = JSON.parse(JSON.stringify(regData));
                newDamagedReg.type = type;
                newDamagedReg.health = remainingHealth;
                newDamagedReg.id = `r${Date.now()}rem`;
                newRegimentsList.push(newDamagedReg);
            }
        }
    }

    if (!consolidationHappened) {
        logMessage("No hay regimientos que necesiten consolidación en esta división.");
        return;
    }

    // 3. Actualizar la división con la nueva lista de regimientos
    unit.regiments = newRegimentsList;
    
    // 4. Recalcular todos los stats y consumir el turno
    recalculateUnitStats(unit);
    unit.currentHealth = newRegimentsList.reduce((sum, reg) => sum + reg.health, 0);
    unit.hasMoved = true;
    unit.hasAttacked = true;

    // 5. Feedback al jugador y actualización de la UI
    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('consolidation_completed');
    }
    Chronicle.logEvent('consolidate', { unit }); // (Opcional, si quieres añadirlo a la Crónica)
    logMessage(`La división "${unit.name}" ha reorganizado sus fuerzas.`, "success");
    UIManager.updateUnitStrengthDisplay(unit);
    UIManager.showUnitContextualInfo(unit, true);
    UIManager.clearHighlights();
}

/**
 * Encuentra la ruta óptima desde un punto de inicio a un destino usando el algoritmo A*.
 * Puede operar en modo normal (terreno) o en modo infraestructura (solo caminos/ciudades).
 * @param {object} unit - La unidad que se mueve (puede ser "fantasma").
 * @param {object} startCoords - Las coordenadas de inicio {r, c}.
 * @param {object} targetCoords - Las coordenadas de destino {r, c}.
 * @param {object} [pathOptions={}] - Opciones para el pathfinding.
 * @param {boolean} [pathOptions.infrastructureOnly=false] - Si es true, solo busca por hexágonos con estructuras.
 * @returns {Array|null} - Un array de coordenadas de la ruta, o null si no se encontró.
 */
/**
 * (NUEVA FUNCIÓN) Encuentra una ruta usando solo hexágonos con infraestructura.
 */
function findInfrastructurePath(startCoords, targetCoords) {
    let queue = [ { ...startCoords, path: [startCoords] } ];
    let visited = new Set([`${startCoords.r},${startCoords.c}`]);

    while (queue.length > 0) {
        let current = queue.shift();

        if (current.r === targetCoords.r && current.c === targetCoords.c) {
            return current.path; // RUTA ENCONTRADA
        }

        for (const neighbor of getHexNeighbors(current.r, current.c)) {
            const key = `${neighbor.r},${neighbor.c}`;
            if (visited.has(key)) continue;

            const hex = board[neighbor.r]?.[neighbor.c];
            
            
            // La condición ahora solo comprueba si el hexágono tiene infraestructura.
            // IGNORA si hay una unidad en él.
            if (hex && (hex.structure || hex.isCity)) {
                visited.add(key);
                const newPath = [...current.path, neighbor];
                queue.push({ ...neighbor, path: newPath });
            }
        }
    }
    
    return null; 
}

function findNavalPath(start, target) {
    if (!start || !target) return null;

    let openSet = [{ r: start.r, c: start.c, f: 0, g: 0, parent: null }];
    let visited = new Set();
    let iterations = 0;
    const MAX_ITERATIONS = 3000; 

    while (openSet.length > 0) {
        iterations++;
        if (iterations > MAX_ITERATIONS) {
            console.warn("[NavalPath] Pathfinding timed out.");
            return null;
        }

        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift();
        const currentKey = `${current.r},${current.c}`;

        if (visited.has(currentKey)) continue;
        visited.add(currentKey);

        if (current.r === target.r && current.c === target.c) {
            let path = [];
            let curr = current;
            while (curr) {
                path.unshift({ r: curr.r, c: curr.c });
                curr = curr.parent;
            }
            return path;
        }

        for (const neighbor of getHexNeighbors(current.r, current.c)) {
            const nKey = `${neighbor.r},${neighbor.c}`;
            if (visited.has(nKey)) continue;

            const hex = board[neighbor.r]?.[neighbor.c];
            
            if (hex && hex.terrain === 'water') {
                const g = current.g + 1;
                const h = hexDistance(neighbor.r, neighbor.c, target.r, target.c);
                const f = g + h;
                openSet.push({ r: neighbor.r, c: neighbor.c, f, g, parent: current });
            }
        }
    }
    return null;
}

function findPath_A_Star(unit, startCoords, targetCoords) {
    if (!unit || !startCoords || !targetCoords) return null;

    const hasJumpAbility = unit.regiments.some(reg => 
        (REGIMENT_TYPES[reg.type]?.abilities || []).includes("Jump")
    );

    let openSet = [ { ...startCoords, g: 0, h: hexDistance(startCoords.r, startCoords.c, targetCoords.r, targetCoords.c), f: 0, path: [startCoords] } ];
    openSet[0].f = openSet[0].h;
    
    let visited = new Set([`${startCoords.r},${startCoords.c}`]);

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift();

        if (current.r === targetCoords.r && current.c === targetCoords.c) {
            return current.path;
        }

        for (const neighbor of getHexNeighbors(current.r, current.c)) {
            const key = `${neighbor.r},${neighbor.c}`;
            if (visited.has(key)) continue;

            const hex = board[neighbor.r]?.[neighbor.c];
            if (!hex || TERRAIN_TYPES[hex.terrain].isImpassableForLand) continue;
            
            const unitOnNeighbor = hex.unit;
            let canPassThrough = false;

            if (!unitOnNeighbor) {
                canPassThrough = true;
            } else if (unitOnNeighbor.player === unit.player && hasJumpAbility) {
                canPassThrough = true;
            }
            
            if (neighbor.r === targetCoords.r && neighbor.c === targetCoords.c && unitOnNeighbor) {
                canPassThrough = false;
            }

            if (canPassThrough) {
                visited.add(key);
                const moveCost = TERRAIN_TYPES[hex.terrain]?.movementCostMultiplier || 1;
                const g = current.g + moveCost;
                const h = hexDistance(neighbor.r, neighbor.c, targetCoords.r, targetCoords.c);
                const f = g + h;
                const newPath = [...current.path, neighbor];
                openSet.push({ ...neighbor, g, h, f, path: newPath });
            }
        }
    }
    
    return null;
}

function cancelPreparingAction() {
    gameState.preparingAction = null;
    _unitBeingSplit = null; // Resetea la unidad que se estaba dividiendo
    if (UIManager) {
        UIManager.clearHighlights();
    }
}

/**
 * [Punto de Entrada] Inicia la acción de explorar unas ruinas.
 * Llamada por el botón de la UI.
 */
function requestExploreRuins() {
    if (!selectedUnit) {
        logMessage("No hay una unidad seleccionada para explorar las ruinas.", "error");
        return;
    }

    const action = {
        type: 'exploreRuins',
        actionId: `explore_${selectedUnit.id}_${Date.now()}`, 
        payload: {
            playerId: selectedUnit.player,
            unitId: selectedUnit.id,
            r: selectedUnit.r,
            c: selectedUnit.c
        }
    };

    if (isNetworkGame()) {
         // Lógica de Red
        if (NetworkManager.esAnfitrion) processActionRequest(action);
        else NetworkManager.enviarDatos({ type: 'actionRequest', action });
    } else {
        // Juego Local
        _executeExploreRuins(action.payload);
    }
}

/**
 * [Función de Ejecución] Procesa el evento de explorar una ruina.
 * @param {object} payload - Los datos de la acción.
 */
function _executeExploreRuins(payload) {
    const { playerId, unitId, r, c } = payload;
    const unit = getUnitById(unitId);
    const hex = board[r]?.[c];
    const playerResources = gameState.playerResources[playerId];

    // Validaciones
    if (!unit || !hex || !playerResources || unit.player !== playerId) return;
    if (unit.hasMoved || unit.hasAttacked) {
        logMessage("Esta unidad ya ha actuado este turno.", "error");
        return;
    }
    if (hex.feature !== 'ruins' || hex.looted) {
        logMessage("No hay ruinas que explorar aquí.", "warning");
        return;
    }
    const hasExplorer = unit.regiments.some(reg => reg.type === 'Explorador');
    if (!hasExplorer) {
        logMessage("Necesitas un regimiento de Exploradores en esta división para investigar ruinas.", "error");
        return;
    }

    // --- Ejecución ---
    unit.hasMoved = true;
    unit.hasAttacked = true;

    logMessage(`${unit.name} comienza a explorar las ruinas...`);

    // Lógica de generación de evento/botín
    const totalWeight = RUIN_EVENTS.reduce((sum, event) => sum + event.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedEvent = null;

    for (const event of RUIN_EVENTS) {
        roll -= event.weight;
        if (roll <= 0) {
            selectedEvent = event;
            break;
        }
    }
    
    if (!selectedEvent) selectedEvent = RUIN_EVENTS.find(e => e.id === 'nothing'); // Fallback

    // Procesar el efecto del evento en victoria
    processRuinEvent(selectedEvent, unit, playerResources);

    const pKey = `player${playerId}`;
    if (!gameState.playerStats.ruinsExplored) gameState.playerStats.ruinsExplored = {};
    if (!gameState.playerStats.ruinsExplored[pKey]) gameState.playerStats.ruinsExplored[pKey] = 0;

    gameState.playerStats.ruinsExplored[pKey]++; // SUMAR AL CONTADOR PARA EL TÍTULO
    
    // Otorgar puntos de investigación por ruina explorada
    if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.onRuinExplored) {
        ResearchRewardsManager.onRuinExplored(playerId);
    }
    
    // Marcar la ruina como saqueada y actualizar visuales
    hex.feature = null; // Hacemos que la ruina desaparezca por completo
    // Opcional, si quisieras que se quede el icono pero atenuado:
    // hex.looted = true;

    if (typeof renderSingleHexVisuals === 'function') renderSingleHexVisuals(r, c);
    
    // CRÍTICO: Actualizar visualmente la unidad si se le agregó un regimiento
    if (selectedEvent.effect.type === 'add_regiment' && unit.element) {
        if (typeof updateUnitSprite === 'function') {
            updateUnitSprite(unit);
        } else if (typeof renderUnitSprite === 'function') {
            renderUnitSprite(unit);
        }
    }
    
    if (UIManager) UIManager.hideContextualPanel();
}

/**
 * [Función Auxiliar] Aplica el efecto de un evento de ruina.
 * @param {object} event - El objeto de evento de RUIN_EVENTS.
 * @param {object} unit - La unidad que explora.
 * @param {object} playerResources - Los recursos del jugador.
 */
function processRuinEvent(event, unit, playerResources) {
    // Primero, el mensaje narrativo al log
    logMessage(event.description, event.type);

    let toastText = event.toastMessage;
    let toastType = event.type === 'bad' ? 'warning' : 'success';
    
    const effect = event.effect;

    // Procesamos el efecto y personalizamos el texto del toast
    switch (effect.type) {
        case 'add_resource':
            const amountRes = Math.floor(Math.random() * (effect.amount[1] - effect.amount[0] + 1)) + effect.amount[0];
            playerResources[effect.resource] += amountRes;
            toastText = `+${amountRes} ${effect.resource.charAt(0).toUpperCase() + effect.resource.slice(1)}`;
            break;

        // <<< CASO MEJORADO PARA MÚLTIPLES RECURSOS >>>
        case 'add_multiple_resources':
            let gainedResources = [];
            for (const resource in effect.resources) {
                const amountRange = effect.resources[resource];
                const amount = Math.floor(Math.random() * (amountRange[1] - amountRange[0] + 1)) + amountRange[0];
                playerResources[resource] += amount;
                gainedResources.push(`+${amount} ${resource}`);
            }
            toastText = gainedResources.join(', '); // Ej: "+150 piedra, +120 madera"
            break;
            
        case 'add_item':
            if (effect.item === 'sellos_guerra' && typeof PlayerDataManager !== 'undefined') {
                PlayerDataManager.addWarSeals(effect.amount);
                toastText = `+${effect.amount} Sello de Guerra`;
            }
            break;
        
        // <<< IMPLEMENTACIÓN DE LOS CASOS QUE FALTABAN >>>
        case 'add_equipment_fragments':
            const eqRarity = effect.rarity;
            const possibleItems = Object.values(EQUIPMENT_DEFINITIONS).filter(item => item.rarity === eqRarity);
            if (possibleItems.length > 0) {
                const droppedItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                const fragAmount = Math.floor(Math.random() * (effect.amount[1] - effect.amount[0] + 1)) + effect.amount[0];
                PlayerDataManager.addEquipmentFragments(droppedItem.id, fragAmount);
                toastText = `+${fragAmount} Fragmentos de "${droppedItem.name}"`;
            }
            break;
            
        case 'add_hero_fragments':
            const heroRarity = effect.rarity[Math.floor(Math.random() * effect.rarity.length)];
            const heroPool = GACHA_CONFIG.HERO_POOLS_BY_RARITY[heroRarity.toUpperCase()];
            if (heroPool && heroPool.length > 0) {
                const randomHeroId = heroPool[Math.floor(Math.random() * heroPool.length)];
                const fragAmount = Math.floor(Math.random() * (effect.amount[1] - effect.amount[0] + 1)) + effect.amount[0];
                PlayerDataManager.addFragmentsToHero(randomHeroId, fragAmount);
                toastText = `+${fragAmount} Fragmentos de ${COMMANDERS[randomHeroId].name}`;
            }
            break;
            
        case 'grant_random_tech':
            const availableTechs = getAvailableTechnologies(playerResources.researchedTechnologies).filter(tech => tech.tier === effect.tier);
            if (availableTechs.length > 0) {
                const randomTech = availableTechs[Math.floor(Math.random() * availableTechs.length)];
                // No llamamos a attemptToResearch para no gastar recursos
                playerResources.researchedTechnologies.push(randomTech.id);
                toastText = `¡Tecnología Descubierta: ${randomTech.name}!`;
                if(typeof refreshTechTreeContent === 'function') refreshTechTreeContent();
            } else {
                toastText = "Hallaste pergaminos, pero no revelaron nada nuevo.";
                toastType = 'info';
            }
            break;

        case 'add_regiment':
            if (unit.regiments.length < MAX_REGIMENTS_PER_DIVISION) {
                const newRegiment = { ...REGIMENT_TYPES[effect.regimentType], type: effect.regimentType };
                newRegiment.health = newRegiment.health; // A salud completa
                unit.regiments.push(newRegiment);
                recalculateUnitStats(unit);
                toastText = `+1 Regimiento de ${effect.regimentType}`;
            } else {
                toastText = "Los mercenarios quisieron unirse, ¡pero tu división está llena!";
                toastType = 'info';
            }
            break;
            
        case 'damage_division_percent':
            const damagePercent = (Math.floor(Math.random() * (effect.amount[1] - effect.amount[0] + 1)) + effect.amount[0]) / 100;
            const damageToDeal = Math.floor(unit.maxHealth * damagePercent);
            unit.currentHealth = Math.max(1, unit.currentHealth - damageToDeal); // Evita que la unidad muera
            // Distribuir el daño entre los regimientos proporcionalmente (lógica simplificada)
            unit.regiments.forEach(reg => {
                reg.health = Math.floor(reg.health * (1 - damagePercent));
            });
            recalculateUnitHealth(unit); // Para recalcular la salud exacta desde los regimientos
            toastText = `¡Emboscada! La división sufre ${damageToDeal} de daño.`;
            break;
        
        case 'damage_random_regiment':
            if (unit.regiments.length > 1) { // Asegurarse de no destruir el único regimiento
                const targetRegIndex = Math.floor(Math.random() * unit.regiments.length);
                const targetReg = unit.regiments[targetRegIndex];
                const damagePercentReg = (Math.floor(Math.random() * (effect.amount[1] - effect.amount[0] + 1)) + effect.amount[0]) / 100;
                const healthBefore = targetReg.health;
                targetReg.health = Math.floor(targetReg.health * (1 - damagePercentReg));
                const damageTaken = healthBefore - targetReg.health;
                recalculateUnitHealth(unit);
                toastText = `¡Trampa! Un regimiento sufre ${damageTaken} de daño.`;
            } else {
                toastText = "¡Una trampa casi acaba con tu último regimiento!";
                toastType = 'info';
            }
            break;

        // --- puntos de victoria ---
        case 'grant_victory_point':
            const vpRuinTracker = gameState.victoryPoints.ruins;
            const playerKey = `player${unit.player}`;
            if (vpRuinTracker[playerKey] < 3) {
                vpRuinTracker[playerKey]++;
                toastText = "¡Has encontrado un Punto de Victoria!";
                toastType = 'special'; // Podrías definir un estilo especial para esto
            } else {
                // Si ya tiene 3, dar oro como compensación
                playerResources.oro += 500;
                toastText = "Has encontrado un artefacto antiguo (+500 Oro)";
                toastType = 'success';
            }
            break;

        case 'nothing':
            // No hacemos nada, el toastText ya es "No has encontrado nada"
            toastText = "Las ruinas estaban vacías.";
            toastType = 'info';
            break;
    }
    
    // Mostramos el Toast con el mensaje detallado
    if (typeof showToast === 'function') {
        showToast(`${event.toastIcon} ${toastText}`, toastType, 4000); // 4 segundos para leer bien
    } else {
        logMessage(toastText, "info");
    }

    // Actualizamos toda la UI para reflejar los cambios de recursos, salud, etc.
    if(UIManager) UIManager.updateAllUIDisplays();
}

/**
 * [Función de Ejecución] Lógica pura para disolver una unidad.
 * @param {object} unitToDisband - La unidad a disolver.
 */
async function _executeDisbandUnit(unitToDisband) {
    console.log("%c[TRACE] La función '_executeDisbandUnit' (la de ejecución pura) ha sido llamada.", "color: green; font-weight: bold;");
    if (!unitToDisband) return false;

    // 1. Calcular y devolver recursos
    const goldToRefund = Math.floor((unitToDisband.cost?.oro || 0) * 0.5);
    if (gameState.playerResources[unitToDisband.player]) {
        gameState.playerResources[unitToDisband.player].oro += goldToRefund;
        logMessage(`Jugador ${unitToDisband.player} recupera ${goldToRefund} de oro por disolver "${unitToDisband.name}".`);
    }

    // 2. Destruir la unidad (usamos await para asegurar que se completa)
    await handleUnitDestroyed(unitToDisband, null);

    // 3. Limpieza de UI (se ejecutará en el Host, pero no hace daño)
    if (domElements.unitDetailModal) domElements.unitDetailModal.style.display = 'none';
    if (UIManager) UIManager.hideContextualPanel();
    
    return true; // Indicar que la acción fue exitosa
}

function RequestDisbandUnit(unitToDisband) {
    if (!unitToDisband) return;

    const actionId = `disband_${unitToDisband.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action = { 
        type: 'disbandUnit', 
        actionId: actionId, 
        payload: { playerId: unitToDisband.player, unitId: unitToDisband.id }
    };

    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action });
        }
    } else {
        // Para juego local, llama directamente a la nueva función de ejecución.
        _executeDisbandUnit(unitToDisband);
    }
    // La limpieza de UI ahora se hace dentro de _executeDisbandUnit
}

/** comercio **/

/**
 * Escanea y presenta rutas válidas. Ahora soluciona el bloqueo marítimo y nombra unidades.
 */
function requestEstablishTradeRoute() {
    if (!selectedUnit) return;
    const unit = selectedUnit;
    const pId = unit.player;
    const isNaval = unit.regiments.some(r => REGIMENT_TYPES[r.type].is_naval);

    console.log(`[COMERCIO] Iniciando escáner para ${unit.name}`);

    // 1. DETECTAR ORIGEN
    let startPoint = null; 
    const currentHex = board[unit.r]?.[unit.c];

    if (!isNaval) {
        // TIERRA: Debe estar en la ciudad
        startPoint = gameState.cities.find(c => c.r === unit.r && c.c === unit.c && c.owner === pId);
    } else {
        // MAR: Debe estar en agua TOCANDO una ciudad propia
        if (currentHex.terrain === 'water') {
            const neighbors = getHexNeighbors(unit.r, unit.c);
            startPoint = gameState.cities.find(c => c.owner === pId && neighbors.some(n => n.r === c.r && n.c === c.c));
        }
    }

    if (!startPoint) {
        logMessage(isNaval ? "Error: El barco debe estar en un hexágono de agua pegado a una ciudad propia." : "Error: La caravana debe estar sobre una ciudad propia.", "warning");
        return;
    }

    // 2. RECOPILAR RUTAS ACTIVAS DEL JUGADOR
    const playerUnits = units.filter(u => u.player === pId && u.tradeRoute);
    const existingRouteKeys = new Set(); // Para filtrar duplicados "Origen-Destino"
    
    // Preparar HTML para la sección de "Rutas Activas"
    let activeRoutesHTML = '';
    if (playerUnits.length > 0) {
        activeRoutesHTML += `<div style="padding: 5px; background: rgba(0,255,0,0.1); border-bottom: 1px solid #333; margin-bottom: 10px;">
            <strong style="color: #2ecc71; font-size: 10px;">RUTAS ACTIVAS (${playerUnits.length}):</strong>`;
        
        playerUnits.forEach(u => {
            const r = u.tradeRoute;
            // Guardamos la clave para evitar duplicados luego
            existingRouteKeys.add(`${r.origin.name}-${r.destination.name}`);
            
            activeRoutesHTML += `
                <div style="font-size: 9px; color: #ccc; margin-top: 2px;">
                    🚚 ${r.origin.name} ➔ ${r.destination.name} (${u.name})
                </div>`;
        });
        activeRoutesHTML += `</div>`;
    }

    // 3. ESCANEO DE NUEVOS DESTINOS
    const potentialDestinations = gameState.cities.filter(c => 
        (c.owner === pId || c.owner === BankManager.PLAYER_ID) && 
        (c.r !== startPoint.r || c.c !== startPoint.c) // Que no sea la misma ciudad
    );

    const validRoutes = [];

    // --- DENTRO DE requestEstablishTradeRoute ---
    potentialDestinations.forEach(dest => {
        // FILTRO DE DUPLICADOS: Si ya existe una ruta de A -> B, saltar.
        const routeKey = `${startPoint.name}-${dest.name}`;
        if (existingRouteKeys.has(routeKey)) {
            return; // Ya existe, no la añadimos a la lista de opciones
        }

        let path = null;
        
        if (isNaval) {
            // PIEZA A: Si es un barco, usamos traceNavalPath 
            // (la cual ya configuramos para que llame internamente a findNavalPath)
            path = traceNavalPath(unit, {r: unit.r, c: unit.c}, dest);
        } else {
            // PIEZA B: Si es tierra, usamos la infraestructura de caminos
            path = findInfrastructurePath(startPoint, dest);
        }
        
        // Si alguna de las dos funciones anteriores devolvió un camino válido (no null)
        if (path && path.length > 0) {
            validRoutes.push({ 
                name: `${startPoint.name} ➔ ${dest.name}`, 
                destData: dest, 
                pathData: path 
            });
        }
    });

    // 4. RENDERIZADO DEL MODAL
    const list = document.getElementById('routeListContainer');
    list.innerHTML = activeRoutesHTML; // Insertamos primero las activas
    
    if (validRoutes.length === 0) {
        const noRoutesDiv = document.createElement('div');
        noRoutesDiv.style.padding = "10px";
        noRoutesDiv.style.color = "#888";
        noRoutesDiv.style.fontStyle = "italic";
        noRoutesDiv.style.textAlign = "center";
        
        if (playerUnits.length > 0 && potentialDestinations.length > 0) {
            noRoutesDiv.textContent = "Todas las rutas posibles desde esta ciudad ya están cubiertas.";
        } else {
            noRoutesDiv.textContent = "No se encontraron nuevas conexiones válidas.";
        }
        list.appendChild(noRoutesDiv);
    } else {
        // Título para nuevas rutas
        const newRoutesTitle = document.createElement('div');
        newRoutesTitle.innerHTML = `<strong style="color: #00f3ff; font-size: 10px; padding-left: 5px;">ESTABLECER NUEVA:</strong>`;
        list.appendChild(newRoutesTitle);

        validRoutes.forEach(route => {
            const div = document.createElement('div');
            div.className = "inbox-list-item"; 
            div.style.fontSize = "10px";
            div.innerHTML = `${isNaval ? '⚓' : '📦'} ${route.name}`;
            div.onclick = () => {
                // RE-BAUTIZAMOS LA UNIDAD CON LOS NOMBRES REALES
                unit.name = `${isNaval ? 'Flota' : 'Caravana'} a ${route.destData.name}`;
                
                _executeEstablishTradeRoute({ unitId: unit.id, origin: startPoint, destination: route.destData, path: route.pathData });
                document.getElementById('routeSelectorModal').style.display = 'none';
            };
            list.appendChild(div);
        });
    }

    document.getElementById('routeSelectorModal').style.display = 'flex';
    document.getElementById('closeRouteSelectorBtn').onclick = () => {
        document.getElementById('routeSelectorModal').style.display = 'none';
    };
}

/**
 * [Función de Ejecución Pura] Aplica el estado de ruta comercial a una unidad.
 */
function _executeEstablishTradeRoute(payload) {
    const { unitId, origin, destination, path } = payload;
    const unit = getUnitById(unitId);
    if (!unit) return false;

    const getTradePairKey = (a, b) => {
        if (!a || !b) return null;
        const aKey = Number.isInteger(a.r) && Number.isInteger(a.c) ? `${a.r},${a.c}` : a.name;
        const bKey = Number.isInteger(b.r) && Number.isInteger(b.c) ? `${b.r},${b.c}` : b.name;
        if (!aKey || !bKey) return null;
        return [aKey, bKey].sort().join('|');
    };

    const pairKey = getTradePairKey(origin, destination);
    if (pairKey) {
        const hasRoute = units.some(u => {
            if (u.player !== unit.player) return false;
            if (!u.tradeRoute?.origin || !u.tradeRoute?.destination) return false;
            const existingKey = getTradePairKey(u.tradeRoute.origin, u.tradeRoute.destination);
            return existingKey === pairKey;
        });
        if (hasRoute) {
            logMessage("Ya existe una ruta comercial activa entre estas ciudades.", "warning");
            return false;
        }
    }

    const isNaval = unit.regiments.some(r => REGIMENT_TYPES[r.type].is_naval);

    const cargoCapacity = unit.regiments.reduce((sum, reg) => {
        return sum + (REGIMENT_TYPES[reg.type].cargoCapacity || 200);
    }, 0);

    unit.tradeRoute = {
        origin: origin,
        destination: destination,
        path: path,
        position: 0,
        goldCarried: 0,
        cargoCapacity: cargoCapacity,
        forward: true
    };

    // Debug: Verificar path
    if (!path || path.length === 0) {
        console.error(`[TradeRoute] ERROR: Path vacío o inválido para ${unit.name}. Path length: ${path ? path.length : 'null'}`);
    } else {
        console.log(`[TradeRoute] ${unit.name} iniciada con path de ${path.length} elementos: ${origin.name} → ${destination.name}`);
    }

    // --- CORRECCIÓN CRÍTICA ---
    // Guardar posición antigua para actualizar UnitGrid
    const oldR = unit.r;
    const oldC = unit.c;

    // SIEMPRE limpiamos la posición actual del tablero lógico primero
    if (board[oldR] && board[oldR][oldC]) {
        board[oldR][oldC].unit = null;
    }

    // Si NO es naval, lo movemos al centro de la ciudad de origen.
    // SI ES NAVAL, se queda en su hexágono de agua actual
    if (!isNaval) {
        unit.r = origin.r;
        unit.c = origin.c;
    }
    // Si ES naval, mantenemos unit.r y unit.c donde está (en agua)

    // Actualizar tablero lógico con nueva posición
    if (board[unit.r] && board[unit.r][unit.c]) {
        board[unit.r][unit.c].unit = unit;
    }

    // CRÍTICO: Actualizar UnitGrid para que getUnitOnHex encuentre la unidad en su nueva posición
    if (typeof UnitGrid !== 'undefined') {
        UnitGrid.move(unit, oldR, oldC);
    }

    unit.hasMoved = true;
    unit.hasAttacked = true;

    logMessage(`¡"${unit.name}" ha comenzado la ruta hacia ${destination.name}!`);
    if (UIManager) UIManager.hideContextualPanel();

    // CRÍTICO: Re-renderizar todas las unidades para evitar fantasmas visuales
    if (UIManager && UIManager.renderAllUnitsFromData) {
        UIManager.renderAllUnitsFromData();
    }

    return true;
}

/**
 * BUSCADOR DE ATRAQUES (Solo para Barcos)
 * Encuentra hexágonos de AGUA adyacentes a una coordenada de tierra.
 */
function getWaterAtracaderos(city) {
    // Verificación de seguridad para no enviar nulos
    if (!city || typeof city.r === 'undefined') return [];

    // Ahora enviamos números reales a getHexNeighbors
    return getHexNeighbors(city.r, city.c).filter(n => {
        const hex = board[n.r]?.[n.c];
        // Solo nos interesa si el vecino es agua
        return hex && hex.terrain === 'water';
    });
}

function traceNavalPath(unit, startWaterHex, destCity) {
    // 1. Obtener los puntos de agua que tocan la ciudad destino (Atracaderos)
    const muellesDestino = getWaterAtracaderos(destCity); 
    
    if (muellesDestino.length === 0) {
        console.warn(`[NAV-LOG] La ciudad ${destCity.name} no tiene salida al mar.`);
        return null;
    }

    // 2. Comprobar si YA estamos en uno de los muelles de destino.
    // Esto evita que el pathfinding falle si simplemente tenemos que "dar la vuelta" en el sitio.
    const alreadyAtDestination = muellesDestino.some(muelle => muelle.r === startWaterHex.r && muelle.c === startWaterHex.c);
    if (alreadyAtDestination) {
        console.log(`[NAV-LOG] El barco ya está en un muelle válido de ${destCity.name}. Generando ruta estática.`);
        return [{ r: startWaterHex.r, c: startWaterHex.c }]; // Ruta de 1 paso (quedarse ahí)
    }

    let bestPath = null;

    // 3. Por cada muelle posible, buscar camino desde la posición actual
    for (let muelle of muellesDestino) {
        const path = findNavalPath(startWaterHex, muelle);
        
        if (path && path.length > 0) {
            // Si es el primer camino encontrado o es más corto que el anterior, guardarlo
            if (!bestPath || path.length < bestPath.length) {
                bestPath = path;
            }
        }
    }

    if (!bestPath) {
        console.warn(`[NAV-LOG] No hay una ruta ininterrumpida de agua desde (${startWaterHex.r},${startWaterHex.c}) hasta ${destCity.name}.`);
    }

    return bestPath;
}

console.log("unit_Actions.js se ha cargado.");
