// autoMoveManager.js
// Sistema de movimiento automático con modo "paint" para unidades

const AutoMoveManager = {
    // Estado del modo paint
    isPaintModeActive: false,
    currentPaintingUnit: null,
    paintedPath: [], // Array de {r, c}
    
    // Estado de arrastre
    isDragging: false,
    dragStartHex: null,
    lastHoveredHex: null,
    
    // Elementos visuales
    pathElements: [],
    
    /**
     * Inicializa el sistema de movimiento automático
     */
    init() {
        console.log("[AutoMove] Inicializando sistema de movimiento automático...");
        
        // Agregar listeners para mouse
        const gameBoard = document.getElementById('gameBoard');
        if (gameBoard) {
            gameBoard.addEventListener('mousedown', this.onMouseDown.bind(this));
            gameBoard.addEventListener('mousemove', this.onMouseMove.bind(this));
            gameBoard.addEventListener('mouseup', this.onMouseUp.bind(this));
            gameBoard.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        }
        
        // Agregar listeners para touch
        if (gameBoard) {
            gameBoard.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            gameBoard.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            gameBoard.addEventListener('touchend', this.onTouchEnd.bind(this));
            gameBoard.addEventListener('touchcancel', this.onTouchCancel.bind(this));
        }
        
        console.log("[AutoMove] Sistema inicializado correctamente");
    },
    
    /**
     * Activa el modo paint para una unidad
     */
    activatePaintMode(unit) {
        if (!unit) {
            console.error("[AutoMove] No se puede activar modo paint sin unidad");
            return false;
        }
        
        this.isPaintModeActive = true;
        this.currentPaintingUnit = unit;
        this.paintedPath = [];
        this.clearPathVisuals();
        
        logMessage(`Modo paint activado para ${unit.name}. Mantén presionado y arrastra para dibujar la ruta.`, "info");
        console.log(`[AutoMove] Modo paint activado para unidad ${unit.id}`);
        
        return true;
    },
    
    /**
     * Desactiva el modo paint
     */
    deactivatePaintMode() {
        this.isPaintModeActive = false;
        this.currentPaintingUnit = null;
        this.isDragging = false;
        this.dragStartHex = null;
        this.lastHoveredHex = null;
        this.clearPathVisuals();
        console.log("[AutoMove] Modo paint desactivado");
    },
    
    /**
     * Maneja el evento mousedown
     */
    onMouseDown(event) {
        if (!this.isPaintModeActive || !this.currentPaintingUnit) return;
        
        const hex = this.getHexFromMouseEvent(event);
        if (!hex) return;
        
        // Verificar que el clic inicial es sobre la unidad
        if (hex.r === this.currentPaintingUnit.r && hex.c === this.currentPaintingUnit.c) {
            this.isDragging = true;
            this.dragStartHex = { r: hex.r, c: hex.c };
            this.paintedPath = [{ r: hex.r, c: hex.c }];
            this.lastHoveredHex = { r: hex.r, c: hex.c };
            
            event.preventDefault();
            console.log(`[AutoMove] Inicio de arrastre en (${hex.r}, ${hex.c})`);
        }
    },
    
    /**
     * Maneja el evento mousemove
     */
    onMouseMove(event) {
        if (!this.isPaintModeActive || !this.isDragging || !this.currentPaintingUnit) return;
        
        const hex = this.getHexFromMouseEvent(event);
        if (!hex) return;
        
        // Si es el mismo hex que el anterior, no hacer nada
        if (this.lastHoveredHex && hex.r === this.lastHoveredHex.r && hex.c === this.lastHoveredHex.c) {
            return;
        }
        
        // Verificar si es un hex adyacente al último
        const lastHex = this.paintedPath[this.paintedPath.length - 1];
        if (this.areHexesAdjacent(lastHex, hex)) {
            // Verificar que no estemos retrocediendo (evitar loops)
            const isDuplicate = this.paintedPath.some(p => p.r === hex.r && p.c === hex.c);
            
            if (!isDuplicate) {
                // Validar que el movimiento es legal
                if (this.isValidPathStep(this.currentPaintingUnit, lastHex, hex)) {
                    this.paintedPath.push({ r: hex.r, c: hex.c });
                    this.updatePathVisuals();
                    this.lastHoveredHex = { r: hex.r, c: hex.c };
                    console.log(`[AutoMove] Ruta extendida a (${hex.r}, ${hex.c})`);
                }
            } else {
                // Si es duplicado, eliminar desde ese punto hacia adelante
                const duplicateIndex = this.paintedPath.findIndex(p => p.r === hex.r && p.c === hex.c);
                if (duplicateIndex > 0 && duplicateIndex < this.paintedPath.length - 1) {
                    this.paintedPath = this.paintedPath.slice(0, duplicateIndex + 1);
                    this.updatePathVisuals();
                    this.lastHoveredHex = { r: hex.r, c: hex.c };
                    console.log(`[AutoMove] Ruta recortada hasta (${hex.r}, ${hex.c})`);
                }
            }
        }
        
        event.preventDefault();
    },
    
    /**
     * Maneja el evento mouseup
     */
    onMouseUp(event) {
        if (!this.isPaintModeActive || !this.isDragging) return;
        
        this.isDragging = false;
        
        // Si hay una ruta pintada, confirmarla
        if (this.paintedPath.length > 1) {
            this.confirmPath();
        } else {
            logMessage("Ruta muy corta. Dibuja una ruta más larga.", "warning");
            this.clearPathVisuals();
            this.paintedPath = [];
        }
        
        event.preventDefault();
    },
    
    /**
     * Maneja el evento cuando el mouse sale del board
     */
    onMouseLeave(event) {
        if (this.isDragging) {
            // Cancelar el arrastre si el mouse sale del tablero
            this.isDragging = false;
            this.clearPathVisuals();
            this.paintedPath = [];
            logMessage("Ruta cancelada (mouse salió del tablero)", "warning");
        }
    },
    
    /**
     * Soporte para touch - touchstart
     */
    onTouchStart(event) {
        if (!this.isPaintModeActive || !this.currentPaintingUnit) return;
        
        const hex = this.getHexFromTouchEvent(event);
        if (!hex) return;
        
        if (hex.r === this.currentPaintingUnit.r && hex.c === this.currentPaintingUnit.c) {
            this.isDragging = true;
            this.dragStartHex = { r: hex.r, c: hex.c };
            this.paintedPath = [{ r: hex.r, c: hex.c }];
            this.lastHoveredHex = { r: hex.r, c: hex.c };
            
            event.preventDefault();
        }
    },
    
    /**
     * Soporte para touch - touchmove
     */
    onTouchMove(event) {
        if (!this.isPaintModeActive || !this.isDragging || !this.currentPaintingUnit) return;
        
        const hex = this.getHexFromTouchEvent(event);
        if (!hex) return;
        
        if (this.lastHoveredHex && hex.r === this.lastHoveredHex.r && hex.c === this.lastHoveredHex.c) {
            return;
        }
        
        const lastHex = this.paintedPath[this.paintedPath.length - 1];
        if (this.areHexesAdjacent(lastHex, hex)) {
            const isDuplicate = this.paintedPath.some(p => p.r === hex.r && p.c === hex.c);
            
            if (!isDuplicate) {
                if (this.isValidPathStep(this.currentPaintingUnit, lastHex, hex)) {
                    this.paintedPath.push({ r: hex.r, c: hex.c });
                    this.updatePathVisuals();
                    this.lastHoveredHex = { r: hex.r, c: hex.c };
                }
            }
        }
        
        event.preventDefault();
    },
    
    /**
     * Soporte para touch - touchend
     */
    onTouchEnd(event) {
        if (!this.isPaintModeActive || !this.isDragging) return;
        
        this.isDragging = false;
        
        if (this.paintedPath.length > 1) {
            this.confirmPath();
        } else {
            logMessage("Ruta muy corta. Dibuja una ruta más larga.", "warning");
            this.clearPathVisuals();
            this.paintedPath = [];
        }
        
        event.preventDefault();
    },
    
    /**
     * Soporte para touch - touchcancel
     */
    onTouchCancel(event) {
        this.isDragging = false;
        this.clearPathVisuals();
        this.paintedPath = [];
    },
    
    /**
     * Obtiene las coordenadas del hex desde un evento de mouse
     */
    getHexFromMouseEvent(event) {
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) return null;
        
        const rect = gameBoard.getBoundingClientRect();
        const x = event.clientX - rect.left + gameBoard.scrollLeft;
        const y = event.clientY - rect.top + gameBoard.scrollTop;
        
        return this.pixelToHex(x, y);
    },
    
    /**
     * Obtiene las coordenadas del hex desde un evento de touch
     */
    getHexFromTouchEvent(event) {
        if (!event.touches || event.touches.length === 0) return null;
        
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) return null;
        
        const touch = event.touches[0];
        const rect = gameBoard.getBoundingClientRect();
        const x = touch.clientX - rect.left + gameBoard.scrollLeft;
        const y = touch.clientY - rect.top + gameBoard.scrollTop;
        
        return this.pixelToHex(x, y);
    },
    
    /**
     * Convierte coordenadas de píxel a coordenadas de hex
     */
    pixelToHex(x, y) {
        if (typeof HEX_WIDTH === 'undefined' || typeof HEX_VERT_SPACING === 'undefined') {
            console.error("[AutoMove] Constantes de hex no definidas");
            return null;
        }
        
        // Cálculo inverso aproximado
        const row = Math.floor(y / HEX_VERT_SPACING);
        const col = Math.floor((x - (row % 2 !== 0 ? HEX_WIDTH / 2 : 0)) / HEX_WIDTH);
        
        // Verificar que el hex existe en el board
        if (board[row] && board[row][col]) {
            return { r: row, c: col };
        }
        
        return null;
    },
    
    /**
     * Verifica si dos hexes son adyacentes
     */
    areHexesAdjacent(hex1, hex2) {
        if (!hex1 || !hex2) return false;
        
        const neighbors = getHexNeighbors(hex1.r, hex1.c);
        return neighbors.some(n => n.r === hex2.r && n.c === hex2.c);
    },
    
    /**
     * Valida si un paso en la ruta es legal
     */
    isValidPathStep(unit, fromHex, toHex) {
        if (!unit || !fromHex || !toHex) return false;
        
        // Usar la función existente isValidMove
        if (typeof isValidMove === 'function') {
            return isValidMove(unit, toHex.r, toHex.c, false);
        }
        
        // Validación básica si isValidMove no está disponible
        const targetHexData = board[toHex.r]?.[toHex.c];
        if (!targetHexData) return false;
        
        // No puede haber unidad en el destino
        const unitOnHex = getUnitOnHex(toHex.r, toHex.c);
        if (unitOnHex) return false;
        
        // Verificar terreno transitable
        const unitRegimentData = REGIMENT_TYPES[unit.regiments[0]?.type];
        if (unitRegimentData?.is_naval) {
            return targetHexData.terrain === 'water';
        } else {
            return targetHexData.terrain !== 'water';
        }
    },
    
    /**
     * Actualiza la visualización de la ruta pintada
     */
    updatePathVisuals() {
        this.clearPathVisuals();
        
        for (let i = 0; i < this.paintedPath.length; i++) {
            const hex = this.paintedPath[i];
            const hexElement = board[hex.r]?.[hex.c]?.element;
            
            if (hexElement) {
                // Crear marcador visual
                const pathMarker = document.createElement('div');
                pathMarker.classList.add('auto-path-marker');
                
                // Diferentes estilos para inicio, fin y puntos intermedios
                if (i === 0) {
                    pathMarker.classList.add('path-start');
                    pathMarker.textContent = '🎯';
                } else if (i === this.paintedPath.length - 1) {
                    pathMarker.classList.add('path-end');
                    pathMarker.textContent = '🏁';
                } else {
                    pathMarker.classList.add('path-middle');
                    pathMarker.textContent = i;
                }
                
                pathMarker.style.position = 'absolute';
                pathMarker.style.left = '50%';
                pathMarker.style.top = '50%';
                pathMarker.style.transform = 'translate(-50%, -50%)';
                pathMarker.style.zIndex = '5';
                pathMarker.style.pointerEvents = 'none';
                pathMarker.style.fontSize = '14px';
                pathMarker.style.fontWeight = 'bold';
                pathMarker.style.textShadow = '0 0 3px black, 0 0 5px black';
                
                hexElement.appendChild(pathMarker);
                this.pathElements.push(pathMarker);
                
                // Resaltar el hexágono
                hexElement.classList.add('auto-path-highlight');
            }
        }
    },
    
    /**
     * Limpia todos los elementos visuales de la ruta
     */
    clearPathVisuals() {
        this.pathElements.forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        this.pathElements = [];
        
        // Limpiar clases de resaltado
        const allHexes = document.querySelectorAll('.auto-path-highlight');
        allHexes.forEach(hex => hex.classList.remove('auto-path-highlight'));
    },
    
    /**
     * Confirma la ruta pintada y la asigna a la unidad
     */
    confirmPath() {
        if (!this.currentPaintingUnit || this.paintedPath.length < 2) {
            console.error("[AutoMove] No se puede confirmar ruta inválida");
            return;
        }
        
        const unit = this.currentPaintingUnit;
        
        // Guardar la ruta en la unidad (quitamos el primer elemento que es la posición actual)
        unit.autoMovePath = this.paintedPath.slice(1);
        unit.autoMoveCurrentStep = 0;
        unit.autoMoveActive = true;
        
        logMessage(`Ruta automática confirmada para ${unit.name} (${unit.autoMovePath.length} pasos)`, "success");
        console.log(`[AutoMove] Ruta confirmada:`, unit.autoMovePath);
        
        // Visualizar la ruta confirmada de forma permanente
        this.showConfirmedPath(unit);
        
        // Desactivar modo paint
        this.deactivatePaintMode();
        
        // Deseleccionar unidad
        if (typeof deselectUnit === 'function') {
            deselectUnit();
        }
    },
    
    /**
     * Muestra la ruta confirmada de una unidad
     */
    showConfirmedPath(unit) {
        if (!unit || !unit.autoMovePath || unit.autoMovePath.length === 0) return;
        
        // Limpiar visualización anterior
        this.clearConfirmedPathVisuals(unit);
        
        unit.autoMoveVisuals = [];
        const startPoint = { r: unit.r, c: unit.c };
        const fullPath = [startPoint, ...unit.autoMovePath];
        
        for (let i = 0; i < fullPath.length; i++) {
            const hex = fullPath[i];
            const hexElement = board[hex.r]?.[hex.c]?.element;
            
            if (hexElement) {
                const marker = document.createElement('div');
                marker.classList.add('auto-path-confirmed');
                
                if (i === 0) {
                    marker.textContent = '📍';
                } else if (i === fullPath.length - 1) {
                    marker.textContent = '⭐';
                } else {
                    marker.textContent = '→';
                }
                
                marker.style.position = 'absolute';
                marker.style.left = '50%';
                marker.style.top = '10%';
                marker.style.transform = 'translateX(-50%)';
                marker.style.zIndex = '4';
                marker.style.pointerEvents = 'none';
                marker.style.fontSize = '16px';
                marker.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.8))';
                
                hexElement.appendChild(marker);
                unit.autoMoveVisuals.push(marker);
            }
        }
    },
    
    /**
     * Limpia la visualización de ruta confirmada de una unidad
     */
    clearConfirmedPathVisuals(unit) {
        if (!unit || !unit.autoMoveVisuals) return;
        
        unit.autoMoveVisuals.forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        unit.autoMoveVisuals = [];
    },
    
    /**
     * Cancela la ruta automática de una unidad
     */
    cancelAutoMove(unit) {
        if (!unit) return;
        
        unit.autoMovePath = null;
        unit.autoMoveCurrentStep = 0;
        unit.autoMoveActive = false;
        
        this.clearConfirmedPathVisuals(unit);
        
        logMessage(`Ruta automática cancelada para ${unit.name}`, "info");
        console.log(`[AutoMove] Ruta cancelada para unidad ${unit.id}`);
    },
    
    /**
     * Ejecuta un paso de movimiento automático para una unidad
     */
    async executeAutoMoveStep(unit) {
        if (!unit || !unit.autoMoveActive || !unit.autoMovePath || unit.autoMovePath.length === 0) {
            return false;
        }
        
        // Verificar que es el turno del jugador
        if (unit.player !== gameState.currentPlayer) {
            return false;
        }
        
        // Verificar que la unidad no ha actuado este turno
        if (unit.hasMoved || unit.hasAttacked) {
            console.log(`[AutoMove] Unidad ${unit.id} ya ha actuado este turno`);
            return false;
        }
        
        // Obtener el siguiente destino
        const nextStep = unit.autoMovePath[unit.autoMoveCurrentStep];
        if (!nextStep) {
            // Ruta completada
            this.cancelAutoMove(unit);
            logMessage(`${unit.name} ha completado su ruta automática`, "success");
            return false;
        }
        
        console.log(`[AutoMove] Ejecutando paso ${unit.autoMoveCurrentStep + 1}/${unit.autoMovePath.length} para ${unit.name}`);
        
        // Validar que el movimiento sigue siendo válido
        if (!this.isValidPathStep(unit, { r: unit.r, c: unit.c }, nextStep)) {
            logMessage(`Ruta bloqueada para ${unit.name}. Movimiento automático cancelado.`, "warning");
            this.cancelAutoMove(unit);
            return false;
        }
        
        // Ejecutar el movimiento
        try {
            if (typeof RequestMoveUnit === 'function' && isNetworkGame()) {
                await RequestMoveUnit(unit, nextStep.r, nextStep.c);
            } else if (typeof _executeMoveUnit === 'function') {
                await _executeMoveUnit(unit, nextStep.r, nextStep.c);
            } else if (typeof moveUnit === 'function') {
                await moveUnit(unit, nextStep.r, nextStep.c);
            } else {
                console.error("[AutoMove] No hay función de movimiento disponible");
                this.cancelAutoMove(unit);
                return false;
            }
            
            // Avanzar al siguiente paso
            unit.autoMoveCurrentStep++;
            
            // Actualizar visualización
            this.updateConfirmedPathProgress(unit);
            
            return true;
        } catch (error) {
            console.error(`[AutoMove] Error al mover unidad:`, error);
            this.cancelAutoMove(unit);
            return false;
        }
    },
    
    /**
     * Actualiza la visualización del progreso de una ruta confirmada
     */
    updateConfirmedPathProgress(unit) {
        if (!unit || !unit.autoMoveActive) return;
        
        // Re-renderizar la ruta para mostrar progreso
        this.clearConfirmedPathVisuals(unit);
        
        if (unit.autoMoveCurrentStep < unit.autoMovePath.length) {
            this.showConfirmedPath(unit);
        } else {
            // Ruta completada
            this.cancelAutoMove(unit);
        }
    },
    
    /**
     * Procesa todos los movimientos automáticos al inicio del turno
     */
    async processAutoMovesForCurrentPlayer() {
        if (!gameState || !units) return;
        
        const currentPlayerUnits = units.filter(u => 
            u.player === gameState.currentPlayer && 
            u.autoMoveActive && 
            u.autoMovePath && 
            u.autoMovePath.length > 0
        );
        
        if (currentPlayerUnits.length === 0) return;
        
        console.log(`[AutoMove] Procesando ${currentPlayerUnits.length} unidades con movimiento automático`);
        
        for (const unit of currentPlayerUnits) {
            const success = await this.executeAutoMoveStep(unit);
            if (success) {
                // Pequeña pausa entre movimientos para visualización
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    },
    
    /**
     * Limpia todas las rutas automáticas al finalizar el turno
     */
    cleanupAutoMovesForEndTurn() {
        if (!units) return;
        
        units.forEach(unit => {
            if (unit.autoMoveActive && unit.hasMoved) {
                // Si la unidad se movió este turno, resetear flags pero mantener la ruta
                unit.hasMoved = false;
                unit.hasAttacked = false;
            }
        });
    }
};

// Estilos CSS para el sistema de movimiento automático
const autoMoveStyles = `
.auto-path-marker {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 150, 255, 0.7);
    border: 2px solid white;
    animation: pulse 1s infinite;
}

.auto-path-highlight {
    box-shadow: inset 0 0 20px rgba(0, 150, 255, 0.5) !important;
}

.auto-path-confirmed {
    animation: float 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.2); }
}

@keyframes float {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-5px); }
}

.path-start {
    background: rgba(0, 255, 0, 0.8) !important;
}

.path-end {
    background: rgba(255, 215, 0, 0.8) !important;
}

.path-middle {
    background: rgba(0, 150, 255, 0.7) !important;
    font-size: 10px !important;
}
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = autoMoveStyles;
    document.head.appendChild(styleSheet);
}

console.log("autoMoveManager.js CARGADO");
