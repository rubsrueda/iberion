# 🤖 AI SYSTEM - GENÉRICO PARA 20+ CIVILIZACIONES

**Rediseñado para funcionar con TODAS las civs sin necesidad de archivos separados**

---

## 🏛️ Introducción: Una Sola Solución

En lugar de crear 20 perfiles separados, usamos un sistema **genérico y escalable**:

```
PESOS BASE UNIVERSALES
        ↓
    + MULTIPLICADOR POR CIVILIZACIÓN
        ↓
    + MULTIPLICADOR POR MODO DE JUEGO
        ↓
    + BONIFICADORES DE TERRENO/ECONOMÍA
        ↓
    = DECISIÓN FINAL (igual para todas las civs)
```

---

## 📋 20 CIVILIZACIONES SOPORTADAS

```
CONQUISTADORAS        │ DEFENSIVAS           │ ECONÓMICAS
───────────────────────────────────────────────────────────
Roma                  │ Persia               │ Cartago
Asiria                │ Japón                │ Babilonia
Otomana               │ Germania             │ Mameluco
Galia                 │ Britania             │ (Todas tienen economía)

ESPECIALISTAS         │ NEUTRALES
───────────────────────────────────────────
Egipto (Arqueros)     │ Reinos Independientes
Maya (Arqueros)       │ Bárbaros
Mongolia (Caballería) │
Arabia (Caballería)   │
Vikingos (Inf. Lig.)  │
Iberia (Versátil)     │
Grecia (Élite)        │
China (Pólvora)       │
```

---

## 1️⃣ PESOS BASE (UNIVERSALES - Mismos para TODAS)

```javascript
const BASE_ACTION_WEIGHTS = {
  defendBase: 2000,         // Proteger capital/base
  conquistarCiudad: 1500,   // Tomar ciudad enemiga
  capturarRecurso: 1200,    // Tomar recurso
  expandirTerritorio: 1000, // Crecer pacíficamente
  investigarTech: 600,      // Árbol tecnológico
  atacarEnemy: 1500,        // Combate ofensivo
  construirBarcos: 800,     // Construcción naval
  construirArcos: 600,      // Construcción arquería
  reforzarDefensa: 800,     // Fortalecer posición
};
```

**Importante:** Estos NO cambian. Lo que cambia son los **multiplicadores**.

---

## 2️⃣ MULTIPLICADORES POR CIVILIZACIÓN (GENÉRICO)

En lugar de 20 perfiles separados, cada civ tiene un **pequeño JSON** en constants.js:

```javascript
// En CIVILIZATIONS, agregar:
const CIVILIZATIONS = {
  "Roma": {
    name: "Roma",
    // ... bonuses existentes...
    
    // NUEVO: AI Weights
    ai_archetype: 'conquistadora',
    ai_multipliers: {
      conquistarCiudad: 1.5,  // Roma ama conquistar
      expandirTerritorio: 1.5,
      defendBase: 1.0,        // Normal
      atacarEnemy: 1.3,
      investigarTech: 0.9
    }
  },
  
  "Persia": {
    name: "Persia",
    ai_archetype: 'defensiva',
    ai_multipliers: {
      defendBase: 2.0,        // Persia DEFIENDE
      atacarEnemy: 0.5,       // Persia débil en ataque
      expandirTerritorio: 0.5,
      conquistarCiudad: 0.8,
      investigarTech: 1.0
    }
  },
  
  "Cartago": {
    name: "Cartago",
    ai_archetype: 'naval/comercial',
    ai_multipliers: {
      construirBarcos: 2.0,   // Cartago NAVAL
      atacarEnemy: 0.6,       // Débil en tierra
      conquistarCiudad: 0.7,
      expandirTerritorio: 1.2,
      comercio: 2.5           // Custom
    }
  },
  
  "Babilonia": {
    name: "Babilonia",
    ai_archetype: 'investigación',
    ai_multipliers: {
      investigarTech: 2.5,    // Babilonia INVESTIGA
      atacarEnemy: 0.8,
      defendBase: 1.0,
      conquistarCiudad: 1.2
    }
  },
  
  "Galia": {
    name: "Galia",
    ai_archetype: 'atacante',
    ai_multipliers: {
      atacarEnemy: 1.4,       // Galia ATACA
      conquistarCiudad: 1.3,
      defendBase: 0.7,        // Débil en defensa
      expandirTerritorio: 1.2
    }
  },
  
  "Japón": {
    name: "Japón",
    ai_archetype: 'defensiva',
    ai_multipliers: {
      defendBase: 1.8,
      reforzarDefensa: 1.6,
      atacarEnemy: 0.7,
      conquistarCiudad: 0.9
    }
  },
  
  "Mongolia": {
    name: "Mongolia",
    ai_archetype: 'caballería',
    ai_multipliers: {
      atacarEnemy: 1.5,
      expandirTerritorio: 1.4,
      defendBase: 0.8,
      conquistarCiudad: 1.2
    }
  },
  
  // ... resto de civs (ver tabla abajo)
};
```

---

## 3️⃣ TABLA RÁPIDA: MULTIPLICADORES PARA LAS 20

```
CIV              │ PRIMARIA      │ SECUNDARIA    │ TERCIARIA    │ DÉBIL
─────────────────┼───────────────┼───────────────┼──────────────┼─────────
Roma             │ Conquistar×1.5│ Expandir×1.5  │ Ataque×1.3   │ Defensa
Grecia           │ Investig×2.0  │ Élite×1.5     │ Normal×1.0   │ Economía
Cartago          │ Barcos×2.0    │ Comercio×2.5  │ Expandir×1.2 │ Ataque
Egipto           │ Arqueros×1.8  │ Normal×1.0    │ Atacar×1.2   │ Caballería
Galia            │ Ataque×1.4    │ Caballería×1.5│ Conquistar×1.3│ Defensa
Germania         │ Defensa×1.6   │ Infantería×1.4│ Normal×1.0   │ Ataque
Britania         │ Naval×1.4     │ Defensa×1.3   │ Expandir×1.1 │ Tierra
Iberia           │ Versátil×1.2  │ Todos×1.0     │ Normal×1.0   │ Ninguna
Persia           │ Defensa×2.0   │ Morale×1.6    │ Normal×1.0   │ Ataque
China            │ Pólvora×1.3   │ Investig×1.2  │ Ataque×1.2   │ Naval
Vikingos         │ Inf.Lig×1.5   │ Ataque×1.4    │ Incursión×1.3│ Defensa
Mongolia         │ Caballería×2.0│ Movimiento×1.5│ Ataque×1.5   │ Infantería
Arabia           │ Caballería×1.6│ Desierto×1.4  │ Ataque×1.3   │ Naval
Mameluco         │ Economía×1.5  │ Élite×1.4     │ Normal×1.0   │ Naval
Otomana          │ Artillería×1.5│ Asedio×1.6    │ Ataque×1.3   │ Naval
Maya             │ Arqueros×1.7  │ Selva×1.4     │ Normal×1.0   │ Caballería
Asiria           │ Asedio×1.8    │ Conquistar×1.6│ Ataque×1.4   │ Naval
Babilonia        │ Investig×2.5  │ Sabio×1.5     │ Normal×1.0   │ Ataque
Japón            │ Defensa×1.8   │ Morale×1.6    │ Normal×1.0   │ Economía
Independientes   │ Normal×0.9    │ Normal×0.9    │ Normal×0.9   │ Nada especial
```

---

## 4️⃣ MULTIPLICADORES POR MODO (UNIVERSALES)

**Mismos para TODAS las civilizaciones:**

```javascript
const MODE_MULTIPLIERS = {
  'normal': {
    defendBase: 1.0,
    conquistarCiudad: 1.0,
    atacarEnemy: 1.0,
    expandirTerritorio: 1.0,
    investigarTech: 1.0
  },
  
  'invasion_attacker': {
    defendBase: 0.2,         // Atacante no defiende
    conquistarCiudad: 3.0,   // MÁXIMA PRIORIDAD
    expandirTerritorio: 0.3, // Solo si conquista
    atacarEnemy: 2.5,        // Ofensivo
    investigarTech: 0.1      // Ignora tech
  },
  
  'invasion_defender': {
    defendBase: 3.5,         // MÁXIMA PRIORIDAD
    conquistarCiudad: 0.3,   // Raro
    expandirTerritorio: 0.8, // Poco
    atacarEnemy: 0.3,        // Solo si amenaza
    investigarTech: 0.5      // Reducido
  },
  
  'puntos_victoria': {
    defendBase: 1.0,
    conquistarCiudad: 0.5,   // Menos importante
    expandirTerritorio: 2.5, // MÁS IMPORTANTE (ruinas)
    atacarEnemy: 0.5,
    investigarTech: 1.0
  }
};
```

---

## 5️⃣ MULTIPLICADORES POR ORO (UNIVERSALES)

**Mismos para TODAS:**

```javascript
const GOLD_MULTIPLIERS = {
  0: 0.2,      // Sin oro: extremadamente defensivo
  300: 0.6,    // Poco: defensivo + entrenamiento
  600: 1.0,    // Normal: equilibrio
  1000: 1.3,   // Suficiente: ofensivo moderado
  1500: 1.8,   // Rico: muy ofensivo
  Infinity: 2.0 // Ultrarrico: máximo ataque
};
```

---

## 6️⃣ FÓRMULA FINAL (UNA SOLA, PARA TODAS)

```javascript
function getActionWeight(action, civilization, gameMode, currentGold) {
  // 1. Peso base (universal)
  const baseWeight = BASE_ACTION_WEIGHTS[action] || 0;
  
  // 2. Multiplicador por civilización
  const civWeights = CIVILIZATIONS[civilization]?.ai_multipliers || {};
  const civMultiplier = civWeights[action] || 1.0;
  
  // 3. Multiplicador por modo
  const modeMultiplier = MODE_MULTIPLIERS[gameMode]?.[action] || 1.0;
  
  // 4. Multiplicador por oro
  const goldLevel = Object.keys(GOLD_MULTIPLIERS)
    .sort((a, b) => a - b)
    .reverse()
    .find(level => currentGold >= level) || 0;
  const goldMultiplier = GOLD_MULTIPLIERS[goldLevel] || 1.0;
  
  // 5. FÓRMULA FINAL
  return baseWeight * civMultiplier * modeMultiplier * goldMultiplier;
}
```

**Ejemplo:**
```javascript
// Roma conquistando en invasión con 1500 oro
getActionWeight('conquistarCiudad', 'Roma', 'invasion_attacker', 1500)
= 1500 (base) × 1.5 (Roma) × 3.0 (invasión atacante) × 1.8 (oro alto)
= 1500 × 1.5 × 3.0 × 1.8
= 12,150 ⭐⭐⭐ MÁXIMA PRIORIDAD

// Persia defendiendo en invasión con 800 oro
getActionWeight('defendBase', 'Persia', 'invasion_defender', 800)
= 2000 (base) × 2.0 (Persia) × 3.5 (invasión defensor) × 1.0 (oro medio)
= 2000 × 2.0 × 3.5 × 1.0
= 14,000 ⭐⭐⭐ MÁXIMA PRIORIDAD
```

---

## 7️⃣ EJEMPLO: COMPARACIÓN TODAS LAS CIVS

**Acción: Investigar Tecnología | Modo: Normal | Oro: 1200**

```
Babilonia: 600 × 2.5 (Babilonia) × 1.0 × 1.3 = 1950 ⭐⭐⭐ ALTA
Grecia: 600 × 2.0 (Grecia) × 1.0 × 1.3 = 1560 ⭐⭐ NORMAL
China: 600 × 1.2 (China) × 1.0 × 1.3 = 936 🟡 BAJA
Cartago: 600 × 0.5 (Cartago) × 1.0 × 1.3 = 390 🟢 IGNORAR
Roma: 600 × 0.9 (Roma) × 1.0 × 1.3 = 702 🟢 IGNORAR
```

**Acción: Atacar | Modo: Normal | Oro: 2000**

```
Galia: 1500 × 1.4 (Galia) × 1.0 × 2.0 = 4200 ⭐⭐⭐ ALTA
Mongolia: 1500 × 1.5 × 1.0 × 2.0 = 4500 ⭐⭐⭐ ALTA
Roma: 1500 × 1.3 × 1.0 × 2.0 = 3900 ⭐⭐⭐ ALTA
Persia: 1500 × 0.5 × 1.0 × 2.0 = 1500 🟡 NORMAL
Japón: 1500 × 0.7 × 1.0 × 2.0 = 2100 🟡 NORMAL
Cartago: 1500 × 0.6 × 1.0 × 2.0 = 1800 🟡 NORMAL
```

---

## 8️⃣ IMPLEMENTACIÓN (3 FUNCIONES = LISTO)

### Paso 1: Agregar ai_multipliers a CIVILIZATIONS

```javascript
// En constants.js, después de "bonuses", agregar para CADA civ:

"Roma": {
  // ... existing...
  ai_multipliers: {
    conquistarCiudad: 1.5,
    expandirTerritorio: 1.5,
    defendBase: 1.0,
    atacarEnemy: 1.3,
    investigarTech: 0.9,
    construirBarcos: 0.5,
    construirArcos: 0.8,
    reforzarDefensa: 1.1
  }
},
// ... TODAS las otras civs con sus propios multiplicadores
```

### Paso 2: Crear aiWeights.js

```javascript
// Nuevo archivo: aiWeights.js

export const BASE_ACTION_WEIGHTS = {
  defendBase: 2000,
  conquistarCiudad: 1500,
  capturarRecurso: 1200,
  expandirTerritorio: 1000,
  investigarTech: 600,
  atacarEnemy: 1500,
  construirBarcos: 800,
  construirArcos: 600,
  reforzarDefensa: 800
};

export const MODE_MULTIPLIERS = {
  'normal': { defendBase: 1.0, conquistarCiudad: 1.0, expandirTerritorio: 1.0, atacarEnemy: 1.0, investigarTech: 1.0 },
  'invasion_attacker': { defendBase: 0.2, conquistarCiudad: 3.0, expandirTerritorio: 0.3, atacarEnemy: 2.5, investigarTech: 0.1 },
  'invasion_defender': { defendBase: 3.5, conquistarCiudad: 0.3, expandirTerritorio: 0.8, atacarEnemy: 0.3, investigarTech: 0.5 },
  'puntos_victoria': { defendBase: 1.0, conquistarCiudad: 0.5, expandirTerritorio: 2.5, atacarEnemy: 0.5, investigarTech: 1.0 }
};

export const GOLD_MULTIPLIERS = {
  0: 0.2, 300: 0.6, 600: 1.0, 1000: 1.3, 1500: 1.8, Infinity: 2.0
};

export function getActionWeight(action, civilization, gameMode, currentGold) {
  const baseWeight = BASE_ACTION_WEIGHTS[action] || 0;
  if (baseWeight === 0) return 0;
  
  // Obtener multiplicador de civ (si existe)
  const civWeights = CIVILIZATIONS[civilization]?.ai_multipliers || {};
  const civMultiplier = civWeights[action] || 1.0;
  
  // Obtener multiplicador de modo
  const modeMultiplier = MODE_MULTIPLIERS[gameMode]?.[action] || 1.0;
  
  // Obtener multiplicador de oro
  const goldKey = Object.keys(GOLD_MULTIPLIERS)
    .map(Number)
    .sort((a, b) => a - b)
    .reverse()
    .find(level => currentGold >= level) || 0;
  const goldMultiplier = GOLD_MULTIPLIERS[goldKey] || 1.0;
  
  const finalWeight = baseWeight * civMultiplier * modeMultiplier * goldMultiplier;
  
  console.log(`[AI] ${action} (${civilization}, ${gameMode}): ${finalWeight.toFixed(0)}`);
  
  return finalWeight;
}
```

### Paso 3: Usar en ai_deploymentLogic.js

```javascript
import { getActionWeight } from './aiWeights.js';

// Dentro de AiDeploymentManager:
const civ = gameState.playerCivilizations[playerNumber];
const gameMode = gameState.gameMode || 'normal';
const currentGold = gameState.playerResources[playerNumber].oro;

const defendWeight = getActionWeight('defendBase', civ, gameMode, currentGold);
const expandWeight = getActionWeight('expandirTerritorio', civ, gameMode, currentGold);
const conquistarWeight = getActionWeight('conquistarCiudad', civ, gameMode, currentGold);

console.log({defendWeight, expandWeight, conquistarWeight});

// Ejecutar según pesos más altos
const weights = [
  { action: 'defend', weight: defendWeight },
  { action: 'expand', weight: expandWeight },
  { action: 'conquistar', weight: conquistarWeight }
];

const bestAction = weights.sort((a, b) => b.weight - a.weight)[0];
console.log(`🎯 Best action: ${bestAction.action}`);
```

---

## 9️⃣ VALIDACIÓN: INVASIÓN NAVAL CON TODAS LAS CIVS

**Escenario:** Invasion naval, defensor, turno 3, 800 oro

| Civ | defendBase | conquitar | atacar | DECISIÓN |
|-----|-----------|-----------|--------|----------|
| Roma | 2000×1.0×3.5×1.0=7000 | 1500×1.5×0.3×1.0=675 | 1500×1.3×0.3×1.0=585 | **DEFENDER** ✓ |
| Persia | 2000×2.0×3.5×1.0=14000 | 1500×0.8×0.3×1.0=360 | 1500×0.5×0.3×1.0=225 | **DEFENDER** ✓✓ |
| Cartago | 2000×0.8×3.5×1.0=5600 | 1500×0.7×0.3×1.0=315 | 1500×0.6×0.3×1.0=270 | **DEFENDER** ✓ |
| Babilonia | 2000×1.0×3.5×1.0=7000 | 1500×1.2×0.3×1.0=540 | 1500×0.8×0.3×1.0=360 | **DEFENDER** ✓ |
| Galia | 2000×0.7×3.5×1.0=4900 | 1500×1.3×0.3×1.0=585 | 1500×1.4×0.3×1.0=630 | **DEFENDER** ✓ |

✅ **TODOS defienden en invasión naval** (correcto)

---

## 🔟 CHECKLIST FINAL

- [ ] Agregar `ai_multipliers` a TODAS las civs en constants.js
- [ ] Crear aiWeights.js con 3 funciones
- [ ] Importar en ai_deploymentLogic.js
- [ ] Validar que getActionWeight() funciona
- [ ] Testear invasión naval con 3 civs diferentes
- [ ] Verificar que cada civ tiene su propia personalidad
- [ ] Documentación completada


