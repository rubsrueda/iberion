# AI Weights Definition - Tabla de Valores para Decisiones

**Versión:** 1.0 | **Para:** AI Logic Development | **Última actualización:** Febrero 2026

---

## 📊 Introducción

Los **weights (pesos)** son valores numéricos que determinan la importancia de cada objetivo para la IA. Un hexágono con más recursos vale más que uno vacío. Matar una unidad élite vale más que capturar terreno neutral.

```
VALOR_TOTAL = (peso_recurso × cantidad) + (peso_ciudad × control) + (peso_unidad × amenaza)
```

---

## 1️⃣ PESOS BASE POR OBJETIVO

### A. Recursos Naturales

```
RECURSO           │ PESO BASE │ MODIFICADOR │ NOTAS
──────────────────┼───────────┼─────────────┼──────────────────────
ORO               │ 100       │ ×2   (alto) │ Recurso más valioso
COMIDA            │ 50        │ ×1.0        │ Mantenimiento de tropas
MADERA            │ 40        │ ×0.8        │ Construcción/barcos
PIEDRA            │ 50        │ ×1          │ Fortificaciones
HIERRO            │ 40        │ ×0.8        │ Equipo legendario
INVESTIGACIÓN     │ 75        │ ×1.5        │ Árbol tecnológico
```

**Uso:**
```javascript
function calculateResourceValue(hexagon) {
  let value = 0;
  if (hexagon.resourceNode === 'oro') value += 100 * 1.5;
  if (hexagon.resourceNode === 'comida') value += 80 * 1.0;
  // ... etc
  return value;
}
```

---

### B. Infraestructuras

```
ESTRUCTURA        │ PESO BASE │ CONTROL? │ VALOR EXTRA SI ES ENEMIGA
──────────────────┼───────────┼──────────┼────────────────────────
CIUDAD (Propia)   │ 1000      │ SÍ       │ -200 (defenderla)
CIUDAD (Enemiga)  │ 500       │ SÍ       │ +600 (conquistarla)
CIUDAD (Neutral)  │ 300       │ SÍ       │ +400 (primero en llegar si tiene explorador)
RUINA             │ 200       │ NO       │ +300 (puntos victoria)
FORTALEZA (Propia)│ 400       │ SÍ       │ 0
FORTALEZA(Enemiga)│200        │ SÍ       │ +500 (breachpoint)
TORRE VIGÍA       │ 150       │ NO       │ +250 (visión)
```

**Lógica de Conquista:**
```javascript
function calculateCityCaptureValue(city, myPlayerNumber) {
  let baseValue = 500; // Valor base
  
  if (city.owner === myPlayerNumber) return 0; // Ya me pertenece
  if (city.owner === 0) baseValue = 300;      // Neutral
  if (city.owner !== myPlayerNumber) baseValue += 600; // Enemiga
  
  // Bonus si conecta con territorio controlado
  if (isConnectedToTerritory(city, myPlayerNumber)) baseValue *= 1.3;
  
  return baseValue;
}
```

---

### C. Amenaza de Unidades Enemigas

```
TIPO UNIDAD       │ AMENAZA BASE │ PRIORIDAD │ VALOR SI LA DESTRUYO
──────────────────┼──────────────┼───────────┼─────────────────────
Pueblo            │ 20           │ 🟢 Baja   │ +100
Infantería Ligera │ 40           │ 🟢 Baja   │ +150
Infantería Pesada │ 60           │ 🟡 Media  │ +300
Caballería Ligera │ 80           │ 🟡 Media  │ +250
Caballería Pesada │ 100          │ 🔴 Alta   │ +500
Arqueros          │ 70           │ 🟡 Media  │ +280
Arqueros a caballo│ 100          │ 🔴 Alta   │ +500
Artillería        │ 250          │ 🔴 CRÍTICA│ +900
Columna Suministro│ 250          │ 🔴 CRÍTICA│ +900
CUARTEL GENERAL   │ 200          │ 🔴 CRÍTICA│ +1000
Hospital          │ 100          │ 🟡 Media  │ +400
Patache           │ 180          │ 🔴 Alta   │ +900
Barcos de Guerra  │ 250          │ 🔴 Alta   │ +900
```

**Cálculo de Amenaza:**
```javascript
function calculateUnitThreat(unit, distanceToBase) {
  let threat = UNIT_THREAT_VALUES[unit.type];
  
  // Cercanía multiplica amenaza
  if (distanceToBase <= 3) threat *= 2.0;  // Muy cercano
  if (distanceToBase <= 6) threat *= 1.5;  // Cercano
  
  // Morale reduce amenaza
  threat *= (unit.morale / 100);
  
  // Nivel de experiencia
  threat *= (1 + unit.level * 0.1);
  
  return threat;
}

function calculateKillValue(unit, bounty = 100) {
  return (UNIT_THREAT_VALUES[unit.type] * 0.8) + (unit.level * 50) + bounty;
}
```

---

## 2️⃣ PESOS DE ACCIÓN

### Acciones Disponibles (Orden de Preferencia)

```
ACCIÓN               │ PESO    │ CONDICIÓN
─────────────────────┼─────────┼──────────────────────────────
Defender Base        │ 10000   │ Enemigo a ≤3 hexágonos
Matar Unidad Crítica │ 5000    │ Artillería, Cuartel General
Conquistar Ciudad    │ 2000    │ Unidades suficientes
Capturar Recurso     │ 1500    │ Cercano y defendible
Expandir Territorio  │ 1000    │ Economía estable
Fortalecer Defensa   │ 800     │ Posición débil
Investigar Tech      │ 600     │ Recursos abundantes
Asediar Fortaleza    │ 1200    │ Unidades > enemigo
Mercado/Comercio     │ 400     │ Civilización apropiada
Descansar/Ahorrar    │ 100     │ Última opción
```

---

## 3️⃣ MODIFICADORES (FACTORES DE AJUSTE)

### Por Modo de Juego

```
MODO               │ PESO ATACAR │ PESO DEFENDER │ PESO EXPANDIR
──────────────────┼─────────────┼───────────────┼──────────────
NORMAL (Conquest) │ ×1.0        │ ×1.0          │ ×1.0
INVASIÓN ATACANTE │ ×2.5        │ ×0.3          │ ×0.5
INVASIÓN DEFENSOR │ ×0.5        │ ×3.0          │ ×1.0
PUNTOS VICTORIA   │ ×0.5        │ ×0.5          │ ×2.0
CONTROL CIUDADES  │ ×1.5        │ ×2.0          │ ×1.8
```

### Por Civilización

```
CIVILIZACIÓN  │ AGRESIÓN │ DEFENSA │ EXPANSIÓN │ ECONOMÍA │ FAVORTEC
──────────────┼──────────┼─────────┼───────────┼──────────┼──────────
IBERIA        │ ×1.0     │ ×1.3    │ ×0.8      │ ×0.9     │ ×1.2
ROMA          │ ×1.2     │ ×1.4    │ ×1.0      │ ×1.3     │ ×1.0
CARTAGO       │ ×0.8     │ ×0.8    │ ×1.4      │ ×1.5     │ ×0.8
GRECIA        │ ×0.9     │ ×1.0    │ ×0.9      │ ×0.8     │ ×2.0
PERSIA        │ ×0.6     │ ×1.8    │ ×1.1      │ ×1.0     │ ×1.0
```

**Ejemplo:**
```javascript
function getActionWeight(action, gameMode, civilization) {
  let baseWeight = BASE_ACTION_WEIGHTS[action];
  let modeMultiplier = MODE_MULTIPLIERS[gameMode][action];
  let civMultiplier = CIV_MULTIPLIERS[civilization][action];
  
  return baseWeight * modeMultiplier * civMultiplier;
}

// Ejemplo: INVASIÓN ATACANTE queriendo atacar ciudad
// getActionWeight('conquistarCiudad', 'invasion_attacker', 'Roma')
// = 2000 × 2.5 × 1.2 = 6000 (PRIORIDAD MÁXIMA)
```

---

## 4️⃣ PESOS DE ESTADO (ECONOMÍA)

### Según Recursos Disponibles

```
ORO DISPONIBLE  │ PESO ATAQUE │ PESO DEFEND │ PESO EXPANS │ ACCIÓN RECOMENDADA
────────────────┼─────────────┼─────────────┼─────────────┼──────────────────
0-200           │ ×0.3        │ ×2.0        │ ×0.1        │ Esperar / Ahorrar
200-500         │ ×0.6        │ ×1.5        │ ×0.4        │ Defensivo
500-1000        │ ×1.0        │ ×1.0        │ ×0.8        │ Equilibrio
1000-2000       │ ×1.4        │ ×0.8        │ ×1.2        │ Ofensivo
2000+           │ ×2.0        │ ×0.5        │ ×1.8        │ ATAQUE MASIVO
```

---

## 5️⃣ PESOS DE POSICIÓN (DISTANCIA & TERRENO)

### Bonificación por Proximidad

```
DISTANCIA (HEX) │ MULTIPLICADOR │ NOTAS
────────────────┼───────────────┼────────────────────
0-1             │ ×2.0          │ Cuerpo a cuerpo
2-3             │ ×1.5          │ Ataque próximo
4-6             │ ×1.0          │ Neutral
7-10            │ ×0.7          │ Lejos
11+             │ ×0.3          │ Muy lejos
```

### Bonificación por Terreno

```
TERRENO       │ DEFENSA │ ATAQUE │ EXPANSIÓN
──────────────┼─────────┼────────┼──────────
Llanura       │ ×1.0    │ ×1.3   │ ×1.0
Bosque        │ ×1.3    │ ×0.8   │ ×0.9
Montaña       │ ×1.5    │ ×0.6   │ ×1.0
Colina        │ ×1.2    │ ×1.0   │ ×1.1
Agua (Naval)  │ ×1.0    │ ×1.2   │ ×0.8
```

---

## 6️⃣ TABLA CONSOLIDADA DE EJEMPLO

**Escenario: Invasión Naval, Defensor con Persia, turno 3**

```
OBJETIVO                    │ PESO BASE │ MODOS   │ CIV    │ ECONOMÍA │ TOTAL
────────────────────────────┼───────────┼─────────┼────────┼──────────┼─────────
Defender base (0-2 hex)     │ 10000     │ ×3.0    │ ×1.8   │ ×1.0     │ 54,000 ⭐⭐⭐
Expandir territorio (3-5h)  │ 1000      │ ×1.0    │ ×1.1   │ ×1.0     │ 1,100
Capturar recurso cercano    │ 1500      │ ×0.5    │ ×1.0   │ ×1.2     │ 900
Entrenar más unidades       │ 100       │ ×1.0    │ ×1.0   │ ×2.0     │ 200
Investigación               │ 600       │ ×1.0    │ ×1.0   │ ×1.0     │ 600
─────────────────────────────────────────────────────────────────────────────
DECISIÓN: DEFENDER BASE (extrema prioridad)
```

---

## 7️⃣ CÓMO USAR ESTOS PESOS

### Algoritmo Simple (Decision Tree)

```javascript
function evaluateAIObjective(situation) {
  const objectives = [];
  
  // 1. Evaluar cada posible objetivo
  objectives.push({
    type: 'defend',
    value: getDefenseValue(situation)
  });
  
  objectives.push({
    type: 'killEnemy',
    value: getKillValue(situation)
  });
  
  objectives.push({
    type: 'captureCity',
    value: getCityValue(situation)
  });
  
  objectives.push({
    type: 'expandTerritory',
    value: getExpansionValue(situation)
  });
  
  // 2. Ordenar por valor
  objectives.sort((a, b) => b.value - a.value);
  
  // 3. Ejecutar el objetivo con mayor valor
  return objectives[0];
}

// Donde getDefenseValue(), getKillValue(), etc. usan los PESOS
```

---

## 8️⃣ CÓMO BALANCEAR PESOS

### Testing Matrix

```
ESCENARIO                      │ PESO ACTUAL │ RESULTADO │ AJUSTE
───────────────────────────────┼─────────────┼───────────┼──────────────
IA roma ataca demasiado pronto │ 2000 (base) │ Pierde    │ Reducir a 1500
IA defensor nunca expande      │ 1000 (base) │ Se rinde  │ Aumentar a 1500
IA cartago no comercia         │ 400 (base)  │ Pobre     │ Aumentar a 900
IA grecia no investiga         │ 600 (base)  │ Débil     │ Aumentar a 1200
```

---

## 9️⃣ CHECKLIST PARA IMPLEMENTACIÓN

- [ ] Crear tabla `AI_WEIGHTS` en constants.js
- [ ] Implementar `calculateResourceValue()`
- [ ] Implementar `calculateThreatValue()`
- [ ] Implementar `calculateActionWeight()`
- [ ] Agregar multiplicadores por civilización
- [ ] Agregar modificadores por modo de juego
- [ ] Crear función `evaluateBestObjective()`
- [ ] Tesear en invasión naval (el caso crítico)
- [ ] Rebalancear según resultados

---

**Siguiente paso:** Ver `AI_INFLUENCE_MAPS.md` para entender cómo calcular el valor de cada hexágono.
