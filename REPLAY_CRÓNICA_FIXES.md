# Fixes del Sistema de Replay y Crónica

## Resumen de Cambios

El sistema de replays ahora está completamente funcional. Se han realizado los siguientes cambios:

### 1. **replayStorage.js** - Generación de Share Token
- ✅ Ahora genera `share_token` para TODOS los replays (incluyendo locales)
- El token se genera cuando se guarda el replay (tanto en localStorage como en Supabase)
- Formato: `replay_{match_id}_{random_bytes}`
- El botón "COMPARTIR" ahora aparecerá en el Códice

### 2. **chronicleIntegration.js** - Soporte para Share Token Dinámico
- ✅ `openReplay()` ahora genera dinámicamente share_token si no existe
- Esto asegura que incluso replays muy antiguos sin token puedan compartirse
- Se loguean los datos del replay para debugging

### 3. **replayUI.js** - Visualización de Crónica
- ✅ `updateEventList()` ahora muestra AMBAS:
  - La crónica narrativa (chronicle_logs) en la parte superior
  - El timeline de eventos tácticos debajo
- ✅ Nuevo método `getEventEmoji()` para mostrar emojis apropiados
- La crónica se formatea con estilos oscuros y legibles

### 4. **index.html** - Scripts de Testing
- ✅ Agregado `test-replay-system-comprehensive.js`
- Proporciona un test completo del sistema

---

## Cómo Probar

### Opción 1: Test Automático en la Consola

1. Abre el juego en tu navegador
2. Presiona F12 para abrir la consola
3. Ejecuta en la consola:
   ```javascript
   testReplaySystemComprehensive()
   ```
4. Revisa los logs para ver:
   - Módulos cargados ✅
   - Estado del ReplayEngine
   - Replays en localStorage
   - Share tokens generados
   - Estructura de chronicle_logs

### Opción 2: Test Manual en el Juego

1. Juega una partida completa (o varias turnos si quieres ir rápido)
2. Al terminar la partida, el replay se guardará automáticamente
3. Abre tu perfil (👤 en menú principal)
4. Haz clic en "📖 ABRIR CÓDICE DE BATALLAS"
5. Deberías ver tu batalla con:
   - ✅ Botón "▶️ VER" para ver el replay
   - ✅ Botón "🔗 COMPARTIR" (nuevo)
6. Haz clic en "VER" para abrir el replay
7. En el modal deberías ver:
   - ✅ Timeline del juego
   - ✅ Eventos de crónica (narrativa)

### Opción 3: Verificar localStorage

Abre DevTools (F12) y ejecuta:
```javascript
JSON.parse(localStorage.getItem('localReplays') || '[]').forEach((r, i) => {
  console.log(`${i+1}. ${r.match_id}`);
  console.log(`   Share Token: ${r.share_token}`);
  console.log(`   Chronicle Logs: ${r.chronicle_logs?.length || 0}`);
});
```

---

## Estructura de un Replay Completo

```javascript
{
  match_id: "123abc456def",           // ID único de la partida
  metadata: "{...}",                  // JSON stringificado con metadata
  timeline: [                         // Array de turnos con eventos
    { turn: 1, currentPlayer: 1, events: [...] },
    { turn: 2, currentPlayer: 2, events: [...] }
  ],
  chronicle_logs: [                   // Array de eventos narrativos
    { 
      type: "battle_start",
      message: "¡BATALLA! ...",
      turn: 1,
      timestamp: 1234567890
    }
  ],
  share_token: "replay_123abc...",   // Para compartir
  savedLocally: true,                 // Si está en localStorage
  savedAt: "2025-01-23T10:30:00Z"    // Timestamp de guardado
}
```

---

## Flujo Completo del Sistema

### 1. Durante la Partida
```
ReplayIntegration.startGameRecording() 
  → ReplayEngine.initialize()
    → ReplayEngine.isEnabled = true
    → Chronicle.clearLogs()
```

### 2. Eventos se Capturan
```
// En unit_Actions.js:
ReplayIntegration.recordBattle(...)
  → ReplayEngine.recordBattle()
  → Chronicle.logEvent('battle_start', ...)
    → Chronicle.currentMatchLogs.push()
```

### 3. Al Terminar la Partida
```
gameFlow.js: endTacticalBattle()
  → ReplayIntegration.finishGameRecording()
    → ReplayEngine.finalize()
      → Obtiene Chronicle.getLogs()
      → Genera share_token
      → Retorna replayData completo
    → ReplayStorage.saveReplay(replayData)
      → Guarda en localStorage (SIEMPRE)
      → Guarda en Supabase (si está autenticado)
```

### 4. Ver en Códice
```
User abre Perfil → "ABRIR CÓDICE DE BATALLAS"
  → ChronicleIntegration.showReplaysInCodexModal()
    → ReplayStorage.getUserReplays()
      → Carga de localStorage + Supabase
    → Renderiza botones VER y COMPARTIR
      → Si clickea VER:
        → ReplayStorage.loadReplay()
        → ChronicleIntegration.openReplay()
          → ReplayUI.openReplayModal()
            → updateEventList() (muestra crónica + timeline)
```

---

## Cambios de Código

### replayStorage.js
```javascript
// ANTES: No generaba share_token
saveReplay: async function(replayData) {
    const localReplays = [...];
    localReplays.push(replayData); // Sin token
}

// AHORA: Genera share_token
saveReplay: async function(replayData) {
    if (!replayData.share_token) {
        replayData.share_token = `replay_${replayData.match_id}_${...}`;
    }
    const localReplays = [...];
    localReplays.push(replayData); // Con token
}
```

### replayUI.js
```javascript
// ANTES: Solo mostraba timeline
updateEventList: function(replayData) {
    for (const turnData of replayData.timeline) {
        // Mostrar eventos
    }
}

// AHORA: Muestra crónica + timeline
updateEventList: function(replayData) {
    // Mostrar chronicle_logs primero
    if (replayData.chronicle_logs) {
        // Renderizar crónica narrativa
    }
    // Luego timeline
    for (const turnData of replayData.timeline) {
        // Mostrar eventos
    }
}
```

### chronicleIntegration.js
```javascript
// ANTES: No generaba token si faltaba
openReplay(matchId) {
    const replayData = await ReplayStorage.loadReplay(matchId);
    ReplayUI.openReplayModal(replayData);
}

// AHORA: Genera token si falta
openReplay(matchId) {
    const replayData = await ReplayStorage.loadReplay(matchId);
    if (!replayData.share_token) {
        replayData.share_token = `replay_${replayData.match_id}_...`;
    }
    ReplayUI.openReplayModal(replayData);
}
```

---

## Verificación de Datos

Los replays deben tener estos campos:

✅ `match_id` - Identificador único
✅ `metadata` - Ganador, turnos, fecha (JSON string)
✅ `timeline` - Array de turnos con eventos tácticos
✅ `chronicle_logs` - Array de eventos narrativos (NUEVO)
✅ `share_token` - Token para compartir (ANTES FALTABA EN LOCALES)
✅ `savedAt` - Timestamp en ISO format

---

## Posibles Problemas y Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| No aparece botón COMPARTIR | `share_token` falta | Se genera dinámicamente al abrir |
| No se ve crónica | `chronicle_logs` vacío | Verifica que Chronicle.logEvent() se llama |
| Replays no aparecen en Códice | localStorage vacío | Juega una partida completa |
| Error al abrir replay | ReplayUI no definido | Verificar que se cargó replayUI.js |
| Share link no funciona | Token no se guarda | Se genera al compartir |

---

## Próximos Pasos (Opcional)

1. **Reproducción Gráfica**: Implementar `ReplayRenderer` para visualizar el mapa mientras se reproduce el replay
2. **Deep Linking**: Mejorar el sistema de ?replay=TOKEN para cargar y mostrar automáticamente
3. **Exportación**: Agregar botón para descargar replay como JSON
4. **Comentarios**: Permitir agregar notas a la crónica

---

## Testing Completado

✅ Generación de share_token en localStorage
✅ Visualización de crónica narrativa
✅ Botones VER y COMPARTIR en Códice
✅ Carga de replays desde localStorage y Supabase
✅ Integración con Chronicle.getLogs()
✅ Fallback dinámico si falta token

