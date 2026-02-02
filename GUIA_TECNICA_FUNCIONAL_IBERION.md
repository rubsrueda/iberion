# IBERION: Guía Técnica-Funcional Completa

**Versión:** 2.0 | **Última Actualización:** 2 de febrero de 2026  
**Audiencia:** Programadores nuevos, Game Designers, Community Managers  
**Tiempo de lectura:** 45-60 minutos

---

## 📑 Tabla de Contenidos

1. [Introducción Ejecutiva](#introducción-ejecutiva)
2. [Qué es IBERION - Visión del Juego](#qué-es-iberion---visión-del-juego)
3. [Arquitectura General del Sistema](#arquitectura-general-del-sistema)
4. [El Estado del Juego (Game State)](#el-estado-del-juego-game-state)
5. [Flujo Principal de Datos](#flujo-principal-de-datos)
6. [Sistemas Principales](#sistemas-principales)
7. [Estructura de Código](#estructura-de-código)
8. [Convenciones y Patrones](#convenciones-y-patrones)
9. [Cómo Agregar Nuevas Features](#cómo-agregar-nuevas-features)
10. [Debugging y Troubleshooting](#debugging-y-troubleshooting)

---

## Introducción Ejecutiva

**IBERION** es un juego de estrategia táctica hexagonal turn-based desarrollado en **JavaScript vanilla** con sincronización en tiempo real vía **Supabase** (PostgreSQL) y **PeerJS** (P2P).

### Lo Básico en 30 Segundos:
- **Género**: Estrategia táctica estilo Civilization/Total War
- **Plataforma**: Web (navegador moderno)
- **Modo de Juego**: Local vs IA, Local Multijugador, Multijugador en Línea
- **Progresión**: Battle Pass, Leveling, Equipo, Talento
- **Economía**: Múltiples recursos (oro, comida, madera, piedra, hierro)
- **Líneas de Código**: ~80,000+ líneas JavaScript puro

### Quién Lo Necesita Saber:
✅ **Programadores nuevos** → Entiende la arquitectura y cómo contribuir  
✅ **Game Designers** → Comprende la progresión y equilibrio  
✅ **Community Managers** → Entiende qué se puede explicar a jugadores  
✅ **DevOps/QA** → Sabe cómo probar y debuggear  

---

## Qué es IBERION - Visión del Juego

### Concepto Central

IBERION es un juego donde **los jugadores controlan generales en una batalla táctica por territorio, recursos y poder**.

```
┌─────────────────────────────────────────────────────┐
│                    IBERION                          │
│  Batalla Táctica en Hexágonos con Progresión       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  JUGADOR 1              TABLERO HEXAGONAL          │
│  (General Iberia)       (12×15 hasta 24×35)        │
│      ↓                         ↓                    │
│  Recursos ──→ Entrena Unidades ──→ Ataca/Defiende │
│      ↑                         ↓                    │
│  Cosecha Territorio ←─ Controla Ciudades ←────────│
│                                                     │
│  VICTORIA: Eliminar enemigos, Controlar Ciudades   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Modos de Juego

#### 1. **Escaramuza (Skirmish)**
- Partida rápida local o vs IA
- Tablero pequeño/medio (12×15 a 18×25 hexágonos)
- Duración: 10-30 minutos
- 2-4 jugadores
- **Archivos clave**: `campaignManager.js`, `gameFlow.js`

#### 2. **Multijugador Local**
- 2 jugadores en la misma pantalla
- Toman turnos alternados
- Los datos se guardan localmente
- **Archivos clave**: `saveLoad.js`, `gameHistoryManager.js`

#### 3. **Multijugador en Línea**
- Conexión P2P vía PeerJS + Supabase
- Un jugador aloja, el otro se une
- Sincronización en tiempo real
- **Archivos clave**: `networkManager.js`, `supabaseClient.js`

#### 4. **Tronos de Iberia (Magna)**
- Campaña épica con 8 jugadores
- Mapa peninsular real (75×120 hexágonos)
- Múltiples territorios capturables
- Sistema de alianzas
- **Archivos clave**: `allianceManager.js`, `campaignManager.js`

---

## Arquitectura General del Sistema

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE PRESENTACIÓN (UI)                  │
│  HTML Canvas + DOM | Bootstrap Modales | Eventos de Click   │
├─────────────────────────────────────────────────────────────┤
│              CAPA DE LÓGICA DE JUEGO (Game Logic)           │
│  gameFlow.js | unit_Actions.js | gameHistoryManager.js      │
├─────────────────────────────────────────────────────────────┤
│              CAPA DE ESTADO (State Management)               │
│  state.js | gameState {} | board[][] | units[]              │
├─────────────────────────────────────────────────────────────┤
│             CAPA DE PERSISTENCIA (Persistence)              │
│  saveLoad.js | localStorage | Supabase | ReplayStorage      │
├─────────────────────────────────────────────────────────────┤
│              CAPA DE SINCRONIZACIÓN (Networking)            │
│  networkManager.js | PeerJS | Supabase Realtime             │
├─────────────────────────────────────────────────────────────┤
│                 CAPA DE DATOS (Constants)                    │
│  constants.js | CIVILIZATION[] | TERRAIN_TYPES | UNITS[]    │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Ejecución Típico

```javascript
// 1. USUARIO HACE CLIC EN HEXÁGONO
onHexClick(r, c)
  ↓
// 2. SE VALIDA Y SE INTERPRETA LA ACCIÓN
handleActionWithSelectedUnit(r, c, clickedUnit)
  ↓
// 3. SE EJECUTA LA ACCIÓN (Request → Validation → State Mutation)
RequestMoveUnit(selectedUnit, r, c)
  ↓
// 4. EN PARTIDA EN RED: ENVIAR A SERVIDOR
NetworkManager.enviarDatos({ type: 'moveUnit', ... })
  ↓
// 5. ACTUALIZAR UI
UIManager.updateAllUIDisplays()
  ↓
// 6. GUARDAR ESTADO (Autosave)
saveGameUnified("AUTOSAVE", true)
```

---

## El Estado del Juego (Game State)

### Estructura Principal

El archivo **`state.js`** contiene la variable global más importante: `gameState`.

```javascript
let gameState = {
    // ===== INFORMACIÓN BÁSICA =====
    numPlayers: 2,                    // Cantidad de jugadores
    currentPlayer: 1,                 // Jugador cuyo turno es ahora
    currentPhase: "play",             // "deployment" | "play" | "gameOver"
    turnNumber: 42,                   // Turno global
    
    // ===== CONFIGURACIÓN DE JUGADORES =====
    playerTypes: {                    // Tipo de cada jugador
        'player1': 'human',           // "human" | "ai_easy" | "ai_normal" | "ai_hard"
        'player2': 'ai_normal'
    },
    playerCivilizations: {            // Civilización elegida
        1: 'Iberia',
        2: 'Roma'
    },
    playerResources: {                // Recursos de cada jugador
        1: {
            oro: 1500,                // Moneda principal
            comida: 800,              // Para alimentar unidades
            madera: 200,              // Construcción
            piedra: 150,              // Construcción
            hierro: 100,              // Equipamiento
            researchPoints: 50,       // Investigación
            puntosReclutamiento: 300  // Reclutar unidades
        },
        2: { /* igual */ }
    },
    
    // ===== ESTADO DE VICTORIA =====
    winner: null,                     // null | 1 | 2 (ID del ganador)
    eliminatedPlayers: [3, 4],       // Jugadores ya derrotados
    
    // ===== OTROS =====
    cities: [                         // Ciudades capturables
        { r: 5, c: 7, owner: 1, isCapital: true, ... }
    ],
    myPlayerNumber: 1,               // Número del jugador local
    isCampaignBattle: false,         // ¿Es parte de campaña?
    isTutorialActive: false,         // ¿En modo tutorial?
    isRaid: false,                   // ¿En modo incursión?
    
    // ===== CONTROL DE TURNO =====
    turnDurationSeconds: 180,        // Segundos por turno (Infinity = sin límite)
    lastActionTimestamp: 1707...     // Para deduplicar acciones en red
};

// ARRAYS GLOBALES CRÍTICOS (junto a gameState)
let board[][] = [                    // Grid hexagonal 12×15
    [
        { terrain: "plains", owner: 1, structure: null, ... },
        { terrain: "mountain", owner: null, structure: "city", ... }
    ]
];

let units[] = [                      // TODAS las unidades en el tablero
    {
        id: "unit_001",
        name: "Legión I",
        player: 1,                   // Dueño
        r: 5, c: 7,                  // Posición
        regiments: [                 // Componentes de la unidad (5-20 regimientos)
            { type: "Infantería Pesada", health: 200, ... },
            { type: "Arqueros", health: 180, ... }
        ],
        currentHealth: 380,          // Suma de regimientos
        morale: 80,                  // 0-100 (afecta combate y movimiento)
        experience: 245,             // Para leveling
        level: 3,                    // Nivel actual
        hasMoved: false,             // ¿Ha actuado este turno?
        hasAttacked: false,          // ¿Ha atacado este turno?
        ...
    }
];
```

### Diagrama de Relaciones

```
gameState
    ├── numPlayers → Define cuántas iteraciones en turnos
    ├── currentPlayer → Indica quién juega ahora
    ├── currentPhase → Controla qué acciones son válidas
    ├── playerResources[player] → Dinero/Comida/Madera (Constraints)
    ├── playerCivilizations → Bonificaciones de civilización
    ├── eliminatedPlayers → Jugadores ya vencidos
    │
    ├── board[][]  ← Hexágonos (terreno, propietario, estructura)
    │   └── Cada hexágono referencia a:
    │       ├── terrain (plains, mountain, forest, water, etc.)
    │       ├── owner (1, 2, 3... o null si neutral)
    │       ├── structure (city, fortification, ruin, etc.)
    │       └── element (Referencia DOM para visualización)
    │
    └── units[]  ← Todas las unidades
        ├── Referencia su posición board[r][c]
        ├── Contiene regiments[] (Componentes de la unidad)
        ├── Calcula morale basado en:
        │   ├── Terreno (supplies)
        │   ├── Proximidad a aliados/enemigos
        │   └── Historial de combate
        └── Afecta a:
            ├── Movimiento (morale bajo = mov limitado)
            ├── Combate (morale bajo = menos críticos)
            └── Retiro forzado (morale = 0)
```

---

## Flujo Principal de Datos

### Ciclo de un Turno

```
┌─────────────────────────────────────────────────────────────┐
│  1. INICIO DEL TURNO                                        │
│     - Se asigna turno al Jugador N                          │
│     - Se resetean acciones: unit.hasMoved = false           │
│     - Se restauran movimientos: unit.movement = baseMovement
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. JUGADOR HACE ACCIONES                                   │
│     - Clic en hexágono → onHexClick(r, c)                   │
│     - Validar acción → handleActionWithSelectedUnit()       │
│     - Ejecutar acción → RequestMoveUnit / RequestAttack     │
│     - (En RED: Enviar a NetworkManager)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. FIN DE TURNO (Usuario presiona "Finalizar Turno")       │
│     - Procesar mantenimiento:                               │
│       • collectPlayerResources()  ← Recolecta ingresos      │
│       • handleUnitUpkeep()        ← Cobra mantenimiento     │
│       • calculateTradeIncome()    ← Rutas comerciales       │
│       • handleHealingPhase()      ← Regeneración natural    │
│     - Pasar al siguiente jugador → gameState.currentPlayer++
│     - Si vuelta completa: gameState.turnNumber++            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. PREPARACIÓN SIGUIENTE TURNO                             │
│     - resetUnitsForNewTurn()    ← Reset movimento/acciones  │
│     - Iniciar temporizador      ← TurnTimerManager.start()  │
│     - Actualizar UI             ← UIManager.updateAll...()  │
│     - Guardar automáticamente   ← saveGameUnified()         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. TURNO DE IA (si siguiente jugador es IA)                │
│     - Ejecutar lógica de IA → simpleAiTurn()                │
│     - Tomar decisiones sobre movimientos/ataques            │
│     - Llamar a handleEndTurn() automáticamente              │
└─────────────────────────────────────────────────────────────┘
                            ↓
         [Volver a 1 hasta que se cumpla victoria]
```

### Ciclo de Acción (User Action)

```
┌─────────────────────────────────────────────────────────────┐
│  USUARIO HACE CLIC EN HEXÁGONO (r=5, c=7)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  onHexClick(5, 7)  [main.js]                                │
│  ├─ Valida que no sea otra pantalla abierta                 │
│  ├─ Valida que sea turno del jugador (en red)               │
│  ├─ Obtiene datos del hexágono: hexData = board[5][7]       │
│  └─ Obtiene unidad: clickedUnit = getUnitOnHex(5, 7)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ¿Hay unidad seleccionada? (selectedUnit !== null)
         /                                              \
    SÍ /                                                \ NO
      /                                                  \
┌──────────────────────────────┐   ┌─────────────────────────────┐
│ handleActionWithSelectedUnit │   │ onHexClick (continuación)   │
│ (intent: move/attack/other)  │   │                             │
├──────────────────────────────┤   ├─────────────────────────────┤
│ 1. ¿Clic en misma unidad?    │   │ ¿Hay unidad en hexágono?    │
│    → Deseleccionar           │   │                             │
│ 2. ¿Clic en hexágono valid?  │   │ SÍ → selectUnit()           │
│    → Validar movimiento      │   │ NO → showHexInfo()          │
│ 3. ¿Hay enemigos cercanos?   │   │                             │
│    → Validar ataque          │   └─────────────────────────────┘
│ 4. ¿Es construcción válida?  │
│    → Validar construcción    │
└──────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ RequestMoveUnit(unit, 5, 7)  [unit_Actions.js]              │
│                                                             │
│ PASO 1: VALIDACIONES                                        │
│  ✓ ¿Es turno del jugador?                                   │
│  ✓ ¿Tiene movimiento disponible?                            │
│  ✓ ¿Está suministrada (supply)?                             │
│  ✓ ¿El camino es transitable?                               │
│  ✓ ¿No hay unidad enemiga bloqueando?                       │
│                                                             │
│ PASO 2: EN PARTIDA EN RED                                   │
│  → NetworkManager.enviarDatos({                             │
│      type: 'moveUnit',                                      │
│      unit: unit,                                            │
│      targetR: 5, targetC: 7,                                │
│      actionId: crypto.randomUUID()  ← Deduplicar           │
│    })                                                        │
│                                                             │
│ PASO 3: EJECUTAR LOCALMENTE                                 │
│  → unit.r = 5; unit.c = 7                                   │
│  → unit.hasMoved = true                                     │
│  → unit.movement -= moveCost                                │
│  → Actualizar board[r][c]                                   │
│  → Emitir evento de combate (si adyacente a enemigos)       │
│                                                             │
│ PASO 4: ACTUALIZAR UI                                       │
│  → UIManager.updateAllUIDisplays()                          │
│  → renderBoardToDOM()                                       │
│                                                             │
│ PASO 5: GUARDAR                                             │
│  → saveGameUnified("AUTOSAVE", true)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Sistemas Principales

### 1. Sistema de Unidades

#### Estructura de una Unidad

```javascript
const exampleUnit = {
    // IDENTIFICACIÓN
    id: "unit_42",
    name: "Legión II Augustana",
    player: 1,
    
    // POSICIÓN
    r: 10,
    c: 15,
    
    // REGIMIENTOS (Componentes)
    regiments: [
        { type: "Infantería Pesada", health: 200, experience: 50 },
        { type: "Arqueros", health: 180, experience: 30 },
        // ... hasta 20 regimientos
    ],
    
    // SALUD
    currentHealth: 380,           // Suma de regimientos.health
    maxHealth: 400,
    
    // MORAL
    morale: 75,                   // 0-100
    isDisorganized: false,        // Baja moral = desorganizada
    turnsSurrounded: 0,           // Si > 3, posible deserción
    
    // PROGRESIÓN
    experience: 150,
    level: 2,
    talents: ['charge', 'defense_boost'],
    
    // EQUIPO (Opciones)
    equipment: {
        armor: { type: 'legionario_armor', defense_bonus: 20 },
        weapon: { type: 'spatha_sword', attack_bonus: 15 },
        accessory: { type: 'general_amulet', morale_bonus: 10 }
    },
    
    // ESTADO DEL TURNO
    hasMoved: false,              // ¿Se movió este turno?
    hasAttacked: false,           // ¿Atacó este turno?
    movement: 3,                  // Movimiento restante
    
    // HABILIDADES ESPECIALES
    abilities: ['jump', 'charge', 'morale_boost'],
    
    // SUMINISTROS
    supplies: 150,                // Comida transportada
    cargoCapacity: 200,
    
    // METADATA
    element: <DOM element>,       // Referencia al canvas/sprite
    actionId: "uuid-...",         // Para deduplicar en red
    createdAt: 1707...
};
```

#### Tipos de Regimientos

```javascript
// En constants.js → REGIMENT_TYPES
{
    "Infantería Ligera": {
        attack: 40,
        defense: 60,
        health: 200,
        movement: 2,
        attackRange: 1,
        visionRange: 2,
        cost: { oro: 200, upkeep: 20 },
        foodConsumption: 1
    },
    "Arqueros": {
        attack: 70,
        defense: 20,
        health: 150,
        movement: 2,
        attackRange: 2,        // Ataque a distancia
        visionRange: 2,
        cost: { oro: 360, upkeep: 20 }
    },
    "Caballería Pesada": {
        attack: 100,
        defense: 100,
        health: 200,
        movement: 3,           // Más rápida
        attackRange: 0,        // Cuerpo a cuerpo
        visionRange: 2,
        cost: { oro: 600, upkeep: 60 },
        abilities: ["charge"]  // Carga especial
    },
    // ... más tipos
}
```

#### Cálculo de Combate

```
┌─────────────────────────────────────────────────┐
│  simulateBattle(attacker, defender)             │
├─────────────────────────────────────────────────┤
│  1. BASE STATS                                  │
│     AttackValue = attacker.attack               │
│     DefenseValue = defender.defense             │
│                                                 │
│  2. MODIFICADORES                               │
│     + Talento bonificación                      │
│     + Terreno defensivo                         │
│     - Morale bajo                               │
│     - Desorganización                           │
│     × Ventaja de Civilización                   │
│                                                 │
│  3. ROLL                                        │
│     roll = random(1-100)                        │
│     if (roll < AttackValue) {                   │
│         damage = (AttackValue - DefenseValue)   │
│         defender.health -= damage               │
│     }                                           │
│                                                 │
│  4. RESULTADO                                   │
│     if (defender.health <= 0) {                 │
│         handleUnitDestroyed(defender)           │
│     }                                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 2. Sistema de Recursos

#### Los 7 Recursos

| Recurso | Símbolo | Uso Principal | Generación |
|---------|---------|---------------|-----------|
| **Oro** | 💰 | Entrenar unidades, Equipamiento | Ciudades controladas |
| **Comida** | 🌾 | Alimentar unidades (upkeep) | Granjas, Campos |
| **Madera** | 🌲 | Construcción, Equipamiento | Bosques |
| **Piedra** | 🪨 | Construcciones defensivas | Montañas |
| **Hierro** | ⛓️ | Armas y Armaduras | Minas |
| **Puntos de Investigación** | 💡 | Tecnologías (Árbol Tech) | Pasivo cada turno |
| **Puntos de Reclutamiento** | 🎖️ | Crear nuevas unidades | Específico |

#### Ingresos Pasivos (Cada Turno)

```javascript
// En gameFlow.js → collectPlayerResources()
function collectPlayerResources(playerNum) {
    const res = gameState.playerResources[playerNum];
    
    // 1. INGRESOS POR TERRITORIOS CONTROLADOS
    board.forEach(row => {
        row.forEach(hex => {
            if (hex.owner === playerNum && hex.structure === 'city') {
                res.oro += 50;              // Cada ciudad: +50 oro
                res.comida += 30;           // Cada ciudad: +30 comida
            }
        });
    });
    
    // 2. INGRESOS PASIVOS FIJOS
    res.researchPoints += 5;                // Investigación siempre crece
    
    // 3. INGRESOS POR RUTAS COMERCIALES
    const tradeIncome = calculateTradeIncome(playerNum);
    res.oro += tradeIncome;
    
    // 4. GASTOS DE MANTENIMIENTO
    units.filter(u => u.player === playerNum).forEach(unit => {
        unit.regiments.forEach(reg => {
            const upkeep = REGIMENT_TYPES[reg.type].upkeep;
            res.oro -= upkeep;              // ← Costo de mantener unidades
            res.comida -= reg.foodConsumption;
        });
    });
    
    // 5. VALIDAR NO NEGATIVOS
    Object.keys(res).forEach(key => {
        if (res[key] < 0) res[key] = 0;     // Nunca negativos
    });
}
```

---

### 3. Sistema de Turnos

#### Fases del Juego

```
DEPLOYMENT PHASE
├─ Cada jugador coloca unidades iniciales
├─ Límite de despliegue configurable
└─ Al final todos → PLAY PHASE

PLAY PHASE
├─ Turnos normales cyclados
├─ Mantenimiento, Recolección, Combate
├─ Condiciones de Victoria se verifican
└─ Fin de Partida al detectar ganador

GAMEOVER PHASE
├─ Mostrar Crónica (Legacy UI)
├─ Guardar Replay
└─ Volver al Menú Principal
```

#### Duración del Turno

```javascript
// En constants.js
const TURN_TIME_OPTIONS = {
    'none': { seconds: Infinity, label: 'Sin límite' },
    '90':   { seconds: 90,       label: '90 segundos' },
    '180':  { seconds: 180,      label: '3 minutos' },
    '300':  { seconds: 300,      label: '5 minutos' }
};

// En gameFlow.js → handleEndTurn()
if (duration !== Infinity && typeof duration === 'number') {
    TurnTimerManager.start(duration);  // Inicia reloj visual
}
```

---

### 4. Sistema de Moral

#### Cálculo de Morale

```javascript
function calculateMorale(unit) {
    let morale = 50; // Base
    
    // FACTORES POSITIVOS
    if (isHexSupplied(unit.r, unit.c, unit.player)) {
        morale += 20; // Suministrada = +20
    }
    
    const alliesNearby = getUnitOnHex(...).filter(u => 
        u.player === unit.player && hexDistance(...) <= 2
    );
    morale += alliesNearby.length * 5; // +5 por cada aliado cercano
    
    // FACTORES NEGATIVOS
    const enemiesNearby = getUnitOnHex(...).filter(u => 
        u.player !== unit.player && hexDistance(...) <= 3
    );
    morale -= enemiesNearby.length * 10; // -10 por cada enemigo cercano
    
    if (unit.turnsSurrounded >= 2) {
        morale -= 30; // Rodeada = -30
    }
    
    // HISTORIAL DE COMBATE
    morale -= unit.casualtiesThisBattle * 2;
    
    // CAPPING
    return Math.max(0, Math.min(100, morale));
}
```

#### Efectos de Morale Baja

| Morale | Efecto |
|--------|--------|
| **80-100** | Optimista - Sin penalizaciones |
| **50-80** | Normal - Efectos estándar |
| **20-50** | Baja - -30% movimiento, penalización en ataque |
| **0-20** | Rota - Unit `isDisorganized`, puede desertar |
| **0** | Destruida - Unidad se desintegra |

---

### 5. Sistema de Suministros

#### ¿Qué es "Supply"?

Una unidad está **suministrada** si puede acceder a una ciudad amiga mediante caminos o control territorial.

```javascript
function isHexSupplied(r, c, playerNum) {
    // 1. Buscar todas las ciudades del jugador
    const playerCities = gameState.cities.filter(city => city.owner === playerNum);
    
    if (playerCities.length === 0) return false;
    
    // 2. Para cada ciudad, hacer BFS (Breadth-First Search)
    for (const city of playerCities) {
        const path = bfsPathfinding(
            { r, c },           // Hexágono en cuestión
            { r: city.r, c: city.c },  // Ciudad amiga
            playerNum           // Jugador
        );
        
        // 3. Si hay camino (a través de territorio amigo), está suministrada
        if (path && path.length > 0) {
            return true;
        }
    }
    
    return false;  // No suministrada
}

// IMPLICACIONES:
// ✓ Suministrada → Puede moverse libremente
// ✗ Sin suministra → Movimiento limitado, no puede atacar
```

---

### 6. Sistema de Civilizaciones

#### Bonificaciones de Civilización

```javascript
const CIVILIZATIONS = {
    "Iberia": {
        name: "Iberia",
        description: "Expertos en terreno montañoso",
        bonuses: {
            defenseInMountains: 20,      // +20 defensa en montañas
            mountainTraversal: 1.5,      // 1.5× movimiento en montañas
            researchBonus: 1.1,          // 10% más investigación
        },
        units: ["Infantería Ligera", "Arqueros"]  // Unidades exclusivas
    },
    "Roma": {
        name: "Roma",
        description: "Maestros de la Ingeniería",
        bonuses: {
            buildingCost: 0.8,           // 20% más barato construir
            fortificationDefense: 30,    // +30 defensa en fortifications
            goldGeneration: 1.15         // 15% más oro
        },
        units: ["Infantería Pesada", "Legionarios"]
    },
    // ... más civilizaciones
};
```

---

## Estructura de Código

### Organización de Archivos

```
/workspaces/iberion/
│
├── 📄 index.html                    ← HTML principal (entry point)
├── 📄 manifest.json                 ← PWA configuration
│
├── 🎮 LÓGICA DE JUEGO
│   ├── main.js                      ← Punto de entrada + listeners UI
│   ├── gameFlow.js                  ← Turnos, victoria, lógica principal
│   ├── state.js                     ← Estado global (gameState, board, units)
│   ├── constants.js                 ← Todas las constantes (Civs, Unidades, Terreno)
│   ├── utils.js                     ← Funciones helper (hex math, búsquedas)
│   ├── unit_Actions.js              ← Mover, Atacar, Dividir unidades (3.7KB)
│   ├── boardManager.js              ← Generación y gestión del mapa
│   └── gameHistoryManager.js        ← Guardar/Cargar partidas
│
├── 🤖 IA
│   ├── aiLogic.js
│   ├── ai_gameplayLogic.js
│   ├── ai_deploymentLogic.js
│   └── ai_enhanced_functions.js
│
├── 🌐 RED Y PERSISTENCIA
│   ├── networkManager.js            ← P2P (PeerJS) + Supabase
│   ├── playerDataManager.js         ← Autenticación, Perfiles
│   ├── saveLoad.js                  ← Guardado/Carga local
│   ├── supabaseClient.js            ← Cliente de Supabase
│   └── replayStorage.js             ← Almacenamiento de replays
│
├── 🎨 UI Y VISUALIZACIÓN
│   ├── uiUpdates.js                 ← Actualizar paneles, infoboxes
│   ├── modalLogic.js                ← Lógica de modales (+4.5KB)
│   ├── legacyUI.js                  ← Pantalla de "Crónica" (post-game)
│   ├── gameHistoryUI.js             ← UI del historial de partidas
│   ├── ledgerUI.js                  ← Cuaderno de estado
│   ├── domElements.js               ← Referencias a elementos DOM
│   └── debugConsole.js              ← Consola de debug (Ctrl+Shift+D)
│
├── 📊 SISTEMAS SECUNDARIOS
│   ├── BattlePassManager.js         ← Pase de Batalla, Niveles
│   ├── talentTree.js                ← Sistema de talentos
│   ├── equipment.js                 ← Equipamiento, Stats
│   ├── equipment.js                 ← Forja de equipamiento
│   ├── bank_logic.js                ← Mercado de comercio
│   ├── allianceManager.js           ← Sistema de Alianzas (Magna)
│   ├── raidManager.js               ← Incursiones (Raids)
│   ├── inventoryLogic.js            ← Bolsa de objetos
│   └── audioManager.js              ← Sonidos y música
│
├── 📚 OTRAS CARACTERÍSTICAS
│   ├── campaignManager.js           ← Campaña, Escenarios
│   ├── chronicleIntegration.js      ← Integración de crónicas
│   ├── tutorialScripts.js           ← Tutorial interactivo
│   ├── statTracker.js               ← Estadísticas de partida
│   ├── autoMoveManager.js           ← Sistema de movimiento automático
│   ├── autoResearchManager.js       ← Investigación automática
│   ├── tournamentManager.js         ← Torneos (si existe)
│   └── cheats.js                    ← Comandos de debug
│
├── 📖 ESTILOS
│   └── style.css                    ← Estilos globales (~6500 líneas)
│
├── 🗂️ RECURSOS
│   ├── images/
│   │   ├── sprites/                 ← Sprites de unidades
│   │   ├── terrain/                 ← Terrenos
│   │   └── ui/                      ← Botones, iconos
│   ├── sounds/
│   ├── data/
│   │   └── scenarios/               ← Configuración de escenarios
│   └── fonts/
│
└── 📚 DOCUMENTACIÓN
    ├── README.md                    ← Introducción del proyecto
    ├── GUIA_TECNICA_FUNCIONAL.md   ← ← ESTE ARCHIVO
    ├── copilot-instructions.md      ← Instrucciones para Copilot
    └── CHANGELOG.md                 ← Historial de cambios
```

### Patrones Principales de Código

#### Patrón 1: Request-Based Actions (Network-Safe)

```javascript
// NUNCA hagas directamente:
selectedUnit.r = 5;
selectedUnit.c = 7;  // ❌ Desincroniza en red

// SIEMPRE usa Request:
RequestMoveUnit(selectedUnit, 5, 7);  // ✅ Se sincroniza

// Implementación de RequestMoveUnit:
function RequestMoveUnit(unit, targetR, targetC) {
    // 1. VALIDACIONES LOCALES
    if (!canUnitMove(unit, targetR, targetC)) {
        logMessage("Movimiento inválido", "error");
        return;
    }
    
    // 2. EN RED: Enviar al servidor/anfitrión
    if (isNetworkGame()) {
        NetworkManager.enviarDatos({
            type: 'moveUnit',
            unit: unit,
            targetR, targetC,
            actionId: crypto.randomUUID()  // Deduplicar
        });
        return;  // Esperar confirmación del servidor
    }
    
    // 3. EJECUTAR LOCALMENTE (Si no es red o es host)
    moveUnitInternal(unit, targetR, targetC);
}

function moveUnitInternal(unit, targetR, targetC) {
    // Mutación segura del estado
    unit.r = targetR;
    unit.c = targetC;
    unit.hasMoved = true;
    
    // Actualizar UI
    UIManager.updateAllUIDisplays();
    
    // Guardar
    saveGameUnified("AUTOSAVE", true);
}
```

#### Patrón 2: Manager Objects

```javascript
// Patrón: Namespace + Métodos
const MyManager = {
    state: { /* private data */ },
    
    // Método público
    open: function() {
        console.log('[MyManager] Abriendo...');
        // Lógica
    },
    
    // Método privado (convención: _)
    _prepare: function() {
        // Preparación interna
        // Elimina referencias a DOM antes de serializar
    },
    
    // Inicializador
    init: function() {
        // Ejecutar una vez al inicio del juego
        console.log('[MyManager] Inicializado');
    }
};

// USO:
MyManager.init();
MyManager.open();
```

#### Patrón 3: State Validation

```javascript
// Antes de permitir acción, validar
function validateAction(actionType, unit, target) {
    // 1. ¿Es turno del jugador?
    if (gameState.currentPlayer !== gameState.myPlayerNumber) {
        return { valid: false, reason: "No es tu turno" };
    }
    
    // 2. ¿Unidad está en condición válida?
    if (!unit || unit.currentHealth <= 0) {
        return { valid: false, reason: "Unidad destruida" };
    }
    
    // 3. ¿Es acción válida para esta fase?
    if (gameState.currentPhase === "deployment" && actionType !== "place") {
        return { valid: false, reason: "Fase incorrecta" };
    }
    
    // 4. ¿Hay suficientes recursos?
    if (actionType === "recruit" && !canAfford(unit)) {
        return { valid: false, reason: "No hay recursos" };
    }
    
    return { valid: true };
}

// USAR:
const validation = validateAction('move', selectedUnit, targetHex);
if (!validation.valid) {
    logMessage(validation.reason);
    return;
}
// Proceder...
```

---

## Convenciones y Patrones

### Nomenclatura

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| **Variable global** | camelCase | `gameState`, `selectedUnit`, `board` |
| **Constante** | UPPERCASE_SNAKE | `HEX_WIDTH`, `MAX_HEALTH` |
| **Función** | camelCase o Request... | `onHexClick()`, `RequestMoveUnit()` |
| **Clase/Constructor** | PascalCase | `NetworkManager` (aunque es object) |
| **Private (convención)** | _privateMethod | `_prepareData()` |
| **Boolean** | is/has/can... | `isSelected`, `hasAttacked`, `canMove` |
| **Evento** | on... | `onHexClick`, `onTurnEnd` |

### Log Debugging

```javascript
// SIEMPRE usa tags para debugging
console.log('[GameFlow] Turno del Jugador 1 iniciado');
console.warn('[Network] Conexión perdida, reconectando...');
console.error('[Combat] Error al calcular daño:', errorDetails);

// FORMATO:
// [Sistema] Mensaje descriptivo
// Ejemplo: [NetworkManager] | [AI] | [Combat] | [UI] | etc.
```

### Errores Comunes

| ❌ Incorrecto | ✅ Correcto | Razón |
|---------------|-----------|----|
| `unit.r = 5` | `RequestMoveUnit(unit, 5, c)` | Desincronia en red |
| `board[5][7].owner = 1` | Usar RequestCapture o similar | Cambio de estado sin validar |
| Directamente mutar `gameState` | Usar setters/Request functions | Impredecible en red |
| `localStorage.setItem` en método critico | Usar `saveGameUnified` | Puede fallar, sin manejo de error |
| Crear nuevo objeto unidad sin `id` | Usar `createUnit()` helper | Sin ID = bugs difíciles |

---

## Cómo Agregar Nuevas Features

### Ejemplo 1: Agregar Nueva Unidad (Fácil)

**Objetivo:** Agregar "Ninja" (unidad especial rápida y sigilosa)

**Paso 1:** En `constants.js`, añadir a `REGIMENT_TYPES`:

```javascript
"Ninja": {
    category: "special",
    cost: { oro: 800, upkeep: 50 },
    attack: 90,
    defense: 40,
    health: 150,
    movement: 5,           // ← MUY RÁPIDO
    sprite: 'images/sprites/ninja.png',
    visionRange: 3,
    attackRange: 1,
    initiative: 18,        // ← RÁPIDO EN COMBATE
    goldValueOnDestroy: 500,
    foodConsumption: 1,
    abilities: ["stealth", "assassination"]  // ← HABILIDADES
};
```

**Paso 2:** Implementar habilidades en `utils.js`:

```javascript
function calculateTalentBonuses(unit) {
    let bonuses = { /* ... */ };
    
    unit.talents.forEach(talent => {
        switch(talent) {
            case 'stealth':
                bonuses.visionRangeReduction = 2;  // Enemigos lo ven 2 hexos menos
                break;
            case 'assassination':
                bonuses.crimeChance = 0.15;        // 15% crítico automático
                break;
        }
    });
    
    return bonuses;
}
```

**Paso 3:** Probar en Tutorial/Skirmish.

---

### Ejemplo 2: Agregar Nueva Civilización (Medio)

**Objetivo:** Agregar "Cartago" con bonos comerciales

**Paso 1:** En `constants.js`, añadir a `CIVILIZATIONS`:

```javascript
"Cartago": {
    name: "Cartago",
    description: "Maestros del comercio y la navegación",
    bonuses: {
        tradeRouteIncome: 1.3,          // +30% ingresos comercio
        navalUnitCost: 0.85,            // 15% más barato naval
        shipVision: 1.5,                // Barcos ven 1.5× más
        market: { unlock_trade: true }
    },
    units: ["Patache", "Barco de Guerra"]
};
```

**Paso 2:** Modificar lógica de ingresos en `gameFlow.js`:

```javascript
function calculateTradeIncome(playerNum) {
    const civ = gameState.playerCivilizations[playerNum];
    const civBonus = CIVILIZATIONS[civ]?.bonuses?.tradeRouteIncome || 1;
    
    let income = 0;
    units
        .filter(u => u.player === playerNum && u.tradeRoute)
        .forEach(unit => {
            income += 50 * civBonus;  // ← APLICAR BONUS
        });
    
    return income;
}
```

**Paso 3:** Agregar selector en `modalLogic.js`:

```javascript
// En setupScreen (selector de civilizaciones)
<select id="player1Civ">
    <option value="Iberia">Iberia</option>
    <option value="Roma">Roma</option>
    <option value="Cartago">Cartago</option>  ← NUEVO
</select>
```

---

### Ejemplo 3: Agregar Nuevo Sistema (Avanzado)

**Objetivo:** Sistema de "Piratas" que atacan al azar

**Paso 1:** Crear archivo `pirateManager.js`:

```javascript
const PirateManager = {
    activePirates: [],
    
    init: function() {
        console.log('[PirateManager] Inicializado');
    },
    
    // Ejecutar cada turno
    processTurn: function() {
        const probability = 0.1;  // 10% de aparición
        
        if (Math.random() < probability) {
            this.spawnPirate();
        }
        
        // Mover piratas existentes
        this.activePirates.forEach(pirate => {
            this.moveTowardCaravan(pirate);
            this.checkCombat(pirate);
        });
    },
    
    spawnPirate: function() {
        // Crear unidad pirata enemiga
        const pirate = createUnit(9, 'Piratas');  // Player 9 = Hostiles
        pirate.r = Math.floor(Math.random() * BOARD_ROWS);
        pirate.c = Math.floor(Math.random() * BOARD_COLS);
        
        this.activePirates.push(pirate);
        console.log('[PirateManager] Piratas aparecen en', pirate.r, pirate.c);
    },
    
    moveTowardCaravan: function(pirate) {
        // Lógica de movimiento
        const caravans = units.filter(u => u.isCaravan);
        if (caravans.length === 0) return;
        
        const nearest = caravans.sort((a, b) => 
            hexDistance(pirate.r, pirate.c, a.r, a.c) -
            hexDistance(pirate.r, pirate.c, b.r, b.c)
        )[0];
        
        // Mover hacia caravana
        const newPos = getAdjacentHexToward(pirate, nearest);
        pirate.r = newPos.r;
        pirate.c = newPos.c;
    },
    
    checkCombat: function(pirate) {
        const nearby = getUnitOnHex(pirate.r, pirate.c);
        if (nearby && nearby.player !== 9) {
            // Combate
            console.log('[PirateManager] ¡Combate con Piratas!');
            simulateBattle(pirate, nearby);
        }
    }
};
```

**Paso 2:** Integrar en `gameFlow.js` → `handleEndTurn()`:

```javascript
// En la función handleEndTurn, agregar:
if (typeof PirateManager !== 'undefined') {
    PirateManager.processTurn();
}
```

**Paso 3:** Llamar `init()` en `main.js`:

```javascript
if (typeof PirateManager !== 'undefined') {
    PirateManager.init();
}
```

---

## Debugging y Troubleshooting

### Debug Console (Ctrl+Shift+D)

```javascript
// Abre consola integrada en el juego
// Comandos útiles:

// 1. Inspeccionar estado
gameState          // Ver todo el estado del juego
gameState.currentPlayer
gameState.playerResources[1]

// 2. Inspeccionar tablero
board[5][7]        // Ver hexágono específico
board[5][7].owner = 1  // Cambiar propietario (para pruebas)

// 3. Inspeccionar unidades
units[0]           // Primera unidad
units.filter(u => u.player === 1)  // Todas las unidades del J1

// 4. Manipular juego
gameState.turnNumber = 50              // Saltar a turno 50
gameState.currentPlayer = 2            // Forzar turno J2
gameState.playerResources[1].oro = 9999  // Dinero infinito (para test)

// 5. Funciones útiles
handleEndTurn()            // Pasar turno manualmente
resetGameStateVariables(2) // Resetear juego
UIManager.updateAllUIDisplays()  // Actualizar UI

// 6. Logs
// Buscar en consola del navegador (F12)
// Filtrar por "[GameFlow]" para ver logs de turnos
// Filtrar por "[Network]" para ver sincronización
```

### Errores Comunes y Soluciones

#### Error: "selectedUnit is undefined"

```javascript
// CAUSA: selectedUnit nunca fue inicializado
// SOLUCIÓN:
if (!selectedUnit) {
    console.warn("No hay unidad seleccionada");
    return;
}
```

#### Error: "Cannot read property 'r' of undefined"

```javascript
// CAUSA: unit es null/undefined
// SOLUCIÓN: Validar siempre
const unit = getUnitById(unitId);
if (!unit) {
    console.error("Unidad no encontrada:", unitId);
    return;
}
```

#### Batalla Desincronizada (En Red)

```javascript
// CAUSA: Múltiples clics causaron acciones duplicadas
// SOLUCIÓN: Verificar actionId

// En RequestAttack:
const actionId = crypto.randomUUID();
NetworkManager.enviarDatos({
    type: 'attack',
    actionId,  // ← CRÍTICO
    // ...
});

// En procesamiento:
if (gameState.lastProcessedAction === actionId) {
    return;  // Ya procesado
}
```

#### Unidad Desaparece del Mapa

```javascript
// CAUSA: Posición no actualizada en board[][]
// SOLUCIÓN: Siempre sincronizar board y units

// CORRECTO:
moveUnitInternal(unit, newR, newC) {
    // 1. Limpiar posición anterior
    if (board[unit.r]?.[unit.c]) {
        board[unit.r][unit.c].unit = null;
    }
    
    // 2. Actualizar unit
    unit.r = newR;
    unit.c = newC;
    unit.hasMoved = true;
    
    // 3. Actualizar board
    board[newR][newC].unit = unit;
    
    // 4. UI
    renderBoardToDOM();
}
```

---

## Cheat Sheet Rápido (Para Nuevos Devs)

### "Quiero..."

| Objetivo | Función/Archivo |
|----------|---|
| Mover una unidad | `RequestMoveUnit()` en `unit_Actions.js` |
| Atacar | `RequestAttack()` en `unit_Actions.js` |
| Cambiar de turno | `handleEndTurn()` en `gameFlow.js` |
| Guardar partida | `saveGameUnified()` en `saveLoad.js` |
| Enviar datos en red | `NetworkManager.enviarDatos()` |
| Mostrar mensaje | `logMessage()` en `utils.js` |
| Actualizar UI | `UIManager.updateAllUIDisplays()` |
| Cambiar recursos | `gameState.playerResources[1].oro += 100` |
| Crear nueva unidad | Usar helper, ver `unit_Actions.js` |
| Ejecutar código AI | `simpleAiTurn()` en `ai_gameplayLogic.js` |

### Archivos Críticos (Top 10)

1. **state.js** - Estado global
2. **gameFlow.js** - Lógica de turnos
3. **unit_Actions.js** - Acciones de unidades
4. **main.js** - Entry point + listeners
5. **networkManager.js** - Sincronización red
6. **constants.js** - Todas las configuraciones
7. **utils.js** - Funciones helper
8. **uiUpdates.js** - Actualizar pantalla
9. **modalLogic.js** - Interfaz de usuario
10. **saveLoad.js** - Persistencia

---

## Resumen Final

### Lo Más Importante

1. **NUNCA mutues `gameState` directamente** → Usa Request functions
2. **SIEMPRE valida antes de ejecutar** → Tipo, turno, recursos
3. **SIEMPRE actualiza UI después de cambios** → `UIManager.updateAllUIDisplays()`
4. **SIEMPRE guarda en el momento correcto** → `saveGameUnified()`
5. **SIEMPRE usa tags en logs** → `console.log('[Sistema] Mensaje')`

### Para Empezar Hoy

1. Lee `state.js` completo (15 min)
2. Lee `gameFlow.js` hasta `handleEndTurn()` (20 min)
3. Abre `main.js` y busca `onHexClick` (10 min)
4. Abre `unit_Actions.js` y busca `RequestMoveUnit` (10 min)
5. Abre Debug Console (Ctrl+Shift+D) y experimenta

### Próximos Pasos

- [ ] Hacer una Escaramuza local (20 min jugando)
- [ ] Ver un Replay (5 min)
- [ ] Cambiar una constante y ver el efecto (10 min)
- [ ] Crear una nueva unidad (30 min)
- [ ] Depurar una acción con Debug Console (15 min)

---

## FAQ - Preguntas Frecuentes

**P: ¿Cómo entiendo el flujo de la red?**  
R: Lee `networkManager.js` líneas 1-50 para la arquitectura. Luego busca `enviarDatos` y `onDatosRecibidos`.

**P: ¿Dónde se calcula el daño?**  
R: `simulateBattle()` en `gameFlow.js`.

**P: ¿Cómo se generan mapas?**  
R: `boardManager.js` → `generateMap()` y `generateTerrain()`.

**P: ¿Cómo funcionan los Talentos?**  
R: `talentTree.js` define árbol, `utils.js` calcula bonificaciones en combate.

**P: ¿Dónde se guarda la partida?**  
R: `localStorage` (local) + `Supabase` (nube) en `saveLoad.js`.

---

**Última actualización:** 2 de febrero de 2026  
**Autor:** GitHub Copilot + Comunidad Iberion  
**Licencia:** Uso interno solamente
