# Fix: Restricciones de Despliegue en Modo Invasión

## Problema
En el modo "Invasión", el atacante podía colocar sus divisiones en cualquier parte del mapa, a pesar de que `INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS` especifica que solo puede colocar a 1 hexágono de distancia de su base.

## Causa Raíz
El problema radicaba en cómo se inicializaba `gameState.gameMode`:

1. **En main.js**: Se asignaba `gameState.gameMode = gameMode` ANTES de llamar a `resetGameStateVariables()`
2. **En state.js**: La función `resetGameStateVariables()` creaba un nuevo objeto `initialGameStateObject` y lo asignaba directamente a `gameState`, **eliminando la asignación anterior de gameMode**
3. **Resultado**: Después del reset, `gameState.gameMode` era `undefined` o el valor por defecto ('development'), por lo que la validación de invasión nunca se ejecutaba

## Soluciones Implementadas

### 1. **state.js** - Pasar `gameMode` como parámetro
```javascript
// Antes:
function resetGameStateVariables(playerCount = 2, turnDuration = Infinity)

// Después:
function resetGameStateVariables(playerCount = 2, turnDuration = Infinity, gameMode = 'development')

// Y dentro del initialGameStateObject:
const initialGameStateObject = {
    numPlayers: playerCount,
    currentPlayer: 1,
    turnDurationSeconds: turnDuration,
    gameMode: gameMode,  // ← AÑADIDO
    ...
}
```

También se corrigió la condición que usaba `gameState.gameMode` (que no existía aún):
```javascript
// Antes:
if (typeof INVASION_MODE_CONFIG !== 'undefined' && gameState.gameMode === 'invasion')

// Después:
if (typeof INVASION_MODE_CONFIG !== 'undefined' && gameMode === 'invasion')
```

### 2. **main.js** - Actualizar todas las llamadas a `resetGameStateVariables()`
Se actualizaron 4 llamadas para pasar el `gameMode` como tercer parámetro:

- Línea 318: Tutorial → `resetGameStateVariables(2, Infinity, 'development')`
- Línea 1045: Network/Campaign → `resetGameStateVariables(settings.numPlayers, turnTime, gameMode)`
- Línea 1237: Local Game → `resetGameStateVariables(numPlayers, turnDuration, gameMode)`
- Línea 2117: New Tutorial → `resetGameStateVariables(2, Infinity, 'development')`
- Línea 2442: LAN Game → `resetGameStateVariables(2, Infinity, gameMode)`

### 3. **unit_Actions.js** - Mejorar validación y logging
Se añadió logging detallado para debugging:

```javascript
console.log(`[INVASION DEPLOY] Player ${currentPlayer}: ${playerCities.length} ciudades, isAttacker: ${isAttacker}`);
console.log(`[INVASION DEPLOY] Atacante a base (${attackerBase.r},${attackerBase.c}): distancia=${distanceFromBase}, radio=${INVASION_MODE_CONFIG.DEPLOYMENT_RADIUS}`);
console.log(`[INVASION DEPLOY] ✓ Distancia válida para colocar en (${r},${c})`);
```

Se reemplazó el fallback genérico por una estructura más explícita que rechaza cualquier colocación no conforme a las reglas de invasión.

## Validación
Ahora, cuando se inicia una partida en modo "Invasión":

1. ✅ `gameState.gameMode` se preserva correctamente después del reset
2. ✅ El atacante SOLO puede colocar divisiones a 1 hexágono de su base
3. ✅ El defensor SOLO puede colocar divisiones cerca de sus ciudades (radio 20)
4. ✅ Se muestra un mensaje de error si se intenta colocar fuera de la zona permitida
5. ✅ El logging de debug ayuda a identificar problemas futuros

## Recursos Afectados
- Atacante (Jugador 1): `INVASION_MODE_CONFIG.ATTACKER_RESOURCES` (40,000 oro)
- Defensor (Jugador 2): `INVASION_MODE_CONFIG.DEFENDER_RESOURCES` (1,000 oro)

Se asignan correctamente ahora porque `gameMode` se pasa correctamente a `resetGameStateVariables()`.

## Archivos Modificados
1. `/workspaces/iberion/state.js` - Función `resetGameStateVariables()`
2. `/workspaces/iberion/main.js` - 5 llamadas a `resetGameStateVariables()`
3. `/workspaces/iberion/unit_Actions.js` - Función `handlePlacementModeClick()` (mejorado con logging)
