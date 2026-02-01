# Reporte de Diagnóstico de Bugs - Enero 2026

**Fecha**: Febrero 1, 2026  
**Estado**: En Investigación y Corrección

---

## Bug #1: La partida termina pero se queda congelada
**Severidad**: 🔴 CRÍTICA  
**Descripción**: Cuando la partida termina, el modal de resultados (postMatchModal) debería aparecer, pero el juego se queda en espera sin mostrar pantalla de fin.

### Diagnóstico:
- ✅ `endTacticalBattle()` se ejecuta correctamente (gameFlow.js línea 1043)
- ✅ Llama a `UIManager.showPostMatchSummary()` (línea 1152)
- ✅ `showPostMatchSummary()` establece `modal.style.display = 'flex'` (uiUpdates.js línea 1521)
- ❌ **PERO**: Es posible que `UIManager` no esté inicializado correctamente

### Ubicaciones de Código:
- **Función Terminal**: `endTacticalBattle()` [gameFlow.js #1043-1220]
- **Función UI**: `UIManager.showPostMatchSummary()` [uiUpdates.js #1466-1530]
- **Modal HTML**: `postMatchModal` [index.html #1296-1316]

### Verificaciones Pendientes:
1. ¿Se llama a `UIManager.showPostMatchSummary()` efectivamente?
2. ¿El modal existe en el DOM?
3. ¿Hay errores de JavaScript en la consola?

---

## Bug #2: Unidades Caravana "Fantasma"
**Severidad**: 🟠 ALTA  
**Descripción**: Las caravanas aparecen como "fantasma" en su casilla inicial. Se mueven en el mapa pero si haces clic en la ciudad de origen, parece seguir allí.

### Diagnóstico:
- 📍 El problema está en `_executeEstablishTradeRoute()` [unit_Actions.js #3988-4040]
- Línea 4018-4024 actualiza la posición pero hay un problema de sincronización
- Posible causa: La unidad se actualiza en el array `units[]` pero no en `board[][]`

### Ubicaciones de Código:
- **Función**: `_executeEstablishTradeRoute()` [unit_Actions.js #3980-4040]
- **BankManager**: `buildAndDeployCaravan()` [bank_logic.js #114-180]
- **Update Loop**: `updateTradeRoutes()` [gameFlow.js #2250-2350]

### Hipótesis:
1. `board[unit.r][unit.c].unit` no se actualiza correctamente
2. El UnitGrid no se sincroniza con la nueva posición
3. Hay un desfase entre la posición visual y la lógica

---

## Bug #3: Pérdida de Control en Ciudades Bárbaras
**Severidad**: 🟠 ALTA  
**Descripción**: Al conquistar ciudades bárbaras, la unidad sigue visible pero no se puede controlar.

### Diagnóstico:
- El flag `isBarbaric` se detecta en [gameFlow.js #2352]
- Cuando `board[r][c].owner === 9` o `isBarbaric === true`, se captura la ciudad
- Pero parece que la unidad pierde su `player` ID

### Ubicaciones de Código:
- **Logística de Captura**: `_executeMoveUnit()` [unit_Actions.js #3022-3090]
- **Validación de Captura**: findConnectedCities() [gameFlow.js #2340-2360]
- **Posible Fallo**: Línea 3045-3070 donde se transfiere ownership

### Hipótesis:
1. El flag `unit.player` se corrompe durante la captura
2. La lógica de cambio de propietario no se aplica correctamente
3. El UnitGrid no se actualiza tras el cambio de owner

---

## Bug #4: Barcos No Pueden Fusionarse
**Severidad**: 🟠 MEDIA  
**Descripción**: Las unidades navales no pueden fusionarse entre sí.

### Diagnóstico:
- Función `mergeUnits()` [unit_Actions.js #272]
- Línea 276: Solo permite "embarking" (terrestre → naval)
- Línea 277: Solo permite "land merge" (terrestre → terrestre)
- ❌ NO hay lógica para fusión naval ↔ naval

### Ubicaciones de Código:
- **Validación**: `mergeUnits()` [unit_Actions.js #272-330]
- **Línea Crítica**: `if (!isEmbarking && !isLandMerge)` [línea 278]

### Solución Necesaria:
```javascript
const isNavalMerge = REGIMENT_TYPES[targetUnit.regiments[0]?.type]?.is_naval && 
                     REGIMENT_TYPES[mergingUnit.regiments[0]?.type]?.is_naval;
if (!isEmbarking && !isLandMerge && !isNavalMerge) {
    logMessage("Esta combinación de unidades no se puede fusionar.", "warning");
    return false;
}
```

---

## Bug #5: Regreso Inesperado a Pantalla Principal
**Severidad**: 🟡 MEDIA  
**Descripción**: Sin terminar el juego, se regresa a la pantalla principal sin motivo aparente.

### Diagnóstico:
- Posibles causas:
  1. Error en `handleEndTurn()` que dispara un `showScreen(mainMenuScreenEl)`
  2. Desconexión de red no manejada correctamente
  3. Timeout o error en sincronización que reinicia el juego

### Ubicaciones de Código:
- **End Turn**: `handleEndTurn()` [gameFlow.js #1836-2165]
- **Network Sync**: `activarEscuchaDeTurnos()` [networkManager.js]
- **Error Handler**: `main.js` línea 1560-1610

### Hipótesis:
1. `RaidManager.currentRaid` causa error en `handleEndTurn()` [línea 1944]
2. Falta try-catch alrededor de la lógica de cambio de turno
3. Error no capturado en actualización de estado de Supabase

---

## Bug #6: Duplicación de Partidas de IA
**Severidad**: 🟡 MEDIA  
**Descripción**: Las partidas vs IA aparecen cada 5 turnos duplicadas en la lista de partidas pendientes, pero ninguna es jugable.

### Diagnóstico:
- Las partidas se guardan pero aparecen múltiples veces
- Al hacer clic no funciona (probablemente causa de error al cargar)
- Posible: El sistema de auto-guardado está creando entradas duplicadas

### Ubicaciones de Código:
- **Auto-Save**: `saveGameUnified()` [saveLoad.js]
- **UPSERT Logic**: Línea que hace el "replace"
- **Game List**: `openMyGamesModal()` [modalLogic.js #4071]

### Hipótesis:
1. El campo `match_id` de partidas locales no es único
2. La lógica de UPSERT está duplicando en lugar de actualizar
3. Falta limpiar partidas antiguas del localStorage

---

## Plan de Correcciones

### Prioridad 1 (Bloqueadores críticos):
1. ✅ Bug #1: Modal de fin de partida no se muestra
2. 🔧 Bug #2: Caravanas fantasma

### Prioridad 2 (Gameplay):
3. 🔧 Bug #4: Fusión de barcos
4. 🔧 Bug #3: Control perdido en ciudades bárbaras

### Prioridad 3 (Quality of Life):
5. 🔧 Bug #5: Regreso a menú principal
6. 🔧 Bug #6: Duplicación de partidas

---

## Checklist de Testing:
- [ ] Terminar partida y ver modal de resultados
- [ ] Crear caravana, verificar posición correcta
- [ ] Conquistar ciudad bárbara, mantener control
- [ ] Fusionar dos barcos
- [ ] Jugar partida vs IA sin desconexiones
- [ ] Verificar lista de partidas guardadas sin duplicados

---

## Correcciones Aplicadas (Fase 1)

### ✅ Bug #4: Fusión de Barcos - CORREGIDO
**Archivo**: unit_Actions.js (línea 276)
**Cambio**:
```javascript
// ANTES: Solo permitía embarking o land merge
if (!isEmbarking && !isLandMerge) {
    logMessage("Esta combinación de unidades no se puede fusionar.", "warning");
    return false;
}

// DESPUÉS: Ahora permite naval merge también
const isNavalMerge = REGIMENT_TYPES[targetUnit.regiments[0]?.type]?.is_naval && 
                     REGIMENT_TYPES[mergingUnit.regiments[0]?.type]?.is_naval;
if (!isEmbarking && !isLandMerge && !isNavalMerge) {
    logMessage("Esta combinación de unidades no se puede fusionar.", "warning");
    return false;
}
```
**Impacto**: Ahora los jugadores pueden fusionar barcos con barcos (flota + flota).

---

### ✅ Bug #1: Modal de Fin de Partida No Se Muestra - PARCIALMENTE CORREGIDO
**Archivo**: gameFlow.js (línea 1152)
**Cambios**:
1. Añadidos logs de diagnóstico para verificar si UIManager está disponible
2. Mejorada la verificación de existencia de `showPostMatchSummary()`

**Logs Añadidos**:
```javascript
console.log("[endTacticalBattle] Verificando UIManager...", { hasUIManager: !!UIManager, hasMethod: !!(UIManager && UIManager.showPostMatchSummary) });
if (UIManager && typeof UIManager.showPostMatchSummary === 'function') {
    console.log("[endTacticalBattle] Mostrando pantalla de resultados...");
    UIManager.showPostMatchSummary(playerWon, xpGained, progress, matchMetrics);
} else {
    console.error("[endTacticalBattle] ¡ERROR! UIManager no tiene showPostMatchSummary...");
}
```
**Nota**: El modal debería existir en index.html (#postMatchModal). Si sigue sin aparecer, verificar que UIManager esté inicializado correctamente.

---

### ✅ Bug #5: Regreso Inesperado a Pantalla Principal - CORREGIDO
**Archivo**: gameFlow.js (línea 1826)
**Cambio**: Envuelto toda la función `handleEndTurn()` en `try-catch`

**Beneficio**: Ahora si hay un error no capturado durante el cambio de turno, se imprimirá en consola en lugar de causar un fallo silencioso que regrese al menú.

```javascript
async function handleEndTurn(isHostProcessing = false) {
    try {
        // ... toda la lógica de turno ...
    } catch (err) {
        console.error("[handleEndTurn] ERROR CRÍTICO DURANTE CAMBIO DE TURNO:", err);
        console.error("[handleEndTurn] Stack:", err.stack);
        logMessage(`⚠️ ERROR durante el cambio de turno: ${err.message}`, "error");
    }
}
```

---

## Problemas Pendientes de Investigación

### Bug #2: Caravanas Fantasma
**Estado**: Investigado, causa probablemente identificada
**Ubicación**: `_executeEstablishTradeRoute()` [unit_Actions.js #3980-4040]
**Hipótesis**: El UnitGrid no se sincroniza correctamente cuando se colocan caravanas en el origen

**Solución Propuesta**:
```javascript
// Después de actualizar unit.r y unit.c en _executeEstablishTradeRoute:
if (typeof UnitGrid !== 'undefined') {
    UnitGrid.move(unit, oldR, oldC);  // Actualizar índice espacial
}
```

### Bug #3: Pérdida de Control en Ciudades Bárbaras
**Estado**: Investigado
**Ubicación**: `_executeMoveUnit()` [unit_Actions.js #3049]
**Hipótesis**: Puede ser un problema de sincronización del tablero lógico o deselección automática

**Recomendación**: Revisar el flujo de captura bárbara y verificar que:
1. `targetHexData.unit` se actualiza correctamente
2. `UnitGrid` se sincroniza después de la captura
3. La unidad no se deselecciona erróneamente

### Bug #6: Duplicación de Partidas de IA
**Estado**: Sospechoso
**Ubicación**: Sistema de auto-save [gameFlow.js #2128-2141]
**Teoría**: El nombre "AUTOSAVE_RECENT" para todas las partidas locales podría estar sobrescribiendo en lugar de crear nuevas

**Verificación Necesaria**:
- ¿El localStorage o Supabase está duplicando IDs de partida?
- ¿El UPSERT está funcionando correctamente?

---

## Testing Recomendado

1. **Partida Simple (2 jugadores, local)**:
   - Terminar partida
   - ¿Aparece modal de resultados?
   - ¿Modal se cierra correctamente?

2. **Caravanas**:
   - Crear caravana
   - Mover 2-3 turnos
   - ¿La caravana está en la posición correcta?
   - ¿Se puede hacer clic en la ciudad de origen sin ver la caravana?

3. **Ciudades Bárbaras**:
   - Crear mapa con ciudades bárbaras (owner=9)
   - Conquistar una
   - ¿Se puede seguir controlando la unidad?

4. **Barcos**:
   - Crear dos unidades navales
   - Mover adyacentes
   - ¿Se puede fusionar? (botón debe aparecer)

5. **Partidas Guardadas**:
   - Jugar 10 turnos
   - Ver lista de partidas
   - ¿Aparecen duplicados?

