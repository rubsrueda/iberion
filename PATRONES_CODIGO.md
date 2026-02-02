# IBERION: Patrones de Código y Estándares

**Versión:** 1.0 | **Para:** Programadores

---

## 📑 Índice

1. [Patrones Generales](#patrones-generales)
2. [Patrones de Request](#patrones-de-request)
3. [Patrones de Manager](#patrones-de-manager)
4. [Patrones de UI](#patrones-de-ui)
5. [Patrones de Red](#patrones-de-red)
6. [Patrones de Persistencia](#patrones-de-persistencia)
7. [Checklist de Implementación](#checklist-de-implementación)

---

## Patrones Generales

### 1. Validación de Estado

**PROBLEMA:** Mutar estado sin validar si es válido.

```javascript
// ❌ MALO - Sin validación
function attack(attacker, defender) {
    attacker.health -= 50;
    defender.health -= 10;
}

// ✅ BUENO - Con validación
function attack(attacker, defender) {
    // Validar entrada
    if (!attacker || !defender) {
        console.error("Atacante o defensor nulo");
        return false;
    }
    
    // Validar estado
    if (attacker.health <= 0) {
        console.warn("Atacante ya está muerto");
        return false;
    }
    
    if (!isHexSupplied(attacker.r, attacker.c)) {
        console.warn("Atacante no tiene suministro");
        return false;
    }
    
    // Ejecutar (ahora seguro)
    attacker.health -= 50;
    defender.health -= 10;
    return true;
}
```

### 2. Patrón de Logging

```javascript
// NIVELES DE LOG (en orden de severidad)
console.log("INFO: Jugador 1 movió unidad a (5,3)");      // INFO
console.warn("WARN: Unidad sin suministro movida");        // WARNING
console.error("ERROR: Falló al guardar partida");          // ERROR
console.debug("DEBUG: State actual =", gameState);         // DEBUG
```

### 3. Patrón de Constantes

```javascript
// ❌ MALO - Números mágicos dispersos
function calculateDamage(attack, defense) {
    return Math.max(attack - defense, 1);
}

// ✅ BUENO - Constantes centralizadas
const COMBAT = {
    MIN_DAMAGE: 1,
    MAX_DAMAGE: 500,
    CRITICAL_MULTIPLIER: 1.5,
    BASE_MORALE_LOSS: 10
};

function calculateDamage(attack, defense) {
    const damage = Math.max(attack - defense, COMBAT.MIN_DAMAGE);
    return Math.min(damage, COMBAT.MAX_DAMAGE);
}
```

---

## Patrones de Request

### Patrón Estándar de Request

Todas las acciones del jugador deben seguir este patrón para garantizar sincronización en red.

```javascript
/**
 * RequestMoveUnit - Patrón recomendado para cualquier acción
 * @param {Unit} unit - Unidad a mover
 * @param {number} targetR - Fila destino
 * @param {number} targetC - Columna destino
 */
async function RequestMoveUnit(unit, targetR, targetC) {
    // PASO 1: Validar que sea turno del jugador actual
    if (gameState.currentPlayer !== playerNumber) {
        console.warn("No es tu turno");
        return false;
    }
    
    // PASO 2: Validar entrada
    if (!unit || !isValidHex(targetR, targetC)) {
        console.error("Unidad o hex destino inválido");
        return false;
    }
    
    // PASO 3: Validar estado del juego (fase correcta)
    if (gameState.currentPhase !== "play") {
        console.warn("Fase incorrecta para mover");
        return false;
    }
    
    // PASO 4: Validar lógica de juego
    const path = findPath(unit.r, unit.c, targetR, targetC);
    if (!path || path.length === 0) {
        console.warn("No hay camino válido");
        return false;
    }
    
    // PASO 5: Generar ID de acción (deduplicación de red)
    const actionId = crypto.randomUUID();
    
    // PASO 6: Crear objeto de acción
    const action = {
        type: "MOVE",
        player: playerNumber,
        unit: unit.id,
        targetR,
        targetC,
        actionId,
        timestamp: Date.now()
    };
    
    // PASO 7: Si es juego en red, enviar a Supabase
    if (isNetworkGame()) {
        try {
            await NetworkManager._prepararEstadoParaNube(action);
            console.log("Acción enviada a red:", action);
        } catch (error) {
            console.error("Error en red:", error);
            showToastError("Error de conexión");
            return false;
        }
    }
    
    // PASO 8: Ejecutar localmente (mutación de estado)
    unit.r = targetR;
    unit.c = targetC;
    unit.actionId = actionId;
    unit.morale -= 2; // Ejemplo: pérdida de morale
    
    // PASO 9: Actualizar DOM
    renderBoardToDOM();
    UIManager.updateUnitInfo(unit);
    
    // PASO 10: Guardar
    if (!isNetworkGame()) {
        saveGameUnified("autosave", true);
    }
    
    // PASO 11: Feedback al usuario
    showToastSuccess(`Movimiento exitoso`);
    return true;
}
```

### Deduplicación de Acciones

**PROBLEMA:** El usuario hace doble-click → la acción se ejecuta 2 veces.

```javascript
// ❌ MALO - Sin deduplicación
function onUnitClick(unit) {
    RequestAttack(unit, enemyUnit);
    // Si el usuario hace doble-click, se ejecuta 2 veces
}

// ✅ BUENO - Con deduplicación via actionId
let lastActionId = null;

async function RequestAttack(attacker, defender) {
    const actionId = crypto.randomUUID();
    
    // Si ya hicimos esta acción, ignorar
    if (actionId === lastActionId) {
        console.warn("Acción duplicada ignorada");
        return false;
    }
    
    lastActionId = actionId;
    
    // ... resto del request
    
    // Resetear después de cierto tiempo (fallback)
    setTimeout(() => { lastActionId = null; }, 5000);
}
```

### Validación de Permisos

```javascript
/**
 * Validar si el jugador puede hacer una acción
 */
function canPlayerAction() {
    // ¿Es tu turno?
    if (gameState.currentPlayer !== playerNumber) {
        return false;
    }
    
    // ¿Está la partida activa?
    if (gameState.currentPhase === "gameOver") {
        return false;
    }
    
    // ¿Tiene acceso de red?
    if (isNetworkGame() && !isNetworkConnected()) {
        return false;
    }
    
    return true;
}
```

---

## Patrones de Manager

### Estructura Base de Manager

```javascript
/**
 * MyManager - Gestor de algo específico
 * Patrón: Object con métodos privados y públicos
 */
const MyManager = {
    // ESTADO PRIVADO
    _state: {
        initialized: false,
        data: []
    },
    
    // INICIALIZACIÓN
    async initialize() {
        console.log("Inicializando MyManager...");
        this._state.initialized = true;
        return true;
    },
    
    // MÉTODOS PÚBLICOS
    getData() {
        if (!this._state.initialized) {
            console.warn("MyManager no inicializado");
            return [];
        }
        return this._state.data;
    },
    
    addData(item) {
        if (!item) return false;
        this._state.data.push(item);
        return true;
    },
    
    // MÉTODOS PRIVADOS (prefijo _)
    _validate(item) {
        return item && item.id;
    },
    
    // SERIALIZACIÓN (para red/persistencia)
    _prepare() {
        return {
            data: this._state.data
            // NO incluir referencias DOM, funciones, etc.
        };
    },
    
    // DESERIALIZACIÓN
    _restore(data) {
        this._state.data = data.data || [];
    }
};

// INICIALIZACIÓN GLOBAL
await MyManager.initialize();
```

### Patrón de Manager con Eventos

```javascript
const EventManager = {
    _listeners: {},
    
    // Registrarse para evento
    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    },
    
    // Desuscribirse
    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event]
                .filter(cb => cb !== callback);
        }
    },
    
    // Lanzar evento
    emit(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(data));
        }
    }
};

// USO:
EventManager.on("unitKilled", (unit) => {
    console.log("Unidad muerto:", unit.name);
});

EventManager.emit("unitKilled", myUnit);
```

---

## Patrones de UI

### Patrón de Actualización de UI

```javascript
/**
 * PROBLEMA: Múltiples funciones actualizando UI causan flickering
 * SOLUCIÓN: Centralizar en UIManager
 */

const UIManager = {
    updateAllUIDisplays() {
        // Llamar en ESTE ORDEN (no paralelo)
        this.updateResources();
        this.updateUnitList();
        this.updateHexDisplay();
        this.updatePhaseInfo();
    },
    
    updateResources() {
        const player = gameState.playerResources[gameState.currentPlayer];
        document.getElementById("gold").textContent = player.oro;
        document.getElementById("food").textContent = player.comida;
        document.getElementById("wood").textContent = player.madera;
    },
    
    updateUnitList() {
        const playerUnits = units.filter(u => u.player === gameState.currentPlayer);
        const html = playerUnits.map(u => `
            <div class="unit-item" data-id="${u.id}">
                ${u.name} (Lvl ${u.level})
            </div>
        `).join("");
        document.getElementById("unitList").innerHTML = html;
    },
    
    updateHexDisplay() {
        renderBoardToDOM();
    },
    
    updatePhaseInfo() {
        const phaseText = `
            Turno ${gameState.turnNumber} 
            | Jugador ${gameState.currentPlayer}
            | Fase: ${gameState.currentPhase}
        `;
        document.getElementById("phaseInfo").textContent = phaseText;
    }
};

// LLAMAR DESPUÉS DE CUALQUIER CAMBIO DE ESTADO:
RequestMoveUnit(unit, 5, 3);
UIManager.updateAllUIDisplays(); // ✓ Una sola vez
```

### Patrón de Modal

```javascript
const MyModal = {
    element: null,
    
    initialize() {
        this.element = document.getElementById("myModal");
    },
    
    open(data) {
        this.element.style.display = "flex";
        this.element.style.zIndex = "10100";
        this.element.style.position = "fixed";
        this.element.style.top = "0";
        this.element.style.left = "0";
        this.element.style.width = "100%";
        this.element.style.height = "100%";
        
        this._render(data);
    },
    
    close() {
        this.element.style.display = "none";
    },
    
    _render(data) {
        const html = `
            <div class="modal-content">
                <span class="close-button">×</span>
                <h2>${data.title}</h2>
                <p>${data.message}</p>
            </div>
        `;
        this.element.innerHTML = html;
        
        // Listeners
        this.element.querySelector(".close-button")
            .addEventListener("click", () => this.close());
    }
};
```

---

## Patrones de Red

### Patrón Básico de Sincronización

```javascript
/**
 * Flujo de sincronización en juego de red:
 * 1. Jugador A hace acción
 * 2. Enviar a servidor
 * 3. Servidor valida y persiste
 * 4. Servidor envía a Jugador B
 * 5. Jugador B recibe y aplica
 */

async function syncActionAcrossNetwork(action) {
    // PASO 1: Crear estado limpio (sin referencias DOM)
    const cleanState = {
        action: action,
        timestamp: Date.now(),
        player: gameState.currentPlayer,
        gameVersion: gameState.version
    };
    
    // PASO 2: Enviar a nube
    try {
        const response = await supabase
            .from('game_actions')
            .insert([cleanState]);
        
        if (response.error) throw response.error;
        
        console.log("Acción sincronizada:", action.type);
    } catch (error) {
        console.error("Fallo en sincronización:", error);
        showToastError("Error de red - reintentando...");
        
        // Reintentar después de 2 segundos
        setTimeout(() => syncActionAcrossNetwork(action), 2000);
    }
}
```

### Patrón de Validación en Servidor

```javascript
/**
 * Este código sería ejecutado en una función serverless (Supabase)
 */

async function validateAndApplyAction(action) {
    // PASO 1: Validar que la acción sea válida
    if (!action.type || !action.player) {
        throw new Error("Acción malformada");
    }
    
    // PASO 2: Validar permisos
    const match = await getMatch(action.matchId);
    if (match.currentPlayer !== action.player) {
        throw new Error("No es turno del jugador");
    }
    
    // PASO 3: Validar lógica de juego
    if (action.type === "MOVE") {
        const unit = findUnitInState(match.gameState, action.unitId);
        const isMoveLegal = validateMove(
            unit, 
            action.targetR, 
            action.targetC, 
            match.gameState
        );
        if (!isMoveLegal) {
            throw new Error("Movimiento ilegal");
        }
    }
    
    // PASO 4: Aplicar cambio al estado
    match.gameState = applyAction(match.gameState, action);
    
    // PASO 5: Persistir
    await updateMatch(match);
    
    // PASO 6: Notificar otros jugadores
    await broadcastStateChange(match);
    
    return match;
}
```

---

## Patrones de Persistencia

### Patrón de Guardado Unificado

```javascript
/**
 * Save - Patrón de guardado para todos los tipos de juego
 */

async function saveGameUnified(saveName, isAutoSave = false) {
    try {
        // PASO 1: Preparar estado limpio
        const gameSnapshot = {
            gameState: JSON.parse(JSON.stringify(gameState, stateReplacer)),
            board: JSON.parse(JSON.stringify(board, boardReplacer)),
            units: JSON.parse(JSON.stringify(units, unitReplacer)),
            timestamp: Date.now(),
            playerNumber: playerNumber,
            isAutoSave: isAutoSave,
            version: GAME_VERSION
        };
        
        // PASO 2: Guardar localmente SIEMPRE
        const storageKey = `save_${playerNumber}_${saveName}`;
        localStorage.setItem(storageKey, JSON.stringify(gameSnapshot));
        console.log("Guardado local:", storageKey);
        
        // PASO 3: Guardar en nube si es juego de red
        if (isNetworkGame()) {
            await supabase
                .from('game_saves')
                .insert([{
                    match_id: currentMatchId,
                    player: playerNumber,
                    game_data: gameSnapshot,
                    save_name: saveName,
                    auto_save: isAutoSave
                }]);
            console.log("Guardado en nube");
        }
        
        return true;
    } catch (error) {
        console.error("Error al guardar:", error);
        return false;
    }
}

// REPLACER FUNCTIONS (Eliminar referencias DOM, funciones, etc.)
function stateReplacer(key, value) {
    if (key === 'element' || typeof value === 'function') {
        return undefined;
    }
    return value;
}

function boardReplacer(key, value) {
    if (key === 'element' || typeof value === 'function') {
        return undefined;
    }
    return value;
}
```

### Patrón de Carga

```javascript
async function loadGameUnified(saveName) {
    try {
        // PASO 1: Intentar cargar del localStorage
        const storageKey = `save_${playerNumber}_${saveName}`;
        const localSnapshot = localStorage.getItem(storageKey);
        
        if (localSnapshot) {
            console.log("Cargado desde storage local");
            const snapshot = JSON.parse(localSnapshot);
            applyGameSnapshot(snapshot);
            return true;
        }
        
        // PASO 2: Si no está local, cargar de nube
        if (isNetworkGame()) {
            const { data, error } = await supabase
                .from('game_saves')
                .select('*')
                .eq('match_id', currentMatchId)
                .eq('save_name', saveName)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            if (data && data.length > 0) {
                console.log("Cargado desde nube");
                applyGameSnapshot(data[0].game_data);
                return true;
            }
        }
        
        console.warn("No se encontró guardado");
        return false;
        
    } catch (error) {
        console.error("Error al cargar:", error);
        return false;
    }
}

function applyGameSnapshot(snapshot) {
    gameState = snapshot.gameState;
    board = snapshot.board;
    units = snapshot.units;
    
    renderBoardToDOM();
    UIManager.updateAllUIDisplays();
}
```

---

## Checklist de Implementación

Cuando implementes una nueva feature, verifica:

### ✅ Antes de Codificar

- [ ] ¿Cuál es el tipo de dato que se va a usar?
- [ ] ¿Dónde va a vivir en `gameState`?
- [ ] ¿Necesita sincronización en red?
- [ ] ¿Cuándo se guarda (auto/manual)?
- [ ] ¿Qué fase del juego lo permite?

### ✅ Durante Codificación

- [ ] Validar entrada (no-null, tipos correctos)
- [ ] Validar estado actual (turno, fase, permisos)
- [ ] Usar Request function si es acción del jugador
- [ ] Generar `actionId` para deduplicación
- [ ] Usar Manager si es subsistema
- [ ] Usar constantes (no números mágicos)
- [ ] Logging a niveles apropiados (info, warn, error)

### ✅ Después de Codificar

- [ ] ¿Se mutó el estado directamente sin validar?
- [ ] ¿Se llamó `UIManager.updateAllUIDisplays()`?
- [ ] ¿Se guardó la partida después?
- [ ] ¿Se sincronizó en red si es necesario?
- [ ] ¿Funciona con IA?
- [ ] ¿Funciona con multijugador local?
- [ ] ¿Funciona con multijugador en red?
- [ ] ¿Está documentado con comentarios JSDoc?

### ✅ Testing

```javascript
// Test básico de una feature
describe("RequestAttack", () => {
    let attacker, defender;
    
    beforeEach(() => {
        // Setup
        attacker = createMockUnit("Caballería", 100, 100, 100);
        defender = createMockUnit("Infantería", 100, 100, 50);
        gameState.currentPlayer = 1;
    });
    
    test("Debe reducir salud del defensor", () => {
        const healthBefore = defender.health;
        RequestAttack(attacker, defender);
        expect(defender.health).toBeLessThan(healthBefore);
    });
    
    test("Debe validar que sea turno correcto", () => {
        gameState.currentPlayer = 2;
        const result = RequestAttack(attacker, defender);
        expect(result).toBe(false);
    });
    
    test("Debe fallar si defensor es nulo", () => {
        const result = RequestAttack(attacker, null);
        expect(result).toBe(false);
    });
});
```

---

## Convenciones de Nombres

```javascript
// Variables de estado (camelCase)
let currentPlayer = 1;
let isGameOver = false;
const playerResources = { ... };

// Funciones (verboPascalCase)
function RequestMoveUnit() { }
function calculateDamage() { }
function updatePlayerUI() { }

// Constantes (UPPER_SNAKE_CASE)
const MAX_PLAYERS = 8;
const TERRAIN_TYPES = { ... };
const CIVILIZATIONS = { ... };

// Elementos DOM (prefijo de id/class)
id="gameBoard"           // contenedor principal
class="unit-item"       // elemento repetido
class="modal-overlay"   // overlay de modal
id="phaseInfo"          // información

// Manager (singular, PascalCase)
const PlayerDataManager = { ... };
const NetworkManager = { ... };
const UIManager = { ... };

// Arrays (plural)
const units = [];
const players = [];
const actions = [];

// Métodos privados (prefijo _)
const MyManager = {
    _state: { },
    _initialize() { },
    _validate() { }
};
```

---

**Última actualización:** 2 de febrero de 2026
