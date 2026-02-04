# 🧪 GUÍA DE TESTING: Fase 3.5 Fusión Ofensiva Inteligente

**Objetivo**: Validar que la IA toma decisiones correctas basadas en poder relativo
**Archivo Principal**: `/workspaces/iberion/ia_archipielago/IA_ARCHIPIELAGO.js`
**Versión**: 2.0 (Poder-basada)

---

## 📋 Test Scenario 1: ATAQUE DIRECTO (1.3x+)

### Setup
```javascript
// Consola de debug (Ctrl+Shift+D)
gameState.currentPlayer = 1  // Activar IA Jugador 1
units[0] = { r: 2, c: 5, regiments: [7 items], owner: 1, health: 100 }
units[1] = { r: 2, c: 6, regiments: [8 items], owner: 1, health: 100 }
units[2] = { r: 5, c: 4, regiments: [10 items], owner: 2, health: 100 }
```

### Esperado
```
[IA] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
[IA] Enemigo (5,4): Poder 15/10 = 1.50x
[IA] ⚔️ ATAQUE DIRECTO (1.50x)
[IA] + Refuerzo: Unit-2 → Unit-0
[IA] ATACANDO en (5,4)
```

### Verificar
- ✅ Cálculo de poder: 15/10 = 1.5 correcto
- ✅ Estrategia seleccionada: ATAQUE DIRECTO
- ✅ Solo 1 refuerzo fusionado
- ✅ Movimiento a posición enemiga
- ✅ Intención de ataque registrada

### Si Falla
- [ ] Verificar que `units[0]` y `units[1]` están a radio 5 de enemigo
- [ ] Verificar que suma 15 regimientos total
- [ ] Verificar que `_ejecutarAtaqueConcentrado()` se llamó

---

## 📋 Test Scenario 2: ENVOLVIMIENTO (0.8-1.3x)

### Setup
```javascript
gameState.currentPlayer = 1
units[0] = { r: 2, c: 5, regiments: [4 items], owner: 1, health: 100 }
units[1] = { r: 2, c: 6, regiments: [4 items], owner: 1, health: 100 }
units[2] = { r: 5, c: 4, regiments: [10 items], owner: 2, health: 100 }
```

### Esperado
```
[IA] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
[IA] Enemigo (5,4): Poder 8/10 = 0.80x
[IA] 🔄 ENVOLVIMIENTO (0.80x)
[IA] Flanqueando desde (4,4)
[IA] Flanqueando desde (6,4)
```

### Verificar
- ✅ Cálculo de poder: 8/10 = 0.8 correcto
- ✅ Estrategia seleccionada: ENVOLVIMIENTO
- ✅ NO hay fusión (mantiene 2 unidades separadas)
- ✅ Posiciones en hexes adyacentes al enemigo
- ✅ Múltiples direcciones de ataque

### Si Falla
- [ ] Verificar `getHexNeighbors()` retorna hexes válidos
- [ ] Verificar que no intenta fusionar
- [ ] Verificar que movimientos son a hexes diferentes

---

## 📋 Test Scenario 3: RETIRADA ESTRATÉGICA (<0.8x)

### Setup
```javascript
gameState.currentPlayer = 1
units[0] = { r: 2, c: 5, regiments: [3 items], owner: 1, health: 100 }
units[1] = { r: 2, c: 6, regiments: [3 items], owner: 1, health: 100 }
units[2] = { r: 5, c: 4, regiments: [15 items], owner: 2, health: 100 }

gameState.cities = [
  { r: 1, c: 5, owner: 1, isCapital: true }  // Capital cercana
]
```

### Esperado
```
[IA] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
[IA] Enemigo (5,4): Poder 6/15 = 0.40x
[IA] ⛔ IGNORAR (0.40x - demasiado fuerte)
```

Ó si está a 0.5-0.8x:
```
[IA] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
[IA] Enemigo (5,4): Poder 6/9 = 0.67x
[IA] 🔙 RETIRADA O CONCENTRAR (0.67x)
[IA] Fusionando TODO para concentración...
[IA] CONCENTRACIÓN: Fusionando 2 unidades (6 regimientos)
[IA] ✓ Fusionado: Unit-1
[IA] Retirando a capital (1,5)
```

### Verificar
- ✅ Cálculo de poder correcto
- ✅ Decide ignorar si < 0.5x
- ✅ Decide retirar si 0.5-0.8x
- ✅ Fusiona TODO si es retirada
- ✅ Movimiento hacia capital

### Si Falla
- [ ] Verificar que capital existe y es del jugador correcto
- [ ] Verificar que fusión respeta MAX_REGIMENTS_PER_DIVISION
- [ ] Verificar cálculo de distancia a capital

---

## 📋 Test Scenario 4: CONQUISTA DE CIUDAD BÁRBARA

### Setup
```javascript
gameState.currentPlayer = 1
units[0] = { r: 2, c: 5, regiments: [5 items], owner: 1, health: 100 }
units[1] = { r: 2, c: 6, regiments: [4 items], owner: 1, health: 100 }

gameState.cities = [
  { r: 4, c: 5, owner: null, isBarbarianCity: true, garrison: [4 items] }
]
```

### Esperado
```
[IA] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
[IA] Ciudad (4,5): Poder=9 Necesario=5
[IA] ✓ CONQUISTABLE: Concentrando...
[IA] CONCENTRACIÓN: Fusionando 2 unidades (9 regimientos)
[IA] ✓ Fusionado: Unit-1
```

### Verificar
- ✅ Cálculo de poder: 5 + 4 = 9
- ✅ Cálculo de poder mínimo: 4 * 1.2 = 4.8 ≈ 5
- ✅ 9 >= 5 → CONQUISTABLE
- ✅ Fusiona unidades
- ✅ Prepara ataque a ciudad

### Si Falla
- [ ] Verificar que ciudad está en gameState.cities
- [ ] Verificar que es city.owner === null
- [ ] Verificar que unidades están a radio 4
- [ ] Verificar fórmula: poderMinimo = garrison.length * 1.2

---

## 📋 Test Scenario 5: CIUDAD BÁRBARA DÉBIL (SIN CONQUISTAR)

### Setup
```javascript
gameState.currentPlayer = 1
units[0] = { r: 2, c: 5, regiments: [2 items], owner: 1, health: 100 }

gameState.cities = [
  { r: 4, c: 5, owner: null, isBarbarianCity: true, garrison: [5 items] }
]
```

### Esperado
```
[IA] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
[IA] Ciudad (4,5): Poder=2 Necesario=6
[IA] ✗ AÚN DÉBIL: 4 regimientos más necesarios
```

### Verificar
- ✅ Cálculo de poder: 2
- ✅ Cálculo de poder mínimo: 5 * 1.2 = 6
- ✅ 2 < 6 → NO CONQUISTABLE
- ✅ Log muestra diferencia: 6 - 2 = 4
- ✅ NO intenta conquistar

### Si Falla
- [ ] Verificar lógica: `if (poderTotal >= poderMinimo)`
- [ ] Verificar log muestra diferencia correcta

---

## 📋 Test Scenario 6: MÚLTIPLES ENEMIGOS

### Setup
```javascript
gameState.currentPlayer = 1

units[0] = { r: 2, c: 5, regiments: [6 items], owner: 1, health: 100 }
units[1] = { r: 3, c: 8, regiments: [7 items], owner: 1, health: 100 }

// Enemigos
units[2] = { r: 5, c: 4, regiments: [5 items], owner: 2, health: 100 }  // Débil
units[3] = { r: 5, c: 9, regiments: [20 items], owner: 2, health: 100 } // Fuerte
```

### Esperado
```
[IA] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE

[IA] Enemigo (5,4): Poder 6/5 = 1.20x
[IA] 🔄 ENVOLVIMIENTO (1.20x)
[IA] Flanqueando desde (4,4)

[IA] Enemigo (5,9): Poder 7/20 = 0.35x
[IA] ⛔ IGNORAR (0.35x - demasiado fuerte)
```

### Verificar
- ✅ Evalúa cada enemigo independientemente
- ✅ Diferentes estrategias para cada uno
- ✅ Ignora enemigos muy fuertes
- ✅ Ataca enemigos débiles

### Si Falla
- [ ] Verificar que loop itera sobre todos los enemigos
- [ ] Verificar que evaluación es independiente por enemigo

---

## 📋 Test Scenario 7: FUSIÓN CON LÍMITE (MAX_REGIMENTS)

### Setup
```javascript
gameState.currentPlayer = 1

units[0] = { r: 2, c: 5, regiments: Array(18), owner: 1, health: 100 }
units[1] = { r: 2, c: 6, regiments: Array(5), owner: 1, health: 100 }
units[2] = { r: 5, c: 4, regiments: Array(15), owner: 2, health: 100 }
```

### Esperado
```
[IA] Enemigo (5,4): Poder 23/15 = 1.53x
[IA] ⚔️ ATAQUE DIRECTO (1.53x)

// Intentar fusionar
18 + 5 = 23 > 20 (MAX_REGIMENTS_PER_DIVISION)
[IA] ⚠️ Unit-1 no cabe (18+5 > 20)

[IA] ATACANDO en (5,4)
```

### Verificar
- ✅ Detecta que 23 > 20
- ✅ NO fusiona (break en loop)
- ✅ Ataca con lo disponible (18 regimientos)
- ✅ Log avisa que no cabe

### Si Falla
- [ ] Verificar condición: `regAct + regFusionar > MAX_REGIMENTS_PER_DIVISION`
- [ ] Verificar que break detiene loop
- [ ] Verificar que movimiento se ejecuta anyway

---

## 🎮 TEST COMPLETO: Batalla en Vivo

### Preparar Mapa
```javascript
// Debugger:
gameState.currentPlayer = 1
playerTypes[1] = 'ai'   // IA controlada
playerTypes[2] = 'ai'   // IA adversaria

// Posicionar:
units[0] = { r: 3, c: 5, regiments: [6 items], owner: 1 }
units[1] = { r: 3, c: 6, regiments: [5 items], owner: 1 }
units[2] = { r: 6, c: 5, regiments: [8 items], owner: 2 }

gameState.cities = [
  { r: 2, c: 4, owner: 1, isCapital: true },
  { r: 5, c: 5, owner: null, isBarbarianCity: true, garrison: [3 items] }
]
```

### Ejecutar Turno
```javascript
// Ejecutar en consola:
handleEndTurn()
```

### Observar
- 🔍 Abre consola (F12)
- 🔍 Busca logs con `[IA_ARCHIPIELAGO]`
- 🔍 Verifica secuencia:
  ```
  FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
  Enemigo (...): Poder X/Y = Z.XXx
  [estrategia seleccionada]
  [acciones ejecutadas]
  ```

### Validar
- ✅ Poder relativo es calculado
- ✅ Estrategia es seleccionada correctamente
- ✅ Movimientos ocurren
- ✅ Ciudad bárbara es evaluada
- ✅ Sin errores en consola

---

## 🐛 Debugging

### Si hay ERROR en Consola

**Paso 1**: Abre DevTools (F12)
**Paso 2**: Busca `IA_ARCHIPIELAGO` en Network/Console

```javascript
// Mostrar estado actual
console.log('Units:', units)
console.log('Board:', board)
console.log('Cities:', gameState.cities)

// Ejecutar específicamente
const ia = IA_ARCHIPIELAGO;
ia.ejecutarTurno(1);
```

### Si Poder Relativo es Incorrecto

```javascript
// Verificar cálculo manual
const mis = units.filter(u => u.owner === 1);
const poder = mis.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
console.log('Poder total:', poder);
```

### Si NO Fusiona

```javascript
// Verificar que mergeUnits existe
console.log(typeof mergeUnits);  // Debe ser 'function'

// Verificar distancia
console.log(hexDistance(units[0].r, units[0].c, units[1].r, units[1].c));
```

### Si NO Se Mueve

```javascript
// Verificar que _executeMoveUnit existe
console.log(typeof _executeMoveUnit);  // Debe ser 'function'

// Verificar destino libre
console.log(board[destR][destC].unit);  // Debe ser undefined
```

---

## 📊 Métricas de Éxito

| Métrica | Target | Criterio |
|---------|--------|----------|
| Cálculo Poder | 100% correcto | Power = regimientos nuestros / regimientos enemigos |
| Estrategia Ataque | 1.3x+ | Selecciona ATAQUE si poderRelativo >= 1.3 |
| Estrategia Envolvimiento | 0.8-1.3x | Selecciona si en rango |
| Estrategia Retirada | <0.8x | Selecciona si debajo del límite |
| Fusión Respetada | MAX_REGIMENTS | Nunca supera 20 regimientos |
| Ciudades Conquistadas | Si >= poder mínimo | Conquista si poder >= garrison * 1.2 |
| Logs Registrados | 100% | Todo acto genera log |
| Sin Errores | 0 | Ejecución limpia |

---

## ✅ Checklist Final

- [ ] Test 1 (Ataque) pasado
- [ ] Test 2 (Envolvimiento) pasado
- [ ] Test 3 (Retirada) pasado
- [ ] Test 4 (Conquista viable) pasado
- [ ] Test 5 (Conquista inviable) pasado
- [ ] Test 6 (Múltiples enemigos) pasado
- [ ] Test 7 (Límite regimientos) pasado
- [ ] Test Completo (en vivo) pasado
- [ ] Consola sin errores
- [ ] Logs verificados y correctos

---

**Status**: 🟢 LISTO PARA TESTING
**Documentación**: Completa
**Soporte**: Ver IA_ARCHIPIELAGO_FASE3_5_REWRITE.md para detalles técnicos

Reporta cualquier anomalía en los logs o comportamiento inesperado.
