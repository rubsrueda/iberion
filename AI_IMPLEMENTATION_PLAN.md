# 🛠️ PLAN DE IMPLEMENTACIÓN - AI SYSTEM INTEGRATION

**Cómo pasar de documentos a código funcional**

---

## 📅 FASE 1: SETUP INICIAL (2 horas)

### Tarea 1.1: Crear la estructura base en constants.js

```javascript
// En constants.js, agregar ANTES de exportar:

// ============ AI WEIGHTS SYSTEM ============
const AI_WEIGHTS = {
  IBERIA: {
    defendBase: 1200,
    expandTerritory: 800,
    captureResource: 1400,
    // ... (ver AI_WEIGHTS_DEFINITION.md sección 1)
  },
  ROMA: {
    defendBase: 700,
    expandTerritory: 1600,
    captureCity: 2000,
    // ...
  },
  // CARTAGO, GRECIA, PERSIA...
};

const TERRAIN_INFLUENCE = {
  'llanura': 1.0,
  'bosque': 1.2,
  'montaña': 1.3,
  'colina': 1.15,
  'agua': 0.8,
  'desierto': 1.1
};

const MODE_MULTIPLIERS = {
  'normal': { attack: 1.0, defend: 1.0, expand: 1.0 },
  'invasion_attacker': { attack: 2.5, defend: 0.3, expand: 0.5 },
  'invasion_defender': { attack: 0.5, defend: 3.0, expand: 1.0 },
  'puntos_victoria': { attack: 0.5, defend: 0.5, expand: 2.0 }
};

export { AI_WEIGHTS, TERRAIN_INFLUENCE, MODE_MULTIPLIERS };
```

**Tiempo:** 1 hora (copiar tablas de documentos)  
**Validación:** `console.log(AI_WEIGHTS.ROMA.captureCity)` debe retornar 2000

---

### Tarea 1.2: Crear archivo `aiStrategySelector.js`

```javascript
// Nuevo archivo: aiStrategySelector.js

export function getAIStrategyByCivilization(civilization, gameMode, playerNumber) {
  
  const strategies = {
    'IBERIA': {
      weights: AI_WEIGHTS.IBERIA,
      deploymentStyle: 'defensive-mountain',
      priority: ['defendBase', 'captureInMountain', 'expandSlow'],
      techPriority: ['ADVANCED_TACTICS', 'FORTIFICATIONS']
    },
    'ROMA': {
      weights: AI_WEIGHTS.ROMA,
      deploymentStyle: 'aggressive-expansion',
      priority: ['expandTerritory', 'captureCity', 'attackEnemy'],
      techPriority: ['EMPIRE_EXPANSION', 'MILITARY_DOCTRINE']
    },
    'CARTAGO': {
      weights: AI_WEIGHTS.CARTAGO,
      deploymentStyle: 'trade-naval',
      priority: ['establishTradRoute', 'buildFleet', 'avoidCombat'],
      techPriority: ['TRADE_ROUTES', 'NAVAL_MASTERY']
    },
    'GRECIA': {
      weights: AI_WEIGHTS.GRECIA,
      deploymentStyle: 'elite-research',
      priority: ['researchTech', 'levelUpUnits', 'surviveEarly'],
      techPriority: ['LEGENDARY_FORGE', 'MILITARY_DOCTRINE']
    },
    'PERSIA': {
      weights: AI_WEIGHTS.PERSIA,
      deploymentStyle: 'defensive-morale',
      priority: ['defendBase', 'reinforcePositions', 'resistAttrition'],
      techPriority: ['MILITARY_DOCTRINE', 'FORTIFICATIONS']
    }
  };
  
  let strategy = strategies[civilization];
  
  // Aplicar modificadores por modo
  if (gameMode === 'invasion_attacker') {
    strategy.weights = applyInvasionAttackerModifiers(strategy.weights);
  } else if (gameMode === 'invasion_defender') {
    strategy.weights = applyInvasionDefenderModifiers(strategy.weights);
  }
  
  return strategy;
}

function applyInvasionAttackerModifiers(weights) {
  return {
    ...weights,
    defendBase: weights.defendBase * 0.3,
    expandTerritory: weights.expandTerritory * 0.5,
    captureCity: weights.captureCity * 2.5,
    attackEnemy: weights.attackEnemy * 2.0
  };
}

function applyInvasionDefenderModifiers(weights) {
  return {
    ...weights,
    defendBase: weights.defendBase * 3.0,
    expandTerritory: weights.expandTerritory * 1.0,
    captureCity: weights.captureCity * 0.5,
    attackEnemy: weights.attackEnemy * 0.5,
    reinforcePositions: (weights.reinforcePositions || 1000) * 2.0
  };
}

export function calculateActionWeight(action, gameMode, civilization, currentGold) {
  const strategy = getAIStrategyByCivilization(civilization, gameMode, -1);
  const baseWeight = strategy.weights[action] || 0;
  
  // Ajuste por oro disponible
  const goldMultiplier = getGoldMultiplier(currentGold);
  
  return baseWeight * goldMultiplier;
}

function getGoldMultiplier(gold) {
  if (gold < 200) return 0.3;
  if (gold < 500) return 0.6;
  if (gold < 1000) return 1.0;
  if (gold < 2000) return 1.4;
  return 2.0;
}
```

**Tiempo:** 1 hora  
**Validación:** `getAIStrategyByCivilization('PERSIA', 'invasion_defender', 2)` debe retornar weights con defendBase × 3.0

---

### Tarea 1.3: Crear archivo `aiInfluenceMap.js`

```javascript
// Nuevo archivo: aiInfluenceMap.js

export function generateInfluenceMap(playerNumber, gameMode, civilization, board, units, cities) {
  const influenceMap = [];
  
  // Inicializar tabla vacía
  for (let r = 0; r < board.length; r++) {
    influenceMap[r] = [];
    for (let c = 0; c < board[0].length; c++) {
      influenceMap[r][c] = 0;
    }
  }
  
  // Calcular cada hexágono
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const hex = board[r][c];
      
      // Saltar agua si no es naval
      if (hex.terrain === 'agua') {
        influenceMap[r][c] = 0;
        continue;
      }
      
      // Calcular componentes
      const resourceVal = calculateResourceInfluence(r, c, playerNumber, board);
      const cityVal = calculateCityInfluence(r, c, playerNumber, cities, gameMode);
      const threatVal = calculateThreatInfluence(r, c, playerNumber, units);
      const terrainBonus = getTerrainBonus(hex.terrain, civilization, gameMode);
      const connectBonus = getConnectivityBonus(r, c, playerNumber, board);
      const strategicBonus = getStrategicBonus(r, c, playerNumber, board);
      
      // FÓRMULA CONSOLIDADA
      const totalValue = 
        (resourceVal * terrainBonus) +
        (cityVal * terrainBonus * connectBonus) +
        (threatVal * 1.5) +
        (strategicBonus * 200);
      
      influenceMap[r][c] = Math.max(0, totalValue);
    }
  }
  
  return influenceMap;
}

function calculateResourceInfluence(r, c, playerNumber, board) {
  const RESOURCE_VALUES = {
    'oro': 100,
    'comida': 80,
    'madera': 60,
    'piedra': 60,
    'hierro': 70,
    'investigacion': 90
  };
  
  let influence = 0;
  
  for (let r2 = 0; r2 < board.length; r2++) {
    for (let c2 = 0; c2 < board[0].length; c2++) {
      const hex = board[r2][c2];
      if (hex.resourceNode) {
        const distance = hexDistance(r, c, r2, c2);
        if (distance > 8) continue;
        
        let value = RESOURCE_VALUES[hex.resourceNode];
        if (hex.owner !== playerNumber && hex.owner !== 0) {
          value *= 1.5;
        }
        
        influence += value / (distance * distance);
      }
    }
  }
  
  return influence;
}

function calculateCityInfluence(r, c, playerNumber, cities, gameMode) {
  let influence = 0;
  
  const CITY_VALUES = {
    own: 500,
    enemy: 1000,
    neutral: 400
  };
  
  for (const city of cities) {
    const distance = hexDistance(r, c, city.r, city.c);
    if (distance > 10) continue;
    
    let baseValue;
    if (city.owner === playerNumber) {
      baseValue = CITY_VALUES.own;
      if (gameMode.includes('invasion')) baseValue *= 2.5;
    } else if (city.owner === 0) {
      baseValue = CITY_VALUES.neutral;
    } else {
      baseValue = CITY_VALUES.enemy;
    }
    
    influence += baseValue / (distance * distance);
  }
  
  return influence;
}

function calculateThreatInfluence(r, c, playerNumber, units) {
  let threat = 0;
  
  for (const unit of units) {
    if (unit.owner === playerNumber) continue;
    
    const distance = hexDistance(r, c, unit.r, unit.c);
    if (distance > 6) continue;
    
    const threatValue = getUnitThreatValue(unit.type);
    threat += (threatValue * 1.5) / (distance * distance);
  }
  
  return threat;
}

function getTerrainBonus(terrain, civilization, gameMode) {
  const baseBonus = TERRAIN_INFLUENCE[terrain] || 1.0;
  
  // Bonus civ-específico
  if (civilization === 'IBERIA' && terrain === 'montaña') {
    return baseBonus * 1.5;
  }
  if (civilization === 'CARTAGO' && terrain === 'agua') {
    return baseBonus * 1.8;
  }
  
  return baseBonus;
}

function getConnectivityBonus(r, c, playerNumber, board) {
  // Verificar si está conectado al territorio controlado
  if (isHexSupplied(r, c, playerNumber, board)) {
    return 1.5;
  } else if (isWithinAttackRange(r, c, playerNumber, board)) {
    return 0.8;
  } else {
    return 0.2;
  }
}

function getStrategicBonus(r, c, playerNumber, board) {
  let bonus = 1.0;
  
  if (isChokePoint(r, c, board)) {
    bonus += 0.5;
  }
  if (isElevated(r, c, board)) {
    bonus += 0.3;
  }
  
  return bonus;
}

export function findBestPositionFromInfluenceMap(influenceMap, currentUnit) {
  const neighbors = getHexNeighbors(currentUnit.r, currentUnit.c);
  
  let best = neighbors[0];
  let bestValue = influenceMap[best.r][best.c];
  
  for (const neighbor of neighbors) {
    const value = influenceMap[neighbor.r][neighbor.c];
    if (value > bestValue) {
      best = neighbor;
      bestValue = value;
    }
  }
  
  return best;
}
```

**Tiempo:** 1.5 horas  
**Validación:** `generateInfluenceMap(2, 'invasion_defender', 'PERSIA', board, units, cities)` debe retornar un mapa con valores > 0 cerca de capital

---

## 📅 FASE 2: INTEGRACIÓN CON IA EXISTENTE (1-2 horas)

### Tarea 2.1: Modificar `ai_deploymentLogic.js`

**Buscar:** La función `AiDeploymentManager.deployUnitsAI()`

**Reemplazar la lógica interna con:**

```javascript
deployUnitsAI(playerNumber) {
  console.group(`🤖 AI Deployment - Player ${playerNumber}`);
  
  const civilization = gameState.playerCivilizations[playerNumber];
  const gameMode = gameState.gameMode || 'normal';
  const strategy = getAIStrategyByCivilization(civilization, gameMode, playerNumber);
  
  // Generar mapa de influencia
  const influenceMap = generateInfluenceMap(
    playerNumber, 
    gameMode, 
    civilization,
    board,
    units,
    citiesArray
  );
  
  console.log('Strategy loaded:', strategy.deploymentStyle);
  console.log('Influence Map generated');
  
  // Ejecutar despliegue según estrategia
  switch(strategy.deploymentStyle) {
    case 'defensive-mountain':
      this.deployIBERIA(playerNumber, influenceMap);
      break;
    case 'aggressive-expansion':
      this.deployROMA(playerNumber, influenceMap);
      break;
    case 'trade-naval':
      this.deployCARTAGO(playerNumber, influenceMap);
      break;
    case 'elite-research':
      this.deployGRECIA(playerNumber, influenceMap);
      break;
    case 'defensive-morale':
      this.deployPERSIA(playerNumber, influenceMap);
      break;
    default:
      this.deployGeneric(playerNumber, influenceMap);
  }
  
  console.groupEnd();
}

// Nueva función para PERSIA
deployPERSIA(playerNumber, influenceMap) {
  const topPositions = this.findTopValuesInMap(influenceMap, 8);
  let deployed = 0;
  
  for (const pos of topPositions) {
    if (canPlaceUnit(pos.r, pos.c, playerNumber)) {
      this.placeFinalizedDivision(
        pos.r, 
        pos.c, 
        'Infantería Pesada',
        playerNumber,
        1 // nivel
      );
      deployed++;
      if (deployed >= 8) break;
    }
  }
  
  console.log(`✅ PERSIA deployed ${deployed} units`);
}

findTopValuesInMap(influenceMap, count) {
  const positions = [];
  
  for (let r = 0; r < influenceMap.length; r++) {
    for (let c = 0; c < influenceMap[0].length; c++) {
      positions.push({
        r, c,
        value: influenceMap[r][c]
      });
    }
  }
  
  positions.sort((a, b) => b.value - a.value);
  return positions.slice(0, count);
}
```

**Tiempo:** 1 hora  
**Validación:** IA PERSIA en invasión debe desplegar 8 unidades ahora

---

### Tarea 2.2: Modificar `ai_gameplayLogic.js`

**En la función que mueve unidades, agregar:**

```javascript
// Dónde IA decide a dónde moverse
function chooseNextMoveForUnit(unit, playerNumber) {
  const civilization = gameState.playerCivilizations[playerNumber];
  const gameMode = gameState.gameMode || 'normal';
  
  // Generar mapa (cada turno)
  const influenceMap = generateInfluenceMap(
    playerNumber,
    gameMode,
    civilization,
    board,
    units,
    citiesArray
  );
  
  // Encontrar mejor posición de este mapa
  const bestPosition = findBestPositionFromInfluenceMap(influenceMap, unit);
  
  return bestPosition;
}
```

**Tiempo:** 30 min  
**Validación:** Unidades se mueven hacia hexágonos con mayor influencia

---

## 📅 FASE 3: TESTING & DEBUGGING (2-3 horas)

### Tarea 3.1: Testing básico

```javascript
// En console del navegador:

// 1. Iniciar invasión naval manual
gameState.gameMode = 'invasion';
gameState.currentPlayer = 2; // Defensor
gameState.playerCivilizations[2] = 'PERSIA';

// 2. Trigger deployment
simpleAiDeploymentTurn(2);

// 3. Ver si hay unidades
console.log('Units deployed:', units.filter(u => u.owner === 2).length);
// Debe haber > 0
```

**Qué buscar:**
- ✅ IA despliega unidades (> 0)
- ✅ Se ve mensaje "AI Deployment" en console
- ✅ Unidades están en posiciones defensivas (cercanas a capital)
- ❌ Si no despliega: revisar pesos
- ❌ Si despliega en lugar equivocado: revisar influenceMap

---

### Tarea 3.2: Debugging detallado

```javascript
// Agregar logging temporal en aiStrategySelector.js
function getAIStrategyByCivilization(civilization, gameMode, playerNumber) {
  console.log(`🎭 Loading strategy: ${civilization} in ${gameMode}`);
  
  // ... resto del código
  
  console.log('Final weights:', strategy.weights);
  return strategy;
}

// Agregar logging en aiInfluenceMap.js
function generateInfluenceMap(...) {
  // ... código
  
  // Después de calcular, imprimir estadísticas
  const values = influenceMap.flat();
  console.log('Influence Map Stats:', {
    max: Math.max(...values),
    min: Math.min(...values),
    avg: values.reduce((a,b) => a+b) / values.length,
    nonZero: values.filter(v => v > 0).length
  });
  
  return influenceMap;
}
```

**Ejecutar en invasión naval y observar:**
- Max value debe estar cerca de capital (defendiendo)
- Debe haber valores en zona defensiva
- Average debe ser > 50

Si no:
- ✋ STOP - Revisar `calculateCityInfluence()` y `calculateThreatInfluence()`
- Asegurarse que ciudades/unidades enemigas se detectan

---

### Tarea 3.3: Balanceo

Si IA es demasiado pasiva:
```javascript
// En constants.js, aumentar PERSIA defensiva en invasión
PERSIA_WEIGHTS.defendBase = 2500;  // +25%
PERSIA_WEIGHTS.expandTerritory = 1200;  // +50%
```

Si IA es demasiado agresiva:
```javascript
ROME_WEIGHTS.captureCity = 1500;  // -25%
ROME_WEIGHTS.attackEnemy = 1200;  // -33%
ROME_WEIGHTS.defendBase = 1000;   // +40%
```

---

## 📅 FASE 4: VALIDACIÓN FINAL (1 hora)

### Tarea 4.1: Juego completo

1. Iniciar invasión naval
2. Seleccionar defensor
3. Verifi que IA despliega
4. Que IA atacante ataque
5. Verificar que combate ocurre
6. Completar partida (min 20 turnos)

**Criterios de éxito:**
- ✅ IA despliega unidades
- ✅ IA se defiende cuando es atacada
- ✅ IA no tiene errores en console
- ✅ IA ataque/defienda apropiadamente
- ✅ Partida se completa sin crashes

---

## 🐛 TROUBLESHOOTING RÁPIDO

| Problema | Causa | Solución |
|----------|-------|----------|
| IA no despliega | Pesos = 0 | Ver PERSIA_WEIGHTS, debe tener defendBase > 0 |
| IA despliega fuera | influenceMap vacío | Revisar calculateCityInfluence() |
| Error "undefined" | Función no importada | Verificar `import { ... } from 'aiInfluenceMap.js'` |
| IA despliega tarde | Lógica de fase incorrecto | Verificar que `deployUnitsAI()` se llama en fase "deployment" |
| Pesos no cambian | Multiplicadores no aplicados | Revisar `applyInvasionDefenderModifiers()` |

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Tarea 1.1: Pesos en constants.js
- [ ] Tarea 1.2: aiStrategySelector.js creado
- [ ] Tarea 1.3: aiInfluenceMap.js creado
- [ ] Tarea 2.1: deployUnitsAI() actualizado
- [ ] Tarea 2.2: chooseNextMove() actualizado
- [ ] Importaciones correctas en todos lados
- [ ] Testing básico pasado
- [ ] Debugging detallado completado
- [ ] Balanceo realizado
- [ ] Validación final pasada
- [ ] Documentación actualizada
- [ ] Git commit + push

---

## ⏱️ TIEMPO TOTAL ESTIMADO

```
Fase 1 (Setup): 3 horas
Fase 2 (Integración): 1.5 horas
Fase 3 (Testing): 3 horas
Fase 4 (Validación): 1 hora
──────────────
TOTAL: ~8.5 horas

CON PROBLEMAS: 12-16 horas
SIN PROBLEMAS: 6-8 horas
```

---

**Siguiente paso:** Empezar por Tarea 1.1 (pesos en constants.js)

Cuando termines cada tarea, marca el checkbox en el CHECKLIST arriba.

¿Listo para empezar? ✨
