# IBERION: Cheat Sheet & Quick Reference

**Última actualización:** 2 de febrero de 2026  
**Uso:** Imprime esto o télo guardado para acceso rápido

---

## 🔧 Comandos de Debug (Console - F12)

```javascript
// VER ESTADO
gameState                               // Estado completo
gameState.currentPlayer                 // Jugador actual
gameState.turnNumber                    // Turno actual
gameState.playerResources[1]            // Oro/recursos jugador 1
board[5][3]                             // Qué hay en hex (5,3)
units.filter(u => u.player === 1)       // Mis unidades

// MODIFICAR (testing)
gameState.currentPlayer = 2             // Cambiar de jugador
units[0].health = 1                     // Dañar unidad
units[0].morale = 100                   // Subir morale
gameState.playerResources[1].oro = 9999 // Dinero infinito

// EJECUTAR
handleEndTurn()                         // Simular fin de turno
RequestMoveUnit(units[0], 5, 3)        // Mover unidad
renderBoardToDOM()                      // Redibujar tablero
UIManager.updateAllUIDisplays()         // Actualizar UI

// GUARDAR/CARGAR
saveGameUnified("test", false)          // Guardar partida
loadGameUnified("test")                 // Cargar partida
localStorage.clear()                    // Limpiar todo

// BUSCAR
units.find(u => u.id === 42)            // Encontrar unidad por ID
units.filter(u => u.health < 50)        // Unidades dañadas
board.flat().filter(h => h.owner === 1) // Hexágonos míos
```

---

## 📁 Archivos Principales (Ubicación Rápida)

| Lo que necesito | Archivo | Línea aprox |
|-----------------|---------|------------|
| Estructura estado | state.js | 1-335 |
| Definiciones unidades | constants.js | 100-300 |
| Definiciones civs | constants.js | 400-500 |
| Manejador click | main.js | 1-100 |
| Lógica turno | gameFlow.js | 1-200 |
| Acción mover | unit_Actions.js | 100-300 |
| Acción atacar | unit_Actions.js | 500-700 |
| Red/sincronización | networkManager.js | 1-300 |
| Guardar/cargar | saveLoad.js | 1-150 |
| Dibujar UI | uiUpdates.js | 1-200 |
| CSS estilos | style.css | 1-500 |
| HTML estructura | index.html | 1-500 |

---

## 📊 Tablas Clave

### Stats de Unidades (Rápido)

```
UNIDAD           │ ATQ │ DEF │ SAL │ MOV │ COSTO
─────────────────┼─────┼─────┼─────┼─────┼──────
Inf. Ligera      │  40 │  60 │ 200 │  2  │ 200
Inf. Pesada      │  60 │ 100 │ 200 │  1  │ 400
Cab. Ligera      │  80 │  60 │ 200 │  4  │ 400
Cab. Pesada      │ 100 │ 100 │ 200 │  3  │ 600
Arqueros         │  70 │  20 │ 150 │  2  │ 360
Arcabuceros      │ 100 │  40 │ 200 │  1  │ 480
Artillería       │ 250 │  20 │ 150 │  1  │ 1000
Cuartel General  │  10 │  40 │ 200 │  3  │ 800
Hospital         │   0 │  40 │ 200 │  2  │ 600
```

### Terrenos (Rápido)

```
TERRENO │ DEF │ MOV   │ RECURSO │ NOTAS
────────┼─────┼───────┼─────────┼────────────
Llanura │  +0 │ 1.0x  │ Comida  │ Normal
Bosque  │ +20 │ 0.5x  │ Madera  │ Defensivo
Montaña │ +30 │ 0.5x  │ Piedra  │ Muy lento
Colina  │ +10 │ 0.75x │ Piedra  │ Híbrido
Agua    │  +0 │ 2.0x  │ Pesca   │ Solo naval
```

### Civs (Rápido)

```
CIV     │ BONIFICACIÓN PRINCIPAL
────────┼──────────────────────────────────
Iberia  │ +20% DEF Montaña, +50% MOV Montaña
Roma    │ -20% Construcción, +30% DEF Fort
Cartago │ +30% Oro comercio, -15% Naval
Grecia  │ +20% XP, +2 Talento slots
Persia  │ +40% Morale, +2 Movimiento
```

---

## ✅ Checklists

### Nuevo Feature (Checklist Rápido)

- [ ] ¿Dónde va en gameState?
- [ ] ¿Afecta a otros jugadores?
- [ ] ¿Necesita Request function?
- [ ] ¿Necesita guardar?
- [ ] Validación entrada
- [ ] Validación estado (turno, fase)
- [ ] Generé actionId?
- [ ] Llamé UIManager.update?
- [ ] Llamé saveGame?
- [ ] Probé local?
- [ ] Probé local multijugador?
- [ ] Probé red?

### Bug Fix (Checklist Rápido)

- [ ] Reproduzco el bug
- [ ] Veo error en console
- [ ] Encuentro el archivo (grep)
- [ ] Entiendo por qué ocurre
- [ ] Hago el fix mínimo
- [ ] Probé que se arregla
- [ ] Reviso que no rompe algo más
- [ ] Commit con descripción clara

### Deploy (Checklist Rápido)

- [ ] Código funciona localmente
- [ ] Tests pasan (si existen)
- [ ] Código sigue patrones
- [ ] No hay console.error
- [ ] Commit message claro
- [ ] Push a rama feature
- [ ] PR escrita
- [ ] Esperar review
- [ ] Merge a main

---

## 🎮 Gameplay Rápido

### Cómo Ganar (3 Formas)

1. **Aniquilación:** Matar todas unidades enemigos
2. **Territorial:** Controlar 6+ ciudades por 3 turnos
3. **Puntos:** Llegar a 100 puntos (matar, conquistar)

### Recursos (7 tipos)

| Recurso | Símbolo | Genera | Usa |
|---------|---------|--------|-----|
| Oro | 💰 | +50 ciudad | Unidades |
| Comida | 🌾 | +30 ciudad | Upkeep |
| Madera | 🌲 | +20 bosque | Construcción |
| Piedra | 🪨 | +20 montaña | Fortif |
| Hierro | ⛓️ | +15 mina | Armas |
| Investigación | 💡 | +5 base | Tech |
| Reclutamiento | 🎖️ | Vary | Unidades |

### Morale Afecta

- **Ataque:** A menor morale, menos daño
- **Movimiento:** A menor morale, más lento
- **Range:** 0-20: Destruida | 20-50: Baja | 50-80: Normal | 80-100: Alta

---

## 💻 Patrones (Una línea cada uno)

```javascript
// Request Pattern
async function RequestXXX(param) {
    if (!canPlayerAction()) return false;
    if (isNetworkGame()) await NetworkManager._prepararEstadoParaNube({...});
    // Mutation
    UIManager.updateAllUIDisplays();
    saveGameUnified("autosave", true);
    return true;
}

// Manager Pattern
const MyManager = { state: {}, open() {}, _private() {} };

// Modal Pattern
const MyModal = {
    open(data) { 
        this.element.style.display = "flex";
        this.element.style.zIndex = "10100";
    },
    close() { this.element.style.display = "none"; }
};

// Validation Pattern
if (!input) return false;
if (currentPlayer !== myPlayer) return false;
if (phase !== "play") return false;
// ... rest

// Loop Pattern
units.filter(u => u.player === currentPlayer)
    .forEach(u => updateUnit(u));
```

---

## 🎯 Troubleshooting (Una línea solución)

| Problema | Debug | Solución |
|----------|-------|----------|
| Cambio no aparece | `UIManager.updateAllUIDisplays()` | Actualizar UI |
| No se guarda | `localStorage.getItem("save_1_autosave")` | Llamar saveGame |
| Desincronizado red | Comparar gameState ambos | Usar RequestXXX |
| Modal no aparece | `console.log(modal.style.zIndex)` | z-index 10100+ |
| Unidad no se mueve | `canUnitMoveTo()` return false | Validar path |
| Daño incorrecto | `calculateDamage(a, d)` | Revisar fórmula |

---

## 🚀 Atajos Útiles

### VS Code
```
Ctrl+F         Buscar en archivo
Ctrl+H         Buscar/reemplazar
Ctrl+Shift+F   Buscar en proyecto
Ctrl+G         Ir a línea
F5             Refrescar página
F12            DevTools
```

### Terminal
```bash
git status                          # Estado repositorio
git log --oneline -5                # Últimos 5 commits
grep -r "RequestMove" .             # Buscar en proyecto
npm start                           # Iniciar servidor
```

### Browser DevTools
```
F12             Abrir DevTools
Ctrl+Shift+D    Debug console (IBERION)
Elements        HTML/CSS
Console         Logs
Network         Requests
Sources         Debugger
```

---

## 📞 Links Rápidos

| Recurso | Link |
|---------|------|
| Documentación Central | [DOCUMENTACION_CENTRAL.md](./DOCUMENTACION_CENTRAL.md) |
| Quick Start | [QUICK_START_DEVELOPERS.md](./QUICK_START_DEVELOPERS.md) |
| Guía Técnica | [GUIA_TECNICA_FUNCIONAL_IBERION.md](./GUIA_TECNICA_FUNCIONAL_IBERION.md) |
| Patrones | [PATRONES_CODIGO.md](./PATRONES_CODIGO.md) |
| Gameplay | [GUIA_GAMEPLAY_MECANICAS.md](./GUIA_GAMEPLAY_MECANICAS.md) |
| FAQ | [FAQ_EXTENDIDO.md](./FAQ_EXTENDIDO.md) |
| Repositorio | https://github.com/[owner]/iberion |
| Supabase | https://supabase.com/dashboard |

---

## 🎓 ¿Qué Leer Cuándo?

```
PRIMER DÍA:
├─ Este cheat sheet (5 min)
├─ Quick Start (15 min)
└─ Abre main.js y lee handlers (15 min)

SEGUNDO DÍA:
├─ Guía Técnica § Arquitectura (20 min)
├─ Lee state.js completo (10 min)
└─ Lee unit_Actions.js (RequestMove) (20 min)

TERCER DÍA:
├─ Patrones § Request (15 min)
├─ Patrones § Validation (10 min)
└─ Haz tu primer bug fix (30 min)

CUANDO NECESITES:
├─ FAQ_EXTENDIDO (respuestas rápidas)
├─ GUIA_GAMEPLAY (entender juego)
└─ Busca en docs con Ctrl+F
```

---

## 📝 Plantilla Mínima para Nueva Función

```javascript
/**
 * RequestNombreDeLaFuncion
 * @param {Type} param - Descripción
 * @returns {boolean} éxito
 */
async function RequestNombreDeLaFuncion(param) {
    // 1. Validar entrada
    if (!param) return false;
    
    // 2. Validar permisos
    if (gameState.currentPlayer !== playerNumber) return false;
    
    // 3. Validar estado
    if (gameState.currentPhase !== "play") return false;
    
    // 4. Red (si aplica)
    const actionId = crypto.randomUUID();
    if (isNetworkGame()) {
        await NetworkManager._prepararEstadoParaNube({
            type: "NOMBRE",
            param,
            actionId
        });
    }
    
    // 5. Ejecutar
    // ... tu código aquí ...
    
    // 6. Actualizar
    UIManager.updateAllUIDisplays();
    saveGameUnified("autosave", true);
    
    return true;
}
```

---

## 🔐 Constantes Clave

```javascript
// Límites
MAX_PLAYERS = 8
MAX_BOARD_SIZE = 75  // Para Magna
TURNS_LIMIT = 500    // Empate después

// IDs especiales
ACTION_TYPE = { MOVE, ATTACK, BUILD, ... }
TERRAIN_TYPES = { PLAINS, FOREST, MOUNTAIN, ... }
UNIT_TYPES = { INFANTRY, CAVALRY, ARCHER, ... }

// Valores
INITIAL_GOLD = 800
INITIAL_FOOD = 300
TURN_DURATION = 3 min (configurable)

// Umbral
MIN_MORALE_TO_FUNCTION = 0
MAX_HEALTH_PER_UNIT = 200
MAX_LEVEL = 5
```

---

**Este cheat sheet es versionado - última actualización: 2 de febrero de 2026**  
**Imprimible: ~4 páginas A4 vertical**
