// uiUpdates.js

/**
 * Comprueba si una unidad enemiga está dentro del rango de visión de un explorador del jugador actual.
 * @param {object} enemyUnit - La unidad enemiga seleccionada.
 * @returns {boolean} - True si un explorador la ve, false en caso contrario.
 */
function isEnemyScouted(enemyUnit) {
    const currentPlayer = gameState.currentPlayer;
    const playerScoutUnits = units.filter(unit => 
        unit.player === currentPlayer && 
        unit.regiments.some(reg => reg.type === "Explorador")
    );

    if (playerScoutUnits.length === 0) {
        return false;
    }

    // Comprueba si alguna de las unidades exploradoras está en rango
    for (const scoutUnit of playerScoutUnits) {
        const distance = hexDistance(scoutUnit.r, scoutUnit.c, enemyUnit.r, enemyUnit.c);
        const scoutRange = scoutUnit.visionRange || 2; // Rango de visión del explorador
        if (distance <= scoutRange) {
            return true;
        }
    }
    
    return false;
}

const UIManager = {
    domElements: null,
    _tutorialMessagePanel: null, 
    _originalEndTurnButtonListener: null, 
    _lastTutorialHighlightElementId: null, 
    _lastTutorialHighlightHexes: [],      
    _combatPredictionPanel: null, 
    _currentAttackPredictionListener: null, 
    _hidePredictionTimeout: null, 
    _domElements: null, 
    _restoreTimeout: null,
    _autoCloseTimeout: null,
    _suppressRadialHideUntil: 0,
    _pendingEndTurnConfirmation: false,
    _lastShownInfo: { type: null, data: null }, // Para recordar qué se mostró por última vez
    _reopenBtn: null, // Guardará la referencia al botón ▲
    _ghostTurnArrowsTimeout: null,
    
    setDomElements: function(domElementsRef) {
        this._domElements = domElementsRef; 
        this._combatPredictionPanel = document.getElementById('combatPredictionPanel');
        if (!this._combatPredictionPanel) console.error("UIManager Error: No se encontró el #combatPredictionPanel en el DOM.");
        this.hideAllActionButtons();
    },
    
    setEndTurnButtonToFinalizeTutorial: function() {
        const btn = this._domElements.floatingEndTurnBtn;
        if (!btn) return;

        // 1. Guardar el listener original si no lo hemos hecho ya
        if (typeof handleEndTurn === 'function' && !this._originalEndTurnButtonListener) {
            // Guardamos una referencia a la función en sí
            this._originalEndTurnButtonListener = handleEndTurn; 
        }

        // 2. Eliminar cualquier listener anterior que pueda tener
        // Hacemos esto clonando el nodo, que es una forma segura de limpiarlo
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        this._domElements.floatingEndTurnBtn = newBtn; // Actualizamos la referencia

        // 3. Configurar el botón para el final del tutorial
        newBtn.innerHTML = "🏁"; // Bandera de meta
        newBtn.title = "Finalizar Tutorial";
        newBtn.disabled = false;
        this.highlightTutorialElement(newBtn.id);

        // 4. Añadir el NUEVO y ÚNICO listener para esta acción final
        const finalizeAction = () => {
            if (domElements.tacticalUiContainer) {
                domElements.tacticalUiContainer.style.display = 'none';
            }
            TutorialManager.stop(); // Llama al stop que ya limpia y vuelve al menú.
        };
        newBtn.addEventListener('click', finalizeAction);
    },

    restoreEndTurnButton: function() {
        const btn = this._domElements.floatingEndTurnBtn;
        if (!btn) return;
        
        // 1. Limpiamos el botón clonándolo. Esto elimina CUALQUIER listener anterior (sea del tutorial o no).
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        this._domElements.floatingEndTurnBtn = newBtn; // Actualizamos la referencia

        // 2. Restauramos la apariencia original
        newBtn.innerHTML = "►";
        newBtn.title = "Finalizar Turno";
        newBtn.classList.remove('tutorial-highlight');
        this.clearEndTurnPendingWarning();
        
        // 3. <<== LÓGICA DE RESTAURACIÓN INTELIGENTE ==>>
        // Si HEMOS guardado un listener original (porque el tutorial se usó), lo restauramos.
        if (this._originalEndTurnButtonListener) {
            console.log("[UIManager] Restaurando listener de fin de turno guardado (post-tutorial).");
            newBtn.addEventListener('click', this._originalEndTurnButtonListener);
        } 
        // Si NO hemos guardado un listener (porque el tutorial nunca se ejecutó), 
        // simplemente añadimos el listener estándar del juego.
        else if (typeof handleEndTurn === "function") {
            console.log("[UIManager] Añadiendo listener de fin de turno estándar (sin tutorial previo).");
            newBtn.addEventListener('click', handleEndTurn);
        } else {
            console.error("CRÍTICO: no se puede restaurar el listener del botón Fin de Turno porque handleEndTurn no está definido.");
        }
    },

    setEndTurnPendingWarning: function(message = 'Acciones pendientes') {
        const btn = this._domElements?.floatingEndTurnBtn;
        if (!btn) return;
        this._pendingEndTurnConfirmation = true;
        btn.classList.add('end-turn-warning');
        btn.dataset.pendingTooltip = message;
        btn.title = message;
    },

    clearEndTurnPendingWarning: function() {
        const btn = this._domElements?.floatingEndTurnBtn;
        this._pendingEndTurnConfirmation = false;
        if (!btn) return;
        btn.classList.remove('end-turn-warning');
        delete btn.dataset.pendingTooltip;
        btn.title = 'Finalizar Turno';
    },

    hasPendingEndTurnWarning: function() {
        return !!this._pendingEndTurnConfirmation;
    },


    
    showCombatPrediction: function(outcome, targetUnit, event) {
        if (!this._combatPredictionPanel) return;
        
        if (this._hidePredictionTimeout) {
            if (typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this._hidePredictionTimeout);
            } else {
                clearTimeout(this._hidePredictionTimeout);
            }
        }

        let html = `<h4>Predicción de Combate</h4><p>Atacando a: <strong>${targetUnit.name} (${targetUnit.currentHealth} HP)</strong></p><p>Daño infligido: <span class="attacker-damage">${outcome.damageToDefender}</span></p>`;
        
        if (outcome.defenderDies) {
            html += `<span class="critical-info">¡OBJETIVO DESTRUIDO!</span>`;
        } else {
            html += `<p>Daño recibido: <span class="defender-damage">${outcome.damageToAttacker}</span></p>`;
            if (outcome.attackerDiesInRetaliation) {
                html += `<span class="critical-info">¡TU UNIDAD SERÁ DESTRUIDA!</span>`;
            }
        }
        
        this._combatPredictionPanel.innerHTML = html;
        this._combatPredictionPanel.style.display = 'block';
        
        const panelWidth = this._combatPredictionPanel.offsetWidth;
        const panelHeight = this._combatPredictionPanel.offsetHeight;
        let left = event.clientX + 20;
        let top = event.clientY - panelHeight - 10;

        if (left + panelWidth > window.innerWidth) left = event.clientX - panelWidth - 20;
        if (top < 0) top = event.clientY + 20;

        this._combatPredictionPanel.style.left = `${left}px`;
        this._combatPredictionPanel.style.top = `${top}px`;
        this._combatPredictionPanel.classList.add('visible');
    },
    
    hideCombatPrediction: function() {
        if (!this._combatPredictionPanel) return;
        if (this._hidePredictionTimeout) {
            if (typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this._hidePredictionTimeout);
            } else {
                clearTimeout(this._hidePredictionTimeout);
            }
        }
        const hidePrediction = () => {
            if (this._combatPredictionPanel) this._combatPredictionPanel.classList.remove('visible');
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            this._hidePredictionTimeout = 'ui_hidePrediction';
            window.intervalManager.setTimeout(this._hidePredictionTimeout, hidePrediction, 100);
        } else {
            this._hidePredictionTimeout = setTimeout(hidePrediction, 100);
        }
    },

        attachAttackPredictionListener: function(selectedUnit) {
            if (!this._domElements.gameBoard || !selectedUnit) return;

            if (this._currentAttackPredictionListener) {
                this._domElements.gameBoard.removeEventListener('mousemove', this._currentAttackPredictionListener);
            }

            // Estado local del throttle: un frame pendiente + clave del último hex calculado
            let _framePending = false;
            let _lastHexKey = null;
            let _lastClientX = 0;
            let _lastClientY = 0;

            this._currentAttackPredictionListener = (event) => {
                // Capturar datos del evento antes de que pueda reciclarse
                const target = event.target;
                _lastClientX = event.clientX;
                _lastClientY = event.clientY;

                if (_framePending) return;
                _framePending = true;

                requestAnimationFrame(() => {
                    _framePending = false;
                    const hexEl = target.closest('.hex');
                    if (!hexEl) { _lastHexKey = null; this.hideCombatPrediction(); return; }

                    const r = parseInt(hexEl.dataset.r);
                    const c = parseInt(hexEl.dataset.c);
                    const hexKey = `${r},${c}`;

                    // Si el puntero sigue sobre el mismo hex, no recalcular
                    if (hexKey === _lastHexKey) return;
                    _lastHexKey = hexKey;

                    const targetUnit = getUnitOnHex(r, c);
                    if (hexEl.classList.contains('highlight-attack') && targetUnit && isValidAttack(selectedUnit, targetUnit)) {
                        const outcome = predictCombatOutcome(selectedUnit, targetUnit);
                        // Reconstruir evento sintético con coordenadas capturadas
                        this.showCombatPrediction(outcome, targetUnit, { clientX: _lastClientX, clientY: _lastClientY });
                    } else {
                        this.hideCombatPrediction();
                    }
                });
            };

            this._domElements.gameBoard.addEventListener('mousemove', this._currentAttackPredictionListener);
        },
    
    
    removeAttackPredictionListener: function() {
        if (this._currentAttackPredictionListener && this._domElements.gameBoard) {
            this._domElements.gameBoard.removeEventListener('mousemove', this._currentAttackPredictionListener);
            this._currentAttackPredictionListener = null;
            this.hideCombatPrediction();
        }
    },
    
    // En uiUpdates.js

    highlightPossibleActions: function(unit) {
        // Llama al método centralizado de limpieza.
        this.clearHighlights(); 

        if (!unit || !board || board.length === 0) return;

        // Recorre el tablero
        for (let r_idx = 0; r_idx < board.length; r_idx++) {
            for (let c_idx = 0; c_idx < board[0].length; c_idx++) {
                const hexData = board[r_idx]?.[c_idx];
                if (!hexData || !hexData.element) continue;

                // Ignorar niebla de guerra
                if (gameState.currentPhase === "play" && hexData.visibility?.[`player${gameState.currentPlayer}`] === 'hidden') {
                    continue;
                }

                // 1. MOVIMIENTO
                if (gameState.currentPhase === 'play' && !unit.hasMoved && unit.currentMovement > 0) {
                    if (isValidMove(unit, r_idx, c_idx)) {
                        
                        // --- NUEVA LÓGICA: PREDICCIÓN DE SUMINISTRO ---
                        // Comprobamos si la casilla destino tendría suministro si nos movemos allí.
                        // Pasamos el ID del jugador de la unidad.
                        const hasSupply = isHexSupplied(r_idx, c_idx, unit.player);

                        if (hasSupply) {
                            // Movimiento seguro (Verde)
                            hexData.element.classList.add('highlight-move');
                        } else {
                            // Movimiento peligroso (Rojo - Sin Suministro)
                            hexData.element.classList.add('highlight-danger');
                            // Opcional: Añadir un tooltip o título para explicar por qué es rojo
                            // hexData.element.title = "¡PELIGRO! Sin Suministro"; 
                        }
                    }
                }

                // 2. ATAQUE (Sin cambios)
                const targetUnitOnHex = getUnitOnHex(r_idx, c_idx);
                if (gameState.currentPhase === 'play' && !unit.hasAttacked && targetUnitOnHex && targetUnitOnHex.player !== unit.player && isValidAttack(unit, targetUnitOnHex)) {
                    hexData.element.classList.add('highlight-attack');
                }
            }
        }
    },

    // Y TAMBIÉN NECESITAMOS ACTUALIZAR `clearHighlights` PARA LIMPIAR LA NUEVA CLASE
    clearHighlights: function() {
        if (board && board.length > 0) {
            // Añadimos .highlight-danger a la lista de limpieza
            document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place, .hex.highlight-danger').forEach(h => {
                h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place', 'highlight-danger');
            });
        }
    },

    showTradeRouteOverlay: function(path = []) {
        this.clearTradeRouteOverlay();
        if (!Array.isArray(path) || path.length === 0) return;

        path.forEach((step, idx) => {
            const hexEl = board?.[step.r]?.[step.c]?.element;
            if (!hexEl) return;
            hexEl.classList.add('trade-route-overlay');
            if (idx === 0) hexEl.classList.add('trade-route-start');
            if (idx === path.length - 1) hexEl.classList.add('trade-route-end');
        });
    },

    clearTradeRouteOverlay: function() {
        document.querySelectorAll('.hex.trade-route-overlay, .hex.trade-route-start, .hex.trade-route-end').forEach(h => {
            h.classList.remove('trade-route-overlay', 'trade-route-start', 'trade-route-end');
        });
    },

    /**
     * Muestra la "línea de vida" de suministro de una unidad.
     * Mientras no haya enemigo en la ruta: verde tenue.
     * Si hay una unidad enemiga interpuesta: rojo + parpadeo (línea cortada).
     */
    showSupplyLineOverlay: function(unit) {
        this.clearSupplyLineOverlay();
        if (!unit || unit.tradeRoute) return; // las caravanas ya tienen su propio overlay
        if (typeof getSupplyPath !== 'function') return;

        const path = getSupplyPath(unit.r, unit.c, unit.player);
        if (!path || path.length < 2) return;

        // Detectar si algún enemigo bloquea la ruta
        const isBroken = path.some(step => {
            if (typeof getUnitOnHex !== 'function') return false;
            const u = getUnitOnHex(step.r, step.c);
            return u && u.player !== unit.player;
        });

        path.forEach((step, idx) => {
            if (idx === 0) return; // skipeamos el hex de la propia unidad
            const hexEl = board?.[step.r]?.[step.c]?.element;
            if (!hexEl) return;
            hexEl.classList.add('supply-line-hex');
            if (isBroken) hexEl.classList.add('danger');
        });
    },

    clearSupplyLineOverlay: function() {
        document.querySelectorAll('.hex.supply-line-hex').forEach(h => {
            h.classList.remove('supply-line-hex', 'danger');
        });
    },

    clearGhostTurnArrows: function() {
        const existing = document.getElementById('ghostTurnArrowsOverlay');
        if (existing) existing.remove();
        if (this._ghostTurnArrowsTimeout) {
            clearTimeout(this._ghostTurnArrowsTimeout);
            this._ghostTurnArrowsTimeout = null;
        }
    },

    showGhostTurnArrows: function(moves = [], durationMs = 1500) {
        this.clearGhostTurnArrows();
        if (!Array.isArray(moves) || moves.length === 0) return;

        const validMoves = moves.filter(m => Number.isFinite(m?.fromR) && Number.isFinite(m?.fromC) && Number.isFinite(m?.toR) && Number.isFinite(m?.toC));
        if (validMoves.length === 0) return;

        const svgNS = 'http://www.w3.org/2000/svg';
        const overlay = document.createElementNS(svgNS, 'svg');
        overlay.setAttribute('id', 'ghostTurnArrowsOverlay');
        overlay.setAttribute('class', 'ghost-turn-arrows-overlay');
        overlay.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

        const defs = document.createElementNS(svgNS, 'defs');
        const marker = document.createElementNS(svgNS, 'marker');
        marker.setAttribute('id', 'ghostArrowHead');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '8');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '8');
        marker.setAttribute('markerHeight', '8');
        marker.setAttribute('orient', 'auto-start-reverse');

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        path.setAttribute('fill', 'rgba(210,230,255,0.82)');
        marker.appendChild(path);
        defs.appendChild(marker);
        overlay.appendChild(defs);

        validMoves.forEach(mv => {
            const fromEl = board?.[mv.fromR]?.[mv.fromC]?.element;
            const toEl = board?.[mv.toR]?.[mv.toC]?.element;
            if (!fromEl || !toEl) return;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            const x1 = fromRect.left + fromRect.width / 2;
            const y1 = fromRect.top + fromRect.height / 2;
            const x2 = toRect.left + toRect.width / 2;
            const y2 = toRect.top + toRect.height / 2;

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
            line.setAttribute('class', 'ghost-turn-arrow-line');
            line.setAttribute('marker-end', 'url(#ghostArrowHead)');
            overlay.appendChild(line);
        });

        document.body.appendChild(overlay);
        this._ghostTurnArrowsTimeout = setTimeout(() => this.clearGhostTurnArrows(), durationMs);
    },

    highlightPossibleSplitHexes: function (unit) {
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        else if (typeof clearHighlights === "function") clearHighlights();
        if (!unit || !board || board.length === 0) return;

        const hasNavalRegiments = unit.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
        const hasLandRegiments = unit.regiments?.some(reg => !REGIMENT_TYPES[reg.type]?.is_naval);
        const isPureNaval = hasNavalRegiments && !hasLandRegiments;

        const neighbors = getHexNeighbors(unit.r, unit.c);
        for (const n of neighbors) {
            const hexData = board[n.r]?.[n.c];
            if (!hexData) continue; // Hexágono inválido

            // Un hexágono es válido para la división si:
            // 1. Está vacío (no hay otra unidad).
            // 2. Para naval: debe ser agua.
            // 3. Para tierra/mixto: no debe ser un terreno intransitable para tierra.
            if (hexData.unit) continue;

            if (isPureNaval) {
                if (hexData.terrain === 'water') {
                    hexData.element.classList.add('highlight-place');
                }
            } else if (!TERRAIN_TYPES[hexData.terrain]?.isImpassableForLand) {
                hexData.element.classList.add('highlight-place');
            }
        }
    },

    hideAllActionButtons: function() {
        if (!this._domElements) return;
        
        const contextualButtons = [
            'floatingUndoMoveBtn', 'floatingReinforceBtn', 'floatingSplitBtn', 
            'floatingBuildBtn', 'floatingPillageBtn', 'setAsCapitalBtn', 
            'floatingConsolidateBtn', 'floatingAssignGeneralBtn', 'floatingCreateDivisionBtn',
            'floatingRazeBtn', 'floatingExploreRuinBtn',
            'floatingTradeBtn', 'floatingStopTradeBtn' 
        ];

        contextualButtons.forEach(id => {
            // --- LA CORRECCIÓN ESTÁ AQUÍ ---
            // Si estamos en despliegue y el botón es el de "Crear División", NO LO OCULTES.
            // Lo saltamos y dejamos que se quede visible.
            if (gameState && gameState.currentPhase === "deployment" && id === 'floatingCreateDivisionBtn') {
                return; 
            }

            // Para todos los demás casos, oculta el botón
            if (this._domElements[id]) {
                this._domElements[id].style.display = 'none';
            }
        });
    },

    updateAllUIDisplays: function() {
        if (this._updateAllScheduled) return;
        this._updateAllScheduled = true;

        const runUpdate = () => {
            this._updateAllScheduled = false;
            this._doUpdateAllUIDisplays();
        };

        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(runUpdate);
        } else {
            setTimeout(runUpdate, 16);
        }
    },

    _doUpdateAllUIDisplays: function() {
        // Si no hay juego o estamos en una fase sin jugador (como el menú), no hacer nada.
        if (!gameState || !gameState.currentPlayer) {
            return;
        }

        // Re-sincronizar unidades con el tablero para evitar casillas vacías por error.
        if (board && Array.isArray(units)) {
            units.forEach(unit => {
                if (!unit || typeof unit.r !== 'number' || typeof unit.c !== 'number') return;
                const hex = board[unit.r]?.[unit.c];
                if (!hex) return;

                if (!hex.unit || hex.unit.id === unit.id) {
                    hex.unit = unit;
                } else if (hex.unit.id !== unit.id) {
                    console.warn(`[UnitSync] Conflicto en (${unit.r},${unit.c}): ${hex.unit.id} vs ${unit.id}`);
                }

                if (typeof UnitGrid !== 'undefined') {
                    const gridUnit = UnitGrid.get(unit.r, unit.c);
                    if (!gridUnit || gridUnit.id !== unit.id) {
                        UnitGrid.index(unit);
                    }
                }
            });
        }

        const gameBoardEl = this._domElements?.gameBoard || document.getElementById('gameBoard');
        if (gameBoardEl) {
            const unitIds = new Set((units || []).map(unit => unit?.id).filter(Boolean));
            const seenUnitIds = new Set();
            gameBoardEl.querySelectorAll('.unit').forEach(el => {
                const unitId = el.dataset?.id;
                if (!unitId || !unitIds.has(unitId) || seenUnitIds.has(unitId)) {
                    el.remove();
                    return;
                }
                seenUnitIds.add(unitId);
            });
        }

        // --- 1. Actualizar la Barra Superior (Menú ☰) ---
        // Esta llamada ahora es el método principal y constante para actualizar la info del jugador.
        if (typeof this.updateTopBarInfo === 'function') {
            this.updateTopBarInfo();
        }

        // --- 2. Actualizar el Indicador de Turno y el Bloqueador de Pantalla ---
        // (Esto gestiona el panel "Esperando al Oponente...")
        if (typeof this.updateTurnIndicatorAndBlocker === 'function') {
            this.updateTurnIndicatorAndBlocker();
        }

        // --- 3. Actualizar la Información del Panel Contextual Inferior (si está visible) ---
        // Si hay una unidad o hexágono seleccionado, esta lógica refrescará su información
        // para reflejar cambios (como vida perdida, recursos gastados, etc.).
        if (this._lastShownInfo && this._lastShownInfo.type) {
            if (document.getElementById('contextualInfoPanel')?.classList.contains('visible')) {
                if (this._lastShownInfo.type === 'unit') {
                    // El `true` o `false` determina si se muestran los botones de acción
                    const unitOwner = this._lastShownInfo.data.player;
                    this.showUnitContextualInfo(this._lastShownInfo.data, unitOwner === gameState.currentPlayer);
                } else if (this._lastShownInfo.type === 'hex') {
                    const { r, c, hexData } = this._lastShownInfo.data;
                    this.showHexContextualInfo(r, c, hexData);
                }
            }
        }
        
        // --- 4. (Legado) Limpieza del Antiguo Panel Flotante Izquierdo ---
        // Esta sección actualizaba el panel que hemos reemplazado.
        // La mantenemos por si la reutilizas o tienes referencias a ella,
        // pero idealmente, se podría eliminar en el futuro si todo se maneja en la barra superior.
        const oldMenuPanel = document.getElementById('floatingMenuPanel');
        if (oldMenuPanel && (oldMenuPanel.style.display === 'block' || oldMenuPanel.style.display === 'flex')) {
            if (typeof this.updatePlayerAndPhaseInfo === 'function') {
                this.updatePlayerAndPhaseInfo(); // Asumimos que esta función actualiza ESE panel
            }
        }

        //--- 5. Niebla de guerra
        this.updatePlayerAndPhaseInfo();
        if (typeof updateFogOfWar === "function") updateFogOfWar(); 
        this.updateActionButtonsBasedOnPhase();

        // Puedes añadir aquí cualquier otra llamada de actualización específica que necesites
        // Por ejemplo:
        // this.updateMinimap(); 
        // this.updateObjectiveTracker();
    },
    
    updatePlayerAndPhaseInfo: function() {
        if (!gameState || !this._domElements) return;
        let phaseText = gameState.currentPhase ? gameState.currentPhase.charAt(0).toUpperCase() + gameState.currentPhase.slice(1) : "-";
        switch (gameState.currentPhase) {
            case "deployment": phaseText = "Despliegue"; break;
            case "play": phaseText = "En Juego"; break;
            case "gameOver": phaseText = "Fin de Partida"; break;
        }
        const playerType = gameState.playerTypes?.[`player${gameState.currentPlayer}`] === 'human' ? 'Humano' : `IA (${gameState.playerAiLevels?.[`player${gameState.currentPlayer}`] || 'Normal'})`;
        const seasonLabel = gameState.currentSeasonName || 'Primavera';
        if(this._domElements.floatingMenuTitle) this._domElements.floatingMenuTitle.innerHTML = `Fase: ${phaseText}<br>Turno ${gameState.turnNumber} - Jugador ${gameState.currentPlayer} (${playerType})<br>Estacion: ${seasonLabel}`;

        const resources = gameState.playerResources?.[gameState.currentPlayer];
        const resourceSpans = document.querySelectorAll('#playerResourcesGrid_float .resource-values span[data-resource]');
        if (resources && resourceSpans.length > 0) {
            resourceSpans.forEach(span => {
                const resType = span.dataset.resource;
                span.textContent = resources[resType] || 0;
            });
        }
    },
    
    // Esta función será llamada por el tutorial para forzar la actualización.
    refreshActionButtons: function() {
            // 1. Verificaciones de seguridad básicas
        if (!gameState || !this._domElements) return;

        // --- CORRECCIÓN 1: Inicialización de seguridad ---
        // Si es el primer turno y esto no existe, se crea para evitar bloqueos.
        if (!gameState.unitsPlacedByPlayer) gameState.unitsPlacedByPlayer = {};

        const { currentPhase, playerTypes, currentPlayer, deploymentUnitLimit } = gameState;
        const isHumanPlayerTurn = playerTypes?.[`player${currentPlayer}`] === 'human';
        // Determinamos si es "mi turno" (compatible con juego local y red)
        const isMyTurn = isNetworkGame() ? (currentPlayer === gameState.myPlayerNumber) : isHumanPlayerTurn;

        // ==================================================================
        // === CASO 1: FASE DE DESPLIEGUE (Aquí es donde se perdía el botón)
        // ==================================================================
        if (currentPhase === "deployment") {
            // 1. Ocultamos todo primero para limpiar basura de otras fases
            this.hideAllActionButtons();

            // 2. Si es mi turno, calculamos si puedo poner más unidades
            if (isMyTurn) {
                const unitsPlaced = gameState.unitsPlacedByPlayer[currentPlayer] || 0;
                let limit;
                if (gameState.deploymentUnitLimitByPlayer && typeof gameState.deploymentUnitLimitByPlayer === 'object') {
                    limit = gameState.deploymentUnitLimitByPlayer[currentPlayer];
                }
                if (limit === undefined || limit === null) {
                    limit = (deploymentUnitLimit === undefined || deploymentUnitLimit === null) ? 5 : deploymentUnitLimit;
                }
                
                // Si no hemos llegado al límite, MOSTRAR botón de crear
                if (unitsPlaced < limit) {
                    if (this._domElements.floatingCreateDivisionBtn) {
                        this._domElements.floatingCreateDivisionBtn.style.display = 'flex';
                        this._domElements.floatingCreateDivisionBtn.disabled = false; // Asegurar que está activo
                    }
                }
            }

            // 3. El botón de Fin de Turno SIEMPRE debe verse en despliegue
            if (this._domElements.floatingEndTurnBtn) {
                this._domElements.floatingEndTurnBtn.style.display = 'flex';
                this._domElements.floatingEndTurnBtn.disabled = false;
            }

            // 4. ¡IMPORTANTE! Salimos de la función aquí. 
            // Así evitamos que el código de abajo oculte cosas por error.
            return; 
        }

        // ==================================================================
        // === CASO 2: FASE DE JUEGO (Batalla)
        // ==================================================================
        if (currentPhase === "play") {
            // 1. Botón de Tecnologías (Siempre visible en juego)
            if (this._domElements.floatingTechTreeBtn) {
                this._domElements.floatingTechTreeBtn.style.display = 'flex';
            }

            // 2. Botón Fin de Turno (Siempre visible en juego)
            if (this._domElements.floatingEndTurnBtn) {
                this._domElements.floatingEndTurnBtn.style.display = 'flex';
                this._domElements.floatingEndTurnBtn.disabled = false;
            }

            // 3. Botón Siguiente Unidad (Solo si es mi turno y tengo unidades libres)
            if (this._domElements.floatingNextUnitBtn) {
                const hasIdleUnits = units.some(u => u.player === currentPlayer && u.currentHealth > 0 && !u.hasMoved && !u.hasAttacked);
                if (isMyTurn && hasIdleUnits) {
                    this._domElements.floatingNextUnitBtn.style.display = 'flex';
                } else {
                    this._domElements.floatingNextUnitBtn.style.display = 'none';
                }
            }
            
            // El botón de Crear División NO debe verse en fase de juego normal (se gestiona vía hexágonos)
            if (this._domElements.floatingCreateDivisionBtn) {
                this._domElements.floatingCreateDivisionBtn.style.display = 'none';
            }
            
            return;
        }

        // ==================================================================
        // === CASO 3: FIN DE PARTIDA
        // ==================================================================
        if (currentPhase === "gameOver") {
            ['floatingMenuBtn', 'floatingTechTreeBtn', 'floatingEndTurnBtn', 'floatingCreateDivisionBtn'].forEach(id => {
                if (this._domElements[id]) this._domElements[id].style.display = 'none';
            });
            this.hideAllActionButtons();
            this.hideContextualPanel();
        }
    },

    // <<< FUNCIÓN ANTIGUA, AHORA MÁS SIMPLE >>>
    // El juego normal llamará a esta, que se detiene durante el tutorial.
    updateActionButtonsBasedOnPhase: function() {
        //if (gameState.isTutorialActive) return; // El "guardia de seguridad" se queda aquí.
        
        this.refreshActionButtons(); // Llama a la función que hace el trabajo.
    },
  
    // ======================================================================
    // === FUNCIÓN DE MENSAJES TEMPORALES (VERSIÓN SEGURA Y REVISADA) ===
    // ======================================================================
    showMessageTemporarily: function(message, duration = 3000, isError = false) {
        // 1. Obtener referencias directas a los elementos del panel de notificaciones.
        const panel = document.getElementById('tutorialMessagePanel');
        const textSpan = document.getElementById('tutorialMessageText');

        // 2. Comprobación de seguridad: si los elementos no existen en el DOM,
        // se evita el error fatal y se informa en la consola.
        if (!panel || !textSpan) {
            console.error("Error en showMessageTemporarily: No se encontraron los elementos #tutorialMessagePanel o #tutorialMessageText. No se puede mostrar el mensaje:", message);
            // Como plan B, usamos un 'alert' para que la información no se pierda.
            alert(message);
            return;
        }

        // 3. Si hay un mensaje anterior mostrándose, se limpia su temporizador.
        if (this._messageTimeout) {
            if (typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this._messageTimeout);
            } else {
                clearTimeout(this._messageTimeout);
            }
        }

        // 4. Se asigna el contenido y se ajusta el estilo si es un mensaje de error.
        textSpan.innerHTML = message;
        
        if (isError) {
            panel.style.borderColor = '#c0392b'; // Rojo
        } else {
            panel.style.borderColor = 'rgba(135, 118, 70, 0.7)'; // Color por defecto
        }

        // 5. Se muestra el panel añadiendo la clase CSS correspondiente.
        panel.classList.add('visible');

        // 6. Se crea un nuevo temporizador para ocultar el panel.
        const hideMessage = () => {
            panel.classList.remove('visible');
            this._messageTimeout = null;
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            this._messageTimeout = 'ui_messageTimeout';
            window.intervalManager.setTimeout(this._messageTimeout, hideMessage, duration);
        } else {
            this._messageTimeout = setTimeout(hideMessage, duration);
        }
    },

    hideContextualPanel: function() {
        if (this._restoreTimeout) {
            if (typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this._restoreTimeout);
            } else {
                clearTimeout(this._restoreTimeout);
            }
            this._restoreTimeout = null;
        }
        
        const panel = this._domElements?.contextualInfoPanel;
        if (panel) {
            panel.classList.remove('visible');
        }
        
        this.removeAttackPredictionListener();
        this.hideAllActionButtons();
        this.clearTradeRouteOverlay();
        if (typeof selectedUnit !== 'undefined') selectedUnit = null;
        if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    },
    
    _buildUnitDetailsHTML: function(unit) {
        let html = '';

        // <<== INICIO DE LA CORRECCIÓN: Sección del General con Imagen ==>>
        if (unit.commander && COMMANDERS[unit.commander]) {
            const cmdr = COMMANDERS[unit.commander];
            const cmdrSpriteValue = cmdr.sprite;
            let commanderSpriteHTML = '';

            // Si el sprite es una ruta de imagen...
            if (cmdrSpriteValue.includes('.png') || cmdrSpriteValue.includes('.jpg')) {
                // ...creamos una etiqueta <img>
                commanderSpriteHTML = `<img src="${cmdrSpriteValue}" alt="${cmdr.name}" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 5px;">`;
            } else {
                // ...si no, lo tratamos como un emoji (fallback).
                commanderSpriteHTML = `<span style="font-size: 20px; vertical-align: middle; margin-right: 5px;">${cmdrSpriteValue}</span>`;
            }

            html += `<p style="text-align: center; font-weight: bold; color: gold; margin-bottom: 5px; display: flex; align-items: center; justify-content: center;">
                Liderada por: ${commanderSpriteHTML} ${cmdr.name}, ${cmdr.title}
            </p>`;
        }

            // --- Línea 1: Stats Consolidados de la Unidad ---
            // Salud
        const healthStr = `Salud: ${unit.currentHealth}/${unit.maxHealth}`;
        
            // Moral (con colores)
        let moralStatus = "Normal", moralColor = "#f0f0f0";
        if (unit.morale > 100) { moralStatus = "Exaltada"; moralColor = "#2ecc71"; }
        else if (unit.morale <= 24) { moralStatus = "Vacilante"; moralColor = "#e74c3c"; }
        else if (unit.morale < 50) { moralStatus = "Baja"; moralColor = "#f39c12"; }
        const moraleStr = `Moral: <strong style="color:${moralColor};">${unit.morale || 50}/${unit.maxMorale || 125} (${moralStatus})</strong>`;

            // Experiencia (con valores numéricos)
        const levelData = XP_LEVELS[unit.level || 0];
        let xpStr = "Experiencia: ";
        if (levelData) {
            const nextLevelXP = levelData.nextLevelXp;
            if (nextLevelXP !== 'Max') {
                xpStr += `${unit.experience || 0}/${nextLevelXP} (${levelData.currentLevelName})`;
            } else {
                xpStr += `Máxima (${levelData.currentLevelName})`;
            }
        }

        // Movimiento
        const moveStr = `Mov: ${unit.currentMovement || unit.movement}`;
        
        // Consumo de Comida
        const foodConsumption = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.foodConsumption || 0), 0);
        const upkeep = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.cost.upkeep || 0), 0);
        const upkeepStr = `Mant: ${upkeep} Oro, ${foodConsumption} Comida`;


        // Construir la primera línea del HTML. Usamos separadores para claridad.
        // <<== MODIFICA ESTA LÍNEA para añadir upkeepStr ==>>
        html += `<p>${healthStr} &nbsp;|&nbsp; ${moraleStr} &nbsp;|&nbsp; ${xpStr} &nbsp;|&nbsp; ${moveStr} &nbsp;|&nbsp; ${upkeepStr}</p>`;

        // --- Líneas 2 y 3: Información de la Casilla ---
        const hexData = board[unit.r]?.[unit.c];
        if (hexData) {
                // Terreno y Coordenadas
            const terrainName = TERRAIN_TYPES[hexData.terrain]?.name || 'Desconocido';
            html += `<p>En Terreno: ${terrainName} (${unit.r},${unit.c})</p>`;
            
                // Dueño, Estabilidad y Nacionalidad
            if (hexData.owner !== null) {
                html += `<p>Dueño: J${hexData.owner} &nbsp;|&nbsp; Est: ${hexData.estabilidad}/${MAX_STABILITY} &nbsp;|&nbsp; Nac: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}</p>`;
            } else {
                html += `<p>Territorio Neutral</p>`;
            }
        }
        
        return html;
    },
       
    _buildHexDetailsHTML: function(hexData) {
        let contentParts = [];
        
        // Parte 1: Dueño y Territorio
        if (hexData.owner !== null) {
            contentParts.push(`Dueño: J${hexData.owner}`);
            contentParts.push(`Est: ${hexData.estabilidad}/${MAX_STABILITY}`);
            contentParts.push(`Nac: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}`);
        } else {
            contentParts.push("Territorio Neutral");
        }

        // Parte 2: Estructura (con integridad)
        if (hexData.structure) {
            const structureData = STRUCTURE_TYPES[hexData.structure];
            let structureString = structureData?.name || hexData.structure;

            // --- INICIO DE LA MODIFICACIÓN ---
        if (structureData && structureData.integrity) {
                const currentIntegrity = hexData.currentIntegrity ?? structureData.integrity;
                structureString += ` | Integridad: ${currentIntegrity}/${structureData.integrity}`;
        }
            // --- FIN DE LA MODIFICACIÓN ---

            contentParts.push(`Estructura: ${structureString}`);
    } else if (hexData.isCity) {
            contentParts.push(hexData.isCapital ? 'Capital' : 'Ciudad');
    }
        
        return `<p>${contentParts.join(' | ')}</p>`;
    },

    updateSelectedUnitInfoPanel: function() {
        if (selectedUnit) {
            this.showUnitContextualInfo(selectedUnit, (selectedUnit.player === gameState.currentPlayer));
        } else {
            this.hideContextualPanel();
        }
    },
    
    updateUnitStrengthDisplay: function(unit) {
        if (!unit?.element) return;
        const s = unit.element.querySelector('.unit-strength');
        if (s) {
            s.textContent = unit.currentHealth;
            s.style.color = unit.currentHealth <= 0 ? 'red' : unit.currentHealth < unit.maxHealth / 2 ? 'orange' : '';
        }
    },

    updateTurnIndicatorAndBlocker: function() {
        // En lugar de this.domElements.turnBlocker...
        // Buscamos el elemento directamente en la página.
        // Esto funciona aunque la inicialización haya fallado.
        const turnBlocker = document.getElementById('turnBlocker');

        if (!turnBlocker || !gameState) {
            return;
        }

        const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;
        const isNetwork = (typeof NetworkManager !== 'undefined' && NetworkManager.miId);

        if (isNetwork && !isMyTurn) {
            turnBlocker.textContent = `Esperando al Jugador ${gameState.currentPlayer}...`;
            turnBlocker.style.display = 'flex';
        } else {
            turnBlocker.style.display = 'none';
        }
    },

    /**
     * (NUEVA FUNCIÓN) Borra todas las unidades visuales del tablero y las vuelve a crear
     * desde el array de datos `units`. Es la solución definitiva para problemas de desincronización del DOM.
     */
    renderAllUnitsFromData: function() {
        if (!this._domElements.gameBoard) return;


        // Paso 1: Eliminar todos los divs de unidades existentes.
        this._domElements.gameBoard.querySelectorAll('.unit').forEach(el => el.remove());

        // Paso 2: Volver a crear cada unidad desde la fuente de datos `units`.
        for (const unit of units) {
            // Se recrea el elemento DOM para cada unidad en la lista de datos.
            const unitElement = document.createElement('div');
            unitElement.className = `unit player${unit.player}`;
            unitElement.dataset.id = unit.id;
            
            // Contenedor principal para alinear el contenido dentro del círculo
            const mainContent = document.createElement('div');
            mainContent.style.position = 'relative';
            mainContent.style.display = 'flex';
            mainContent.style.alignItems = 'center';
            mainContent.style.justifyContent = 'center';
            mainContent.style.width = '100%';
            mainContent.style.height = '100%';

            // Lógica HÍBRIDA para el sprite de la unidad (emoji o imagen)
            const unitSpriteValue = unit.sprite || '?';
            if (unitSpriteValue.includes('.') || unitSpriteValue.includes('/')) {
                unitElement.style.backgroundImage = `url('${unitSpriteValue}')`;
            } else {
                unitElement.style.backgroundImage = 'none';
                mainContent.textContent = unitSpriteValue; // El emoji va dentro del contenedor
            }

            unitElement.appendChild(mainContent);

            // <<== INICIO DE LA CORRECCIÓN: Lógica para el estandarte del Comandante ==>>
            if (unit.commander && COMMANDERS[unit.commander]) {
                const commanderData = COMMANDERS[unit.commander];
                const commanderSpriteValue = commanderData.sprite;

                const commanderBanner = document.createElement('span');
                commanderBanner.className = 'commander-banner';
                commanderBanner.innerHTML = ''; // Limpiar cualquier contenido previo

                // Si el sprite del comandante es una ruta de imagen...
                if (commanderSpriteValue.includes('.png') || commanderSpriteValue.includes('.jpg')) {
                    // ...creamos una etiqueta <img>
                    const img = document.createElement('img');
                    img.src = commanderSpriteValue;
                    img.alt = commanderData.name.substring(0, 1);
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.borderRadius = '50%'; // Para que la imagen sea redonda dentro del estandarte
                    commanderBanner.appendChild(img);
                } else {
                    // ...si no, lo tratamos como un emoji (fallback).
                    commanderBanner.textContent = commanderSpriteValue;
                }
                
                mainContent.appendChild(commanderBanner);
            }

            /// 1. Calculamos los estados
            const isUnsupplied = (gameState.turnNumber > 1 && !isHexSupplied(unit.r, unit.c, unit.player));
            const isLowMorale = (unit.morale <= 25 && unit.morale > 0); // Baja, pero no 0
            const isLostControl = (unit.isDisorganized || unit.morale <= 0); // Zombie

            let statusIconHTML = '';
            let statusClass = '';
            let statusTitle = '';

            // PRIORIDAD 1: PÉRDIDA DE CONTROL (La más grave)
            if (isLostControl) {
                statusIconHTML = '💀'; 
                statusClass = 'status-doomed'; // Usamos el estilo rojo/negro que creamos
                statusTitle = "DESORGANIZADA: Unidad fuera de control. Huirá o se rendirá.";
            }
            // PRIORIDAD 2: MORAL CRÍTICA (Prevalece sobre el suministro)
            else if (isLowMorale) {
                statusIconHTML = '🏳️';
                statusClass = 'status-low-morale';
                statusTitle = `Moral Crítica (${unit.morale}). Defensa muy reducida.`;
            }
            // PRIORIDAD 3: SIN SUMINISTRO (Solo si tiene moral para aguantarlo)
            else if (isUnsupplied) {
                statusIconHTML = '⚡';
                statusClass = 'status-no-supply';
                statusTitle = "Sin Suministros. Perderá salud y moral al final del turno.";
            }

            // 3. Renderizar
            if (statusClass) {
                const statusDiv = document.createElement('div');
                statusDiv.className = `unit-status-icon ${statusClass}`;
                statusDiv.innerHTML = statusIconHTML;
                statusDiv.title = statusTitle;
                unitElement.appendChild(statusDiv);
        
                    // === SUPPLY VISUAL FEEDBACK: Agregar class de animación si está sin suministro ===
                    if (isUnsupplied) {
                        unitElement.classList.add('unit-no-supply');
                    } else {
                        unitElement.classList.remove('unit-no-supply');
                    }
            }

            // Añadir el indicador de salud
            const strengthDisplay = document.createElement('div');
            strengthDisplay.className = 'unit-strength';
            strengthDisplay.textContent = unit.currentHealth;
            unitElement.appendChild(strengthDisplay);
            
            // Re-asignamos la nueva referencia y lo añadimos al tablero.
            unit.element = unitElement;

                        // Lo añadimos al tablero.
            this._domElements.gameBoard.appendChild(unitElement);

                        // Y lo posicionamos.
            if (typeof positionUnitElement === 'function') {
                positionUnitElement(unit);
            }
        }
    },

    showRewardToast: function(message, icon = '🏆') {
        if (!this._domElements.gameBoard) return;
        
        const toast = document.createElement('div');
        toast.className = 'reward-toast';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        // Posicionarlo en el centro horizontal y un poco arriba
        toast.style.left = '50%';
        toast.style.top = '25%';
        toast.style.transform = 'translateX(-50%)'; // Centrarlo correctamente

        this._domElements.gameBoard.appendChild(toast);

        // Se autodestruye cuando termina la animación
        setTimeout(() => {
            toast.remove();
        }, 2500); // La duración de la animación
    },

    _clearHexSelectionProgressVisual: function() {
        const existingOverlay = document.getElementById('hexSelectionProgressOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        if (this._lastDisputedHexElement) {
            this._lastDisputedHexElement.classList.remove('hex-dispute-glow');
            this._lastDisputedHexElement = null;
        }
    },

    _showHexSelectionProgressVisual: function(r, c, hexData) {
        this._clearHexSelectionProgressVisual();

        if (!hexData || !this._domElements?.gameBoard) return;

        let label = '';
        let ratio = 0;
        let barColor = '#4caf50';
        let shouldGlowDispute = false;

        if (hexData.owner === gameState.currentPlayer) {
            const stability = Number(hexData.estabilidad || 0);
            const maxStability = Number(MAX_STABILITY || 5);
            ratio = Math.max(0, Math.min(1, maxStability > 0 ? (stability / maxStability) : 0));
            label = `Estabilidad ${stability}/${maxStability}`;
        } else if (hexData.owner !== null) {
            const occupyingUnit = (typeof getUnitOnHex === 'function') ? getUnitOnHex(r, c) : null;
            const isDisputed = occupyingUnit && occupyingUnit.player === gameState.currentPlayer;
            if (!isDisputed) return;

            const resistance = Number(hexData.nacionalidad?.[hexData.owner] || 0);
            const maxNationality = Number(MAX_NACIONALIDAD || 5);
            ratio = Math.max(0, Math.min(1, maxNationality > 0 ? ((maxNationality - resistance) / maxNationality) : 0));
            label = `Conquista ${Math.round(ratio * 100)}%`;
            barColor = '#ffb74d';
            shouldGlowDispute = true;
        } else {
            return;
        }

        const hexEl = hexData.element;
        if (!hexEl) return;

        const hexWidth = hexEl.offsetWidth || 50;
        const hexCenterX = (parseFloat(hexEl.style.left || '0') + (hexWidth / 2));
        const hexTopY = parseFloat(hexEl.style.top || '0');

        const overlay = document.createElement('div');
        overlay.id = 'hexSelectionProgressOverlay';
        overlay.className = 'hex-selection-progress-overlay';
        overlay.style.left = `${Math.round(hexCenterX)}px`;
        overlay.style.top = `${Math.round(hexTopY - 12)}px`;

        overlay.innerHTML = `
            <div class="hex-selection-progress-label">${label}</div>
            <div class="hex-selection-progress-track">
                <div class="hex-selection-progress-fill" style="width:${Math.round(ratio * 100)}%; background:${barColor};"></div>
            </div>
        `;

        this._domElements.gameBoard.appendChild(overlay);

        if (shouldGlowDispute) {
            hexEl.classList.add('hex-dispute-glow');
            this._lastDisputedHexElement = hexEl;
        }
    },

    showUnitContextualInfo: function(unit, isOwnUnit = true) {
        if (!this._domElements.contextualInfoPanel || !unit) return;

        // Limpia cualquier temporizador de autocierre anterior.
        if (this._autoCloseTimeout) {
            if (typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this._autoCloseTimeout);
            } else {
                clearTimeout(this._autoCloseTimeout);
            }
        }
        this.removeAttackPredictionListener();
        
        // --- Prepara el contenido del panel ---
        const line1 = document.getElementById('contextual-line-1');
        const line2 = document.getElementById('contextual-line-2');
        line1.innerHTML = this._buildUnitLine(unit);
        line2.innerHTML = this._buildHexLine(unit.r, unit.c);
        line1.style.display = 'block';
        line2.style.display = 'block';

        // --- Muestra el panel ---
        this._domElements.contextualInfoPanel.classList.remove('hex-tooltip-compact');
        this._domElements.contextualInfoPanel.classList.add('visible');
        if (this._reopenBtn) this._reopenBtn.style.display = 'none';
        this._showHexSelectionProgressVisual(unit.r, unit.c, board[unit.r]?.[unit.c]);

        // --- Guarda la información para poder reabrirla ---
        this._lastShownInfo = { type: 'unit', data: unit };
        
        // --- Inicia el temporizador de autocierre ---
        const autocloseUnitPanel = () => {
            this._domElements.contextualInfoPanel.classList.remove('visible');
            this._clearHexSelectionProgressVisual();
                // Usa this._reopenBtn para mostrar el botón
            if (this._reopenBtn) this._reopenBtn.style.display = 'block';
            if (gameState.isTutorialActive) return; // Si es el tutorial, no sigas ocultando cosas 
            //this.hideAllActionButtons();
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            this._autoCloseTimeout = 'ui_autoClose';
            window.intervalManager.setTimeout(this._autoCloseTimeout, autocloseUnitPanel, 3000);
        } else {
            this._autoCloseTimeout = setTimeout(autocloseUnitPanel, 3000);
        }
        
        // --- Lógica para mostrar los botones de acción ---
        this.hideAllActionButtons();
        const isPlayerUnit = isOwnUnit;
        const isScoutedEnemy = !isPlayerUnit && isEnemyScouted(unit);
        
        if (isPlayerUnit || isScoutedEnemy) {
            if (this._domElements.floatingReinforceBtn) {
                this._domElements.floatingReinforceBtn.style.display = 'flex';
                this._domElements.floatingReinforceBtn.title = isPlayerUnit ? "Gestionar/Reforzar Unidad" : "Ver Detalles";
                this._domElements.floatingReinforceBtn.innerHTML = isPlayerUnit ? "💪" : "👁️";
            }
        }
        
        if (isPlayerUnit && gameState.currentPhase === 'play') {
            //const canAct = !unit.hasMoved && !unit.hasAttacked;
            const canAct = !unit.hasAttacked;
            if (unit.lastMove && !unit.hasAttacked) {
                if (this._domElements.floatingUndoMoveBtn) this._domElements.floatingUndoMoveBtn.style.display = 'flex';
            }
            if (canAct) {
                if ((unit.regiments?.length || 0) > 1 && this._domElements.floatingSplitBtn) {
                    this._domElements.floatingSplitBtn.style.display = 'flex';
                }
                if (this._domElements.floatingAssignGeneralBtn) {
                    const playerTechs = gameState.playerResources[unit.player]?.researchedTechnologies || [];
                    const hasLeadershipTech = playerTechs.includes("LEADERSHIP");
                    const hasHQ = unit.regiments.some(r => r.type === "Cuartel General");
                    const unitHex = board[unit.r]?.[unit.c];
                    let isAtRecruitmentPoint = false;
                    if (unitHex && (unitHex.isCity || unitHex.isCapital || unitHex.structure === "Fortaleza")) {
                        isAtRecruitmentPoint = true;
                    }
                    if (!unit.commander && hasLeadershipTech && hasHQ && isAtRecruitmentPoint) {
                        this._domElements.floatingAssignGeneralBtn.style.display = 'flex';
                    }
                }
                const unitHex = board[unit.r]?.[unit.c];
                if (unitHex) {
                    if (unitHex.owner !== null && unitHex.owner !== unit.player && this._domElements.floatingPillageBtn) {
                        this._domElements.floatingPillageBtn.style.display = 'flex';
                    }
                    const isBuilderUnit = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.abilities?.includes("build_road"));
                    if (isBuilderUnit && this._domElements.floatingBuildBtn) {
                        hexToBuildOn = { r: unit.r, c: unit.c };
                        this._domElements.floatingBuildBtn.style.display = 'flex';
                    }
                }
                const hasDamagedDuplicates = [...new Set(unit.regiments.map(r => r.type))].some(type => {
                    const group = unit.regiments.filter(r => r.type === type);
                    return group.length > 1 && group.some(r => r.health < REGIMENT_TYPES[type].health);
                });
                if (hasDamagedDuplicates && this._domElements.floatingConsolidateBtn) {
                    this._domElements.floatingConsolidateBtn.style.display = 'flex';
                }
            }
            const hexUnderUnit = board[unit.r]?.[unit.c];
            if (hexUnderUnit && this._domElements.setAsCapitalBtn) {
                const isEligibleCity = hexUnderUnit.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexUnderUnit.structure);
                if (isOwnUnit && isEligibleCity && !hexUnderUnit.isCapital) {
                    this._domElements.setAsCapitalBtn.style.display = 'flex';
                }
            }

            // --- COMERCIO ---
            const hasSupplyAbility = unit.regiments.some(reg => (REGIMENT_TYPES[reg.type].abilities || []).includes("provide_supply"));
            
            // Si es una unidad de suministro y puede actuar, muestra el botón de iniciar ruta
            if (hasSupplyAbility && canAct && !unit.tradeRoute) {
                if (this._domElements.floatingTradeBtn) { // Asumiremos que el botón tiene el ID 'floatingTradeBtn'
                    this._domElements.floatingTradeBtn.style.display = 'flex';
                    this._domElements.floatingTradeBtn.onclick = () => {
                        if (typeof requestEstablishTradeRoute === 'function') {
                            requestEstablishTradeRoute();
                        }
                    };
                }
            }
            
            // Si ya está en una ruta comercial, muestra un botón para detenerla
            if (hasSupplyAbility && unit.tradeRoute) {
                if (this._domElements.floatingStopTradeBtn) { // Asumiremos un botón con ID 'floatingStopTradeBtn'
                    this._domElements.floatingStopTradeBtn.style.display = 'flex';
                    this._domElements.floatingStopTradeBtn.onclick = () => {
                        if (confirm('¿Detener la ruta comercial? La unidad volverá a control manual.')) {
                            delete unit.tradeRoute;
                            unit.hasMoved = true; // Consumir su turno al cancelar
                            unit.hasAttacked = true;
                            logMessage(`La ruta comercial de "${unit.name}" ha sido cancelada.`);
                            this.hideContextualPanel();
                        }
                    };
                }
            }
            // --- FIN DE comercio ---
        }

        if (isOwnUnit && gameState.currentPhase === 'play' && !unit.hasAttacked) {
            this.attachAttackPredictionListener(unit);    
        } else { 
            this.removeAttackPredictionListener();
        }

        const hexUnderUnit = board[unit.r]?.[unit.c];
        // Comprobamos si hay una estructura, si no es una capital, y si el dueño ORIGINAL
        // del hexágono no eres tú.
        if (hexUnderUnit && hexUnderUnit.structure && !hexUnderUnit.isCapital) {
            if (this._domElements.floatingRazeBtn) {
                this._domElements.floatingRazeBtn.style.display = 'flex';
                this._domElements.floatingRazeBtn.title = hexUnderUnit.owner === unit.player ? 'Destruir Construccion' : 'Arrasar Estructura';
            }
        }

        // Lógica para el botón de Explorar Ruinas
        if (hexUnderUnit && hexUnderUnit.feature === 'ruins' && hexUnderUnit.looted !== true) {
            // Comprobar si la división tiene un explorador
            const hasExplorer = unit.regiments.some(reg => reg.type === 'Explorador');
            
            if (hasExplorer) {
                if (this._domElements.floatingExploreRuinBtn) {
                    this._domElements.floatingExploreRuinBtn.style.display = 'flex';
                }
            }
        }

        if (this.preventNextAutoclose) {
            this.preventNextAutoclose = false;
        } else {
            this._startAutocloseTimer();
        }
    },

    showHexContextualInfo: function(r, c, hexData) {
        if (!this._domElements.contextualInfoPanel || !hexData) return;

        // Limpia cualquier temporizador de autocierre anterior.
        if (this._autoCloseTimeout) {
            if (typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this._autoCloseTimeout);
            } else {
                clearTimeout(this._autoCloseTimeout);
            }
        }
        this.removeAttackPredictionListener();

        // --- Prepara el contenido del panel ---
        const line1 = document.getElementById('contextual-line-1');
        const line2 = document.getElementById('contextual-line-2');
        line1.innerHTML = '';
        line1.style.display = 'none';
        line2.innerHTML = this._buildHexLine(r, c);
        line2.style.display = 'block';

        // --- Muestra el panel ---
        this._domElements.contextualInfoPanel.classList.add('hex-tooltip-compact');
        this._domElements.contextualInfoPanel.classList.add('visible');
        if (this._reopenBtn) this._reopenBtn.style.display = 'none';
        this._showHexSelectionProgressVisual(r, c, hexData);
        
        // --- Guarda la información ---
        this._lastShownInfo = { type: 'hex', data: { r, c, hexData } };
        
        // --- Inicia el temporizador de autocierre ---
        const autocloseHexPanel = () => {
            this._domElements.contextualInfoPanel.classList.remove('visible');
            this._clearHexSelectionProgressVisual();
                // Usa this._reopenBtn para mostrar el botón
            if (this._reopenBtn) this._reopenBtn.style.display = 'block'; 
            //this.hideAllActionButtons();
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            this._autoCloseTimeout = 'ui_autoClose';
            window.intervalManager.setTimeout(this._autoCloseTimeout, autocloseHexPanel, 3000);
        } else {
            this._autoCloseTimeout = setTimeout(autocloseHexPanel, 3000);
        }

        // --- Lógica para mostrar los botones de acción ---
        this.hideAllActionButtons();
        
        const isPlayerTerritory = hexData.owner === gameState.currentPlayer;
        const isUnitPresent = getUnitOnHex(r, c);
        const canActHere = (gameState.currentPhase === 'play' || gameState.isTutorialActive) && isPlayerTerritory && !isUnitPresent;
        
        
        if (canActHere) {
            const playerTechs = gameState.playerResources[gameState.currentPlayer]?.researchedTechnologies || [];
            if (playerTechs.includes('ENGINEERING')) {
                if (this._domElements.floatingBuildBtn) this._domElements.floatingBuildBtn.style.display = 'flex';
                hexToBuildOn = {r, c};
            }
            const currentStructureInfo = hexData.structure ? STRUCTURE_TYPES[hexData.structure] : null;
            const isRecruitmentPoint = hexData.isCity || hexData.isCapital || (currentStructureInfo && currentStructureInfo.allowsRecruitment);
            if (isRecruitmentPoint && this._domElements.floatingCreateDivisionBtn) {
                console.error("¡DIAGNÓSTICO! El código para mostrar el botón 'Crear Unidad' SÍ SE ESTÁ EJECUTANDO.");
                this._domElements.floatingCreateDivisionBtn.style.display = 'flex';
                hexToBuildOn = {r, c};
            }
        }
        
        const setCapitalBtn = this._domElements.setAsCapitalBtn;
        if(setCapitalBtn) {
            const isEligibleCity = hexData.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexData.structure);
            if(isPlayerTerritory && isEligibleCity && !hexData.isCapital) {
                setCapitalBtn.style.display = 'flex';
            }
        }

        if (this.preventNextAutoclose) {
            this.preventNextAutoclose = false;
        } else {
            this._startAutocloseTimer(true);
        }

    },

    hideContextualPanel: function() {
        if (this._domElements.contextualInfoPanel) {
            this._domElements.contextualInfoPanel.classList.remove('visible');
        }
        this._clearHexSelectionProgressVisual();
        this.removeAttackPredictionListener();
        if (!gameState.isTutorialActive) {
            this.hideAllActionButtons();
        }
    },

    _buildUnitLine: function(unit) {
        const levelData = XP_LEVELS[unit.level || 0];
        const xpStr = (levelData.nextLevelXp === 'Max') ? 'Max' : `${unit.experience || 0}/${levelData.nextLevelXp}`;
        const food = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.foodConsumption || 0), 0);
        const upkeep = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.cost.upkeep || 0), 0);

        // --- comercio ---
        let tradeInfo = '';
        if (unit.tradeRoute) {
            tradeInfo = `&nbsp;•&nbsp; <strong>Carga:</strong> ${unit.tradeRoute.goldCarried}/${unit.tradeRoute.cargoCapacity} Oro`;
        }
        // --- FIN DE comercio ---

        return `<strong>Unidad:</strong> ${unit.name} (J${unit.player}) &nbsp;•&nbsp; <strong>S:</strong> ${unit.currentHealth}/${unit.maxHealth} &nbsp;•&nbsp; <strong>M:</strong> ${unit.morale || 50}/${unit.maxMorale || 125} &nbsp;•&nbsp; <strong>Exp:</strong> ${xpStr} &nbsp;•&nbsp; <strong>Mov:</strong> ${unit.currentMovement || unit.movement} &nbsp;•&nbsp; <strong>Mt:</strong> ${upkeep} Oro, ${food} Comida${tradeInfo}`;
    },

    _buildHexLine: function(r, c) {
        const hexData = board[r]?.[c];
        if (!hexData) return 'Datos no disponibles.';
        
        const terrainName = TERRAIN_TYPES[hexData.terrain]?.name || 'Desconocido';
        let content = `${terrainName} ${r},${c}`;

        if (hexData.owner !== null) {
            content += ` • <strong>J${hexData.owner}</strong>`;

            if (hexData.isCapital) {
                content += ' • Capital';
            } else if (hexData.isCity) {
                content += ' • Ciudad';
            } else if (hexData.structure) {
                content += ` • ${hexData.structure}`;
            }

        } else {
            content += ` • <strong>Neutral</strong>`;
        }
        
        // LÍNEA INFERIOR: Información de Estabilidad y Nacionalidad
        let tooltip = `<p>${content}`;
        if (hexData.owner !== null) {
            const stability = hexData.estabilidad || 0;
            const nationality = hexData.nacionalidad?.[hexData.owner] || 0;
            tooltip += `<br><span style="font-size: 0.9em; color: #aaa;">Est: ${stability}/${MAX_STABILITY} • Nac: ${nationality}/${MAX_NACIONALIDAD}</span>`;
        }
        tooltip += '</p>';
        
        return tooltip;
    },
    
    showTutorialMessage: function(message) {
        // Si el panel de INFORMACIÓN está visible, lo cerramos forzosamente.
        if (this._domElements.contextualInfoPanel && this._domElements.contextualInfoPanel.classList.contains('visible')) {
            this._domElements.contextualInfoPanel.classList.remove('visible');
            const reopenBtn = document.getElementById('reopenContextualPanelBtn');
            if (reopenBtn) reopenBtn.style.display = 'block';
        }

        // Y luego mostramos el mensaje del tutorial
        if (!this._tutorialMessagePanel) this._tutorialMessagePanel = document.getElementById('tutorialMessagePanel');
        const tutorialTextElement = document.getElementById('tutorialMessageText');
        if (tutorialTextElement && this._tutorialMessagePanel) {
            tutorialTextElement.innerHTML = message;
            this._tutorialMessagePanel.classList.add('visible');
        }
    },

    hideTutorialMessage: function() {
        if (!this._tutorialMessagePanel) this._tutorialMessagePanel = document.getElementById('tutorialMessagePanel');
        if (this._tutorialMessagePanel) {
            this._tutorialMessagePanel.classList.remove('visible');
        }
    },

    // Función para limpiar CUALQUIER resaltado del tutorial
    clearTutorialHighlights: function() {
        // 1. Limpia el resaltado de botones/UI si lo hubiera
        if (this._lastTutorialHighlightElementId) {
            const oldElement = document.getElementById(this._lastTutorialHighlightElementId);
            if (oldElement) oldElement.classList.remove('tutorial-highlight');
            this._lastTutorialHighlightElementId = null;
        }
        
        // 2. Busca y elimina TODOS los "aros de luz" que puedan existir
        /*
        const existingOverlays = document.querySelectorAll('.tutorial-hex-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
        */
        document.querySelectorAll('.tutorial-highlight-hex').forEach(hex => {
            hex.classList.remove('tutorial-highlight-hex');
        });
    },

    // Función para crear los resaltados
    highlightTutorialElement: function(elementId = null, hexCoords = null) {
        // SIEMPRE limpiamos cualquier resaltado anterior para empezar de cero
        this.clearTutorialHighlights();

        // Lógica para resaltar botones (esta no cambia)
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.add('tutorial-highlight');
                this._lastTutorialHighlightElementId = elementId; 
            }
        }

        if (hexCoords) {
            const coords = (typeof hexCoords === 'function') ? hexCoords() : hexCoords;
            coords.forEach(coord => {
                const hexData = board[coord.r]?.[coord.c];
                if (hexData && hexData.element) {
                    // Cambio mínimo: Aplicar la clase que ya existe en el CSS
                    hexData.element.classList.add('tutorial-highlight-hex');
                }
            });
        }
    },

    _formatTopBarResourceValue: function(value) {
        const numericValue = Number(value) || 0;
        return numericValue >= 1000 ? `${(numericValue / 1000).toFixed(1)}k` : `${Math.round(numericValue)}`;
    },

    _popTopBarResourceIcon: function(resourceEl) {
        const iconEl = resourceEl?.parentElement?.querySelector('span');
        if (!iconEl) return;

        iconEl.style.transition = 'transform 120ms ease-out';
        iconEl.style.transform = 'scale(1.2)';

        setTimeout(() => {
            iconEl.style.transition = 'transform 160ms ease-in';
            iconEl.style.transform = 'scale(1)';
        }, 120);
    },

    _animateTopBarResourceValue: function(resourceEl, targetValue, options = {}) {
        if (!resourceEl) return;

        const duration = Number(options.durationMs || 300);
        const popIcon = options.popIcon === true;
        const finalValue = Number(targetValue) || 0;

        if (!this._topBarResourceTweens) {
            this._topBarResourceTweens = {};
        }

        const tweenKey = resourceEl.dataset.resource || 'unknown';
        const currentValueFromDom = Number(resourceEl.dataset.rawValue);
        const startValue = Number.isFinite(currentValueFromDom)
            ? currentValueFromDom
            : finalValue;

        if (this._topBarResourceTweens[tweenKey]) {
            cancelAnimationFrame(this._topBarResourceTweens[tweenKey]);
            this._topBarResourceTweens[tweenKey] = null;
        }

        if (startValue === finalValue) {
            resourceEl.dataset.rawValue = `${finalValue}`;
            resourceEl.textContent = this._formatTopBarResourceValue(finalValue);
            return;
        }

        if (popIcon) {
            this._popTopBarResourceIcon(resourceEl);
        }

        const startedAt = performance.now();
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const tick = (now) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = easeOutCubic(progress);
            const animatedValue = startValue + ((finalValue - startValue) * eased);
            const roundedAnimatedValue = Math.round(animatedValue);

            resourceEl.dataset.rawValue = `${roundedAnimatedValue}`;
            resourceEl.textContent = this._formatTopBarResourceValue(roundedAnimatedValue);

            if (progress < 1) {
                this._topBarResourceTweens[tweenKey] = requestAnimationFrame(tick);
            } else {
                resourceEl.dataset.rawValue = `${finalValue}`;
                resourceEl.textContent = this._formatTopBarResourceValue(finalValue);
                this._topBarResourceTweens[tweenKey] = null;
            }
        };

        this._topBarResourceTweens[tweenKey] = requestAnimationFrame(tick);
    },

    _getPlayerWealth: function(playerId) {
        const resources = gameState?.playerResources?.[playerId];
        if (!resources) return 0;

        return Object.values(resources).reduce((sum, val) => {
            const n = Number(val);
            return Number.isFinite(n) ? sum + Math.max(0, n) : sum;
        }, 0);
    },

    _isJ2AiRicherThanJ1: function() {
        const p2Type = gameState?.playerTypes?.player2 || '';
        const isJ2Ai = typeof p2Type === 'string' && p2Type.includes('ai');
        if (!isJ2Ai) return false;

        const p1Wealth = this._getPlayerWealth(1);
        const p2Wealth = this._getPlayerWealth(2);
        return p2Wealth > p1Wealth;
    },

    _getAdvancePoints: function(playerId) {
        const res = gameState?.playerResources?.[playerId] || {};
        const researchedCount = Array.isArray(res.researchedTechnologies) ? res.researchedTechnologies.length : 0;
        const reserveResearch = Number(res.researchPoints || 0);
        // El conteo de tecnologías manda; researchPoints solo desempata suavemente.
        return researchedCount + (reserveResearch / 1000);
    },

    _getAdvanceLeaderDataJ1J2: function() {
        const p1 = { playerId: 1, points: this._getAdvancePoints(1) };
        const p2 = { playerId: 2, points: this._getAdvancePoints(2) };

        if (Math.abs(p1.points - p2.points) < 0.0001) {
            return null;
        }

        const leader = p1.points > p2.points ? p1 : p2;
        const civKey = gameState?.playerCivilizations?.[leader.playerId] || 'ninguna';
        const civData = CIVILIZATIONS?.[civKey] || null;

        return {
            playerId: leader.playerId,
            points: Math.floor(leader.points),
            civKey,
            civData
        };
    },

    _renderAdvanceLeaderIndicator: function(tracker) {
        if (!tracker) return;

        let indicatorEl = document.getElementById('victory-advance-indicator');
        if (!indicatorEl) {
            indicatorEl = document.createElement('div');
            indicatorEl.id = 'victory-advance-indicator';
            indicatorEl.className = 'victory-advance-indicator';
            tracker.insertBefore(indicatorEl, document.getElementById('victory-points-tooltip'));
        }

        const leader = this._getAdvanceLeaderDataJ1J2();
        if (!leader) {
            indicatorEl.style.display = 'none';
            tracker.classList.remove('arabia-advance-lead');
            return;
        }

        const civName = leader.civData?.name || leader.civKey;
        const factionImage = leader.civData?.factionImage || '';
        const isArabiaLead = civName === 'Arabia' || leader.civKey === 'Arábiga';

        const iconHtml = factionImage
            ? `<img class="advance-faction-icon" src="${factionImage}" alt="${civName}">`
            : `<span class="advance-faction-fallback">⚑</span>`;

        indicatorEl.style.display = 'inline-flex';
        indicatorEl.innerHTML = `${iconHtml}<span class="advance-faction-text">Avance J${leader.playerId}</span>`;
        indicatorEl.title = `${civName} lidera en Puntos de Avance (${leader.points}).`;

        tracker.classList.toggle('arabia-advance-lead', isArabiaLead);
    },

    _bindVictoryTrackerGuideToggle: function(tracker, tooltipEl) {
        if (!tracker || !tooltipEl || tracker.dataset.guideBound === '1') return;

        tracker.dataset.guideBound = '1';

        tracker.addEventListener('click', (event) => {
            event.stopPropagation();
            tracker.classList.toggle('guide-open');
        });

        document.addEventListener('click', (event) => {
            if (!tracker.contains(event.target)) {
                tracker.classList.remove('guide-open');
            }
        });
    },

    _buildVictoryNextStepGuideHtml: function(vpData) {
        const j1Wealth = this._getPlayerWealth(1);
        const j2Wealth = this._getPlayerWealth(2);
        const j1Points = Number(vpData?.player1 || 0);
        const j2Points = Number(vpData?.player2 || 0);
        const j1Cities = (gameState.cities || []).filter(c => c.owner === 1).length;
        const j2Cities = (gameState.cities || []).filter(c => c.owner === 2).length;

        const recommendations = [];

        if (j1Cities < j2Cities) {
            recommendations.push('Necesitas más ciudades para superar al rival en Demografía.');
        }

        if (j1Wealth < j2Wealth) {
            recommendations.push('Vas por detrás en riqueza: protege rutas y prioriza ingresos de oro.');
        }

        if (j1Points < j2Points) {
            recommendations.push('J2 lidera en puntos: disputa títulos abiertos y ruinas este turno.');
        }

        if (recommendations.length === 0) {
            recommendations.push('Vas por buen camino: mantén ciudades seguras y comercio activo.');
        }

        return `
            <div class="victory-next-step-guide">
                <h4>The Next Step</h4>
                <ul>
                    ${recommendations.map(text => `<li>${text}</li>`).join('')}
                </ul>
            </div>
        `;
    },

    //función para la información en pantalla
    updateTopBarInfo: function() {
        // 1. Verificar si el menú y los datos existen antes de hacer nada
        const topBar = document.getElementById('top-bar-menu');
        if (!topBar || topBar.style.display === 'none' || !gameState || !gameState.playerResources) {
            return; // No hacer nada si el menú está cerrado o los datos no están listos
        }

        const infoContainer = document.getElementById('top-bar-info');
        if (!infoContainer) return;
        
        // --- 2. CORRECCIÓN: FASE Y TURNO ---
        const phaseTurnEl = document.getElementById('top-bar-phase-turn');
        if (phaseTurnEl) {
            const playerType = gameState.playerTypes && gameState.playerTypes[`player${gameState.currentPlayer}`] 
                            ? (gameState.playerTypes[`player${gameState.currentPlayer}`].includes('ai') ? 'IA' : 'Humano') 
                            : 'Desconocido';
            const seasonLabel = gameState.currentSeasonName || 'Primavera';
            phaseTurnEl.textContent = `Fase: ${gameState.currentPhase} | Turno: ${gameState.turnNumber} | Estacion: ${seasonLabel} | J${gameState.currentPlayer} (${playerType})`;
        }
        
        // --- 3. CORRECCIÓN: RUTA A LOS RECURSOS ---
        const resourcesData = gameState.playerResources[gameState.currentPlayer];
        if (!resourcesData) return; // Salir si el jugador actual no tiene recursos definidos

        for (const resKey in resourcesData) {
            const el = infoContainer.querySelector(`strong[data-resource="${resKey}"]`);
            if (!el) continue;

            const numericValue = Number(resourcesData[resKey] || 0);
            if (resKey === 'oro') {
                this._animateTopBarResourceValue(el, numericValue, {
                    durationMs: 300,
                    popIcon: true
                });
                continue;
            }

            el.dataset.rawValue = `${numericValue}`;
            el.textContent = this._formatTopBarResourceValue(numericValue);
        }

        // --- NUEVO: ALERTA DE MANTENIMIENTO ---
        const playerUnits = units.filter(u => u.player === gameState.currentPlayer);
        let totalGoldUpkeep = 0;
        let totalFoodUpkeep = 0;

        // Calcular mantenimiento previsto
        playerUnits.forEach(u => {
            (u.regiments || []).forEach(r => {
                const cost = REGIMENT_TYPES[r.type]?.cost || {};
                totalGoldUpkeep += cost.upkeep || 0;
                // Asumimos un consumo base de 1 comida por regimiento si no está definido
                totalFoodUpkeep += REGIMENT_TYPES[r.type]?.foodConsumption || 1; 
            });
        });

        const currentGold = gameState.playerResources[gameState.currentPlayer].oro || 0;
        const currentFood = gameState.playerResources[gameState.currentPlayer].comida || 0;

        // Elementos del DOM (Asegúrate de que tus spans tengan IDs o data-attributes accesibles)
        // En tu HTML actual usas: <strong data-resource="oro">
        
        const goldEl = document.querySelector('strong[data-resource="oro"]');
        const foodEl = document.querySelector('strong[data-resource="comida"]');
        const goldItemEl = goldEl?.parentElement;

        // Comprobación Oro
        if (goldEl) {
            if (currentGold < totalGoldUpkeep) {
                goldEl.style.color = "#ff4444"; // Rojo Alerta
                goldEl.parentElement.title = `¡Déficit! Mantenimiento: ${totalGoldUpkeep}`;
                // Animación opcional
                goldEl.style.animation = "pulseWarning 1s infinite"; 
            } else {
                goldEl.style.color = ""; // Restaurar (o el color que use tu CSS, el amarillo de .resource-item strong)
                goldEl.style.animation = "";
                goldEl.parentElement.title = "";
            }
        }

        // Alerta estratégica: si J2 (IA) supera en riqueza a J1, destacar oro con pulso/flecha.
        if (goldItemEl) {
            const warnRivalWealth = this._isJ2AiRicherThanJ1();
            goldItemEl.classList.toggle('gold-trailing-rival', warnRivalWealth);
            if (warnRivalWealth) {
                const baseTitle = goldItemEl.title ? `${goldItemEl.title} · ` : '';
                goldItemEl.title = `${baseTitle}J2 tiene más riqueza. Mejora comercio o conquista ciudades.`;
            }
        }

        // Comprobación Comida
        if (foodEl) {
            if (currentFood < totalFoodUpkeep) {
                foodEl.style.color = "#ff4444";
                foodEl.parentElement.title = `¡Hambre! Consumo: ${totalFoodUpkeep}`;
                foodEl.style.animation = "pulseWarning 1s infinite";
            } else {
                foodEl.style.color = "";
                foodEl.style.animation = "";
                foodEl.parentElement.title = "";
            }
        }

    },

    // =============================================================
    // ==   FUNCIÓN DE AUTOCIERRE                     ==
    // =============================================================
    _startAutocloseTimer: function(isHexPanel = false) {
        if (gameState.isTutorialActive) return;
        // 1. Limpiar cualquier temporizador anterior para evitar cierres conflictivos
        if (this._autoCloseTimeout) {
            if (typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this._autoCloseTimeout);
            } else {
                clearTimeout(this._autoCloseTimeout);
            }
        }

        // 2. Definir la duración del temporizador
        // 8 segundos para paneles de unidad, 4 segundos para paneles de hexágono (más simples)
        const duration = isHexPanel ? 4000 : 8000;
        
        // 3. Crear el nuevo temporizador
        const autoclosePanel = () => {
            const infoPanel = document.getElementById('contextualInfoPanel');
            if (infoPanel && infoPanel.classList.contains('visible')) {
                infoPanel.classList.remove('visible');

                // También mostramos el botón de reabrir
                const reopenBtn = document.getElementById('reopenContextualPanelBtn');
                if (reopenBtn) {
                    reopenBtn.style.display = 'block';
                }

                // Y ocultamos los botones de acción para que no queden flotando
                this.hideAllActionButtons();
            }
            // Limpiar la referencia al temporizador una vez ejecutado
            this._autoCloseTimeout = null;
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            this._autoCloseTimeout = 'ui_autoClose';
            window.intervalManager.setTimeout(this._autoCloseTimeout, autoclosePanel, duration);
        } else {
            this._autoCloseTimeout = setTimeout(autoclosePanel, duration);
        }
    },

    updateVictoryPointsDisplay: function() {

        const tracker = document.getElementById('victory-points-tracker');
        if (!tracker) {
            console.error("[UI] ¡ERROR! No se encuentra el elemento #victory-points-tracker en el DOM.");
            return;
        }

        if (gameState.turnNumber < 2) {
            tracker.style.display = 'none';
            tracker.classList.remove('guide-open');
            return;
        }

        tracker.style.display = 'flex';

        const summaryEl = document.getElementById('victory-points-summary');
        const tooltipEl = document.getElementById('victory-points-tooltip');
        const barP1El = document.getElementById('victory-bar-p1');
        const barP2El = document.getElementById('victory-bar-p2');
        const vpData = gameState.victoryPoints;

        // 0. Calcular y animar la barra bicolor de comparación de puntos
        if (barP1El && barP2El) {
            const p1Points = vpData['player1'] || 0;
            const p2Points = vpData['player2'] || 0;
            const totalPoints = Math.max(p1Points + p2Points, 1);
            const p1Ratio = (p1Points / totalPoints) * 100;
            const p2Ratio = (p2Points / totalPoints) * 100;
            
            barP1El.style.flex = `${Math.max(p1Ratio, 3)}`; // Mínimo 3% para visibilidad
            barP2El.style.flex = `${Math.max(p2Ratio, 3)}`;
        }

        // 1. Actualizar el resumen simple (formato compacto)
        const playerScores = [];
        for (let i = 1; i <= gameState.numPlayers; i++) {
            if (!gameState.eliminatedPlayers.includes(i)) {
                playerScores.push(`J${i}:${vpData['player' + i] || 0}`);
            }
        }
        summaryEl.textContent = playerScores.join(' | ');
        this._renderAdvanceLeaderIndicator(tracker);

        // 2. Construir el contenido del tooltip detallado (sin cambios en la lógica)
        let tooltipHTML = '<h4>Títulos de Victoria</h4><ul>';
        const titles = {
            mostCities: "Más Ciudades", largestArmy: "Ejército Grande", mostRoutes: "Ruta Larga",
            mostKills: "Más Victorias", mostTechs: "Más Avances", mostHeroes: "Más Héroes",
            mostResources: "Más Riqueza", mostTrades: "Más Comercios", mostRuins: "Gran Arqueólogo",
            mostBarbaraCities: "Conquistador Bárbaro", mostNavalVictories: "Almirante Supremo"
        };

        for (const key in vpData.holders) {
            const title = titles[key];
            let holderText = '(Nadie)';
            const holderValue = vpData.holders[key];

            // --- INICIO DE LA CORRECCIÓN ---
            // Caso 1: El valor es un array (para 'mostTrades')
            if (Array.isArray(holderValue)) {
                if (holderValue.length > 0) {
                    holderText = holderValue.join(', ').replace(/player/g, 'J');
                }
            // Caso 2: El valor es un string (para todos los demás títulos)
            } else if (typeof holderValue === 'string') {
                holderText = holderValue.replace('player', 'J');
            }
            tooltipHTML += `<li><span>${title}:</span> <strong>${holderText}</strong></li>`;
        }
        tooltipHTML += '</ul>';
        
        let ruinsHTML = '<h4>PV de Ruinas</h4><ul>';
        let hasRuinPoints = false;
        for (let i = 1; i <= gameState.numPlayers; i++) {
            const ruinPoints = vpData.ruins['player' + i] || 0;
            if (ruinPoints > 0) {
                hasRuinPoints = true;
                ruinsHTML += `<li><span>Jugador ${i}:</span> <strong>${ruinPoints}</strong></li>`;
            }
        }
        ruinsHTML += '</ul>';
        if (hasRuinPoints) { tooltipHTML += ruinsHTML; }
        
        tooltipEl.innerHTML = `${tooltipHTML}${this._buildVictoryNextStepGuideHtml(vpData)}`;
        this._bindVictoryTrackerGuideToggle(tracker, tooltipEl);
    },

    // =============================================================
    // ==   pantalla de resultados                     ==
    // =============================================================

    showPostMatchSummary: function(playerWon, xpGained, progress, matchData) {
        const modal = document.getElementById('postMatchModal');
        if (!modal) return;

        const myPlayerNumber = gameState.myPlayerNumber || 1;
        const currentPowerForPlayer = (playerId) => {
            if (!Array.isArray(units)) return 0;
            return units
                .filter(unit => (unit.player ?? unit.playerId) === playerId && !unit.isDefeated)
                .reduce((sum, unit) => sum + (Number(unit.currentHealth) || 0), 0);
        };

        const pickMainRivalPlayer = () => {
            const candidates = new Set();
            const bankPlayerId = typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : 0;
            const barbarianPlayerId = typeof BARBARIAN_PLAYER_ID !== 'undefined' ? BARBARIAN_PLAYER_ID : 9;

            Object.keys(gameState.playerResources || {}).forEach(key => {
                const playerId = Number(key);
                if (!Number.isFinite(playerId)) return;
                if (playerId === myPlayerNumber || playerId === bankPlayerId || playerId === barbarianPlayerId) return;
                if (gameState.eliminatedPlayers?.includes(playerId)) return;
                candidates.add(playerId);
            });

            Object.keys(StatTracker?.gameStats?.players || {}).forEach(key => {
                const playerId = Number(key);
                if (!Number.isFinite(playerId)) return;
                if (playerId === myPlayerNumber || playerId === bankPlayerId || playerId === barbarianPlayerId) return;
                if (gameState.eliminatedPlayers?.includes(playerId)) return;
                candidates.add(playerId);
            });

            const rankedCandidates = Array.from(candidates).map(playerId => {
                const statPlayer = StatTracker?.gameStats?.players?.[playerId];
                const statPower = (statPlayer?.militaryPower || 0) + (statPlayer?.navyPower || 0);
                const timeline = Array.isArray(statPlayer?.timelineHistory) ? statPlayer.timelineHistory : [];
                const timelinePower = Number(timeline[timeline.length - 1]?.totalPower || 0);
                const livePower = currentPowerForPlayer(playerId);
                return {
                    playerId,
                    power: Math.max(statPower, timelinePower, livePower)
                };
            }).sort((a, b) => b.power - a.power);

            return rankedCandidates[0]?.playerId || (myPlayerNumber === 1 ? 2 : 1);
        };

        const rivalPlayerNumber = pickMainRivalPlayer();
        const rawSnapshots = Array.isArray(gameState.matchSnapshots) ? gameState.matchSnapshots.filter(Boolean) : [];

        const buildSnapshotsFromStatTracker = () => {
            const myTimeline = Array.isArray(StatTracker?.gameStats?.players?.[myPlayerNumber]?.timelineHistory)
                ? StatTracker.gameStats.players[myPlayerNumber].timelineHistory
                : [];
            const rivalTimeline = Array.isArray(StatTracker?.gameStats?.players?.[rivalPlayerNumber]?.timelineHistory)
                ? StatTracker.gameStats.players[rivalPlayerNumber].timelineHistory
                : [];

            const turns = new Set();
            myTimeline.forEach(point => turns.add(Number(point.turn)));
            rivalTimeline.forEach(point => turns.add(Number(point.turn)));

            const orderedTurns = Array.from(turns)
                .filter(Number.isFinite)
                .sort((a, b) => a - b);

            if (orderedTurns.length === 0) return [];

            let carryMyPower = 0;
            let carryRivalPower = 0;

            return orderedTurns.map(turn => {
                const myPoint = myTimeline.find(point => Number(point.turn) === turn);
                const rivalPoint = rivalTimeline.find(point => Number(point.turn) === turn);

                if (myPoint) carryMyPower = Number(myPoint.totalPower || 0);
                if (rivalPoint) carryRivalPower = Number(rivalPoint.totalPower || 0);

                return {
                    turn,
                    [`p${myPlayerNumber}`]: carryMyPower,
                    [`p${rivalPlayerNumber}`]: carryRivalPower
                };
            });
        };

        let normalizedSnapshots = rawSnapshots.map((snap, index) => ({
            ...snap,
            turn: Number(snap.turn || index + 1)
        }));

        const rawHasUsableSeries = normalizedSnapshots.some(snap => Number.isFinite(snap[`p${myPlayerNumber}`]) || Number.isFinite(snap[`p${rivalPlayerNumber}`]));
        if (!rawHasUsableSeries) {
            normalizedSnapshots = buildSnapshotsFromStatTracker();
        }

        if (normalizedSnapshots.length === 0) {
            normalizedSnapshots = [{
                turn: Number(gameState.turnNumber || 1),
                [`p${myPlayerNumber}`]: currentPowerForPlayer(myPlayerNumber),
                [`p${rivalPlayerNumber}`]: currentPowerForPlayer(rivalPlayerNumber)
            }];
        } else {
            const finalSnapshot = {
                turn: Number(gameState.turnNumber || normalizedSnapshots.length || 1),
                [`p${myPlayerNumber}`]: currentPowerForPlayer(myPlayerNumber),
                [`p${rivalPlayerNumber}`]: currentPowerForPlayer(rivalPlayerNumber)
            };
            const lastSnapshot = normalizedSnapshots[normalizedSnapshots.length - 1];
            const shouldAppendFinalSnapshot = !lastSnapshot
                || Number(lastSnapshot.turn) !== finalSnapshot.turn
                || Number(lastSnapshot[`p${myPlayerNumber}`] || 0) !== finalSnapshot[`p${myPlayerNumber}`]
                || Number(lastSnapshot[`p${rivalPlayerNumber}`] || 0) !== finalSnapshot[`p${rivalPlayerNumber}`];

            if (shouldAppendFinalSnapshot) {
                normalizedSnapshots.push(finalSnapshot);
            }
        }

        const myPowerSeries = normalizedSnapshots.map(snap => Number(snap[`p${myPlayerNumber}`] ?? 0));
        const enemyPowerSeries = normalizedSnapshots.map(snap => Number(snap[`p${rivalPlayerNumber}`] ?? 0));
        const finalOwnPower = myPowerSeries[myPowerSeries.length - 1] || 0;
        const finalEnemyPower = enemyPowerSeries[enemyPowerSeries.length - 1] || 0;

        // Validación: Si progress es undefined, usar valores por defecto
        if (!progress) {
            console.warn('[showPostMatchSummary] progress es undefined, usando valores por defecto');
            progress = { level: 1, xp: 0, xpNext: 1000 };
        }

        // 1. ACTIVAR EL BOTÓN PRIMERO (Para que nunca se quede bloqueado)
        const closeBtn = document.getElementById('closePostMatchBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
                
                console.log('[postMatch] Botón "Volver al Cuartel General" presionado');
                
                // 1. Ocultar contenedor del juego EXPLÍCITAMENTE
                if (domElements.gameContainer) {
                    domElements.gameContainer.style.display = 'none';
                    console.log('[postMatch] Game container ocultado');
                }
                
                // 2. Mostrar el menú principal como paso PRIORITARIO
                if (typeof showScreen === 'function') {
                    showScreen(domElements.mainMenuScreenEl);
                    console.log('[postMatch] Menú principal mostrado vía showScreen');
                } else if (domElements.mainMenuScreenEl) {
                    domElements.mainMenuScreenEl.style.display = 'flex';
                    console.log('[postMatch] Menú principal mostrado directamente');
                }
                
                // 3. MOSTRAR LA CRÓNICA SÓLO DESPUÉS de estar seguro que el menú está visible
                if (typeof LegacyManager !== 'undefined' && !gameState.isCampaignBattle) {
                    console.log('[postMatch] Abriendo crónica de batalla...');
                    setTimeout(() => {
                        LegacyManager.open(gameState.winner);
                    }, 500);
                }
            };
        }

        // 2. TEXTOS PRINCIPALES
        const title = document.getElementById('matchResultTitle');
        if (title) {
            title.textContent = playerWon ? "¡VICTORIA!" : "DERROTA";
            title.style.color = playerWon ? "#f1c40f" : "#e74c3c";
        }

        const levelDisp = document.getElementById('playerLevelDisplay');
        if (levelDisp) levelDisp.textContent = progress.level;

        const xpGainedDisplay = document.getElementById('xpGainedDisplay');
        if (xpGainedDisplay) {
            xpGainedDisplay.textContent = `+${xpGained} XP de perfil obtenida en esta batalla`;
        }

        // 3. INYECCIÓN DE STATS Y CONTENEDOR DE GRÁFICO
        const statsGrid = document.getElementById('matchStatsGrid');
        if (statsGrid) {
            const emotionMsg = PlayerDataManager.analyzeMatchEmotion();
            statsGrid.innerHTML = `
                <div style="grid-column: span 2; color: #ffd700; font-style: italic; font-size: 0.9em; margin-bottom: 10px;">
                    "${emotionMsg}"
                </div>
                <div style="font-size: 0.8em;">Resultado: <strong>${playerWon ? 'Victoria' : 'Derrota'}</strong></div>
                <div style="font-size: 0.8em;">Turnos jugados: <strong>${matchData.turns}</strong></div>
                <div style="font-size: 0.8em;">Regimientos enemigos destruidos: <strong>${matchData.kills}</strong></div>
                <div style="font-size: 0.8em;">Poder final propio / rival: <strong>${finalOwnPower} / ${finalEnemyPower}</strong></div>
                <div style="grid-column: span 2; font-size: 0.75em; color: #bcaaa4; text-align: left;">Grafica apilada tipo piramide: arriba tu poder militar y abajo el del rival principal en cada ronda.</div>
                <div id="miniPowerGraph" style="grid-column: span 2; height: 82px; display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.5); padding: 6px; margin-top: 10px; border: 1px solid #444;">
                </div>
            `;
        }

        // 4. DIBUJAR GRÁFICO (Con protección contra nulos)
        const graph = document.getElementById('miniPowerGraph');
        if (graph && normalizedSnapshots.length > 0) {
            const maxPower = Math.max(...myPowerSeries, ...enemyPowerSeries, 1);
            const laneHeight = 32;

            const ownLane = document.createElement('div');
            ownLane.style.flex = '1';
            ownLane.style.display = 'flex';
            ownLane.style.alignItems = 'flex-end';
            ownLane.style.gap = '2px';
            ownLane.style.borderBottom = '1px solid rgba(255,255,255,0.08)';

            const enemyLane = document.createElement('div');
            enemyLane.style.flex = '1';
            enemyLane.style.display = 'flex';
            enemyLane.style.alignItems = 'flex-end';
            enemyLane.style.gap = '2px';

            normalizedSnapshots.forEach((snap, index) => {
                const ownBar = document.createElement('div');
                ownBar.style.flex = '1';
                ownBar.style.height = `${Math.max(3, Math.round(((myPowerSeries[index] || 0) / maxPower) * laneHeight))}px`;
                ownBar.style.background = '#4caf50';
                ownBar.title = `Turno ${snap.turn}: tu poder ${myPowerSeries[index] || 0}`;

                const enemyBar = document.createElement('div');
                enemyBar.style.flex = '1';
                enemyBar.style.height = `${Math.max(3, Math.round(((enemyPowerSeries[index] || 0) / maxPower) * laneHeight))}px`;
                enemyBar.style.background = '#e57373';
                enemyBar.title = `Turno ${snap.turn}: poder rival ${enemyPowerSeries[index] || 0}`;

                ownLane.appendChild(ownBar);
                enemyLane.appendChild(enemyBar);
            });

            graph.appendChild(ownLane);
            graph.appendChild(enemyLane);
        }

        // 5. MOSTRAR MODAL Y ANIMAR BARRA XP
        modal.style.display = 'flex';
        setTimeout(() => {
            const xpBar = document.getElementById('playerXpBar');
            if (xpBar) {
                const xpToNext = Math.floor(1000 * Math.pow(1.2, progress.level - 1));
                const percentage = (progress.xp / xpToNext) * 100;
                xpBar.style.width = percentage + '%';
            }
        }, 500);
    },

    // =============================================================
    // ... Radial Táctico ...
    // =============================================================

    // 1. Función para mostrar el menú
    showRadialMenu: function(unit, screenX, screenY) {
        // Mostrar menú radial
        const container = document.getElementById('radialMenuContainer');
        if (!container) {
            console.error('[RADIAL MENU] No se encontró radialMenuContainer');
            return;
        }

        container.innerHTML = '';
        
        // Calcular tamaño del hex (en pantalla con zoom aplicado)
        let hexSizeOnScreen = 36;
        if (unit && unit.element) {
            try {
                const rect = unit.element.getBoundingClientRect();
                hexSizeOnScreen = Math.max(rect.width || 36, rect.height || 36);
            } catch (e) { /* ignore */ }
        }

        // Tamaños fijos pequeños (no escalan con zoom para evitar botones gigantes)
        const buttonSize = 15.4;  // Tamaño fijo 15.4px (10% más grande que 14px)
        const containerSize = Math.round(hexSizeOnScreen * 1.0);

        // Radio: proporción del hex en pantalla para separar los botones
        const baseRadius = Math.round(hexSizeOnScreen * 0.7);

        // Función para actualizar posición Y tamaños (responde a zoom/pan)
        const updatePositionAndSize = () => {
            if (!unit || !unit.element) return;
            try {
                const rect = unit.element.getBoundingClientRect();
                const newScreenX = rect.left + rect.width / 2;
                const newScreenY = rect.top + rect.height / 2;
                const newHexSize = Math.max(rect.width || 36, rect.height || 36);
                const newRadius = Math.round(newHexSize * 0.7);
                
                // Actualizar posición del contenedor
                const style = container.style;
                style.setProperty('left', `${newScreenX}px`, 'important');
                style.setProperty('top', `${newScreenY}px`, 'important');
                style.setProperty('width', `${newHexSize}px`, 'important');
                style.setProperty('height', `${newHexSize}px`, 'important');
                
                // Actualizar posición de cada botón según el nuevo radio
                const buttons = container.querySelectorAll('.radial-btn');
                const total = buttons.length;
                // Abanico de 120° centrado en 270° (arriba)
                const centerAngle = (270 * Math.PI) / 180; // 270° = arriba
                const fanAngle = (120 * Math.PI) / 180; // 120° de apertura
                const angleStep = total > 1 ? fanAngle / (total - 1) : 0;
                const startAngle = centerAngle - (fanAngle / 2); // Comienza en 210°
                const centerOffset = newHexSize / 2;
                
                buttons.forEach((btn, index) => {
                    // Distribuir uniformemente en el abanico de 120° superior
                    const angle = startAngle + (index * angleStep);
                    const x = Math.cos(angle) * newRadius;
                    const y = Math.sin(angle) * newRadius;
                    const btnLeft = centerOffset + x;
                    const btnTop = centerOffset + y;
                    
                    btn.style.setProperty('left', `${btnLeft}px`, 'important');
                    btn.style.setProperty('top', `${btnTop}px`, 'important');
                });
            } catch (e) { /* ignore */ }
        };

        // Aplicar estilos al contenedor
        const style = container.style;
        updatePositionAndSize(); // Posición inicial
        style.setProperty('display', 'block', 'important');
        style.setProperty('position', 'fixed', 'important');
        style.setProperty('z-index', '2001', 'important');
        style.setProperty('width', `${containerSize}px`, 'important');
        style.setProperty('height', `${containerSize}px`, 'important');
        style.setProperty('transform', 'translate(-50%, -50%)', 'important');
        style.setProperty('pointer-events', 'none', 'important');
        style.setProperty('background', 'transparent', 'important');
        style.setProperty('border', 'none', 'important');
        style.setProperty('border-radius', '50%', 'important');
        style.setProperty('visibility', 'visible', 'important');
        style.setProperty('opacity', '1', 'important');
        style.setProperty('overflow', 'visible', 'important');

        this._suppressRadialHideUntil = Date.now() + 150;
        
        // Actualizar posición Y tamaños continuamente (responde a zoom/pan)
        if (typeof window !== 'undefined' && window.intervalManager) {
            this._radialUpdateUsingManager = true;
            this._radialUpdateInterval = 'ui_radialUpdate';
            window.intervalManager.setInterval(this._radialUpdateInterval, updatePositionAndSize, 50);
        } else {
            this._radialUpdateUsingManager = false;
            this._radialUpdateInterval = setInterval(updatePositionAndSize, 50); // Cada 50ms
        }

        // Asegurar que está en body
        if (container.parentElement !== document.body) {
            document.body.appendChild(container);
        }

        // Definir acciones
        const actions = [];
        const isBuilder = unit.regiments.some(r => REGIMENT_TYPES[r.type]?.abilities?.includes("build_road"));
        const hex = board[unit.r]?.[unit.c];
        
        if (isBuilder && hex && hex.owner === unit.player) {
            actions.push({ 
                icon: '🏗️', 
                title: 'Construir', 
                onClick: () => { 
                    hexToBuildOn = { r: unit.r, c: unit.c };
                    if (typeof openBuildStructureModal === "function") openBuildStructureModal(); 
                }
            });
        }

        // NUEVO: Botón de Modo Paint para rutas automáticas
        if (!unit.autoMoveActive) {
            actions.push({ 
                icon: '🎨', 
                title: 'Ruta Auto', 
                onClick: () => {
                    if (typeof AutoMoveManager !== 'undefined') {
                        AutoMoveManager.activatePaintMode(unit);
                        this.hideRadialMenu();
                    }
                }
            });
        } else {
            actions.push({ 
                icon: '🚫', 
                title: 'Cancelar Ruta', 
                onClick: () => {
                    if (typeof AutoMoveManager !== 'undefined') {
                        AutoMoveManager.cancelAutoMove(unit);
                        this.hideRadialMenu();
                    }
                }
            });
        }

        if (unit.regiments.length > 1) {
            actions.push({ 
                icon: '✂️', 
                title: 'Dividir', 
                onClick: () => { 
                    if (typeof prepareSplitOrDisembark === "function") {
                        prepareSplitOrDisembark(unit);
                    } else if (typeof openAdvancedSplitUnitModal === "function") {
                        openAdvancedSplitUnitModal(unit);
                    }
                }
            });
        }

        if (hex && hex.owner !== null && hex.owner !== unit.player) {
            actions.push({ 
                icon: '💰', 
                title: 'Saquear', 
                onClick: () => { 
                    if (typeof RequestPillageAction === "function") RequestPillageAction(); 
                }
            });
        }
        
        if (hex && hex.feature === 'ruins') {
            actions.push({ 
                icon: '🧭', 
                title: 'Explorar', 
                onClick: () => { 
                    if (typeof requestExploreRuins === "function") requestExploreRuins(); 
                }
            });
        }

        const neighbors = getHexNeighbors(unit.r, unit.c);
        for (const n of neighbors) {
            const adjUnit = units.find(u => u.r === n.r && u.c === n.c && u.player === unit.player && u.id !== unit.id);
            if (adjUnit) {
                actions.push({ 
                    icon: '🔗', 
                    title: 'Unir', 
                    onClick: () => {
                        if (typeof RequestMergeUnits === 'function') RequestMergeUnits(unit, adjUnit);
                        else if (typeof mergeUnits === 'function') mergeUnits(unit, adjUnit);
                    }
                });
                break;
            }
        }

        actions.push({ 
            icon: 'ℹ️', 
            title: 'Detalles', 
            onClick: () => { 
                if (typeof openUnitDetailModal === "function") openUnitDetailModal(unit);
            }
        });

        // Crear botones en forma de abanico de 120° superior
        requestAnimationFrame(() => {
            const total = actions.length || 1;
            // Abanico de 120° centrado en 270° (arriba)
            const centerAngle = (270 * Math.PI) / 180; // 270° = arriba
            const fanAngle = (120 * Math.PI) / 180; // 120° de apertura
            const angleStep = total > 1 ? fanAngle / (total - 1) : 0;
            const startAngle = centerAngle - (fanAngle / 2); // Comienza en 210°
            const centerOffset = containerSize / 2;

            actions.forEach((action, index) => {
                // Distribuir uniformemente en el abanico de 120° superior
                const angle = startAngle + (index * angleStep);
                const x = Math.cos(angle) * baseRadius;
                const y = Math.sin(angle) * baseRadius;

                const btn = document.createElement('div');
                btn.className = 'radial-btn';
                btn.innerHTML = action.icon;
                btn.setAttribute('data-title', action.title);

                // Posicionar dentro del contenedor
                const btnLeft = centerOffset + x;
                const btnTop = centerOffset + y;

                // Usar setProperty con 'important' para forzar los estilos
                btn.style.setProperty('position', 'absolute', 'important');
                btn.style.setProperty('left', `${btnLeft}px`, 'important');
                btn.style.setProperty('top', `${btnTop}px`, 'important');
                btn.style.setProperty('width', `${buttonSize}px`, 'important');
                btn.style.setProperty('height', `${buttonSize}px`, 'important');
                btn.style.setProperty('border-radius', '50%', 'important');
                btn.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
                btn.style.setProperty('z-index', '2002', 'important');
                btn.style.setProperty('pointer-events', 'auto', 'important');
                btn.style.setProperty('font-size', `${Math.round(buttonSize * 0.6)}px`, 'important');
                btn.style.setProperty('line-height', `${buttonSize}px`, 'important');
                btn.style.setProperty('display', 'flex', 'important');
                btn.style.setProperty('justify-content', 'center', 'important');
                btn.style.setProperty('align-items', 'center', 'important');

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.hideRadialMenu();
                    action.onClick();
                });

                container.appendChild(btn);
            });
        });

    },

    hideRadialMenu: function() {
        // Ignorar hides que ocurran inmediatamente después de abrir el menú
        if (Date.now() < (this._suppressRadialHideUntil || 0)) {
            return;
        }
        
        // Limpiar el interval de actualización de posición
        if (this._radialUpdateInterval) {
            if (this._radialUpdateUsingManager && typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearInterval(this._radialUpdateInterval);
            } else {
                clearInterval(this._radialUpdateInterval);
            }
            this._radialUpdateInterval = null;
            this._radialUpdateUsingManager = false;
        }
        
        const container = document.getElementById('radialMenuContainer');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    },

};
