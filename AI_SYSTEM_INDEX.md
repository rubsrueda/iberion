# 🤖 AI SYSTEM - ÍNDICE DE REFERENCIA RÁPIDA

**3 documentos maestros para definir la IA de Iberion**

---

## 📋 CONTENIDOS

### 1. **AI_WEIGHTS_DEFINITION.md**
**¿Qué es?** Tabla de valores numéricos para decisiones de la IA

**Contiene:**
- ✅ Pesos base por objetivo (recursos, ciudades, unidades enemigas)
- ✅ Tabla de acciones disponibles y su prioridad
- ✅ Modificadores por modo de juego (normal, invasión, puntos victoria)
- ✅ Multiplicadores por civilización
- ✅ Pesos de estado (según oro disponible)
- ✅ Multiplicadores por distancia y terreno
- ✅ Tabla consolidada de ejemplo
- ✅ Algoritmo simple de decisión

**Usa si:**
- Necesitas saber "¿cuánto vale matar una unidad?"
- Quieres balancear la IA (aún ataca demasiado? Baja el peso)
- Implementas `calculateActionWeight(action, mode, civ)`

**Ejemplo:**
```javascript
// Ciudad enemiga en invasión para Roma
cityValue = 500 * 2.5 (invasión) * 1.2 (Roma) = 1500
// = MÁXIMA PRIORIDAD
```

---

### 2. **AI_INFLUENCE_MAPS.md**
**¿Qué es?** Cálculos matemáticos para valor de cada hexágono

**Contiene:**
- ✅ Fórmula central de influencia
- ✅ Componentes: recursos, ciudades, amenazas
- ✅ Bonificadores: terreno, conectividad, estratégico
- ✅ Cómo generar el mapa completo
- ✅ Ejemplo invasión naval defensor
- ✅ Visualización de heatmap
- ✅ Cómo usar el mapa en despliegue y gameplay

**Usa si:**
- Necesitas saber "¿a dónde debería ir mi unidad?"
- Quieres entender por qué IA elige cierta dirección
- Implementas `generateInfluenceMap(playerNumber, mode, civ)`

**Ejemplo:**
```javascript
// Hexágono cerca de ciudad enemiga (distancia 3)
// + recurso oro cercano (distancia 2)
// = Muy valioso para conquistar
influenceValue = (1000/9) + (100/4) = 111 + 25 = 136
```

---

### 3. **AI_CIVILIZATION_LOGIC.md**
**¿Qué es?** Comportamiento único para cada una de las 5 civilizaciones

**Contiene:**
- ✅ Perfil de IBERIA (defensiva montañosa)
- ✅ Perfil de ROMA (agresiva expansionista)
- ✅ Perfil de CARTAGO (comercial naval)
- ✅ Perfil de GRECIA (investigadora elite)
- ✅ Perfil de PERSIA (defensiva morale)
- ✅ Pesos únicos para cada civ
- ✅ Estrategias de despliegue personalizadas
- ✅ Comportamiento turno-a-turno
- ✅ Fortalezas, debilidades, vulnerabilidades
- ✅ Tabla comparativa de balance

**Usa si:**
- Necesitas saber "¿cómo juega Cartago?"
- Quieres que cada civ tenga personalidad
- Implementas `getAIStrategyByCivilization(civ, mode, player)`

**Ejemplo:**
```javascript
// ROMA atacante en invasión
// Pesos normales × 2.5 (invasión) × 1.2 (Roma)
// = conquistar ciudades = 2000 × 2.5 × 1.2 = 6000
// = PRIORIDAD ABSOLUTÍSIMA
```

---

## 🎯 ESTRUCTURA VISUAL

```
┌─────────────────────────────────────────────┐
│      AI_CIVILIZATION_LOGIC.md               │
│  (¿QUÉ civ? ¿Qué estrategia?)              │
│  ↓                                          │
│  ┌──────────────────────────────────────┐   │
│  │ AI_WEIGHTS_DEFINITION.md             │   │
│  │ (¿CUÁNTO vale cada acción?)          │   │
│  │  ↓                                   │   │
│  │  ┌────────────────────────────────┐  │   │
│  │  │ AI_INFLUENCE_MAPS.md           │  │   │
│  │  │ (¿DÓNDE? Mejor posición)       │  │   │
│  │  │                                │  │   │
│  │  │ Decisión Final:                │  │   │
│  │  │ Mover AQUÍ a Conquistar ESTO  │  │   │
│  │  └────────────────────────────────┘  │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

FLUJO:
1. Civ (PERSIA?) → Carga pesos personalizados
2. Pesos → Calcula valor de cada objetivo
3. Mapas → Calcula mejor posición
4. Decisión → Mover + ejecutar acción
```

---

## 🧮 EJEMPLO INTEGRADO: INVASIÓN NAVAL

**Escenario:** Defensor PERSIA, turno 3, mapa naval

### Paso 1: Cargar Civilización
```javascript
const strategy = getAIStrategyByCivilization('PERSIA', 'invasion_defender', 2);
// Retorna PERSIA_WEIGHTS con multiplicadores invasión aplicados
```

### Paso 2: Calcular Pesos
```javascript
const defendWeight = 2000 * 3.0 (invasión) * 1.8 (Persia) = 10800
const expandWeight = 1000 * 1.0 * 1.1 = 1100
// DEFENDER >> EXPANDIR (10800 vs 1100)
```

### Paso 3: Generar Mapa de Influencia
```javascript
const influenceMap = generateInfluenceMap(2, 'invasion_defender', 'PERSIA');

// Resultado esperado:
// - Rojo alrededor de capital (defender)
// - Naranja en ciudades (reforzar)
// - Gris en territorio lejano (ignorar)
```

### Paso 4: Desplegar Unidades
```javascript
const deployment = deployUnitsPERSIA(2, topPosiciones);
// Despliega 5-8 unidades en posiciones defensivas
// Agrupadas para bonificador morale
```

### Paso 5: Ejecutar Turno
```javascript
// Cada unidad PERSIA
├─ Consulta influenceMap
├─ Se mueve hacia hex más valioso
├─ Ataca enemigo cercano (si vale la pena)
└─ Usa Retiro Estratégico (si está perdiendo)
```

---

## 🔑 CONCEPTOS CLAVE

### Pesos (Weights)
**Número entre 0-10000 que dice "qué tan importante es esta acción"**

```
Defender base = 10000 (crítico)
Matar unidad crítica = 5000 (muy importante)
Conquistar ciudad = 2000 (importante)
Capturar recurso = 1500 (moderado)
Investigación = 600 (bajo)
```

### Mapas de Influencia
**Capa invisible de valor para cada hexágono**

```
Valor = Recursos cercanos + Ciudades cercanas + Amenazas cercanas
        + Bonificador terreno + Bonificador conectividad + Estratégico
```

### Civilizaciones
**Multiplicadores que personalizan el comportamiento**

```
ROMA × expansión = AGRESIVA en territorio
CARTAGO × comercio = COMERCIAL
GRECIA × investigación = ESTUDIOS
PERSIA × defensa = RESISTENTE
IBERIA × montaña = DEFENSORA
```

---

## 📊 TABLA DE DECISIÓN RÁPIDA

**¿Qué archivo consultar?**

```
PREGUNTA                              │ ARCHIVO
──────────────────────────────────────┼─────────────────────────
¿Cuánto vale matar una unidad?        │ AI_WEIGHTS_DEFINITION
¿Cuál es el mejor objetivo?           │ AI_WEIGHTS_DEFINITION
¿Dónde debería ir mi unidad?          │ AI_INFLUENCE_MAPS
¿Por qué atacó ese hexágono?          │ AI_INFLUENCE_MAPS
¿Cómo juega Cartago?                  │ AI_CIVILIZATION_LOGIC
¿Es vulnerable tal civ a otra?        │ AI_CIVILIZATION_LOGIC
¿Qué hace en invasión?                │ (Los 3 + integración)
¿Cómo rebalancea la IA?               │ AI_WEIGHTS_DEFINITION
──────────────────────────────────────┴─────────────────────────
```

---

## ⚙️ INTEGRACIÓN EN CÓDIGO

### Step 1: Constants.js
```javascript
// Agregar todos los PESOS
const IBERIA_WEIGHTS = { ... };
const ROMA_WEIGHTS = { ... };
// etc.
```

### Step 2: ai_deploymentLogic.js
```javascript
// Usar deployUnitsByStrategy
const strategy = getAIStrategyByCivilization(civ, mode, player);
const deployment = strategy.deployment(player, territory);
```

### Step 3: ai_gameplayLogic.js
```javascript
// Usar mapas de influencia
const influenceMap = generateInfluenceMap(player, mode, civ);
const bestPosition = findBestPositionFromMap(currentUnit, influenceMap);
unit.moveTo(bestPosition);
```

### Step 4: Validación
```javascript
// Testear en invasión naval
// Si IA aún no actúa → revisar pesos
// Si IA es demasiado agresiva → reducir pesos ataque
// Si IA no defiende → aumentar pesos defensa
```

---

## 🐛 DEBUGGING: ¿POR QUÉ LA IA NO ACTÚA?

### Invasión Naval Defensor (Caso Crítico)

**Problema:** IA no despliega unidades

**Checklist:**

- [ ] ¿Se carga `PERSIA_WEIGHTS` con multiplicador invasión 3.0?
  ```javascript
  defendWeight = 2000 * 3.0 = 6000 (debe ser máximo)
  ```

- [ ] ¿`generateInfluenceMap()` retorna valores > 0?
  ```javascript
  console.log(influenceMap); // Debe ver rojos/naranjas
  ```

- [ ] ¿`deployUnitsPERSIA()` encuentra posiciones?
  ```javascript
  console.log(defensivePositions); // Debe tener 5-8 hex
  ```

- [ ] ¿El terreno está conectado?
  ```javascript
  isHexSupplied(r, c, player) // Debe ser TRUE
  ```

**Si todo es TRUE y aún no despliega:**
→ Problema está en `AiDeploymentManager.deployUnitsAI()`
→ Revisar donde sale si `missionList.length === 0`
→ Cambiar a: `if (missionList.length === 0) { generateDefensiveMissions() }`

---

## 📈 BALANCEO: ANTES/DESPUÉS

### Ejemplo: Roma está demasiado agresiva

**ANTES:**
```javascript
ROMA_WEIGHTS.expandTerritory = 1600;
ROMA_WEIGHTS.captureCity = 2000;
ROMA_WEIGHTS.attackEnemy = 1800;
// Resultado: Ataca sin parar, pierde unidades
```

**DESPUÉS:**
```javascript
ROMA_WEIGHTS.expandTerritory = 1200;  // -25%
ROMA_WEIGHTS.captureCity = 1500;       // -25%
ROMA_WEIGHTS.attackEnemy = 1200;       // -33%
ROMA_WEIGHTS.defendBase = 900;         // +50%
// Resultado: Más balanceada, defiende mejor
```

---

## 🎓 CÓMO APRENDER ESTOS ARCHIVOS

### Para principiantes:
1. Lee el resumen arriba (este documento)
2. Lee **AI_WEIGHTS_DEFINITION.md** (secciones 1-3)
3. Ejecuta en invasión naval
4. Observa qué hace la IA
5. Ajusta pesos según comportamiento

### Para avanzados:
1. Lee todos los documentos completamente
2. Implementa `generateInfluenceMap()` first
3. Después `getAIStrategyByCivilization()`
4. Testea en todos los modos
5. Rebalancea

### Para extremistas:
1. Crea nuevos tipos de "objetivos estratégicos"
2. Implementa machine learning para auto-balanceo
3. Crea dinámicas de "sinergia civ"
4. Agrega eventos que favorecen civs específicas

---

## ✅ CHECKLIST FINAL

- [ ] Los 3 archivos creados y legibles
- [ ] WEIGHTS en constants.js implementados
- [ ] `getAIStrategyByCivilization()` creado
- [ ] `generateInfluenceMap()` creado
- [ ] `deployUnitsAI()` usa strategy
- [ ] Modificadores invasión aplicados
- [ ] Testeo en invasión naval
- [ ] IA actúa (¡éxito!)
- [ ] Balanceo: si es necesario, ajustar pesos
- [ ] Documentación actualizada

---

**Inicio:** Febrero 3, 2026  
**Estado:** Ready for Implementation  
**Prioridad:** CRÍTICA para invasión naval + IA despliegue

Ver también:
- `/copilot-instructions.md` (Instrucciones del proyecto)
- `/GUIA_GAMEPLAY_MECANICAS.md` (Gameplay reference)
- `/gameFlow.js` (Dónde se llama IA)
- `/ai_deploymentLogic.js` (Dónde se implementa)
