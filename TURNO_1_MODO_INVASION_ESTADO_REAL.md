# TURNO 1 - MODO INVASIÓN: ESTADO REAL DEL JUEGO

## Introducción
Este documento describe **exactamente** qué existe en el juego al inicio del Turno 1 en modo invasión. No hay especulación ni diseño. Solo la verdad del código.

---

## ESTADO DEL TABLERO (board[][])

### Configuración de Mapa
- **Tamaño**: B_ROWS × B_COLS (variables de boardManager.js)
- **Tipo**: NO es naval (no es archipiélago)
- **Modo**: `gameState.gameMode === 'invasion'`

### Territorio del Jugador P1 (Atacante)
**Ubicación de Capital:**
```
const attackerBaseR = 1
const attackerBaseC = 2
```
- Capital: "Base de Invasión" en hexágono (1, 2)
- Estructura inicial: 'Aldea'
- Propietario: `board[1][2].owner = 1`

**Zona de Desembarco (CÁLCULO EXACTO):**
```
const attackerDeploymentRadius = INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS
Valor real: DEPLOYMENT_RADIUS: 1
```
- Hexágonos controlados: Todos donde `hexDistance(1, 2, r, c) <= 1`
- **Cantidad EXACTA: 7 hexágonos** (capital + 6 vecinos adyacentes)
- Todos con `board[r][c].owner = 1`
- Patrón radial: círculo de Manresa de radio 1 alrededor de (1,2)

---

### Territorio de la IA (P2 - Defensor)
**Ubicación de Capital:**
```
const defenderCapitalR = B_ROWS - 2
const defenderCapitalC = B_COLS - 3
```
- Capital: "Capital del Reino" en hexágono (B_ROWS-2, B_COLS-3)
- Estructura inicial: 'Ciudad'
- Propietario: `board[B_ROWS-2][B_COLS-3].owner = 2`

**Ciudades Adicionales en modo invasión (según código):**
```
const additionalCities = INVASION_MODE_CONFIG.DEFENDER_CITIES - 1
Valor real: DEFENDER_CITIES: 5
```
- Cantidad: 5 ciudades totales (1 capital + 4 adicionales)
- Ubicación: distribuidas aleatoriamente en zona:
  - Rango R: `Math.floor(B_ROWS * 0.3)` a `Math.floor(B_ROWS * 0.3) + B_ROWS * 0.5`
  - Rango C: `Math.floor(B_COLS * 0.3)` a `Math.floor(B_COLS * 0.3) + B_COLS * 0.5`
- En el código se crean con `addCityToBoardData(..., 2, ...)` y `board[r][c].owner = 2`
- **Además**, después se ejecuta `generateBarbarianCities()` que crea ciudades **player 9** separadas (no reemplaza estas)

**Resto del Territorio (CÁLCULO EXACTO):**
```
Algoritmo: for cada hex (r,c) en board
  if !board[r][c].owner && hexDistance(1, 2, r, c) > 1:
    board[r][c].owner = 2
```
- **Cantidad EXACTA: (B_ROWS × B_COLS) - 7 hexágonos**
- Ejemplo: En mapa 15×15 = 225 - 7 = **218 hexágonos para P2**
- En mapa 20×20 = 400 - 7 = **393 hexágonos para P2**
- Todos con `board[r][c].owner = 2`
- Ratio territorial P2/P1: aprox. **30:1** en mapa estándar

---

## RECURSOS INICIALES (gameState.playerResources)

### Jugador P1 (Atacante)
```javascript
gameState.playerResources[1] = {
    oro: 40000,              // INVASION_MODE_CONFIG.ATTACKER_RESOURCES
    comida: 2000,
    madera: 1000,
    piedra: 500,
    hierro: 500,
  researchPoints: 100
}
```
[constants.js:490-498]

### IA P2 (Defensor)
```javascript
gameState.playerResources[2] = {
    oro: 1000,              // INVASION_MODE_CONFIG.DEFENDER_RESOURCES
    comida: 1000,
    madera: 800,
    piedra: 400,
    hierro: 300,
  researchPoints: 50
}
```
[constants.js:500-507]

**Asimetría Clave:**
- Atacante (P1): 40× más oro que Defensor
- Defensor (P2): control territorial masivo (fórmula exacta en tabla)
- El atacante **paga su conquista con oro**, el defensor **paga con territorio**

**Nota sobre puntos de reclutamiento:**
- `INVASION_MODE_CONFIG` no define `puntosReclutamiento`. Si se usa, proviene de otra inicialización o empieza en `0/undefined`.

---

## UNIDADES INICIALES (units[])

### Fase: "deployment"
En `gameState.currentPhase === "deployment"`, ningún jugador ha desplegado unidades todavía.

**Estado al Turno 1, inicio:**
- `units = []` (array vacío)
- Límites de despliegue:
  - P1 (Atacante): `INVASION_MODE_CONFIG.ATTACKER_DEPLOYMENT_UNIT_LIMIT: 7` regimientos máximo [constants.js:516]
  - P2 (Defensor): Puede desplegar en radio `DEFENDER_DEPLOYMENT_RADIUS: 2` desde cualquier ciudad [constants.js:517]

---

## CIUDADES (gameState.cities[])

### Ciudades Creadas
```javascript
gameState.cities = [
    {
        id: ?,
        owner: 1,
        r: 1,
        c: 2,
        name: "Base de Invasión",
        isCapital: true,
        structure: 'Aldea'
    },
    {
        id: ?,
        owner: 2,
        r: (B_ROWS - 2),
        c: (B_COLS - 3),
        name: "Capital del Reino",
        isCapital: true,
        structure: 'Ciudad'
    },
    {
        id: ?,
        owner: 2,
        r: <random>,
        c: <random>,
        name: "Ciudad 1",
        isCapital: false,
        structure: 'Ciudad'
    },
    {
        id: ?,
        owner: 2,
        r: <random>,
        c: <random>,
        name: "Ciudad 2",
        isCapital: false,
        structure: 'Aldea'
    },
    {
        id: ?,
        owner: 2,
        r: <random>,
        c: <random>,
        name: "Ciudad 3",
        isCapital: false,
        structure: 'Aldea'
    },
    {
        id: ?,
        owner: 2,
        r: <random>,
        c: <random>,
        name: "Ciudad 4",
        isCapital: false,
        structure: 'Aldea'
    }
]
```

**Total:** 6 ciudades (1 atacante + 5 defensor)

---

## ESTADO GLOBAL (gameState)

```javascript
gameState = {
    numPlayers: 2,
    currentPlayer: 1,              // Comienza con el Jugador
    currentPhase: "deployment",    // Fase inicial
    turnNumber: 1,
    
    playerTypes: {
        player1: 'human',          // El jugador controla P1
        player2: 'ai'              // La IA controla P2
    },
    
    playerCivilizations: {
        1: '<nombre>',             // Según escenario
        2: '<nombre>'
    },
    
    gameMode: 'invasion',
    
    playerResources: { ... },      // Ver sección superior
    
    cities: [ ... ],               // Ver sección superior
    
    capitalCityId: {
        1: { r: 1, c: 2 },
        2: { r: B_ROWS-2, c: B_COLS-3 }
    },
    
    unitsPlacedByPlayer: {
        1: 0,
        2: 0
    },
    
    deploymentUnitLimitByPlayer: {
        1: 7,
        2: <unlimited o número>
    }
}
```

---

## LOS "SENTIDOS" DE LA IA - FUNCIONES REQUERIDAS

La IA **NO puede inventar información**. Todo lo que "siente" debe venir de funciones que **procesan datos reales** de `gameState`, `board`, y `units`.

Estas funciones son **OBLIGATORIAS** para que la IA tome decisiones. Si no existen, la IA está ciega:

### A) FUNCIONES DE DETECCIÓN (Información sobre Enemigo)

```javascript
/**
 * Detectar todas las unidades enemigas y sus ubicaciones
 * @param {number} enemyPlayer - Player ID del enemigo (1 o 2)
 * @return {Array} Array de unidades con {id, r, c, poder, tipo, ...}
 */
function detectar_unidades_enemigas(enemyPlayer) {
  return units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
}

/**
 * Detectar enemigo cerca de objetivos propios (define el frente real)
 * @param {number} myPlayer - Player ID de la IA
 * @param {Array} objetivos - Hexes clave propios (ciudades, recursos, infra)
 * @param {number} threatRange - Radio de amenaza
 * @return {Array} Unidades enemigas que amenazan objetivos propios
 */
function detectar_enemigo_en_tierra(myPlayer, objetivos, threatRange = 3) {
  const enemyPlayer = myPlayer === 1 ? 2 : 1;
  return units.filter(u =>
    u.player === enemyPlayer && 
    u.currentHealth > 0 &&
    objetivos.some(hex => hexDistance(u.r, u.c, hex.r, hex.c) <= threatRange)
  );
}

/**
 * Definir el frente real a partir de contactos entre unidades
 * @param {number} myPlayer
 * @param {number} contactRange - Distancia de contacto
 * @return {Array} Hexes de frente donde hay interacción directa
 */
function detectar_frente_de_batalla(myPlayer, contactRange = 2) {
  const enemyPlayer = myPlayer === 1 ? 2 : 1;
  const misUnidades = units.filter(u => u.player === myPlayer && u.currentHealth > 0);
  const unidadesEnemigas = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);

  let frente = [];
  for (let mi of misUnidades) {
    for (let en of unidadesEnemigas) {
      if (hexDistance(mi.r, mi.c, en.r, en.c) <= contactRange) {
        frente.push({ r: mi.r, c: mi.c, enemigo: { r: en.r, c: en.c } });
      }
    }
  }
  return frente;
}

/**
 * Detectar ciudades enemigas
 * @param {number} enemyPlayer
 * @return {Array} Ciudades con {r, c, name, owner, isCapital, ...}
 */
function detectar_ciudades_enemigas(enemyPlayer) {
  return gameState.cities.filter(city => city.owner === enemyPlayer);
}

/**
 * Detectar capital enemiga específicamente
 * @param {number} enemyPlayer
 * @return {Object} Capital con {r, c, name}
 */
function detectar_capital_enemiga(enemyPlayer) {
  return gameState.cities.find(city => city.owner === enemyPlayer && city.isCapital);
}

/**
 * Detectar si enemigo tiene ruta de suministro completa desde unidad a ciudad
 * @param {number} unitR, unitC - Posición de unidad
 * @param {number} enemyPlayer
 * @return {boolean} true si unidad está conectada
 */
function detectar_si_unidad_conectada(unitR, unitC, enemyPlayer) {
  // BFS desde (unitR, unitC) buscando ciudad propia
  let visited = new Set();
  let queue = [{r: unitR, c: unitC}];
  
  while (queue.length > 0) {
    let current = queue.shift();
    let key = `${current.r},${current.c}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // ¿Es ciudad del enemigo?
    if (board[current.r]?.[current.c]?.isCity && 
        board[current.r][current.c].owner === enemyPlayer) {
      return true;
    }
    
    // Expandir a vecinos del mismo dueño
    let vecinos = getHexNeighbors(current.r, current.c);
    for (let vecino of vecinos) {
      if (board[vecino.r]?.[vecino.c]?.owner === enemyPlayer) {
        queue.push(vecino);
      }
    }
  }
  
  return false; // No encontró conexión
}

/**
 * Identificar hexágonos críticos (que rompen conexiones de múltiples unidades)
 * @param {number} enemyPlayer
 * @return {Array} Hexes con {r, c, valor, unidades_afectadas}
 */
function detectar_hexes_criticos_enemigo(enemyPlayer) {
  let unidades_enemigas = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
  let mapa_conexiones = {};
  
  // Para cada unidad, encontrar su ruta de suministro
  for (let unidad of unidades_enemigas) {
    let ruta = encontrar_ruta_suministro(unidad.r, unidad.c, enemyPlayer);
    for (let hex of ruta) {
      let key = `${hex.r},${hex.c}`;
      if (!mapa_conexiones[key]) {
        mapa_conexiones[key] = {r: hex.r, c: hex.c, dependientes: 0};
      }
      mapa_conexiones[key].dependientes++;
    }
  }
  
  // Filtrar los que afectan múltiples unidades
  let hexes_criticos = Object.values(mapa_conexiones)
    .filter(h => h.dependientes >= 2)
    .map(h => ({...h, valor: h.dependientes * 500}))
    .sort((a,b) => b.valor - a.valor);
  
  return hexes_criticos;
}
```

### B) FUNCIONES DE ANÁLISIS (Información sobre Situación)

```javascript
/**
 * Calcular territorio controlado por jugador
 * @param {number} player
 * @return {number} Cantidad de hexágonos controlados
 */
function calcular_territorio_controlado(player) {
  return board.flat().filter(hex => hex.owner === player).length;
}

/**
 * Calcular ratio territorial (mi territorio / territorio enemigo)
 * @param {number} myPlayer
 * @return {number} Ratio (ej: 0.5 = yo tengo mitad del territorio del enemigo)
 */
function calcular_ratio_territorial(myPlayer) {
  const enemyPlayer = myPlayer === 1 ? 2 : 1;
  const miTerreno = calcular_territorio_controlado(myPlayer);
  const enemyTerreno = calcular_territorio_controlado(enemyPlayer);
  
  return enemyTerreno > 0 ? miTerreno / enemyTerreno : 0;
}

/**
 * Evaluar fortaleza defensiva de posición
 * @param {number} r, c - Coordenadas
 * @return {number} Bonus defensivo (0 = sin bonus, >1 = muy fuerte)
 */
function evaluar_defensa_hex(r, c) {
  let hex = board[r]?.[c];
  if (!hex) return 0;
  
  let defensaBase = 1.0;
  
  // Bonos de terreno
  if (hex.terrain === 'hills') defensaBase += 0.3;
  if (hex.terrain === 'forest') defensaBase += 0.2;
  if (hex.terrain === 'mountains') defensaBase += 0.5;
  
  // Bonus de estructura
  if (hex.structure === 'Fortaleza') defensaBase += 3.0;
  if (hex.structure === 'Muralla') defensaBase += 2.0;
  if (hex.structure === 'Campamento') defensaBase += 1.0;
  
  // Bonus si es ciudad
  if (hex.isCity) defensaBase += 1.5;
  if (hex.isCapital) defensaBase += 2.0;
  
  return defensaBase;
}

/**
 * Detectar recursos sin protección
 * @param {number} myPlayer
 * @param {number} searchRadius - Rango de búsqueda
 * @return {Array} Recursos con {r, c, tipo, guardias_cercanas}
 */
function detectar_recursos_desprotegidos(myPlayer, searchRadius = 5) {
  const enemyPlayer = myPlayer === 1 ? 2 : 1;
  let recursosVulnerables = [];
  
  board.forEach(row => row.forEach(hex => {
    if (hex.resourceNode && hex.owner === enemyPlayer) {
      let guardias = units.filter(u => 
        u.player === enemyPlayer && 
        hexDistance(hex.r, hex.c, u.r, u.c) <= searchRadius
      );
      
      if (guardias.length === 0 || guardias.length <= 1) {
        recursosVulnerables.push({
          r: hex.r,
          c: hex.c,
          tipo: hex.resourceNode,
          guardias: guardias.length,
          prioridad: guardias.length === 0 ? 'CRÍTICA' : 'ALTA'
        });
      }
    }
  }));
  
  return recursosVulnerables.sort((a,b) => b.prioridad.localeCompare(a.prioridad));
}

/**
 * Calcular poder militar de ambos bandos
 * @return {Object} {mi_poder, poder_enemigo, ratio}
 */
function calcular_poder_militar(myPlayer) {
  const enemyPlayer = myPlayer === 1 ? 2 : 1;
  
  let poderMio = units
    .filter(u => u.player === myPlayer && u.currentHealth > 0)
    .reduce((total, u) => total + (u.currentHealth || 100), 0);
  
  let poderEnemigo = units
    .filter(u => u.player === enemyPlayer && u.currentHealth > 0)
    .reduce((total, u) => total + (u.currentHealth || 100), 0);
  
  return {
    mi_poder: poderMio,
    poder_enemigo: poderEnemigo,
    ratio: poderEnemigo > 0 ? poderMio / poderEnemigo : 1
  };
}
```

### C) FUNCIONES DE ESTADO (Información sobre Recursos)

```javascript
/**
 * Obtener oro actual disponible
 * @param {number} player
 * @return {number} Oro en tesoro
 */
function obtener_oro_disponible(player) {
  return gameState.playerResources[player]?.oro || 0;
}

/**
 * Obtener todos los recursos del jugador
 * @param {number} player
 * @return {Object} {oro, comida, madera, piedra, hierro, researchPoints}
 */
function obtener_todos_recursos(player) {
  return gameState.playerResources[player] || {};
}

/**
 * Clasificar situación económica por tramos de oro
 * @param {number} oro
 * @return {Object} {tramo, multiplicador, capacidad_militar}
 */
function clasificar_situacion_economica(oro) {
  if (oro < 500) return {tramo: '0-500', multiplicador: 0.3, capacidad: 'Crisis'};
  if (oro < 1000) return {tramo: '500-1000', multiplicador: 0.6, capacidad: 'Bajo'};
  if (oro < 2000) return {tramo: '1000-2000', multiplicador: 1.0, capacidad: 'Medio'};
  if (oro < 5000) return {tramo: '2000-5000', multiplicador: 1.4, capacidad: 'Alto'};
  return {tramo: '5000+', multiplicador: 1.8, capacidad: 'Dominio'};
}
```

### D) FUNCIONES AUXILIARES (Cálculos Comunes)

```javascript
/**
 * Encontrar ruta de suministro de una unidad a su ciudad más cercana
 * @param {number} unitR, unitC - Posición de unidad
 * @param {number} player - Owner de la unidad
 * @return {Array} Ruta de hexágonos conectados, o []  si no hay conexión
 */
function encontrar_ruta_suministro(unitR, unitC, player) {
  let visited = new Set();
  let queue = [{r: unitR, c: unitC, ruta: []}];
  
  while (queue.length > 0) {
    let current = queue.shift();
    let key = `${current.r},${current.c}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    let hex = board[current.r]?.[current.c];
    if (!hex) continue;
    
    // ¿Es ciudad propia?
    if (hex.isCity && hex.owner === player) {
      return current.ruta;
    }
    
    // Expandir a vecinos propios
    let vecinos = getHexNeighbors(current.r, current.c);
    for (let vecino of vecinos) {
      let hex_vecino = board[vecino.r]?.[vecino.c];
      if (hex_vecino && hex_vecino.owner === player) {
        queue.push({
          r: vecino.r,
          c: vecino.c,
          ruta: [...current.ruta, {r: vecino.r, c: vecino.c}]
        });
      }
    }
  }
  
  return [];
}

/**
 * Calcular distancia táctica (considerando terreno)
 * @param {number} r1, c1, r2, c2 - Coordenadas
 * @return {number} Distancia en términos de movimiento
 */
function calcular_distancia_tactica(r1, c1, r2, c2) {
  let distanciaBase = hexDistance(r1, c1, r2, c2);
  let costeFinal = distanciaBase;
  
  // Aplicar costes de terreno si es necesario
  // (esto requeriría BFS real, simplificado aquí)
  
  return costeFinal;
}
```

---

## RESUMEN: VARIABLES CRÍTICAS QUE LA IA ACCEDE

**Para conocer su posición:**
- `gameState.capitalCityId[2]` → Coordenadas de su capital {r, c}
- `gameState.cities` → Array de TODAS sus ciudades (filtradas por owner === 2)

**Para conocer al enemigo:**
- `gameState.capitalCityId[1]` → Ubicación capital atacante {r, c}
- `gameState.cities` → Ciudades enemigas (filtradas por owner === 1)
- `units[]` → Todas las unidades visibles (filtradas por player === 1)
- `board[r][c].owner` → Propiedad de cada hexágono

**Para conocer su poder:**
- `gameState.playerResources[2]` → Sus recursos (oro, comida, madera, piedra, hierro, researchPoints)
- `gameState.playerResources[1]` → Recursos del atacante (conoce sus gastos)
- `units[]` → Suma de poder de todas sus unidades vs enemigo

**Para analizar territorio:**
- `board[][]` → Matriz completa, cada hex tiene:
  - `owner` (1, 2, 9 o null)
  - `terrain` (plains, hills, forest, mountains, water)
  - `structure` (Aldea, Ciudad, Fortaleza, Camino, etc.)
  - `isCity`, `isCapital`
  - `resourceNode` (oro_mina, hierro_mina, etc.)
  - `estabilidad`, `nacionalidad`

**Para saber turno/fase:**
- `gameState.currentPhase` → "deployment", "play", "gameOver"
- `gameState.currentPlayer` → Quién juega ahora (1 o 2)
- `gameState.turnNumber` → Número de turno actual
- `gameState.gameMode` → "invasion" en este caso

---

## RESUMEN: LA VERDAD DEL TURNO 1 (INVASIÓN)

| Aspecto | Jugador P1 (Atacante) | IA P2 (Defensor) |
|---------|-----------|-------|
| **Territorio Exacto** | 7 hexes (1 capital + 6 adyacentes) | (B_ROWS × B_COLS) - 7 hexes |
| **Territorio en Mapa 15×15** | 7 hexes | 218 hexes |
| **Territorio en Mapa 20×20** | 7 hexes | 393 hexes |
| **Ratio Territorial** | 1 | $\frac{(B\_ROWS \times B\_COLS) - 7}{7}$ |
| **Ciudades Propias** | 1 (Aldea en 1,2) | 5 (1 Ciudad + 4 Aldeas) |
| **Ubicación Capital** | (1, 2) | (B_ROWS-2, B_COLS-3) |
| **Oro Disponible** | 40,000 | 1,000 |
| **Comida** | 2,000 | 1,000 |
| **Madera** | 1,000 | 800 |
| **Piedra** | 500 | 400 |
| **Hierro** | 500 | 300 |
| **Research Points** | 100 | 50 |
| **Unidades Desplegadas** | 0 (en fase deployment) | 0 (en fase deployment) |
| **Límite Despliegue** | 7 regimientos máximo | Sin límite especificado en invasion |
| **Estrategia Implícita** | Compra ejército con oro masivo | Defiende con territorio y ciudades |
| **Rol en Modo Invasión** | Invasor: paga entrada con dinero | Defensor: paga defensa con territorio |

---

## NOTAS CRÍTICAS

### 1. Ciudades P2 vs ciudades bárbaras
**Aclaración por código:**
- Las 4 ciudades adicionales se crean con owner=2 en `addCityToBoardData(..., 2, ...)`
- Las ciudades bárbaras (player 9) se generan DESPUÉS en `generateBarbarianCities()`
- Con `barbarianDensity = 'med'` se generan **4 ciudades bárbaras** (player 9)
- Para distinguirlas: `city.owner === 2` (defensor) vs `city.owner === 9` (bárbaras)

### 2. Número exacto de hexágonos NO es aproximado
- P1 siempre controla EXACTAMENTE 7 hexes (Manresa radio 1)
- P2 controla EXACTAMENTE (B_ROWS × B_COLS) - 7 hexes
- No hay "aproximadamente", es determinista

### 3. Las funciones "sentidos" son OBLIGATORIAS
Si alguna de estas funciones NO existe en el código actual, la IA está ciega:
- `detectar_enemigo_en_tierra()` → ¿Hay enemigos cerca?
- `calcular_ratio_territorial()` → ¿Cuál es mi situación vs enemigo?
- `detectar_hexes_criticos_enemigo()` → ¿Dónde puedo romper su ejército?
- `detectar_unidades_desconectadas()` → ¿Quién está sin suministro?
- `calcular_poder_militar()` → ¿Tengo ventaja?

**CRÍTICO:** Sin estas funciones, la IA NO puede saber nada. No puede "imaginar" valores.

