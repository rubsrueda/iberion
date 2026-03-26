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

## 2️⃣ MULTIPLICADORES POR CIVILIZACIÓN (COMPLETO)

Cada civ tiene un bloque `ai_multipliers` derivado de sus **bonuses reales en `constants.js`**.
Claves disponibles: `conquistarCiudad`, `expandirTerritorio`, `capturarRecurso`, `defendBase`, `reforzarDefensa`, `atacarEnemy`, `investigarTech`, `construirBarcos`.

```javascript
// En CIVILIZATIONS (constants.js), añadir ai_archetype + ai_multipliers a cada entrada:
// La clave del objeto debe coincidir EXACTAMENTE con la clave en CIVILIZATIONS.

// ── CONQUISTADORAS ──────────────────────────────────────────────────────────

"Roma": {
  // Infantería Pesada: +20 def, +1 mov → conquista sostenida y táctica
  ai_archetype: 'conquistadora',
  ai_multipliers: {
    conquistarCiudad: 1.5, expandirTerritorio: 1.5, atacarEnemy: 1.3,
    reforzarDefensa: 1.1,  defendBase: 1.0,          investigarTech: 0.9,
    capturarRecurso: 1.1,  construirBarcos: 0.5
  }
},

"Asiria": {
  // Artillería: +40 atk, coste -10% → asedio + terror de moral
  // Infantería Pesada: daño de moral x2
  ai_archetype: 'asedio-terror',
  ai_multipliers: {
    conquistarCiudad: 1.8, atacarEnemy: 1.6,          capturarRecurso: 1.2,
    expandirTerritorio: 1.1, reforzarDefensa: 0.9,    defendBase: 0.7,
    investigarTech: 0.7,   construirBarcos: 0.4
  }
},

"Otomana": {
  // Arcabuceros: +20 atk; Artillería: +20 atk → potencia de asedio y pólvora
  ai_archetype: 'asedio-polvora',
  ai_multipliers: {
    conquistarCiudad: 1.8, atacarEnemy: 1.5,          capturarRecurso: 1.2,
    expandirTerritorio: 1.2, reforzarDefensa: 1.0,    defendBase: 0.8,
    investigarTech: 0.8,   construirBarcos: 0.5
  }
},

"Galia": {
  // Infantería Ligera: +20 atk; Caballería Pesada: +20 atk → choque ofensivo total
  ai_archetype: 'atacante',
  ai_multipliers: {
    atacarEnemy: 1.6,      conquistarCiudad: 1.3,     capturarRecurso: 1.2,
    expandirTerritorio: 1.2, reforzarDefensa: 0.8,    defendBase: 0.7,
    investigarTech: 0.7,   construirBarcos: 0.5
  }
},

// ── DEFENSIVAS ───────────────────────────────────────────────────────────────

"Persia": {
  // Barco de Guerra: sanación pasiva; globalBonus: sin upkeep de oro → resistencia económica
  ai_archetype: 'economica-defensiva',
  ai_multipliers: {
    defendBase: 2.0,       reforzarDefensa: 1.5,      expandirTerritorio: 1.2,
    capturarRecurso: 1.1,  investigarTech: 1.0,       conquistarCiudad: 0.8,
    atacarEnemy: 0.5,      construirBarcos: 0.8
  }
},

"Japón": {
  // Infantería Pesada: iniciativa +5; Arqueros: +20 atk; global: pérdida de moral -25%
  ai_archetype: 'defensiva-honor',
  ai_multipliers: {
    defendBase: 1.8,       reforzarDefensa: 1.6,      atacarEnemy: 1.0,
    capturarRecurso: 1.0,  expandirTerritorio: 0.9,   conquistarCiudad: 0.9,
    investigarTech: 0.9,   construirBarcos: 0.6
  }
},

"Germania": {
  // Infantería Ligera: +20 def → muro defensivo sin agresión ofensiva
  ai_archetype: 'defensiva',
  ai_multipliers: {
    defendBase: 1.6,       reforzarDefensa: 1.4,      expandirTerritorio: 1.1,
    conquistarCiudad: 1.0, capturarRecurso: 1.0,      atacarEnemy: 0.8,
    investigarTech: 0.9,   construirBarcos: 0.6
  }
},

"Britania": {
  // Arqueros: +20 def; Barco de Guerra: xpGainModifier → arquería defensiva + XP naval rápido
  ai_archetype: 'defensiva-naval',
  ai_multipliers: {
    defendBase: 1.4,       reforzarDefensa: 1.3,      construirBarcos: 1.4,
    expandirTerritorio: 1.1, capturarRecurso: 1.0,    atacarEnemy: 0.9,
    conquistarCiudad: 0.9, investigarTech: 1.0
  }
},

// ── ECONÓMICAS ───────────────────────────────────────────────────────────────

"Babilonia": {
  // economyBonus: researchPointBonus +25%; Arqueros: +20 def → tecnología como motor
  ai_archetype: 'investigacion',
  ai_multipliers: {
    investigarTech: 2.5,   capturarRecurso: 1.2,      expandirTerritorio: 1.1,
    defendBase: 1.1,       reforzarDefensa: 1.0,      conquistarCiudad: 0.9,
    atacarEnemy: 0.8,      construirBarcos: 0.7
  }
},

"Mameluca": {
  // globalBonus: sin upkeep de oro NI comida → puede sostener más unidades sin coste
  ai_archetype: 'economica',
  ai_multipliers: {
    reforzarDefensa: 1.6,  expandirTerritorio: 1.4,   capturarRecurso: 1.3,
    defendBase: 1.2,       conquistarCiudad: 1.0,     atacarEnemy: 1.1,
    investigarTech: 1.0,   construirBarcos: 0.8
  }
},

// ── ESPECIALISTAS: ARQUEROS ──────────────────────────────────────────────────

"Egipto": {
  // Arqueros: +20 atk, +1 rango → dominio a distancia, control de casillas
  ai_archetype: 'arqueros',
  ai_multipliers: {
    atacarEnemy: 1.5,      capturarRecurso: 1.4,      conquistarCiudad: 1.2,
    expandirTerritorio: 1.1, reforzarDefensa: 1.0,    defendBase: 0.9,
    investigarTech: 0.9,   construirBarcos: 0.5
  }
},

"Maya": {
  // Arqueros: +20 atk; Barco de Guerra: xpGainModifier → arquería rápida + XP naval
  ai_archetype: 'arqueros-xp',
  ai_multipliers: {
    atacarEnemy: 1.5,      capturarRecurso: 1.4,      conquistarCiudad: 1.1,
    expandirTerritorio: 1.2, construirBarcos: 1.2,    defendBase: 0.9,
    investigarTech: 0.9,   reforzarDefensa: 0.9
  }
},

// ── ESPECIALISTAS: CABALLERÍA ────────────────────────────────────────────────

"Mongol": {
  // Caballería Ligera: +1 mov; Arqueros a Caballo: +1 mov → movilidad extrema y expansión
  ai_archetype: 'caballeria-movimiento',
  ai_multipliers: {
    expandirTerritorio: 1.6, capturarRecurso: 1.6,    atacarEnemy: 1.5,
    conquistarCiudad: 1.2,   reforzarDefensa: 0.8,    defendBase: 0.7,
    investigarTech: 0.7,     construirBarcos: 0.4
  }
},

"Arábiga": {
  // Caballería Ligera: +20 atk → jinetes ofensivos rápidos
  ai_archetype: 'caballeria-ofensiva',
  ai_multipliers: {
    atacarEnemy: 1.5,      capturarRecurso: 1.4,      expandirTerritorio: 1.3,
    conquistarCiudad: 1.2, reforzarDefensa: 0.8,      defendBase: 0.8,
    investigarTech: 0.8,   construirBarcos: 0.5
  }
},

// ── ESPECIALISTAS: POLIVALENTES / PÓLVORA ───────────────────────────────────

"Iberia": {
  // Infantería Ligera: +40 atk; Caballería Ligera: +20 atk; Artillería: +20 atk → versátil total
  ai_archetype: 'versatil',
  ai_multipliers: {
    atacarEnemy: 1.5,      capturarRecurso: 1.3,      expandirTerritorio: 1.3,
    conquistarCiudad: 1.2, reforzarDefensa: 1.0,      defendBase: 1.0,
    investigarTech: 0.9,   construirBarcos: 0.7
  }
},

"Vikingos": {
  // Infantería Ligera: +20 atk, +1 mov → incursiones rápidas y pillaje
  ai_archetype: 'incursora',
  ai_multipliers: {
    atacarEnemy: 1.5,      capturarRecurso: 1.5,      expandirTerritorio: 1.4,
    construirBarcos: 1.3,  conquistarCiudad: 1.1,     defendBase: 0.7,
    investigarTech: 0.8,   reforzarDefensa: 0.7
  }
},

"China": {
  // Arqueros: +20 atk; Arcabuceros: +20 atk; Barco de Guerra: xpGainModifier → pólvora + XP
  ai_archetype: 'polvora',
  ai_multipliers: {
    atacarEnemy: 1.4,      capturarRecurso: 1.3,      expandirTerritorio: 1.2,
    construirBarcos: 1.2,  investigarTech: 1.1,       conquistarCiudad: 1.1,
    defendBase: 0.9,       reforzarDefensa: 0.9
  }
},

"Grecia": {
  // Infantería Ligera: +20 def, +1 mov → flexible, resistente, buena para rutas y recursos
  ai_archetype: 'expansionista',
  ai_multipliers: {
    expandirTerritorio: 1.4, capturarRecurso: 1.3,    atacarEnemy: 1.1,
    conquistarCiudad: 1.1,   defendBase: 1.1,         investigarTech: 1.0,
    reforzarDefensa: 1.0,    construirBarcos: 0.6
  }
},

// ── NAVALES ──────────────────────────────────────────────────────────────────

"Cartago": {
  // Artillería: +20 atk; Patache: +10 def, +1 mov; Barco de Guerra: +20 def, +1 rango
  ai_archetype: 'naval',
  ai_multipliers: {
    construirBarcos: 2.0,  capturarRecurso: 1.2,      expandirTerritorio: 1.2,
    reforzarDefensa: 0.9,  defendBase: 1.0,           conquistarCiudad: 0.7,
    atacarEnemy: 0.6,      investigarTech: 0.8
  }
},

// ── NEUTRALES / NPC ──────────────────────────────────────────────────────────

"ninguna": {
  // Sin bonuses → estándar equilibrado
  ai_archetype: 'estandar',
  ai_multipliers: {
    conquistarCiudad: 1.0, expandirTerritorio: 1.0,   defendBase: 1.0,
    atacarEnemy: 1.0,      investigarTech: 1.0,       construirBarcos: 1.0,
    capturarRecurso: 1.0,  reforzarDefensa: 1.0
  }
},

"Bárbaros": {
  // Reinos Independientes: sin bonuses, comportamiento defensivo-pasivo
  ai_archetype: 'independiente',
  ai_multipliers: {
    defendBase: 1.3,       reforzarDefensa: 1.2,      capturarRecurso: 1.0,
    expandirTerritorio: 0.8, conquistarCiudad: 0.8,   atacarEnemy: 0.9,
    investigarTech: 0.7,   construirBarcos: 0.5
  }
},

// ── REINOS IBÉRICOS (CIVILIZATIONS_IBERIA) ───────────────────────────────────
// NOTA: los bonuses de CIVILIZATIONS_IBERIA están como /* ... */ en constants.js.
// Los multipliers abajo son un placeholder lógico hasta que se definan los bonuses reales.

"Castilla": {
  // Arquetipo: reino conquistador peninsular
  ai_archetype: 'conquistadora-iberia',
  ai_multipliers: {
    conquistarCiudad: 1.4, expandirTerritorio: 1.3,   atacarEnemy: 1.2,
    reforzarDefensa: 1.1,  defendBase: 1.1,            capturarRecurso: 1.1,
    investigarTech: 1.0,   construirBarcos: 0.7
  }
},

"Aragon": {
  // Arquetipo: potencia naval mediterránea y conquistadora
  ai_archetype: 'naval-conquistadora',
  ai_multipliers: {
    construirBarcos: 1.5,  conquistarCiudad: 1.3,     expandirTerritorio: 1.3,
    capturarRecurso: 1.2,  atacarEnemy: 1.1,          defendBase: 1.0,
    investigarTech: 1.0,   reforzarDefensa: 0.9
  }
},

"Portugal": {
  // Arquetipo: exploración, expansión naval, apertura de rutas
  ai_archetype: 'exploradora-naval',
  ai_multipliers: {
    expandirTerritorio: 1.6, construirBarcos: 1.5,    capturarRecurso: 1.3,
    conquistarCiudad: 1.1,   investigarTech: 1.1,     defendBase: 0.9,
    atacarEnemy: 0.9,        reforzarDefensa: 0.8
  }
},

"Navarra": {
  // Arquetipo: defensiva de montaña, control de pasos
  ai_archetype: 'defensiva-pirenaica',
  ai_multipliers: {
    defendBase: 1.5,       reforzarDefensa: 1.4,      expandirTerritorio: 1.1,
    capturarRecurso: 1.0,  conquistarCiudad: 1.0,     atacarEnemy: 0.9,
    investigarTech: 0.9,   construirBarcos: 0.5
  }
},

"Granada": {
  // Arquetipo: defensiva resistente, arquería ligera
  ai_archetype: 'defensiva-arqueros',
  ai_multipliers: {
    defendBase: 1.6,       reforzarDefensa: 1.5,      capturarRecurso: 1.2,
    atacarEnemy: 1.1,      expandirTerritorio: 0.9,   conquistarCiudad: 0.8,
    investigarTech: 0.9,   construirBarcos: 0.5
  }
},
```

---

## 3️⃣ TABLA COMPLETA: MULTIPLICADORES PARA TODAS LAS CIVILIZACIONES

Derivada de los bonuses reales en `constants.js`. Clave del objeto = clave exacta en `CIVILIZATIONS` / `CIVILIZATIONS_IBERIA`.

```
CIV (clave)      │ Arquetipo             │ FUERTE (×)                    │ DÉBIL (×)
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Roma             │ conquistadora         │ conquistarCiudad ×1.5         │ construirBarcos ×0.5
                 │                       │ expandirTerritorio ×1.5       │ investigarTech ×0.9
                 │                       │ atacarEnemy ×1.3              │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Asiria           │ asedio-terror         │ conquistarCiudad ×1.8         │ defendBase ×0.7
                 │                       │ atacarEnemy ×1.6              │ construirBarcos ×0.4
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Otomana          │ asedio-polvora        │ conquistarCiudad ×1.8         │ construirBarcos ×0.5
                 │                       │ atacarEnemy ×1.5              │ defendBase ×0.8
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Galia            │ atacante              │ atacarEnemy ×1.6              │ defendBase ×0.7
                 │                       │ conquistarCiudad ×1.3         │ investigarTech ×0.7
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Persia           │ economica-defensiva   │ defendBase ×2.0               │ atacarEnemy ×0.5
                 │                       │ reforzarDefensa ×1.5          │ conquistarCiudad ×0.8
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Japón            │ defensiva-honor       │ defendBase ×1.8               │ construirBarcos ×0.6
                 │                       │ reforzarDefensa ×1.6          │ conquistarCiudad ×0.9
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Germania         │ defensiva             │ defendBase ×1.6               │ atacarEnemy ×0.8
                 │                       │ reforzarDefensa ×1.4          │ construirBarcos ×0.6
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Britania         │ defensiva-naval       │ defendBase ×1.4               │ atacarEnemy ×0.9
                 │                       │ construirBarcos ×1.4          │ conquistarCiudad ×0.9
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Babilonia        │ investigacion         │ investigarTech ×2.5           │ atacarEnemy ×0.8
                 │                       │ capturarRecurso ×1.2          │ conquistarCiudad ×0.9
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Mameluca         │ economica             │ reforzarDefensa ×1.6          │ construirBarcos ×0.8
                 │                       │ expandirTerritorio ×1.4       │ (sin debilidad grave)
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Egipto           │ arqueros              │ atacarEnemy ×1.5              │ construirBarcos ×0.5
                 │                       │ capturarRecurso ×1.4          │ defendBase ×0.9
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Maya             │ arqueros-xp           │ atacarEnemy ×1.5              │ defendBase ×0.9
                 │                       │ capturarRecurso ×1.4          │ reforzarDefensa ×0.9
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Mongol           │ caballeria-movimiento │ expandirTerritorio ×1.6       │ defendBase ×0.7
                 │                       │ capturarRecurso ×1.6          │ construirBarcos ×0.4
                 │                       │ atacarEnemy ×1.5              │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Arábiga          │ caballeria-ofensiva   │ atacarEnemy ×1.5              │ construirBarcos ×0.5
                 │                       │ capturarRecurso ×1.4          │ defendBase ×0.8
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Iberia           │ versatil              │ atacarEnemy ×1.5              │ construirBarcos ×0.7
                 │                       │ capturarRecurso ×1.3          │ investigarTech ×0.9
                 │                       │ expandirTerritorio ×1.3       │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Vikingos         │ incursora             │ atacarEnemy ×1.5              │ defendBase ×0.7
                 │                       │ capturarRecurso ×1.5          │ reforzarDefensa ×0.7
                 │                       │ construirBarcos ×1.3          │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
China            │ polvora               │ atacarEnemy ×1.4              │ defendBase ×0.9
                 │                       │ expandirTerritorio ×1.2       │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Grecia           │ expansionista         │ expandirTerritorio ×1.4       │ construirBarcos ×0.6
                 │                       │ capturarRecurso ×1.3          │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Cartago          │ naval                 │ construirBarcos ×2.0          │ atacarEnemy ×0.6
                 │                       │ capturarRecurso ×1.2          │ conquistarCiudad ×0.7
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
ninguna          │ estandar              │ todos ×1.0                    │ ninguna
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Bárbaros         │ independiente         │ defendBase ×1.3               │ investigarTech ×0.7
                 │                       │ reforzarDefensa ×1.2          │ construirBarcos ×0.5
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
── REINOS IBÉRICOS (CIVILIZATIONS_IBERIA — bonuses pendientes de definir en constants.js) ────────
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Castilla         │ conquistadora-iberia  │ conquistarCiudad ×1.4         │ construirBarcos ×0.7
                 │                       │ expandirTerritorio ×1.3       │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Aragon           │ naval-conquistadora   │ construirBarcos ×1.5          │ reforzarDefensa ×0.9
                 │                       │ conquistarCiudad ×1.3         │
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Portugal         │ exploradora-naval     │ expandirTerritorio ×1.6       │ atacarEnemy ×0.9
                 │                       │ construirBarcos ×1.5          │ reforzarDefensa ×0.8
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Navarra          │ defensiva-pirenaica   │ defendBase ×1.5               │ construirBarcos ×0.5
                 │                       │ reforzarDefensa ×1.4          │ atacarEnemy ×0.9
─────────────────┼───────────────────────┼───────────────────────────────┼────────────────────────
Granada          │ defensiva-arqueros    │ defendBase ×1.6               │ conquistarCiudad ×0.8
                 │                       │ reforzarDefensa ×1.5          │ expandirTerritorio ×0.9
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


