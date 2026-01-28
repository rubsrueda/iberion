// autoMoveManager.js
// Sistema de movimiento automático con modo "paint" para unidades
// Versión con logs extensivos de depuración

const AutoMoveManager = {
    // Estado del modo paint
    isPaintModeActive: false,
    currentPaintingUnit: null,
    paintedPath: [], // Array de {r, c}
    
    // Control de timeout
    lastClickTime: null,
    autoConfirmTimeout: null,
    autoConfirmUsingManager: false,
    timeoutDuration: 2000, // 2 segundos
    
    // Elementos visuales
    pathElements: [],
    confirmButton: null,
    clickHandler: null,
    
    /**
     * Inicializa el sistema de movimiento automático
     */
    init() {
        console.log("[AutoMove] Inicializando sistema de movimiento automático...");
        console.log("[AutoMove] Sistema inicializado correctamente");
    },
    
    /**
     * Activa el modo paint para una unidad
     */
    activatePaintMode(unit) {
        if (!unit) {
            console.error("[AutoMove] ❌ No se puede activar modo paint sin unidad");
            return false;
        }
        
        console.log(`%c[AutoMove] 🎨 ACTIVANDO MODO PAINT`, 'background: #4CAF50; color: white; font-weight: bold; padding: 5px;');
        console.log(`[AutoMove] Unidad: ${unit.name} (ID: ${unit.id}) en posición (${unit.r}, ${unit.c})`);
        
        this.isPaintModeActive = true;
        this.currentPaintingUnit = unit;
        this.paintedPath = [{ r: unit.r, c: unit.c }]; // Empezar con la posición actual
        this.lastClickTime = Date.now();
        this.clearPathVisuals();
        
        console.log(`[AutoMove] ✓ Estado isPaintModeActive: ${this.isPaintModeActive}`);
        console.log(`[AutoMove] ✓ Ruta inicial: 1 paso en (${unit.r}, ${unit.c})`);
        
        // Crear overlay de instrucciones
        this.showPaintModeUI();
        console.log(`[AutoMove] ✓ UI overlay creada`);
        
        // Iniciar temporizador de auto-confirmación
        this.resetAutoConfirmTimer();
        console.log(`[AutoMove] ✓ Timer de auto-confirmación iniciado (${this.timeoutDuration}ms)`);
        
        // Instalar interceptor de clics en el mapa
        this.installClickInterceptor();
        console.log(`[AutoMove] ✓ Interceptor de clics instalado`);
        
        logMessage(`Modo Ruta Automática: Haz clic en cada hexágono. Auto-confirma en 2s sin clics.`, "info");
        
        // Actualizar visualización inicial
        this.updatePathVisuals();
        console.log(`[AutoMove] ✓ Visualización inicial actualizada`);
        
        console.log(`%c[AutoMove] ✅ MODO PAINT COMPLETAMENTE ACTIVO`, 'background: #4CAF50; color: white; font-weight: bold; padding: 5px;');
        
        return true;
    },
    
    /**
     * Desactiva el modo paint
     */
    deactivatePaintMode() {
        console.log(`%c[AutoMove] 🛑 DESACTIVANDO MODO PAINT`, 'background: #f44336; color: white; font-weight: bold; padding: 5px;');
        
        this.isPaintModeActive = false;
        this.currentPaintingUnit = null;
        this.lastClickTime = null;
        this.clearPathVisuals();
        this.hidePaintModeUI();
        this.removeClickInterceptor();
        
        // Cancelar temporizador
        if (this.autoConfirmTimeout) {
            if (this.autoConfirmUsingManager && typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this.autoConfirmTimeout);
            } else {
                clearTimeout(this.autoConfirmTimeout);
            }
            this.autoConfirmTimeout = null;
            this.autoConfirmUsingManager = false;
            console.log("[AutoMove] ✓ Timer cancelado");
        }
        
        console.log("[AutoMove] ✓ Modo paint desactivado completamente");
    },
    
    /**
     * Instala un interceptor de clics en el mapa
     */
    installClickInterceptor() {
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) {
            console.error("[AutoMove] ❌ No se encontró gameBoard, no se puede instalar interceptor");
            return;
        }
        
        console.log("[AutoMove] Instalando interceptor de clics...");
        this.clickHandler = this.handlePaintClick.bind(this);
        
        // Instalar en múltiples eventos para máxima captura
        gameBoard.addEventListener('click', this.clickHandler, true); // true = fase de captura
        gameBoard.addEventListener('mousedown', this.clickHandler, true);
        gameBoard.addEventListener('touchstart', this.clickHandler, true);
        
        console.log("[AutoMove] ✓ Interceptor instalado en click, mousedown y touchstart");
    },
    
    /**
     * Remueve el interceptor de clics
     */
    removeClickInterceptor() {
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard || !this.clickHandler) {
            console.log("[AutoMove] No hay interceptor para remover");
            return;
        }
        
        console.log("[AutoMove] Removiendo interceptor de clics...");
        gameBoard.removeEventListener('click', this.clickHandler, true);
        gameBoard.removeEventListener('mousedown', this.clickHandler, true);
        gameBoard.removeEventListener('touchstart', this.clickHandler, true);
        this.clickHandler = null;
        console.log("[AutoMove] ✓ Interceptor removido");
    },
    
    /**
     * Maneja clics en modo paint
     */
    handlePaintClick(event) {
        console.log(`%c[AutoMove] 🖱️ EVENTO CAPTURADO: ${event.type}`, 'background: #2196F3; color: white; font-weight: bold; padding: 3px;');
        console.log(`[AutoMove] isPaintModeActive: ${this.isPaintModeActive}`);
        console.log(`[AutoMove] currentPaintingUnit: ${this.currentPaintingUnit ? this.currentPaintingUnit.name : 'null'}`);
        
        if (!this.isPaintModeActive || !this.currentPaintingUnit) {
            console.warn("[AutoMove] ⚠️ Evento capturado pero modo paint no está activo, ignorando");
            return;
        }
        
        console.log("[AutoMove] ✓ Modo paint activo, procesando clic...");
        
        // Evitar que el clic llegue a otros handlers
        event.stopPropagation();
        event.stopImmediatePropagation();
        event.preventDefault();
        
        console.log("[AutoMove] ✓ Propagación detenida");
        
        const hex = this.getHexFromMouseEvent(event);
        console.log(`[AutoMove] Hex detectado: ${hex ? `(${hex.r}, ${hex.c})` : 'null'}`);
        
        if (!hex) {
            console.warn("[AutoMove] ⚠️ No se pudo determinar el hex clickeado");
            return;
        }
        
        // Resetear temporizador
        this.lastClickTime = Date.now();
        this.resetAutoConfirmTimer();
        console.log("[AutoMove] ✓ Timer reseteado");
        
        // Obtener el último hexágono en la ruta
        const lastHex = this.paintedPath[this.paintedPath.length - 1];
        console.log(`[AutoMove] Último hex en ruta: (${lastHex.r}, ${lastHex.c})`);
        
        // Verificar si es el mismo hex (ignorar)
        if (hex.r === lastHex.r && hex.c === lastHex.c) {
            console.log("[AutoMove] ℹ️ Mismo hex que el último, ignorando");
            return;
        }
        
        // Verificar si es un hex adyacente
        const isAdjacent = this.areHexesAdjacent(lastHex, hex);
        console.log(`[AutoMove] ¿Es adyacente? ${isAdjacent}`);
        
        if (!isAdjacent) {
            logMessage("Solo puedes seleccionar hexágonos adyacentes", "warning");
            console.warn("[AutoMove] ❌ Hex no es adyacente");
            return;
        }
        
        // Verificar si ya está en la ruta (permitir retroceder eliminando)
        const existingIndex = this.paintedPath.findIndex(p => p.r === hex.r && p.c === hex.c);
        console.log(`[AutoMove] ¿Ya está en ruta? ${existingIndex !== -1 ? 'Sí, índice ' + existingIndex : 'No'}`);
        
        if (existingIndex !== -1) {
            // Retroceder hasta ese punto
            this.paintedPath = this.paintedPath.slice(0, existingIndex + 1);
            this.updatePathVisuals();
            console.log(`[AutoMove] 🔙 Ruta retrocedida hasta (${hex.r}, ${hex.c})`);
            logMessage(`Ruta retrocedida. Pasos: ${this.paintedPath.length - 1}`, "info");
            return;
        }
        
        // Validar que el movimiento es legal
        const isValid = this.isValidPathStep(this.currentPaintingUnit, lastHex, hex);
        console.log(`[AutoMove] ¿Es válido el movimiento? ${isValid}`);
        
        if (!isValid) {
            logMessage("Ese hexágono no es válido para la ruta", "warning");
            console.warn("[AutoMove] ❌ Movimiento no válido");
            return;
        }
        
        // Agregar a la ruta
        this.paintedPath.push({ r: hex.r, c: hex.c });
        this.updatePathVisuals();
        console.log(`%c[AutoMove] ✅ PASO AGREGADO: (${hex.r}, ${hex.c}). Total: ${this.paintedPath.length} pasos`, 'background: #4CAF50; color: white; font-weight: bold; padding: 3px;');
        logMessage(`Paso ${this.paintedPath.length - 1} agregado a la ruta`, "success");
    },
    
    /**
     * Resetea el temporizador de auto-confirmación
     */
    resetAutoConfirmTimer() {
        // Cancelar temporizador anterior
        if (this.autoConfirmTimeout) {
            if (this.autoConfirmUsingManager && typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearTimeout(this.autoConfirmTimeout);
            } else {
                clearTimeout(this.autoConfirmTimeout);
            }
        }
        
        // Crear nuevo temporizador
        const confirmCallback = () => {
            if (this.isPaintModeActive && this.paintedPath.length > 1) {
                console.log("[AutoMove] ⏰ Timeout alcanzado, confirmando ruta automáticamente");
                this.confirmPath();
            }
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            this.autoConfirmUsingManager = true;
            this.autoConfirmTimeout = 'autoMove_confirm';
            window.intervalManager.setTimeout(this.autoConfirmTimeout, confirmCallback, this.timeoutDuration);
        } else {
            this.autoConfirmUsingManager = false;
            this.autoConfirmTimeout = setTimeout(confirmCallback, this.timeoutDuration);
        }
    },
    
    /**
     * Muestra la UI del modo paint
     */
    showPaintModeUI() {
        // Crear overlay con instrucciones y botón de confirmar
        const overlay = document.createElement('div');
        overlay.id = 'paintModeOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 10000;
            font-size: 14px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            border: 2px solid #4CAF50;
        `;
        
        overlay.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>🎨 Modo Ruta Automática</strong><br>
                <span style="font-size: 12px;">Haz clic en cada hexágono para crear la ruta</span>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="confirmPathBtn" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: bold;
                ">✓ Confirmar</button>
                <button id="cancelPathBtn" style="
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: bold;
                ">✗ Cancelar</button>
            </div>
            <div id="pathStepsCounter" style="margin-top: 8px; font-size: 11px; color: #aaa;">
                Pasos: 0
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Agregar listeners a los botones
        document.getElementById('confirmPathBtn').addEventListener('click', () => {
            console.log("[AutoMove] 🔘 Botón Confirmar presionado");
            this.confirmPath();
        });
        
        document.getElementById('cancelPathBtn').addEventListener('click', () => {
            console.log("[AutoMove] 🔘 Botón Cancelar presionado");
            this.cancelPaintMode();
        });
    },
    
    /**
     * Oculta la UI del modo paint
     */
    hidePaintModeUI() {
        const overlay = document.getElementById('paintModeOverlay');
        if (overlay) {
            overlay.remove();
            console.log("[AutoMove] ✓ UI overlay removida");
        }
    },
    
    /**
     * Actualiza el contador de pasos en la UI
     */
    updateStepsCounter() {
        const counter = document.getElementById('pathStepsCounter');
        if (counter) {
            const steps = Math.max(0, this.paintedPath.length - 1);
            counter.textContent = `Pasos: ${steps}`;
        }
    },
    
    /**
     * Cancela el modo paint sin confirmar
     */
    cancelPaintMode() {
        console.log("[AutoMove] ❌ Modo de ruta cancelado por el usuario");
        logMessage("Modo de ruta automática cancelado", "info");
        this.deactivatePaintMode();
    },
    
    /**
     * Obtiene las coordenadas del hex desde un evento de mouse o touch
     * Método mejorado: busca el elemento hex en el DOM desde el target del evento
     */
    getHexFromMouseEvent(event) {
        // Determinar si es touch o mouse
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) {
            // Evento touch
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
            console.log(`[AutoMove] Evento TOUCH detectado`);
        } else if (event.clientX !== undefined && event.clientY !== undefined) {
            // Evento mouse
            clientX = event.clientX;
            clientY = event.clientY;
            console.log(`[AutoMove] Evento MOUSE detectado`);
        } else {
            console.error("[AutoMove] ❌ No se pudieron obtener coordenadas del evento");
            return null;
        }
        
        console.log(`[AutoMove] Coordenadas del clic: clientX=${clientX}, clientY=${clientY}`);
        
        // Usar elementFromPoint para encontrar el elemento en las coordenadas del clic
        const elementAtPoint = document.elementFromPoint(clientX, clientY);
        console.log(`[AutoMove] Elemento en punto:`, elementAtPoint?.className || elementAtPoint?.tagName);
        
        // Buscar el hexágono en el elemento o sus ancestros
        let hexElement = elementAtPoint;
        let attempts = 0;
        while (hexElement && attempts < 10) {
            console.log(`[AutoMove] Intento ${attempts + 1}: elemento`, hexElement.className || hexElement.tagName);
            
            // Verificar si este elemento es un hex
            if (hexElement.classList && hexElement.classList.contains('hex')) {
                console.log(`[AutoMove] ✓ Elemento hex encontrado en intento ${attempts + 1}`);
                
                // Intentar obtener las coordenadas desde atributos data
                const dataR = hexElement.getAttribute('data-r');
                const dataC = hexElement.getAttribute('data-c');
                
                console.log(`[AutoMove] data-r="${dataR}", data-c="${dataC}"`);
                
                if (dataR !== null && dataC !== null) {
                    const r = parseInt(dataR);
                    const c = parseInt(dataC);
                    console.log(`[AutoMove] ✓ Coordenadas obtenidas desde atributos: (${r}, ${c})`);
                    
                    // Verificar que existan en el board
                    if (board[r] && board[r][c]) {
                        return { r, c };
                    } else {
                        console.warn(`[AutoMove] ⚠️ Hex (${r}, ${c}) no existe en board`);
                    }
                }
                
                // Si el hex no tiene atributos data, buscar por elemento
                console.log(`[AutoMove] Buscando hex por elemento en board...`);
                return this.findHexByElement(hexElement);
            }
            
            hexElement = hexElement.parentElement;
            attempts++;
        }
        
        console.warn(`[AutoMove] ⚠️ No se encontró elemento hex en el punto del clic después de ${attempts} intentos`);
        return this.findHexInBoard(clientX, clientY);
    },
    
    /**
     * Busca un hex en el board por su elemento DOM
     */
    findHexByElement(hexElement) {
        if (!hexElement) return null;
        
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c] && board[r][c].element === hexElement) {
                    console.log(`[AutoMove] ✓ Hex encontrado por elemento: (${r}, ${c})`);
                    return { r, c };
                }
            }
        }
        
        console.warn(`[AutoMove] ⚠️ No se encontró hex por elemento en board`);
        return null;
    },
    
    /**
     * Busca un hex en el board por coordenadas de pantalla (fallback)
     */
    findHexInBoard(clientX, clientY) {
        console.log(`[AutoMove] Usando método fallback para encontrar hex...`);
        
        // Buscar todos los elementos hex y ver cuál está más cerca del clic
        let closestHex = null;
        let closestDistance = Infinity;
        
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c] && board[r][c].element) {
                    const hexEl = board[r][c].element;
                    const rect = hexEl.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const distance = Math.sqrt(
                        Math.pow(clientX - centerX, 2) + 
                        Math.pow(clientY - centerY, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestHex = { r, c };
                    }
                }
            }
        }
        
        if (closestHex) {
            console.log(`[AutoMove] ✓ Hex más cercano encontrado: (${closestHex.r}, ${closestHex.c}) a ${Math.round(closestDistance)}px`);
        } else {
            console.warn(`[AutoMove] ⚠️ No se pudo encontrar ningún hex cercano`);
        }
        
        return closestHex;
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
        if (!unit || !fromHex || !toHex) {
            console.log(`[AutoMove] Validación fallida: datos inválidos`);
            return false;
        }
        
        const targetHexData = board[toHex.r]?.[toHex.c];
        if (!targetHexData) {
            console.log(`[AutoMove] Validación fallida: hex no existe`);
            return false;
        }
        
        console.log(`[AutoMove] 🔍 Validando movimiento a (${toHex.r}, ${toHex.c})`);
        console.log(`[AutoMove] Terreno: ${targetHexData.terrain}`);
        
        // Verificar que el hex sea adyacente (básico para cada paso)
        const neighbors = getHexNeighbors(fromHex.r, fromHex.c);
        const isAdjacent = neighbors.some(n => n.r === toHex.r && n.c === toHex.c);
        if (!isAdjacent) {
            console.log(`[AutoMove] Validación fallida: no es adyacente`);
            return false;
        }
        
        // Verificar tipo de unidad (naval vs terrestre)
        const unitRegimentData = REGIMENT_TYPES[unit.regiments[0]?.type];
        const isNaval = unitRegimentData?.is_naval || false;
        console.log(`[AutoMove] Unidad naval: ${isNaval}`);
        
        // Obtener tipo de terreno
        const terrainType = TERRAIN_TYPES[targetHexData.terrain];
        console.log(`[AutoMove] TerrainType encontrado:`, terrainType);
        
        if (!terrainType) {
            console.log(`[AutoMove] Validación fallida: tipo de terreno desconocido (${targetHexData.terrain})`);
            return false;
        }
        
        console.log(`[AutoMove] isImpassableForLand: ${terrainType.isImpassableForLand}`);
        console.log(`[AutoMove] isImpassableForNaval: ${terrainType.isImpassableForNaval}`);
        
        // Verificar si el terreno es transitable para este tipo de unidad
        if (isNaval && terrainType.isImpassableForNaval) {
            console.log(`[AutoMove] Validación fallida: terreno intransitable para unidades navales (${targetHexData.terrain})`);
            return false;
        }
        
        if (!isNaval && terrainType.isImpassableForLand) {
            console.log(`[AutoMove] Validación fallida: terreno intransitable para unidades terrestres (${targetHexData.terrain})`);
            return false;
        }
        
        // Permitir hexágonos con unidades propias (podría moverse antes de que lleguemos)
        // Solo rechazar si hay una unidad enemiga
        const unitOnHex = getUnitOnHex(toHex.r, toHex.c);
        if (unitOnHex && unitOnHex.player !== unit.player) {
            console.log(`[AutoMove] Validación fallida: unidad enemiga en destino`);
            return false;
        }
        
        // Verificar si es territorio enemigo con ciudad
        if (targetHexData.owner && targetHexData.owner !== unit.player && targetHexData.isCity) {
            console.log(`[AutoMove] Validación fallida: ciudad enemiga`);
            return false;
        }
        
        console.log(`[AutoMove] ✓ Validación exitosa para (${toHex.r}, ${toHex.c})`);
        return true;
    },
    
    /**
     * Actualiza la visualización de la ruta pintada
     */
    updatePathVisuals() {
        this.clearPathVisuals();
        this.updateStepsCounter();
        
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
            console.error("[AutoMove] ❌ No se puede confirmar ruta inválida");
            logMessage("Ruta demasiado corta. Necesitas al menos 2 hexágonos.", "warning");
            return;
        }
        
        console.log(`%c[AutoMove] ✅ CONFIRMANDO RUTA`, 'background: #4CAF50; color: white; font-weight: bold; padding: 5px;');
        
        const unit = this.currentPaintingUnit;
        
        // Guardar la ruta en la unidad (quitamos el primer elemento que es la posición actual)
        unit.autoMovePath = this.paintedPath.slice(1);
        unit.autoMoveCurrentStep = 0;
        unit.autoMoveActive = true;
        
        console.log(`[AutoMove] Ruta guardada en unidad:`, unit.autoMovePath);
        console.log(`[AutoMove] Total de pasos: ${unit.autoMovePath.length}`);
        
        logMessage(`Ruta automática confirmada para ${unit.name} (${unit.autoMovePath.length} pasos)`, "success");
        
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
        
        console.log(`[AutoMove] Mostrando ruta confirmada para ${unit.name}`);
        
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
        
        console.log(`[AutoMove] ✓ Visualización de ruta confirmada completada`);
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
        
        console.log(`[AutoMove] Cancelando ruta automática de ${unit.name}`);
        
        unit.autoMovePath = null;
        unit.autoMoveCurrentStep = 0;
        unit.autoMoveActive = false;
        
        this.clearConfirmedPathVisuals(unit);
        
        logMessage(`Ruta automática cancelada para ${unit.name}`, "info");
        console.log(`[AutoMove] ✓ Ruta cancelada`);
    },
    
    /**
     * Ejecuta un paso de movimiento automático para una unidad
     */
    async executeAutoMoveStep(unit) {
        if (!unit || !unit.autoMoveActive || !unit.autoMovePath || unit.autoMovePath.length === 0) {
            return false;
        }
        
        console.log(`[AutoMove] ⚙️ Ejecutando paso automático para ${unit.name}`);
        
        // Verificar que es el turno del jugador
        if (unit.player !== gameState.currentPlayer) {
            console.log(`[AutoMove] ⏸️ No es el turno del jugador ${unit.player}`);
            return false;
        }
        
        // Verificar que la unidad no ha actuado este turno
        if (unit.hasMoved || unit.hasAttacked) {
            console.log(`[AutoMove] ⏸️ Unidad ${unit.id} ya ha actuado este turno`);
            return false;
        }
        
        // Obtener el siguiente destino
        const nextStep = unit.autoMovePath[unit.autoMoveCurrentStep];
        if (!nextStep) {
            // Ruta completada
            console.log(`[AutoMove] 🏁 Ruta completada para ${unit.name}`);
            this.cancelAutoMove(unit);
            logMessage(`${unit.name} ha completado su ruta automática`, "success");
            return false;
        }
        
        console.log(`[AutoMove] Paso ${unit.autoMoveCurrentStep + 1}/${unit.autoMovePath.length}: (${nextStep.r}, ${nextStep.c})`);
        
        // Validar que el movimiento sigue siendo válido
        if (!this.isValidPathStep(unit, { r: unit.r, c: unit.c }, nextStep)) {
            console.warn(`[AutoMove] ⚠️ Ruta bloqueada en paso ${unit.autoMoveCurrentStep + 1}`);
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
                console.error("[AutoMove] ❌ No hay función de movimiento disponible");
                this.cancelAutoMove(unit);
                return false;
            }
            
            console.log(`[AutoMove] ✅ Movimiento ejecutado exitosamente`);
            
            // Avanzar al siguiente paso
            unit.autoMoveCurrentStep++;
            
            // Actualizar visualización
            this.updateConfirmedPathProgress(unit);
            
            return true;
        } catch (error) {
            console.error(`[AutoMove] ❌ Error al mover unidad:`, error);
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
        
        console.log(`%c[AutoMove] 🔄 Procesando ${currentPlayerUnits.length} unidades con movimiento automático`, 'background: #FF9800; color: white; font-weight: bold; padding: 5px;');
        
        for (const unit of currentPlayerUnits) {
            const success = await this.executeAutoMoveStep(unit);
            if (success) {
                // Pequeña pausa entre movimientos para visualización
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        console.log(`[AutoMove] ✅ Procesamiento de movimientos automáticos completado`);
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

console.log("autoMoveManager.js CARGADO ✅");
