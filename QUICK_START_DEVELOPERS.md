# IBERION: Quick Start para Nuevos Programadores

**Versión:** 1.0 | **Tiempo de lectura:** 15 minutos | **Para:** Developers nuevos

---

## 🎯 Lo que Necesitas Saber en 15 Minutos

### ¿Qué es IBERION?

Un juego de **estrategia táctica por turnos** (como Civilization meets Final Fantasy Tactics).

- 🎮 **Grid hexagonal** de 12×15 a 75×120
- 👥 **2-8 jugadores** simultáneamente
- 💻 **Vanilla JavaScript** (sin frameworks)
- ☁️ **Juega en nube** (Supabase) + **localmente** (localStorage)
- ⚔️ **Turno-basado**: Estrategia pura, sin reflejos

---

## 🏗️ Arquitectura Mental (Simplificada)

```
┌────────────────────────────────────────────────────────┐
│                    INTERFAZ DE USUARIO                 │
│  (HTML/CSS) - Lo que el jugador ve                     │
└────────────┬───────────────────────────────────────────┘
             │ usuario hace click
             ↓
┌────────────────────────────────────────────────────────┐
│                  LÓGICA DE JUEGO                       │
│  main.js, gameFlow.js - Qué pasa cuando hace click    │
│  Ej: "¿Puede mover aquí?" "¿Es su turno?"            │
└────────────┬───────────────────────────────────────────┘
             │ valida y ejecuta
             ↓
┌────────────────────────────────────────────────────────┐
│                  ESTADO DEL JUEGO                      │
│  state.js - La "verdad" actual                        │
│  gameState = { currentPlayer, turnNumber, ... }       │
│  board[][] = { terrain, owner, ... }                  │
│  units[] = { id, name, health, ... }                  │
└────────────┬───────────────────────────────────────────┘
             │ estado cambió
             ↓
┌────────────────────────────────────────────────────────┐
│              PERSISTENCIA + RED                        │
│  saveLoad.js, networkManager.js                       │
│  Guardar en localStorage + Supabase                    │
│  Sincronizar con otros jugadores                      │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Archivos Clave (Mapa Mental)

```
Mi trabajo va a estar en uno de estos 5 ficheros:

1️⃣  main.js (2873 líneas)
    ├─ Usuario hace click en hexágono
    ├─ Manejador principal de entrada
    └─ → "RequestMoveUnit()", "RequestAttack()", etc.

2️⃣  gameFlow.js (2489 líneas)
    ├─ Turno empieza → acciones → turno termina
    ├─ "¿Alguien ganó?" → "¿Cuánta morale pierde?"
    └─ handleEndTurn(), checkVictoryConditions()

3️⃣  unit_Actions.js (3700 líneas)
    ├─ Cómo mover, atacar, dividir unidades
    ├─ Validación de cada acción
    └─ RequestMoveUnit(), RequestAttack(), RequestSplitUnit()

4️⃣  constants.js (986 líneas)
    ├─ Configuración: estadísticas de unidades, civs
    ├─ UNIT_DEFINITIONS = { "Cavalry": { attack: 100 } }
    └─ No toques aquí a menos que balancees

5️⃣  uiUpdates.js
    ├─ Renderizar el tablero en pantalla
    ├─ Actualizar barra de recursos
    └─ "Dame el estado actual y lo dibujo"
```

---

## 🔑 Conceptos Fundamentales

### Concepto #1: El Ciclo de Turno

```
┌──────────────────────────────────────┐
│ INICIO TURNO (Jugador 1)             │
├──────────────────────────────────────┤
│ 1. Recolectar recursos               │ ← +50 oro, +30 comida
│ 2. Resetear movimiento de unidades   │ ← Todas pueden mover
│ 3. Hacer acciones (el jugador juega) │ ← ← ← AQUÍ ERES TÚ
│ 4. Fin de turno                      │ ← Guardar, enviar red
│                                      │
│ ↓ turnNumber++                       │
│                                      │
│ INICIO TURNO (Jugador 2)             │
└──────────────────────────────────────┘
```

**Tu código entra en el paso 3.** Cuando el usuario hace click en "Atacar", tu `RequestAttack()` se ejecuta.

### Concepto #2: Estado Central vs. Estado Local

```javascript
// ✅ VERDAD UNIVERSAL (en state.js)
gameState.currentPlayer = 2;        // Todos los clientes saben esto
board[5][3].owner = 2;              // Todos saben quién controla esto
units[0].health = 150;              // Todos saben esto

// ❌ TEMPORAL (variables locales)
let isModalOpen = false;            // Solo este cliente lo sabe
let selectedUnit = null;            // Solo este cliente lo sabe

// REGLA: Si afecta a la partida, va en gameState
//        Si es solo UI, es variable local
```

### Concepto #3: Validación Antes de Ejecutar

```javascript
// PATRÓN SIEMPRE:
// 1. Es tu turno? → NO → salir
// 2. ¿Hex válido? → NO → salir  
// 3. ¿Unidad existe? → NO → salir
// 4. ¿Lógica válida? → NO → salir
// 5. OK → ejecutar

function RequestMoveUnit(unit, targetR, targetC) {
    // STOP 1
    if (gameState.currentPlayer !== playerNumber) return false;
    
    // STOP 2
    if (!isValidHex(targetR, targetC)) return false;
    
    // STOP 3
    if (!unit || !unit.id) return false;
    
    // STOP 4
    if (!canUnitMoveTo(unit, targetR, targetC)) return false;
    
    // ✅ OK → MOVER
    unit.r = targetR;
    unit.c = targetC;
    UIManager.updateAllUIDisplays();
}
```

---

## 🚀 Tu Primer Bug Fix (Ejemplo Real)

**Escenario:** Un jugador reporta: "Mi infantería se mueve demasiado rápido".

### Paso 1: Reproducir el bug

```javascript
// Console.log en main.js
console.log("Unidad está moviendo a velocidad:", 
    unit.movement);

// Output: "2" (cuando debería ser "1")
```

### Paso 2: Encontrar dónde se asigna `movement`

```javascript
// grep_search: "movement"
// → Encontramos: unit_Actions.js línea 245
```

### Paso 3: Revisar la lógica

```javascript
// En constants.js:
const UNIT_DEFINITIONS = {
    "Infantry": {
        attack: 60,
        defense: 100,
        movement: 1,  // ✓ Correcto aquí
        health: 200
    }
};

// En main.js donde se crea la unidad:
const newUnit = {
    ...UNIT_DEFINITIONS["Infantry"],
    movement: 2  // ❌ AQUÍ ESTÁ EL BUG - sobrescribe a 2
};
```

### Paso 4: Fix

```javascript
// ANTES:
const newUnit = {
    ...UNIT_DEFINITIONS["Infantry"],
    movement: 2  // ❌ Bug
};

// DESPUÉS:
const newUnit = {
    ...UNIT_DEFINITIONS["Infantry"]
    // Sin sobrescribir movement - usa el de constants
};

// O si necesitas modificarlo:
const newUnit = {
    ...UNIT_DEFINITIONS["Infantry"],
    movement: UNIT_DEFINITIONS["Infantry"].movement  // ✓ Usar constanteñ
};
```

### Paso 5: Probar

```javascript
// En console:
units[0].movement  // → 1 ✓ Fix correcto
```

---

## 💾 Guardado y Red (Simplificado)

### Guardado Local

```javascript
// Automático cada turno:
handleEndTurn() {
    // ... lógica de turno ...
    saveGameUnified("autosave", true);  // ← Se guarda
}

// En localStorage:
// Key: "save_1_autosave"
// Value: { gameState, board, units, timestamp }
```

### Guardado en Red

```javascript
// Si es juego multijugador:
if (isNetworkGame()) {
    // Enviar a Supabase
    await NetworkManager._prepararEstadoParaNube({
        action: "MOVE",
        unitId: 42,
        targetR: 5,
        targetC: 3,
        actionId: crypto.randomUUID()
    });
    
    // Jugador 2 recibe el cambio automáticamente
    // (via listener de Supabase en realtime)
}
```

---

## 🧪 Cómo Probar tu Código

### Test Rápido Local

```javascript
// En console (F12):

// 1. Ver estado actual
console.log(gameState);
console.log(units[0]);

// 2. Ejecutar función
RequestMoveUnit(units[0], 5, 3);

// 3. Ver si cambió
console.log(units[0].r, units[0].c);  // → 5, 3 ✓
```

### Test Multijugador Local

1. Abre el juego en **2 pestañas**
2. Pestañasña 1: Crea partida
3. Pestaña 2: Únete (mismo navegador, localStorage compartido)
4. Juega normalmente (los cambios se sincronizan)

### Test en Red

1. Abre en 2 **navegadores diferentes** (Chrome y Firefox)
2. Host crea partida → obtiene código (ej: "HGEF")
3. Guest se une con código
4. ¡Ahora es red real!

---

## 🐛 Debug Console (Tu Mejor Amigo)

Presiona `Ctrl+Shift+D` para abrir la consola de debug:

```javascript
// Ver estado actual
> gameState
{ currentPlayer: 1, turnNumber: 23, ... }

// Ver todos los jugadores
> gameState.playerResources
{ 1: { oro: 500, comida: 150 }, 2: { oro: 300, comida: 200 } }

// Ver todas las unidades
> units
[ { id: 1, name: "Cavalry", player: 1, r: 5, c: 3 }, ... ]

// Modificar estado (para testing)
> gameState.currentPlayer = 2
> units[0].health = 1
> handleEndTurn()  // simular fin de turno

// Buscar unidades específicas
> units.filter(u => u.player === 1 && u.health > 0)

// Ver tablero
> board[5][3]  // Qué hay en esa posición
{ terrain: "mountain", owner: 1, element: <div> }
```

---

## 📝 Estructura de una Función (Plantilla)

Copia-pega esto como base para nuevas funciones:

```javascript
/**
 * [Nombre descriptivo]
 * @param {Type} param1 - Descripción
 * @param {Type} param2 - Descripción
 * @returns {boolean} true si éxito, false si fallo
 * 
 * Ejemplo:
 *   RequestDoSomething(unit, 5, 3) → true
 */
async function RequestDoSomething(param1, param2) {
    // VALIDAR ENTRADA
    if (!param1 || !param2) {
        console.error("Parámetros inválidos");
        return false;
    }
    
    // VALIDAR PERMISOS
    if (gameState.currentPlayer !== playerNumber) {
        console.warn("No es tu turno");
        return false;
    }
    
    // VALIDAR ESTADO
    if (gameState.currentPhase !== "play") {
        console.warn("Fase incorrecta");
        return false;
    }
    
    // VALIDAR LÓGICA
    const isValid = validateSomething(param1, param2);
    if (!isValid) {
        console.warn("Lógica inválida");
        return false;
    }
    
    try {
        // GENERAR ACTION ID
        const actionId = crypto.randomUUID();
        
        // SI ES RED, ENVIAR
        if (isNetworkGame()) {
            await NetworkManager._prepararEstadoParaNube({
                type: "DOSOMETHING",
                param1,
                param2,
                actionId
            });
        }
        
        // EJECUTAR LOCALMENTE
        doSomethingInternal(param1, param2);
        
        // ACTUALIZAR UI
        UIManager.updateAllUIDisplays();
        
        // GUARDAR
        saveGameUnified("autosave", true);
        
        // FEEDBACK
        showToastSuccess("Acción completada");
        return true;
        
    } catch (error) {
        console.error("Error:", error);
        showToastError("Algo salió mal");
        return false;
    }
}
```

---

## 🎓 Ruta de Aprendizaje (Para tus primeros días)

### Día 1: Leer (No codificar)

- [ ] Lee [Arquitectura (2 min)](./GUIA_TECNICA_FUNCIONAL_IBERION.md#arquitectura)
- [ ] Lee [Estructura de Estado (5 min)](./GUIA_TECNICA_FUNCIONAL_IBERION.md#estructura-de-estado)
- [ ] Lee [Ciclo de Turno (3 min)](./GUIA_TECNICA_FUNCIONAL_IBERION.md#ciclo-de-turno)

### Día 2: Explorar Código

- [ ] Abre `state.js` - entiende la estructura
- [ ] Abre `main.js` - ve cómo maneja clicks
- [ ] Abre `unit_Actions.js` - mira un Request function completo

### Día 3: Tu Primer Bug

- [ ] Toma un bug fácil de la lista
- [ ] Reproduce en consola
- [ ] Encuentra dónde ocurre (grep)
- [ ] Fix + Test

### Día 4: Feature Pequeña

- [ ] Elige feature pequeña (ej: "Añadir botón")
- [ ] Lee [Patrones de UI](./PATRONES_CODIGO.md#patrones-de-ui)
- [ ] Implementa con patrón

### Día 5: Feature Mediana

- [ ] Feature que toque gameState
- [ ] Usa [Patrón de Request](./PATRONES_CODIGO.md#patrón-estándar-de-request)
- [ ] Cubre local + red

---

## ❓ Preguntas Frecuentes

**P: ¿Dónde agrego un nuevo tipo de unidad?**  
R: En `constants.js`, sección `UNIT_DEFINITIONS`. Copia una unidad existente, cambia sus stats.

**P: ¿Cómo hago que funcione en multijugador en red?**  
R: Todo debe pasar por `RequestXXX()` functions. Sigue el [patrón de request](./PATRONES_CODIGO.md#patrón-estándar-de-request).

**P: ¿Dónde se guarda la partida?**  
R: Localmente en `localStorage`. Si es red, también en Supabase tabla `game_saves`.

**P: ¿Cómo encuentro un bug?**  
R: `Ctrl+F` para buscar en un archivo, `grep` en terminal para buscar en todo el proyecto.

**P: ¿Cómo agrego una civilización nueva?**  
R: En `constants.js`, sección `CIVILIZATIONS`. Asigna bonificaciones.

**P: Mi cambio no aparece en pantalla**  
R: Probablemente olvidaste llamar `UIManager.updateAllUIDisplays()` después de cambiar estado.

**P: El juego se desincroniza en multijugador**  
R: Posiblemente muteaste estado sin guardar. Asegúrate de usar `RequestXXX()`, no mutación directa.

---

## 🔗 Links Útiles en el Proyecto

| Archivo | Para | Líneas |
|---------|------|--------|
| `state.js` | Estructura del estado | ~335 |
| `constants.js` | Configuración (unidades, civs) | ~986 |
| `main.js` | Manejador principal | ~2873 |
| `gameFlow.js` | Lógica de turno | ~2489 |
| `unit_Actions.js` | Acciones de unidades | ~3700 |
| `GUIA_TECNICA_FUNCIONAL_IBERION.md` | Comprensión profunda | 1200+ |
| `PATRONES_CODIGO.md` | Cómo escribir código | - |
| `GUIA_GAMEPLAY_MECANICAS.md` | Entender el juego | - |

---

## ✅ Checklist Antes de tu Primer PR

- [ ] ¿Probé localmente?
- [ ] ¿Probé en multijugador local (2 pestañas)?
- [ ] ¿Probé en red (2 navegadores)?
- [ ] ¿Llamé `UIManager.updateAllUIDisplays()`?
- [ ] ¿Guardé con `saveGameUnified()`?
- [ ] ¿Usé `RequestXXX()` para acciones del jugador?
- [ ] ¿Validé entrada (null, tipos)?
- [ ] ¿Agregué console.log para debugging?
- [ ] ¿Funcionó con IA también?
- [ ] ¿El código sigue los patrones?

---

**Siguiente paso:** Abre `main.js`, busca "onclick", mira cómo se maneja un click. 🚀

**Última actualización:** 2 de febrero de 2026
