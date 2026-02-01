# Guía de Diagnóstico del Sistema de Replay

## Cambios Realizados

Se añadieron **logs detallados en toda la cadena de guardado del replay** para identificar dónde se corta el proceso.

## Secuencia de Ejecución Esperada

Cuando terminas una partida, **en orden** deberías ver estos logs:

### 1. **Inicialización del Replay** (cuando comienza la partida)
```
[Main] ReplayEngine inicializado
[ReplayIntegration] startGameRecording llamado con: ...
[ReplayEngine] initialize() llamado con matchId: ...
[ReplayEngine] ✅ Inicializado. isEnabled=true, matchId=..., players=...
```

### 2. **Fin de la Partida** (cuando termina)
```
[endTacticalBattle] Replay guardado: ...
[ReplayIntegration] finishGameRecording llamado con: ...
[ReplayEngine] finalize() llamado con: ...
[ReplayEngine] ✅ Replay finalizado: X turnos registrados
[ReplayIntegration] Llamando a ReplayStorage.saveReplay...
[ReplayStorage] Tamaños (bytes): { match_id: ..., user_id: ..., metadata: ..., timeline_compressed: ..., created_at: ... }
[ReplayStorage] ✅ Replay ... guardado exitosamente en Supabase
[ReplayIntegration] saveReplay retornó: true
[ReplayIntegration] ✅ Replay guardado exitosamente en Supabase
```

## Qué Buscar si Falla

| Síntoma | Causa Probable | Solución |
|---------|---|---|
| No ves `[ReplayEngine] ✅ Inicializado...` | `ReplayIntegration.startGameRecording()` nunca se llama | Revisar `main.js` línea ~1260 |
| Ves `isEnabled=false` en initialize | ReplayEngine se está reseteando entre partidas | Revisar si hay reinicio de estado |
| No ves `[ReplayIntegration] finishGameRecording llamado...` | `finishGameRecording()` no se llama en `endTacticalBattle` | Revisar `gameFlow.js` línea ~1180 |
| Ves `[ReplayEngine] finalize() llamado... isEnabled: false` | ReplayEngine.isEnabled fue puesto a false antes de que finalize se llame | Ver dónde se resetea `isEnabled` |
| No ves `[ReplayStorage] Tamaños (bytes):...` | El saveReplay NO entra en el try o retorna temprano | Revisar si PlayerDataManager.currentPlayer existe |
| Ves `[ReplayStorage] Error guardando replay: {code: '22001'...}` | Un campo excede 255 bytes | Ver los tamaños en Tamaños (bytes) |

## Cómo Probar

1. Abre DevTools (F12)
2. Pestaña "Console"
3. **PRIMERO**: Ejecuta el diagnóstico completo copiando todo el contenido de `test-systems.js` en la consola
4. Inicia una partida (deberías ver logs de inicialización)
5. Termina la partida (deberías ver logs de fin)
6. **Copia TODOS los logs** que veas entre `[ReplayEngine]`, `[ReplayIntegration]`, `[ReplayStorage]`, `[endTacticalBattle]`

## PROBLEMAS IDENTIFICADOS (Feb 1, 2026)

### 🔴 PROBLEMA 1: Botón del Cuaderno no aparece
**Causa**: `LedgerIntegration.initialize()` se ejecuta antes de que `top-bar-menu` esté en el DOM
**Fix aplicado**: 
- Agregado reintentos automáticos cada 500ms si no encuentra el elemento
- Agregada llamada explícita desde `main.js` después de inicializar la UI
- Agregada verificación para evitar duplicados

### 🔴 PROBLEMA 2: Replays no aparecen en "Crónicas Históricas"
**Causa**: `openFullCodex()` busca en tabla `match_history`, pero replays se guardan en `game_replays`
**Solución pendiente**: Necesita integración entre ambas tablas o consulta unificada

### 🔴 PROBLEMA 3: No se genera link de replay al terminar partida
**Causa**: `endTacticalBattle()` llama a `finishGameRecording()` pero no muestra UI de resultado
**Solución pendiente**: Agregar pantalla post-partida con link al replay

## PRUEBAS MANUALES RECOMENDADAS

### Test 1: Verificar que el botón aparece
```javascript
// En consola, después de iniciar partida:
document.getElementById('btn-open-ledger')
// Debería devolver: <button id="btn-open-ledger">📖 Cuaderno</button>
// Si devuelve null, el botón NO se creó
```

### Test 2: Abrir Cuaderno manualmente
```javascript
LedgerIntegration.openLedger()
// Debería abrir el modal del Cuaderno
```

### Test 3: Verificar que replay se guardó
```javascript
await ReplayStorage.listReplays()
// Debería devolver array con tus replays guardados
```

### Test 4: Verificar eventos capturados
```javascript
// Durante la partida:
console.log(ReplayEngine.timeline.length)
// Debería ir aumentando con cada turno
```

## Logs Actualizados en

- `main.js` (~1260): Llamada inicial a `startGameRecording`
- `replayEngine.js`: `initialize()` y `finalize()` con logs mejora
- `replayIntegration.js`: `startGameRecording()` y `finishGameRecording()` con logs detallados
- `replayStorage.js`: `saveReplay()` con tamaños de cada campo
- `gameFlow.js` (~1180): Llamada a `finishGameRecording()`
