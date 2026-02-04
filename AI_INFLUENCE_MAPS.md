# AI Influence Maps - Cálculo Matemático de Valor de Hexágonos

**Versión:** 1.0 | **Para:** Spatial Reasoning & IA Pathfinding | **Última actualización:** Febrero 2026

---

## 🗺️ Introducción

Un **Mapa de Influencia** es una capa invisible que rodea toda unidad, ciudad y recurso. Cada hexágono tiene un **"valor de influencia"** que determina qué tan atractivo es conquistar o defender esa zona.

```
Influencia = Σ (valor_fuente × 1 / distancia²) × terreno_bonus × modo_multiplicador
```

---

## 1️⃣ CÁLCULO DE INFLUENCIA BASE

### A. Fórmula Central

```
INFLUENCIA(hex) = 
    Σ RECURSOS_NEARBY +
    Σ CIUDADES_NEARBY +
    Σ AMENAZAS_ENEMIGAS +
    BONUS_TERRENO +
    BONUS_CONECTIVIDAD +
    BONUS_ESTRATEGICO
```

### B. Componente 1: Recursos Cercanos

```javascript
function calculateResourceInfluence(hexagon, playerNumber) {
  let influence = 0;
  const RESOURCE_VALUES = {
    'oro': 100,
    'comida': 80,
    'madera': 60,
    'piedra': 60,
    'hierro': 70,
    'investigacion': 90
  };
  
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (board[r][c].resourceNode) {
        const distance = hexDistance(hexagon.r, hexagon.c, r, c);
        
        // Si está muy lejos, ignore
        if (distance > 8) continue;
        
        // Valor base del recurso
        let value = RESOURCE_VALUES[board[r][c].resourceNode];
        
        // Si es enemigo, vale más conquistarlo
        if (board[r][c].owner !== playerNumber && board[r][c].owner !== 0) {
          value *= 1.5;
        }
        
        // Inversa cuadrada: cercano vale MUCHO
        let influence_contribution = value / (distance * distance);
        
        influence += influence_contribution;
      }
    }
  }
  
  return influence;
}
```

**Ejemplo Visual:**
```
HEXÁGONO CON ORO a distancia X

Distancia 1: 100 / (1²) = 100 puntos
Distancia 2: 100 / (2²) = 25 puntos
Distancia 3: 100 / (3²) = 11 puntos
Distancia 4: 100 / (4²) = 6 puntos
Distancia 5: 100 / (5²) = 4 puntos
```

---

### C. Componente 2: Ciudades Cercanas

```javascript
function calculateCityInfluence(hexagon, playerNumber, gameMode) {
  let influence = 0;
  const CITY_VALUES = {
    'own': 500,        // Defender ciudad propia
    'enemy': 1000,     // Conquistar ciudad enemiga
    'neutral': 400     // Tomar ciudad neutral
  };
  
  for (const city of citiesArray) {
    const distance = hexDistance(hexagon.r, hexagon.c, city.r, city.c);
    
    if (distance > 10) continue; // Ciudades lejanas ignorar
    
    let baseValue;
    if (city.owner === playerNumber) {
      baseValue = CITY_VALUES.own;
    } else if (city.owner === 0) {
      baseValue = CITY_VALUES.neutral;
    } else {
      baseValue = CITY_VALUES.enemy;
    }
    
    // En invasión, defenderse vale más
    if (gameMode === 'invasion' && city.owner === playerNumber) {
      baseValue *= 2.5;
    }
    
    let influence_contribution = baseValue / (distance * distance);
    influence += influence_contribution;
  }
  
  return influence;
}
```

---

### D. Componente 3: Amenaza (Unidades Enemigas)

```javascript
function calculateThreatInfluence(hexagon, playerNumber) {
  let threat = 0;
  const THREAT_MULTIPLIER = 1.5; // Amenaza vale 1.5× más que ganancia
  
  for (const unit of units) {
    if (unit.owner === playerNumber) continue; // Ignorar propias
    
    const distance = hexDistance(hexagon.r, hexagon.c, unit.r, unit.c);
    
    if (distance > 6) continue; // Unidades muy lejanas ignorar
    
    // Valor amenaza según tipo
    const threatValue = getUnitThreatValue(unit.type);
    
    // Unidades enemiga cercana = debe defender más
    let threat_contribution = (threatValue * THREAT_MULTIPLIER) / (distance * distance);
    
    threat += threat_contribution;
  }
  
  return threat;
}
```

**Visualización:**
```
UNIDAD ENEMIGA cerca = Aumenta valor DEFENSIVO del área

⚔️ (Enemigo)
  ↓
  Rango 1: CRÍTICO (×3.0 valor defensivo)
  Rango 2-3: ALTO (×2.0 valor defensivo)
  Rango 4-6: MEDIO (×1.0 valor defensivo)
  Rango 7+: BAJO (×0.3 valor defensivo)
```

---

## 2️⃣ BONIFICADORES DE TERRENO

```javascript
function getTerrainBonus(hexagon, gameMode, civilization) {
  const terrain = hexagon.terrain;
  let bonus = 1.0;
  
  // Bonificador base por tipo terreno
  switch(terrain) {
    case 'llanura':     bonus = 1.0;  break;
    case 'bosque':      bonus = 1.2;  break; // Defensa
    case 'montaña':     bonus = 1.3;  break; // Defensa fuerte
    case 'colina':      bonus = 1.15; break;
    case 'agua':        bonus = 0.8;  break; // Excepto si naval
    case 'desierto':    bonus = 1.1;  break;
  }
  
  // Civilización específica
  if (civilization === 'IBERIA' && terrain === 'montaña') {
    bonus *= 1.5; // IBERIA ama montañas
  }
  
  if (civilization === 'CARTAGO' && terrain === 'agua') {
    bonus *= 1.8; // CARTAGO domina agua
  }
  
  // En invasión naval, agua vale MÁS si no tienes armada
  if (gameMode === 'invasion' && terrain === 'agua') {
    bonus *= 1.0; // Neutral para invasión (control terrestre)
  }
  
  return bonus;
}
```

---

## 3️⃣ BONIFICADOR DE CONECTIVIDAD

```javascript
function getConnectivityBonus(hexagon, playerNumber) {
  // ¿Está conectado a tu capital/ciudades?
  // Expansión conectada = vale 1.5× más
  // Expansión desconectada = vale 0.3× menos (riesgo)
  
  if (isHexSupplied(hexagon.r, hexagon.c, playerNumber)) {
    return 1.5; // Territorio conectado
  } else if (isWithinAttackRange(hexagon.r, hexagon.c, playerNumber)) {
    return 0.8; // Vulnerable pero capaz
  } else {
    return 0.2; // Muy arriesgado
  }
}
```

**Lógica:**
```
TERRITORIO CONTROLADO + RADIO SUMINISTRO
        ↓
    CONECTADO → Vale 1.5× más
        ↓
  DESCONECTADO → Vale 0.2× (riesgo)
```

---

## 4️⃣ BONIFICADOR ESTRATÉGICO

```javascript
function getStrategicBonus(hexagon, playerNumber, gameMode) {
  let bonus = 1.0;
  
  // PUNTO DE PASO (entre dos ciudades)
  if (isChokePoint(hexagon)) {
    bonus += 0.5; // +50% valor
  }
  
  // ALTURA (si es colina/montaña cerca de enemigo)
  if (isElevated(hexagon) && hasNearbyEnemy(hexagon, playerNumber)) {
    bonus += 0.3; // +30% valor defensivo
  }
  
  // RUPTURA DE LÍNEA (corta suministro enemigo)
  if (cutsEnemySupply(hexagon, playerNumber)) {
    bonus += 0.7; // +70% valor (muy estratégico)
  }
  
  // EN INVASIÓN: Barrera defensiva
  if (gameMode === 'invasion' && isDefenderTerritory(hexagon, playerNumber)) {
    bonus += 0.4; // +40% valor (fortalecer defensa)
  }
  
  return bonus;
}
```

---

## 5️⃣ FÓRMULA CONSOLIDADA

```javascript
function calculateHexagonInfluenceValue(hexagon, playerNumber, gameMode, civilization) {
  
  // Componentes principales
  const resourceInfluence = calculateResourceInfluence(hexagon, playerNumber);
  const cityInfluence = calculateCityInfluence(hexagon, playerNumber, gameMode);
  const threatInfluence = calculateThreatInfluence(hexagon, playerNumber);
  
  // Bonificadores
  const terrainBonus = getTerrainBonus(hexagon, gameMode, civilization);
  const connectivityBonus = getConnectivityBonus(hexagon, playerNumber);
  const strategicBonus = getStrategicBonus(hexagon, playerNumber, gameMode);
  
  // FÓRMULA FINAL
  const totalInfluence = 
    (resourceInfluence * terrainBonus) +
    (cityInfluence * terrainBonus * connectivityBonus) +
    (threatInfluence * 1.5) + // Amenaza se pondera diferente
    (strategicBonus * 200);    // Valor estratégico fijo
  
  return totalInfluence;
}
```

---

## 6️⃣ GENERACIÓN DEL MAPA (IMPLEMENTACIÓN)

```javascript
function generateInfluenceMap(playerNumber, gameMode, civilization) {
  const influenceMap = [];
  
  // Inicializar tabla
  for (let r = 0; r < BOARD_ROWS; r++) {
    influenceMap[r] = [];
    for (let c = 0; c < BOARD_COLS; c++) {
      influenceMap[r][c] = 0;
    }
  }
  
  // Calcular valor de cada hexágono
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const hex = board[r][c];
      
      // Ignorar agua si no es naval
      if (hex.terrain === 'agua' && !isNavalCivilization(civilization)) {
        influenceMap[r][c] = 0;
        continue;
      }
      
      // Ignorar territorio enemigo controlado (excepto invasión)
      if (hex.owner !== playerNumber && hex.owner !== 0) {
        if (gameMode !== 'invasion') {
          influenceMap[r][c] = calculateHexagonInfluenceValue(hex, playerNumber, gameMode, civilization) * 0.5;
          continue;
        }
      }
      
      influenceMap[r][c] = calculateHexagonInfluenceValue(hex, playerNumber, gameMode, civilization);
    }
  }
  
  return influenceMap;
}
```

---

## 7️⃣ EJEMPLO: INVASIÓN NAVAL DEFENSOR

**Escenario:** Persia, modo invasión, territorio 5×5 alrededor de capital

```
Mapa Visual:
┌─────────────────────┐
│  🏰 (Capital) - Hex│
│  @ (Defensor)      │
├─────────────────────┤
│  Atacante a 3 hexes│
│  ⚔️ ⚔️ ⚔️ (Unidades)│
└─────────────────────┘

Cálculos:
────────────────────────────────────────────────
HEX        │ RECURSO │ CIUDAD │ AMENAZA │ TERRENO │ TOTAL
────────────────────────────────────────────────
(0,0) Base │ 0       │ 500    │ 0       │ 1.0     │ 500
(0,1) Cerca│ 80      │ 200    │ 150     │ 1.2     │ 518
(1,0) Lado │ 0       │ 200    │ 200     │ 1.0     │ 400
(2,0) Lejos│ 20      │ 50     │ 300     │ 1.3     │ 439
(3,0) Frontera│ 30   │ 10     │ 600     │ 1.0     │ 640
                                      ↑
                            PRIORIDAD DE DEFENSA
```

---

## 8️⃣ HEATMAP VISUAL

**Cómo se vería en el juego:**

```
LEYENDA:
🔴 = Muy alto valor (>1000)
🟠 = Alto valor (500-1000)
🟡 = Medio valor (100-500)
🟢 = Bajo valor (10-100)
⚪ = Sin valor (0)

EJEMPLO INVASIÓN DEFENSOR:
┌──────────────────────────────┐
│ ⚪⚪🟡🟡🟡⚪⚪             │
│ ⚪🟢🟡🔴🟡🟢⚪             │
│ 🟢🟡🟡🏰🟡🟡🟢             │
│ ⚪🟢🟡🟡🟡🟢⚪             │
│ ⚪⚪🟡🟡🟡⚪⚪             │
│ ⚪⚪⚪⚔️⚪⚪⚪ (Atacante)   │
└──────────────────────────────┘

INTERPRETACIÓN:
- Zona roja = DEFENDER (capital + amenaza)
- Zona amaranja = EXPANDIR (conectado)
- Zona gris = IGNORAR (lejos/desconectado)
```

---

## 9️⃣ CÓMO USAR ESTE MAPA

### En Despliegue (Deployment Phase)

```javascript
function deployUnitsBasedOnInfluence(playerNumber, gameMode, civilization) {
  const influenceMap = generateInfluenceMap(playerNumber, gameMode, civilization);
  
  // Buscar N puntos más valiosos
  const topPositions = findTopNPositions(influenceMap, 10);
  
  // Desplegar unidades defensivas en esos puntos
  topPositions.forEach(pos => {
    if (canPlaceUnit(pos)) {
      placeDefensiveUnit(pos);
    }
  });
}
```

### En Fase de Juego

```javascript
function getAIObjectiveDirection(unitPosition, playerNumber, gameMode, civilization) {
  const influenceMap = generateInfluenceMap(playerNumber, gameMode, civilization);
  
  // Obtener vecinos con influencia
  const neighbors = getHexNeighbors(unitPosition);
  
  // Ordenar por valor de influencia
  neighbors.sort((a, b) => 
    influenceMap[b.r][b.c] - influenceMap[a.r][a.c]
  );
  
  // Moverse hacia el más valioso
  return neighbors[0];
}
```

---

## 🔟 VALIDACIÓN Y DEBUGGING

```javascript
function validateInfluenceMap(influenceMap) {
  let stats = {
    maxValue: Math.max(...influenceMap.flat()),
    minValue: Math.min(...influenceMap.flat()),
    avgValue: influenceMap.flat().reduce((a,b) => a+b) / (BOARD_ROWS * BOARD_COLS),
    zeroCount: influenceMap.flat().filter(v => v === 0).length
  };
  
  console.log('Influence Map Stats:', stats);
  
  // Validaciones
  if (stats.maxValue < 100) console.warn('⚠️ Mapa demasiado bajo');
  if (stats.zeroCount > BOARD_ROWS * BOARD_COLS * 0.8) console.warn('⚠️ Mapa muy vacío');
  
  return stats;
}
```

---

## ⭐ CHECKLIST PARA IMPLEMENTACIÓN

- [ ] Crear función `calculateResourceInfluence()`
- [ ] Crear función `calculateCityInfluence()`
- [ ] Crear función `calculateThreatInfluence()`
- [ ] Crear función `getTerrainBonus()`
- [ ] Crear función `getConnectivityBonus()`
- [ ] Crear función `getStrategicBonus()`
- [ ] Integrar en `calculateHexagonInfluenceValue()`
- [ ] Generar mapa completo con `generateInfluenceMap()`
- [ ] Agregar visualización para debugging
- [ ] Testear en invasión naval

---

**Siguiente paso:** Ver `AI_CIVILIZATION_LOGIC.md` para entender cómo cambia el comportamiento según civilización.
