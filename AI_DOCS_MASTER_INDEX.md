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

### Las 20 civilizaciones (tabla rápida):

| Civ | Fortaleza | Multiplicador | Debilidad |
|-----|-----------|---------------|-----------|
| Roma | Conquistar | ×1.5 | Defensa |
| Persia | Defender | ×2.0 | Ataque |
| Cartago | Naval | ×2.0 barcos | Tierra |
| Babilonia | Investigación | ×2.5 tech | Ataque |
| Galia | Ataque | ×1.4 | Defensa |
| ... | ... | ... | ... |

**VER:** AI_GENERIC_SYSTEM.md sección 3 para tabla completa

---

## 🔍 DECISION TREE: ¿QUÉ ARCHIVO LEER?

```
¿Cómo funciona IA con 20 civs?
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

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### ANTES (Viejo sistema)
```
5 civilizaciones documentadas
5 archivos separados
Cada archivo: 300+ líneas
Difícil agregar civs nuevas
Difícil entender interacciones
```

### DESPUÉS (Nuevo sistema)
```
20+ civilizaciones
1 archivo maestro
Cada civ: 8 líneas de multiplicadores
Agregar civ: copiar/pegar 8 líneas
Fácil entender: base × mult × mult × mult
```

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
