# AI Civilization Logic - Comportamiento Diferenciado por Civilización

**Versión:** 1.0 | **Para:** Civilization-Specific AI Strategies | **Última actualización:** Febrero 2026

---

## 🏛️ Introducción

Cada civilización tiene un **"arquetipo estratégico"** que define cómo juega la IA:

- **IBERIA** = Defensiva territorial (ama montañas)
- **ROMA** = Agresiva + versátil (expande rápido)
- **CARTAGO** = Comercial + naval (economía exponencial)
- **GRECIA** = Investigación + leveling (gana con tiempo)
- **PERSIA** = Defensiva morale (fortalecer posiciones)

Cada civilización tiene:
1. **Pesos distintos** para las mismas acciones
2. **Mapas de influencia personalizados**
3. **Estrategias alternativas** de despliegue
4. **Prioridades de investigación** únicas

---

## 1️⃣ PERFIL IBERIA

### Identidad: "Guerrera Montañosa"

```
FORTALEZAS:
├─ +20% Defensa en Montaña
├─ +50% Movimiento en Montaña
└─ +10% Investigación

DEBILIDADES:
├─ -30% Velocidad en Llanura
└─ Difícil expandir a áreas planas

ESTILO IA:
├─ Preferencia por montañas
├─ Defensa pasiva-agresiva
├─ Espera a enemigo en posiciones fuertes
└─ Control territorial (no conquista rápida)
```

### Pesos Personalizados

```javascript
const IBERIA_WEIGHTS = {
  // ACCIONES
  defendBase: 1200,           // +20% (le encanta defender)
  expandTerritory: 800,       // -20% (lenta en llanura)
  captureResource: 1400,      // +40% (especialmente en montaña)
  attackEnemy: 1000,          // Normal
  tradeWithCartago: 300,      // Nunca comercia (no es fuerte)
  researchTech: 700,          // Normal
  
  // TERRENO MULTIPLICADORES
  terrain: {
    'montaña': 1.8,           // MUCHÍSIMO más valioso
    'bosque': 1.4,            // Buen terreno
    'colina': 1.2,            // Moderado
    'llanura': 0.7,           // Evitar
    'agua': 0.3               // No le importa
  },
  
  // CIUDADES
  cityCapture: 1200,          // En montañas, súper agresiva
  cityDefense: 1500,          // Defiende ciudades fuerte
  
  // PRIORIDAD DE INVESTIGACIÓN
  preferredTech: ['ADVANCED_TACTICS', 'FORTIFICATIONS', 'MOUNTAIN_WISDOM']
};
```

### Estrategia de Despliegue

```javascript
function deployUnitsIBERIA(playerNumber, territorioDisponible) {
  // PRINCIPIO: Controlar puntos altos y pasos montañosos
  
  const mountainPositions = territorioDisponible
    .filter(hex => hex.terrain === 'montaña')
    .sort((a, b) => b.elevationValue - a.elevationValue);
  
  const chokePoints = territorioDisponible
    .filter(hex => isChokePoint(hex)); // Pasos entre montañas
  
  // Despliegue: 60% en montañas, 30% en chokepoints, 10% cobertura
  const deployment = [
    ...mountainPositions.slice(0, 6),  // Posiciones altas
    ...chokePoints.slice(0, 3),        // Pasos
    ...territorioDisponible.slice(0, 1) // Flexible
  ];
  
  return deployment;
}
```

### Comportamiento en Combate

```
TÁCTICA IBERIA:
1. Retirarse a montaña si es posible (+20% defensa)
2. Buscar chokepoints para jugar en superioridad
3. Evitar llanuras (enemiga)
4. Fortalecer posiciones defensivas

VULNERABLE A:
- CARTAGO (comercio = más oro/unidades)
- GRECIA (investigación = unidades elite)
- Ataques desde llanura
```

### Invasión Naval (Defensor)

```
IBERIA como defensor:
✓ Excelente (montañas naturales en arquipélago)
├─ Defiende desde colinas
├─ USA las montañas como fortaleza
└─ Muy resistente

CAMBIOS EN INVASIÓN:
├─ Territorio montañoso = +50% valor defensivo
├─ Defiende pasos de agua
└─ Nunca intenta conquistar mucha agua
```

---

## 2️⃣ PERFIL ROMA

### Identidad: "Imperio Expansionista"

```
FORTALEZAS:
├─ -20% Costo Construcción (más unidades)
├─ +30% Defensa en Fortifications
└─ +15% Generación de Oro

DEBILIDADES:
├─ +10% Upkeep (más caro mantener)
└─ Versátil pero sin especialidad

ESTILO IA:
├─ Expansión agresiva
├─ Intenta conquistar TODAS las ciudades
├─ Economía fuerte = más unidades
└─ Juega ofensivo el 80% del tiempo
```

### Pesos Personalizados

```javascript
const ROMA_WEIGHTS = {
  // ACCIONES
  defendBase: 700,            // -30% (prefiere ataque)
  expandTerritory: 1600,      // +60% (ROMA EXPANDE)
  captureCity: 2000,          // +100% (PRIORIDAD)
  captureResource: 1200,      // Normal
  attackEnemy: 1800,          // +80% (agresiva)
  tradeWithCartago: 200,      // Mínimo
  researchTech: 900,          // Moderado
  
  // TERRENO MULTIPLICADORES
  terrain: {
    'llanura': 1.3,           // Bueno (puede expandir rápido)
    'montaña': 0.8,           // Evita (difícil construir)
    'bosque': 1.0,            // Normal
    'colina': 1.2,            // Buen terreno
    'agua': 0.6               // Evita
  },
  
  // CIUDADES
  cityCapture: 2500,          // MÁXIMA PRIORIDAD
  cityDefense: 1000,          // Menos defensiva
  
  // CONSTRUCCIÓN & FORTIFICACIONES
  buildFortifications: 1400,  // +40% (le gusta fortalecer)
  buildSettlements: 1800,     // +80% (expande rápido)
  
  // PRIORIDAD DE INVESTIGACIÓN
  preferredTech: ['EMPIRE_EXPANSION', 'MILITARY_DOCTRINE', 'CONSTRUCTION']
};
```

### Estrategia de Despliegue

```javascript
function deployUnitsROMA(playerNumber, territorioDisponible) {
  // PRINCIPIO: Máxima cobertura + ciudades fortificadas
  
  const cityPositions = findAllCities(playerNumber);
  const adjacentToCity = territorioDisponible
    .filter(hex => hasNearbyCity(hex, 2));
  
  // Despliegue: 50% defendiendo ciudades, 50% expansión
  const deployment = [
    ...cityPositions.map(city => getNearestHex(city, territorioDisponible)),
    ...adjacentToCity.slice(0, 5)
  ];
  
  return deployment;
}
```

### Comportamiento en Juego

```
ESPAÑA ROMA TURNO-A-TURNO:
┌─ Turno 1-2: ¿Hay ciudad neutral cerca?
│   ├─ SÍ → Atacar con todo (+2500 peso)
│   └─ NO → Expandir territorio (+1600 peso)
├─ Turno 3-5: ¿Enemigo en llanura? 
│   ├─ SÍ → ATACAR FRONTAL (+1800 peso)
│   └─ NO → Seguir conquistando ciudades
└─ Turno 6+: Dominación masiva
```

### Invasión Naval (Atacante)

```
ROMA como atacante:
✓ EXCELENTE (económica + agresiva)
├─ Genera muchos recursos
├─ Construye muchas unidades rápido
├─ Ataca ciudades enemigas agresivamente
└─ Win condition: Conquistar territorio

CAMBIOS EN INVASIÓN ATACANTE:
├─ +100% peso CONQUISTAR (máxima prioridad)
├─ +50% peso EXPANDIR (territorio)
├─ -50% peso COMERCIAR (no hay tiempo)
└─ Objetivo: Llegar a 20%+ territorio RÁPIDO
```

---

## 3️⃣ PERFIL CARTAGO

### Identidad: "Mercader Naval"

```
FORTALEZAS:
├─ +30% Ingresos Comercio
├─ -15% Costo Naval
└─ +50% Visión Naval

DEBILIDADES:
├─ -20% Defensa Tierra
└─ Muy dependiente de agua/rutas

ESTILO IA:
├─ Económico (NO militar)
├─ Busca rutas comerciales
├─ Construye armada naval
├─ Win condition: Economía exponencial
└─ Débil en combate terrestre
```

### Pesos Personalizados

```javascript
const CARTAGO_WEIGHTS = {
  // ACCIONES
  defendBase: 400,            // -60% (débil en tierra)
  expandTerritory: 1000,      // Moderado
  captureCity: 600,           // Baja (no le importa mucho)
  captureResource: 1200,      // Normal
  attackEnemy: 300,           // -70% (no le gusta combate)
  establishTradRoute: 2500,   // MÁXIMA PRIORIDAD
  buildNavalFleet: 1800,      // +80% (construye barcos)
  researchTech: 600,          // Bajo (no le importa leveling)
  
  // TERRENO MULTIPLICADORES
  terrain: {
    'agua': 2.0,              // CARTAGO DOMINA AGUA
    'costa': 1.8,             // Excelente
    'llanura': 0.7,           // Evita
    'montaña': 0.5,           // Muy malo
    'bosque': 0.6
  },
  
  // CIUDADES
  cityCapture: 400,           // Baja (no es su foco)
  cityDefense: 300,           // Muy baja (débil)
  
  // COMERCIO
  tradeRouteValue: 300,       // Cada ruta = +300 valor
  
  // PRIORIDAD DE INVESTIGACIÓN
  preferredTech: ['TRADE_ROUTES', 'NAVAL_MASTERY', 'ECONOMIC_GROWTH']
};
```

### Estrategia de Despliegue

```javascript
function deployUnitsCARTAGO(playerNumber, territorioDisponible) {
  // PRINCIPIO: Proteger costas + rutas comerciales
  
  const coastPositions = territorioDisponible
    .filter(hex => isCoastal(hex));
  
  const tradeRoutes = findOptimalTradeRoutes(playerNumber);
  const tradeHexes = tradeRoutes.map(route => route.path).flat();
  
  // Despliegue: 70% en costas, 30% protegiendo rutas
  const deployment = [
    ...coastPositions.slice(0, 7),
    ...tradeHexes.filter(hex => isVulnerable(hex)).slice(0, 3)
  ];
  
  return deployment;
}
```

### Comportamiento en Juego

```
CARTAGO TURNO-A-TURNO:
┌─ Turno 1-3: Establecer rutas comerciales
│   ├─ +30% oro/turno por cada ruta exitosa
│   └─ Proteger rutas con pocas unidades
├─ Turno 4-6: Construir flota naval
│   ├─ Con oro extra, crea barcos
│   └─ Controla agua cerca de enemigo
└─ Turno 7+: Economía exponencial
    └─ Puede financiar CUALQUIER cosa
```

### Punto Débil: Combate Terrestre

```
CARTAGO vs ROMA en llanura:
┌─ ROMA: +100 ataque
├─ CARTAGO: +60 ataque (-20% por civilización)
└─ ROMA GANA SIEMPRE
    → CARTAGO evita combate terrestre
    → Busca combate NAVAL
```

### Invasión Naval (Atacante/Neutral)

```
CARTAGO en invasión naval:
✓ BUENA (control del agua)
├─ Construye armada rápido
├─ Controla mares alrededor de defensor
├─ Bloquea suministros por agua (si hay)
└─ Pero defensa terrestre DÉBIL

CAMBIOS EN INVASIÓN:
├─ +150% peso CONSTRUIR FLOTA
├─ +80% peso CONTROL AGUA
├─ -80% peso EXPANDIR TIERRA
└─ Objetivo: Dominar agua + asedio
```

---

## 4️⃣ PERFIL GRECIA

### Identidad: "Estudiosa Elite"

```
FORTALEZAS:
├─ +20% XP Generado (leveling rápido)
├─ +2 Talento slots (unidades más especiales)
└─ +30% Crítico

DEBILIDADES:
├─ -20% Oro generado (pobre)
└─ +30% Upkeep (caro mantener)

ESTILO IA:
├─ Espera pacientemente
├─ Invierte en investigación + leveling
├─ Pocas unidades PERO ELITE
├─ Win condition: Arrollamiento tardío (turno 30+)
└─ Débil temprano, fuerte tarde
```

### Pesos Personalizados

```javascript
const GRECIA_WEIGHTS = {
  // ACCIONES
  defendBase: 800,            // Normal
  expandTerritory: 600,       // -40% (no expande rápido)
  captureCity: 400,           // -60% (no es su foco)
  captureResource: 1000,      // Normal
  attackEnemy: 1200,          // +20% (si es beneficial)
  researchTech: 2000,         // +200% MÁXIMA PRIORIDAD
  levelUpUnits: 1800,         // +80% (calidad > cantidad)
  trainEliteUnits: 1500,      // +50% (pocos pero fuertes)
  
  // TERRENO MULTIPLICADORES
  terrain: {
    'llanura': 1.0,           // Neutral
    'montaña': 1.0,           // Neutral
    'bosque': 0.9,
    'colina': 1.0,
    'agua': 0.8
  },
  
  // CIUDADES
  cityCapture: 200,           // Baja (no le importa)
  cityDefense: 700,           // Defiende si la tiene
  
  // INVESTIGACIÓN
  researchSpeed: 2.0,         // El doble de rápido
  preferredTech: ['LEGENDARY_FORGE', 'MILITARY_DOCTRINE', 'ADVANCED_TACTICS']
};
```

### Estrategia de Despliegue

```javascript
function deployUnitsGRECIA(playerNumber, territorioDisponible) {
  // PRINCIPIO: Pocas unidades, MUY BIEN equipadas
  
  // Solo despliega 3-4 unidades máximo
  const elitePositions = territorioDisponible
    .slice(0, 3)
    .map(hex => ({
      position: hex,
      type: 'elite',  // Caballería Pesada, Artillería
      talents: ['Charge', 'Fortified']
    }));
  
  return elitePositions;
}
```

### Comportamiento en Juego

```
GRECIA TURNO-A-TURNO:
┌─ Turno 1-10: DEFENSA + INVESTIGACIÓN
│   ├─ Entrena 2-3 unidades ELITE solamente
│   ├─ Invierte TODO en techs
│   └─ Evita combate (pequeño)
├─ Turno 11-20: LEVELING
│   ├─ Unidades suben de nivel combatiendo
│   ├─ XP+20% natural = MUCHO más fuerte
│   └─ Empiezan a atacar
└─ Turno 21+: ARROLLAMIENTO
    ├─ Unidades nivel 4-5 con todos los talentos
    ├─ ATTAQUE MASIVO con pocas tropas
    └─ Gana partida si llegó a turno 30
```

### Debilidad Crítica

```
GRECIA VULNERABLE A:
┌─ ROMA: Ataque rápido turno 5-8 (antes de leveling)
├─ CARTAGO: Bloqueo económico (Grecia es pobre)
└─ IBERIA: Defensa montañosa resistente

CONTRAPUNTO GRECIA:
└─ Si sobrevive hasta turno 20, GANA A TODO
```

### Invasión Naval (Defensor)

```
GRECIA como defensor:
✓ BUENA (si se aguanta)
├─ Pocas unidades elite
├─ Fuerte + talentosas
├─ Investigación rápida
└─ Pero economía débil

CAMBIOS EN INVASIÓN:
├─ +300% peso INVESTIGACIÓN (supervivencia)
├─ -50% peso EXPANDIR
├─ Objetivo: Aguantar + mejorar unidades
└─ Win condition: Destruir atacante con élites
```

---

## 5️⃣ PERFIL PERSIA

### Identidad: "Defensora Morale"

```
FORTALEZAS:
├─ +40% Morale (unidades muy motivadas)
├─ +2 Movimiento (muy ágil)
└─ Habilidad: Retiro Estratégico (escapar de combate)

DEBILIDADES:
├─ -20% Ataque (débil ofensivo)
└─ Más lenta en combate

ESTILO IA:
├─ Juega DEFENSIVO
├─ Refuerza posiciones
├─ Usa morale para mantener territorio
├─ Win condition: Aguantar + castigo tardío
└─ Muy resistente, poco ofensiva
```

### Pesos Personalizados

```javascript
const PERSIA_WEIGHTS = {
  // ACCIONES
  defendBase: 2000,           // +100% DEFENSA MÁXIMA
  expandTerritory: 800,       // Moderado
  captureCity: 600,           // -40% (no ofensiva)
  captureResource: 1100,      // Normal
  attackEnemy: 400,           // -80% (muy defensiva)
  reinforcePositions: 1700,   // +70% (fortalecer)
  rallyMorale: 1500,          // +50% (special)
  strategicRetreat: 1600,     // +60% (unique)
  
  // TERRENO MULTIPLICADORES
  terrain: {
    'llanura': 1.0,
    'montaña': 1.3,           // Buen terreno
    'bosque': 1.2,            // Buen terreno
    'colina': 1.2,
    'agua': 0.7
  },
  
  // CIUDADES
  cityCapture: 300,           // Muy baja
  cityDefense: 2000,          // DEFIENDE A MUERTE
  
  // MORAL
  moraleBonus: 300,           // Cada +10 morale = +300 valor
  
  // PRIORIDAD DE INVESTIGACIÓN
  preferredTech: ['MILITARY_DOCTRINE', 'ADVANCED_TACTICS', 'FORTIFICATIONS']
};
```

### Estrategia de Despliegue

```javascript
function deployUnitsPERSIA(playerNumber, territorioDisponible) {
  // PRINCIPIO: Defensa concentrada + morale
  
  const defensiveHubs = territorioDisponible
    .filter(hex => isDefensivePosition(hex))
    .slice(0, 8);
  
  // Despliegue: Crear "fortaleza" compacta
  const deployment = defensiveHubs.map(hex => ({
    position: hex,
    role: 'defensive',
    supportMorale: true  // Agrupadas para morale
  }));
  
  return deployment;
}
```

### Comportamiento en Juego

```
PERSIA TURNO-A-TURNO:
┌─ Turno 1-5: Entrincherar
│   ├─ Pocas unidades, BIEN posicionadas
│   ├─ Morale = +40%, super resistentes
│   └─ Evita expansión agresiva
├─ Turno 6-15: Resistencia
│   ├─ Si atacan: Contraataque pequeño
│   ├─ Retiro estratégico si amenaza
│   └─ Fortalecer posiciones
└─ Turno 16+: Castigo
    ├─ Unidades enemiga desgastadas
    ├─ Contraataque con ventaja
    └─ Gana por desgaste
```

### Habilidad Única: Retiro Estratégico

```
PERSIA puede RETIRARSE de un combate
├─ Evita pérdidas totales
├─ Reagrupa en mejor posición
└─ Otros civs NO PUEDEN (lucha hasta perder)

IMPACTO EN IA:
├─ Pelea menos temiendo
├─ Puede jugar arriesgado sabiendo que se retira
└─ +1.5× valor defensivo por esto
```

### Invasión Naval (Defensor) ⭐⭐⭐

```
PERSIA como defensor:
✓✓✓ EXCELENTE (el mejor defensor)
├─ +40% morale = súper resistente
├─ +2 movimiento = muy ágil
├─ Retiro estratégico = casi inmortal
├─ +1.8× multiplicador en invasión defensiva
└─ Difícil de vencer incluso en desventaja

CAMBIOS EN INVASIÓN DEFENSOR:
├─ +200% peso DEFENDERSE
├─ +150% peso REFORZAR
├─ +100% peso RETIRO ESTRATÉGICO
├─ -80% peso ATACAR
└─ Objetivo: AGUANTAR > 40+ turnos
```

---

## 6️⃣ TABLA COMPARATIVA RÁPIDA

```
CIV      │ FUERTE│ DÉBIL       │ EARLY │ MID  │ LATE │ INVASIÓN
─────────┼───────┼─────────────┼───────┼──────┼──────┼─────────
IBERIA   │ Defens│ Llanura     │ 🟡    │ 🟡🟡  │ 🟡   │ Def ✓
ROMA     │ Agresi│ Especialid. │ 🟢🟢  │ 🟢🟢🟢│ 🟢🟢 │ Ataq ✓✓
CARTAGO  │ Comer │ Tierra      │ 🟡    │ 🟢🟢  │ 🟢🟢 │ Neu ✓
GRECIA   │ Invest│ Pobre       │ 🔴    │ 🟡   │ 🟢🟢🟢│ Def ✓
PERSIA   │ Moral │ Ataque      │ 🟡    │ 🟡🟡  │ 🟢🟢 │ Def✓✓✓
```

---

## 7️⃣ IMPLEMENTACIÓN: SELECTOR INTELIGENTE

```javascript
function getAIStrategyByCivilization(civilization, gameMode, playerNumber) {
  
  const strategies = {
    'IBERIA': {
      weights: IBERIA_WEIGHTS,
      deployment: deployUnitsIBERIA,
      priority: ['defendBase', 'captureInMountain', 'expandSlow'],
      advantageAgainst: ['ROMA'], // In mountains
      vulnerableTo: ['CARTAGO']
    },
    'ROMA': {
      weights: ROMA_WEIGHTS,
      deployment: deployUnitsROMA,
      priority: ['expandTerritory', 'captureCity', 'attackEnemy'],
      advantageAgainst: ['GRECIA'],
      vulnerableTo: ['CARTAGO'] // Economía
    },
    'CARTAGO': {
      weights: CARTAGO_WEIGHTS,
      deployment: deployUnitsCARTAGO,
      priority: ['establishTradRoute', 'buildNavalFleet', 'avoidCombat'],
      advantageAgainst: ['ROME', 'IBERIA'],
      vulnerableTo: ['GRECIA'] // Investigación late game
    },
    'GRECIA': {
      weights: GRECIA_WEIGHTS,
      deployment: deployUnitsGRECIA,
      priority: ['researchTech', 'levelUpUnits', 'surviveEarly'],
      advantageAgainst: ['ROMA', 'IBERIA'],
      vulnerableTo: ['CARTAGO'] // Bloqueo económico
    },
    'PERSIA': {
      weights: PERSIA_WEIGHTS,
      deployment: deployUnitsPERSIA,
      priority: ['defendBase', 'reinforcePositions', 'resistAttrition'],
      advantageAgainst: ['CARTAGO'],
      vulnerableTo: ['ROME'] // Early aggression
    }
  };
  
  // En invasión, modificar pesos
  if (gameMode === 'invasion') {
    strategies[civilization].weights = applyInvasionModifiers(
      strategies[civilization].weights,
      playerNumber === 1 ? 'attacker' : 'defender'
    );
  }
  
  return strategies[civilization];
}
```

---

## 8️⃣ EJEMPLO: INVASIÓN NAVAL 2 JUGADORES

**Escenario:**
- Atacante = ROMA (agresiva)
- Defensor = PERSIA (resistencia)
- Mapa = Naval Archipelago

**Turno 1-3: Despliegue**
```
ROMA (Atacante):
├─ Despliega OFENSIVAMENTE
├─ 7 unidades cerca de base
├─ Objetivo: Romper perimeter en turno 4-5

PERSIA (Defensor):
├─ Despliega DEFENSIVAMENTE
├─ 5 ciudades + 20 unidades
├─ Fortifica alrededor de capital
└─ Morale +40% = muy resistentes
```

**Turno 4-8: Combate Inicial**
```
ROMA ataca → PERSIA aguanta (+40% morale)
PERSIA usa Retiro Estratégico → evita bajas
Atrito lento a favor de PERSIA (tiene +territorio)
```

**Turno 9-20: Equilibrio Precario**
```
ROMA: Economía crece, conquista lentamente
PERSIA: Desgaste, pero resistente
Resultado: Depende si ROMA logra romper defensa
```

**Turno 21+: Momento de Verdad**
```
├─ Si ROMA conquistó 15%+ territorio → ROMA GANA
├─ Si PERSIA aguantó sin perder → PERSIA GANA
└─ Probabilidad: 60% PERSIA (mejor defensor)
```

---

## 9️⃣ CHECKLIST PARA IMPLEMENTACIÓN

- [ ] Crear `IBERIA_WEIGHTS`, `ROMA_WEIGHTS`, etc. en constants.js
- [ ] Implementar funciones de despliegue por civ
- [ ] Crear `getAIStrategyByCivilization()`
- [ ] Aplicar multiplicadores de modo en despliegue
- [ ] Integrar con mapas de influencia (parte 2)
- [ ] Testear cada civ en escenario invasión
- [ ] Validar balanceo (no civ gane demasiado)
- [ ] Agregar logging para debugging

---

## 🔟 NOTAS FINALES

### Filosofía de Balance

```
Cada civilización DEBE ser viable en invasión naval:
├─ ROMA: Atacante fuerte
├─ PERSIA: Defensor fuerte
├─ CARTAGO: Neutral (buena en agua)
├─ GRECIA: Underdog (leveling late)
└─ IBERIA: Montañas (si hay montañas en mapa)

Cambios futuros pueden añadir:
├─ Bonificadores de sinergia (Roma + Cartago = bueno)
├─ Contadores (Rock-Paper-Scissors): Roma > IBERIA > CARTAGO > ROMA
└─ Eventos dinámicos que benefician civs específicas
```

---

**Próximo paso:** Integrar estos 3 archivos en el código actual.

**Sugerencia de orden:**
1. Implementar `AI_WEIGHTS_DEFINITION.md` (constants + funciones simples)
2. Implementar `AI_INFLUENCE_MAPS.md` (mapas espaciales)
3. Implementar `AI_CIVILIZATION_LOGIC.md` (comportamiento final)

---

**Última actualización:** Febrero 2026
