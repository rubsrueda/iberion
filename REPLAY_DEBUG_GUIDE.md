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
3. Inicia una partida (deberías ver logs de inicialización)
4. Termina la partida (deberías ver logs de fin)
5. **Copia TODOS los logs** que veas entre `[ReplayEngine]`, `[ReplayIntegration]`, `[ReplayStorage]`, `[endTacticalBattle]`

## Logs Actualizados en

- `main.js` (~1260): Llamada inicial a `startGameRecording`
- `replayEngine.js`: `initialize()` y `finalize()` con logs mejora
- `replayIntegration.js`: `startGameRecording()` y `finishGameRecording()` con logs detallados
- `replayStorage.js`: `saveReplay()` con tamaños de cada campo
- `gameFlow.js` (~1180): Llamada a `finishGameRecording()`
