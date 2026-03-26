# 📚 AI SYSTEM



---
## 📂 ARCHIVOS ACTUALES

### 1. **AI_GENERIC_SYSTEM.md** ⭐ LEER PRIMERO
**El archivo maestro - Una sola fórmula para todas las civs**

```
QUÉ HAY:
- Pesos base universales (7 acciones)
- Multiplicadores por civilización (20 civs incluidas)
- Multiplicadores por modo (invasión, normal, etc.)
- Multiplicadores por oro disponible
- Fórmula final: base × civ × modo × oro = acción

### 2. **AI_INFLUENCE_MAPS.md**
**Cálculo matemático de valor de cada hexágono en el mapa**

```
QUÉ HAY:
- Fórmula de influencia (recursos + ciudades + amenazas)
- Bonificadores de terreno
- Bonificadores de conectividad
- Heatmaps visuales

CUÁNDO USAR:
- Después de determinar QUAT hacer (pesos)
- Para determinar DÓNDE hacerlo (mapas)

EJEMPLO: "Persia debe DEFENDER. ¿Dónde? En el hex con más influencia defensiva"
```

---

### 3. **AI_IMPLEMENTATION_PLAN.md**
**Plan paso-a-paso con timeboxes**

```
ESTRUCTURA:
- Fase 1: Setup inicial (3h)
- Fase 2: Integración (1.5h)
- Fase 3: Testing (3h)
- Fase 4: Validación (1h)
TOTAL: 8.5h

CADA FASE: Tarea concreta + checklist
```

### 4. **IA_INVASION_UNIFICACION_BASE.md**
**Documento base para sustituir la IA básica por IA Invasión como motor único**

```
QUÉ HAY:
- Comparativa IA básica vs IA Invasión
- Jerarquía de prioridades: supervivencia, economía, sabotaje, puntuación
- Sistema de Nodos de Valor
- Criterio de éxito funcional para la unificación
- Base conceptual para tutorial, debug y extracción data-driven

CUÁNDO USAR:
- Antes de tocar el motor IA
- Para alinear diseño, implementación y tutorial
- Para definir la futura tabla externa de reglas/pesos
```

---

### ~~**ARCHIVOS OBSOLETOS**~~ (Ignore)
- ~~AI_WEIGHTS_DEFINITION.md~~ → Incorporado en AI_GENERIC_SYSTEM.md
- ~~AI_CIVILIZATION_LOGIC.md~~ → Incorporado en AI_GENERIC_SYSTEM.md
- ~~AI_SYSTEM_INDEX.md~~ → Este archivo lo reemplaza

---

## 🚀 QUICK START (5 minutos)

### Para entender rápido:

```javascript
// La ÚNICA fórmula que necesitas:
actionWeight = BASE_WEIGHT × CIV_MULTIPLIER × MODE_MULTIPLIER × GOLD_MULTIPLIER

// Ejemplo real:
getActionWeight('conquistarCiudad', 'Roma', 'invasion_attacker', 1500)
= 1500 (base) × 1.5 (Roma) × 3.0 (invasión) × 1.8 (oro alto)
= 12,150 ⭐⭐⭐ HACER ESTO
```

### Las 26 civilizaciones (tabla rápida):

| Civ (clave exacta) | Arquetipo | Fortaleza principal | Debilidad principal |
|---|---|---|---|
| Roma | conquistadora | conquistarCiudad ×1.5 | construirBarcos ×0.5 |
| Asiria | asedio-terror | conquistarCiudad ×1.8 | defendBase ×0.7 |
| Otomana | asedio-polvora | conquistarCiudad ×1.8 | construirBarcos ×0.5 |
| Galia | atacante | atacarEnemy ×1.6 | defendBase ×0.7 |
| Persia | economica-defensiva | defendBase ×2.0 | atacarEnemy ×0.5 |
| Japón | defensiva-honor | defendBase ×1.8 | construirBarcos ×0.6 |
| Germania | defensiva | defendBase ×1.6 | atacarEnemy ×0.8 |
| Britania | defensiva-naval | defendBase ×1.4 / construirBarcos ×1.4 | atacarEnemy ×0.9 |
| Babilonia | investigacion | investigarTech ×2.5 | atacarEnemy ×0.8 |
| Mameluca | economica | reforzarDefensa ×1.6 | construirBarcos ×0.8 |
| Egipto | arqueros | atacarEnemy ×1.5 | construirBarcos ×0.5 |
| Maya | arqueros-xp | atacarEnemy ×1.5 | defendBase ×0.9 |
| Mongol | caballeria-movimiento | expandirTerritorio ×1.6 | construirBarcos ×0.4 |
| Arábiga | caballeria-ofensiva | atacarEnemy ×1.5 | construirBarcos ×0.5 |
| Iberia | versatil | atacarEnemy ×1.5 / expandir ×1.3 | construirBarcos ×0.7 |
| Vikingos | incursora | capturarRecurso ×1.5 / barcos ×1.3 | defendBase ×0.7 |
| China | polvora | atacarEnemy ×1.4 | defendBase ×0.9 |
| Grecia | expansionista | expandirTerritorio ×1.4 | construirBarcos ×0.6 |
| Cartago | naval | construirBarcos ×2.0 | atacarEnemy ×0.6 |
| ninguna | estandar | todos ×1.0 | — |
| Bárbaros | independiente | defendBase ×1.3 | investigarTech ×0.7 |
| **Reinos Ibéricos** | | *bonuses pendientes en constants.js* | |
| Castilla | conquistadora-iberia | conquistarCiudad ×1.4 | construirBarcos ×0.7 |
| Aragon | naval-conquistadora | construirBarcos ×1.5 | reforzarDefensa ×0.9 |
| Portugal | exploradora-naval | expandirTerritorio ×1.6 | atacarEnemy ×0.9 |
| Navarra | defensiva-pirenaica | defendBase ×1.5 | construirBarcos ×0.5 |
| Granada | defensiva-arqueros | defendBase ×1.6 | conquistarCiudad ×0.8 |

**VER:** AI_GENERIC_SYSTEM.md sección 2 para el bloque `ai_multipliers` completo de cada civ.

---

## 🔍 DECISION TREE DE DOCUMENTACIÓN (SOLO HUMANO)

> Nota crítica: este bloque NO se ejecuta en runtime. La IA del juego no lee archivos `.md` para decidir acciones.
> Se usa solo como mapa de lectura para diseño, tutorial y desarrollo.

```
¿Cómo funciona IA con 26 civs?
    ↓
    LEE: AI_GENERIC_SYSTEM.md

¿Cuánto vale una acción?
    ↓
    Sección: "FÓRMULA FINAL"

¿Dónde debería ir mi unidad?
    ↓
    LEE: AI_INFLUENCE_MAPS.md

¿Cómo implemento esto?
    ↓
    LEE: AI_IMPLEMENTATION_PLAN.md

¿Cómo reemplazo la IA básica por IA Invasión sin perder claridad de diseño?
    ↓
    LEE: IA_INVASION_UNIFICACION_BASE.md

¿Cómo agrego una nueva civ?
    ↓
    AI_GENERIC_SYSTEM.md → Paso 1 (8 líneas en constants.js)

¿Por qué IA no ataca en invasión?
    ↓
    Verificar: ai_multipliers en "Invasión atacante"
    (defendBase debe ser ×0.2, atacarEnemy debe ser ×2.5)
```

---

## 🎓 LEARNING PATH

### PRINCIPIANTE (30 min)
1. Lee AI_GENERIC_SYSTEM.md - Introducción + Fórmula
2. Entiende: "Una fórmula para todas las civs"
3. Ejecuta en browser console: `getActionWeight('conquistarCiudad', 'Roma', 'invasion_attacker', 1500)`

### INTERMEDIO (2h)
1. Lee AI_GENERIC_SYSTEM.md completo
2. Lee AI_INFLUENCE_MAPS.md secciones 1-3
3. Implementa Step 1 de AI_IMPLEMENTATION_PLAN.md

### AVANZADO (4h)
1. Implementa AI_IMPLEMENTATION_PLAN.md completo
2. Testea invasión naval con múltiples civs
3. Rebalancea según comportamiento

---

## 🐛 TROUBLESHOOTING RÁPIDO

| Problema | Causa | Solución |
|----------|-------|----------|
| IA no despliega | weight = 0 | Verificar ai_multipliers existe |
| IA ataca mal | mult × modo × oro = bajo | Aumentar multiplicador en constants.js |
| Invasión defensor ataca | modo_mult debería ×0.3 | Revisar MODE_MULTIPLIERS |
| Nueva civ débil | sin ai_multipliers | Copiar plantilla de civ similar |

---

## ✅ NEXT STEPS

### AHORA:
1. Leer AI_GENERIC_SYSTEM.md (30 min)
2. Entender la fórmula

### PRÓXIMA SESIÓN:
1. Implementar AI_IMPLEMENTATION_PLAN.md Fase 1
2. Agregar ai_multipliers a constants.js

### SIGUIENTE:
1. Crear aiWeights.js
2. Testear invasión naval

---

## 📝 NOTES

- Documentación actualizada: Feb 3, 2026
- Sistema: Genérico + Escalable (de 5 civs → 20+)
- Tiempo implementación: 8.5h estimado
- Prioridad: CRÍTICA para invasión naval

---

**Para dudas específicas:**
- ¿Qué es "multiplicador"? → AI_GENERIC_SYSTEM.md sección 2
- ¿Cómo agregar civ? → AI_GENERIC_SYSTEM.md paso 1
- ¿Por qué invasión no funciona? → AI_GENERIC_SYSTEM.md ejemplo
- ¿Cómo balanc ear? → AI_GENERIC_SYSTEM.md sección 8

## Siguientes pasos: 

Convertir este documento en una especificación técnica más ejecutable, con módulos concretos y orden de refactor.
Diseñar el formato exacto del archivo externo de reglas, por ejemplo JSON, y dejar una plantilla real para puntos y multiplicadores.
Preparar una versión resumida para tutorial/UI, con frases cortas que el juego pueda mostrar al jugador.

prioridades que quieras subir o bajar
si “ciudad natal” debe tratarse como derrota inmediata o estado crítico
cuánto peso quieres dar a banca, caminos, caravanas y sabotaje frente a conquista directa
si el tutorial debe sonar más técnico o más pedagógico