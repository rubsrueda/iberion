# Análisis de Issues Reportados y Plan de Fixes

## Issue 1: Menú Radial Táctico - NO APARECE

### Problema
El código existe (`uiUpdates.js`, `style.css`, `unit_Actions.js`) pero el menú no se muestra al hacer clic en unidades.

### Root Cause Analysis
- ✅ `unit_Actions.js#496-498` - Sí llama a `UIManager.showRadialMenu()`
- ✅ `uiUpdates.js#1448-1550` - Función `showRadialMenu()` existe y está bien
- ✅ `style.css#6498-6533` - CSS existe con z-index correcto (20000)
- ❌ **PROBLEMA**: En `style.css#6527`, hay un cierre de llave extra `}` que rompe el CSS
- ❌ **PROBLEMA**: El contenedor `#radialMenuContainer` necesita `pointer-events: auto` en los botones

### Fix Requerido
1. Eliminar el cierre de llave extra en CSS
2. Verificar que `pointer-events` está correctamente seteado
3. Asegurar que `#radialMenuContainer` tiene `z-index` alto y posición `fixed`

---

## Issue 2: Battle Pass Disfuncional

### Problemas Identificados
1. ❌ XP de batallas (100 XP) no se contabiliza en GitHub (sí localmente)
2. ❌ Compra con gemas no persiste después de reiniciar
3. ❌ XP ganado por batallas no permite avanzar en ciertos momentos
4. ❌ "Eventualmente" aparecen los comprados y permite avanzar (inconsistencia de sincronización)

### Root Cause
- **Sincronización Supabase**: `BattlePassManager.addMatchXp()` no se ejecuta correctamente en red
- **Donde se llama**: `raidManager.js#465` llama `BattlePassManager.addMatchXp()`
- **Problema**: Si hay error de fetch o timeout, falla silenciosamente sin retry

### Código Problemático
```javascript
// raidManager.js line 465
await BattlePassManager.addMatchXp(baseXp * contributionPct);  // Sin try/catch
```

### Fixes Requeridos
1. Agregar error handling en `raidManager.js` 
2. Verificar que `saveUserProgress()` en `BattlePassManager.js` actualiza correctamente el `is_premium`
3. Implementar retry logic para fallos de red
4. Validar que `addMatchXp()` calcula niveles correctamente (línea 557 usa 500xp, pero debería ser dinámico)

---

## Issue 3: IA Muy Débil - Pierde Unidades Rápido

### Problemas
- ❌ IA pierde toda su oro muy rápido
- ❌ Cuando Oro = 0, pierde todas las unidades (game over implícito)
- ❌ IA no considera usar la **Banca** como fuente de recursos

### Root Cause
`aiLogic.js#23-65` - Despliegue de IA es reactivo, no estratégico a nivel económico

### Solución Requerida
1. Crear `ai_tradeLogic.js` con función `considerBankTrade()`
2. En `ai_gameplayLogic.js`, agregar check: Si `playerResources[player].oro < 300`, solicitar trade con Banca
3. Implementar "valor de preservación": IA debe mantener 200 oro de reserva

---

## Issue 4: Banca Crea Múltiples Caravanas por Ciudad

### Problema
`bank_logic.js#60-85` - La lógica de "1 caravana por turno" se cumple, pero se acumulan

### Root Cause
El check `activeDestinations.has(targetCity.name)` solo previene 1 activa POR DESTINO, pero la Banca puede tener múltiples rutas.
Falta límite global de caravanas.

### Fix
Agregar en `bank_logic.js`:
```javascript
const maxCaravans = 3; // Máximo 3 caravanas simultáneas
const activeCaravans = units.filter(u => u.player === this.PLAYER_ID && u.tradeRoute).length;
if (activeCaravans >= maxCaravans) return; // No crear más
```

---

## Issue 5: Nuevo Punto de Victoria - Ciudades Bárbaras Conquistadas

### Implementación Requerida
1. **Rastrear ciudades neutrales**: En `gameState`, agregar `barbaraCitiesConquered = {}`
2. **En `gameFlow.js`**: Detectar cuando unidad conquista ciudad neutral (owner = null/9)
3. **En `calculateVictoryPoints()`**: Sumar puntos por ciudades bárbaras
4. **En `checkVictory()`**: Si victoryConditions incluye `barbaraCities`, sumarlas al cálculo

### Cambios en constants.js
```javascript
// Agregar a VICTORY_CONDITIONS
barbaraCities: { name: "Ciudades Bárbaras Conquistadas", type: 'count', target: 5 }
```

---

## Issue 6: Alianza - Caravana Imperial No Funciona

### Problemas Identificados
1. ❌ División IA no visible en el mapa
2. ❌ Fortalezas no habilitadas para el jugador

### Root Cause
`allianceManager.js` no tiene implementación de "Caravana Imperial":
- No existe generación de unidades compartidas
- No existe lógica de "fortaleza aliada compartida"

### Fix Requerido
1. Crear evento en `allianceManager.js` para desplegar unidad IA conjunta
2. Extender `board[][]` para soportar "ownership compartido" de fortalezas
3. Modificar `isHexSupplied()` para permitir supply desde fortalezas aliadas

---

## Resumen de Archivos a Modificar

| Archivo | Issue | Líneas |
|---------|-------|--------|
| `style.css` | 1 (Radial) | 6527 |
| `uiUpdates.js` | 1 (Radial) | 1500-1510 (pointer-events) |
| `BattlePassManager.js` | 2 (BP) | 537-560 (addMatchXp), 487-510 (saveUserProgress) |
| `raidManager.js` | 2 (BP) | 465 (try/catch) |
| `bank_logic.js` | 4 (Caravanas) | 70-80 (add max limit) |
| `aiLogic.js` | 3 (IA) | Add trade consideration |
| `gameFlow.js` | 5 (VP) | 2163-2200 (barbaraCities) |
| `constants.js` | 5 (VP) | Add barbaraCities to victory conditions |
| `allianceManager.js` | 6 (Alianza) | New functions for shared units |

