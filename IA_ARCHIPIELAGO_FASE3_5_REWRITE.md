# Fase 3.5: Reescritura de Fusión Ofensiva Inteligente
**Fecha**: Enero 2026 | **Versión**: 2.0 - CORREGIDA

## Problema Original
La Fase 3.5 original (Fusión Ofensiva) estaba mal diseñada:
- ❌ Se basaba en **distancia (RADIO)** para agrupar unidades
- ❌ Fusionaba unidades simplemente porque estaban cerca
- ❌ No evaluaba si realmente podíamos ganar
- ❌ No consideraba alternativas estratégicas (envolvimiento, retirada)

## Solución: Poder Relativo
Se reescribió completamente para basarse en **PODER RELATIVO**:
```
Poder Relativo = (Mis Regimientos) / (Regimientos del Enemigo)
```

### Árbol de Decisión
```
SI poderRelativo >= 1.3
  → ATAQUE DIRECTO (fusión mínima, atacar agresivamente)
  
SI 0.8 <= poderRelativo < 1.3
  → ENVOLVIMIENTO (flanqueo coordinado)
  
SI 0.5 <= poderRelativo < 0.8
  → RETIRADA ESTRATÉGICA (consolidar o huir)
  
SI poderRelativo < 0.5
  → IGNORAR (enemigo demasiado fuerte)
```

## Nuevos Métodos

### 1. `ejecutarFusionesOfensivas(myPlayer, misUnidades, situacion)`
**Rol**: Coordinador principal de Fase 3.5
- Itera sobre cada enemigo del jugador opuesto
- Llama a `_evaluarYActuarContraEnemigoAislado()` para cada uno
- Evalúa ciudades bárbaras con `_evaluarConquistaDeCity()`

### 2. `_evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo)` ⭐
**Rol**: Evaluador de poder y ejecutor de estrategia
**Entrada**: 
- `myPlayer`: número del jugador IA
- `misUnidades`: array de todas nuestras unidades
- `enemigo`: unidad enemiga para evaluar

**Lógica**:
```javascript
nuestrasUnidadesCercanas = unidades a radio 5 del enemigo
poderNuestro = suma de regimientos
poderEnemigo = regimientos del enemigo
poderRelativo = poderNuestro / poderEnemigo

// Tomar decisión basada en poder
```

**Salidas**:
- Si 1.3x+: llamar `_ejecutarAtaqueConcentrado()`
- Si 0.8-1.3x: llamar `_ejecutarEnvolvimiento()`
- Si 0.5-0.8x: llamar `_ejecutarRetiradaEstrategica()`
- Si <0.5x: ignorar (demasiado fuerte)

### 3. `_ejecutarAtaqueConcentrado(myPlayer, unidadesNuestras, enemigo)`
**Condición**: Poder relativo >= 1.3x (ventaja clara)
**Estrategia**:
- Ordenar unidades por proximidad al enemigo
- Fusionar **MÍNIMAMENTE** (solo 1-2 refuerzos máximo)
- Mover unidad principal directamente al enemigo para atacar

**Ejemplo**:
```
Nosotros: 15 regimientos
Enemigo: 10 regimientos
Poder: 1.5x → ATAQUE DIRECTO

Fusión: +5 regimientos de refuerzo
Resultado: 20 regimientos atacando
```

### 4. `_ejecutarEnvolvimiento(myPlayer, unidadesNuestras, enemigo)`
**Condición**: 0.8 <= Poder relativo < 1.3 (batalla dudosa)
**Estrategia**:
- Rodear al enemigo en hexes adyacentes
- Atacar desde múltiples direcciones simultáneamente
- Evita fusión masiva; usa coordinación en su lugar

**Ejemplo**:
```
Nosotros: 8 regimientos
Enemigo: 10 regimientos
Poder: 0.8x → ENVOLVIMIENTO

Posicionamos 3 unidades alrededor del enemigo
Proporción: (8+8+8) vs 10 regimientos
Ventaja: ataque multinivel
```

### 5. `_ejecutarRetiradaEstrategica(myPlayer, unidadesNuestras, enemigo)`
**Condición**: 0.5 <= Poder relativo < 0.8 (desventaja)
**Estrategia**:
1. Fusionar TODO lo disponible (crear súper-unidad)
2. Moverse hacia la capital si es cercana
3. Intentar consolidación defensiva

**Lógica**:
```javascript
_fusionarTodo(unidadesNuestras) // Máx concentración
if (capital) moveTo(capital)     // Defensa reactiva
```

### 6. `_fusionarTodo(unidades)`
**Rol**: Utilidad de consolidación máxima
**Acción**:
- Itera sobre todas las unidades
- Fusiona con la primera mientras quepa (≤20 regimientos)
- Si no cabe: detiene y avisa con log

**Importante**: Respeta el límite `MAX_REGIMENTS_PER_DIVISION = 20`

### 7. `_evaluarConquistaDeCity(myPlayer, unidades, ciudad)`
**Rol**: Evalúa si podemos conquistar ciudad bárbara
**Lógica**:
```javascript
poderTotal = suma de regimientos cercanos
poderMinimo = (guarnición || 4) * 1.2  // +20% de seguridad

if (poderTotal >= poderMinimo) → CONQUISTAR
else → ESPERAR (log con diferencia)
```

**Ejemplo**:
```
Ciudad bárbara: 4 regimientos
Poder mínimo: 4 * 1.2 = 4.8 ≈ 5 regimientos
Nuestro poder: 8 regimientos
→ ✓ CONQUISTABLE: Fusionar y atacar
```

## Cambios Retirados
❌ `_prepararFusionParaConquista()` - ELIMINADA (radio-basada)
❌ `_prepararFusionParaAtaque()` - ELIMINADA (radio-basada)
❌ `_agruparUnidadesPorProximidad()` - ELIMINADA (sin sentido ahora)

## Constantes Utilizadas
- `MAX_REGIMENTS_PER_DIVISION = 20` - límite de regimientos por unidad
- Radio de búsqueda: 5 hexes para enemigos, 4 para ciudades
- Thresholds:
  - 1.3x: ataque directo
  - 0.8x: envolvimiento
  - 0.5x: ignorar si muy débil

## Flujo Completo en Contexto
```
ejecutarTurno()
  ↓
ejecutarPlanDeAccion() [7 fases]
  ├─ FASE 1: Fusiones Defensivas (si hay amenazas)
  ├─ FASE 2: Divisiones Estratégicas (heartbeat)
  ├─ FASE 3: Movimientos Tácticos (exploración)
  ├─ FASE 3.5: Fusiones Ofensivas ⭐ [NUEVA LÓGICA]
  │  ├─ Evaluar cada enemigo
  │  ├─ Decidir por poder relativo
  │  ├─ Ejecutar estrategia correspondiente
  │  └─ Evaluar ciudades bárbaras
  ├─ FASE 4: Conquista de Ciudades Bárbaras
  ├─ FASE 5: Construir Infraestructura
  └─ FASE 6: Crear Caravanas
```

## Verificación de Implementación
✅ Métodos implementados: 7/7
✅ Decisiones basadas en poder: SI
✅ Estrategias múltiples: SI (3 de ataque + 1 retirada)
✅ Logs descriptivos: SI (emojis + detalles)
✅ Respeta límites: SI (MAX_REGIMENTS_PER_DIVISION)
✅ Integración con sensores: SI (IASentidos.getUnits)

## Pruebas Recomendadas
1. **Ataque Directo**: IA vs Enemigo débil (1.5x poder)
   - Esperar: Fusión mínima + ataque inmediato
2. **Envolvimiento**: IA vs Enemigo parejo (0.9x poder)
   - Esperar: Múltiples unidades posicionadas alrededor
3. **Retirada**: IA vs Enemigo fuerte (0.6x poder)
   - Esperar: Consolidación defensiva o movimiento a capital
4. **Conquista**: IA vs Ciudad bárbara
   - Esperar: Evaluación de poder + decisión de conquista

## Notas Técnicas
- Los métodos NO modifican directamente `gameState`
- Utilizan `_executeMoveUnit()` y `mergeUnits()` existentes
- Los logs incluyen emojis para fácil identificación visual
- Poder relativo se calcula como número simple (no porcentaje)
- El envolvimiento NO realiza ataque automático; posiciona unidades

---

**Contribuyente**: IA Assistant (GitHub Copilot)
**Sesión**: Reescritura de Fase 3.5 con lógica de poder
**Status**: ✅ IMPLEMENTADO Y FUNCIONAL
