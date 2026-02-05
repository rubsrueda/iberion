# FIX: Replay mostrando "Evento desconocido" en todos los turnos

## 🐛 Problema Identificado

Los replays mostraban "Evento desconocido" para TODOS los eventos, a pesar de que los datos se guardaban correctamente en Supabase.

### Causa Raíz

El problema estaba en la función `compressTimeline()` en [replayStorage.js](replayStorage.js):

1. **Estructura esperada vs recibida**:
   - `ReplayEngine` guardaba la timeline con estructura:
     ```javascript
     [{
       turn: 1,
       currentPlayer: 1,
       events: [
         { type: 'MOVE', unitId, unitName, ... },
         { type: 'CONQUEST', location, ... }
       ],
       timestamp: ...
     }]
     ```
   
   - Pero `compressTimeline()` intentaba acceder directamente a `event.action` (que no existe) en lugar de navegar a `event.events[].type`.

2. **Validación de tamaño destructiva**:
   - El código tenía validaciones que limitaban `timeline_compressed` a 250 bytes
   - Si excedía este límite, reemplazaba TODO el timeline con `{ t: timeline.length }` (solo el conteo)
   - Esto destruía completamente los datos del replay

3. **Lógica de compresión innecesaria**:
   - El campo en BD es `TEXT` (ilimitado), no `VARCHAR(255)`
   - No había necesidad de comprimir los datos
   - La compresión solo agregaba bugs sin beneficio

## ✅ Solución Implementada

### 1. Eliminación de compresión innecesaria

**Antes:**
```javascript
compressTimeline: function(timeline) {
    const compact = limited.map(event => [
        event.turn || 0,
        event.action || '',  // ❌ Buscaba 'action' que no existe
        event.player || 0,
        ...
    ]);
    // ... validaciones que destruían datos
}
```

**Después:**
```javascript
compressTimeline: function(timeline) {
    // Ya no comprimimos - el campo es TEXT en BD
    return JSON.stringify(timeline);
}
```

### 2. Simplificación de deserialización

**Antes:**
```javascript
decompressTimeline: function(compressed) {
    // 80+ líneas intentando "reconstruir" estructura
    // que ya estaba correcta
}
```

**Después:**
```javascript
decompressTimeline: function(compressed) {
    const data = JSON.parse(compressed);
    if (Array.isArray(data)) return data;
    return [];
}
```

### 3. Eliminación de validaciones destructivas

**Antes:**
```javascript
// Validar tamaños antes de insertar
if (this._getByteLength(compressedTimeline) > 250) {
    compressedTimeline = JSON.stringify({ t: replayData.timeline?.length || 0 });
}
```

**Después:**
```javascript
// Sin validaciones - el campo TEXT puede manejar tamaño grande
const timelineJson = JSON.stringify(replayData.timeline);
```

### 4. Función de diagnóstico agregada

Nueva función `ReplayStorage.diagnoseReplay(matchId)` para verificar estructura de replays existentes:

```javascript
// USO en consola:
await ReplayStorage.diagnoseReplay('match_5f25d4ed')
```

Verifica:
- ✅ Estructura de timeline correcta
- ✅ Tipos de evento válidos
- ✅ Tamaños de datos
- ✅ Eventos reconocidos por replayUI

## 📊 Impacto

### Tipos de evento soportados

Todos estos tipos ahora funcionan correctamente:

- ✅ `MOVE` - Movimiento de unidades
- ✅ `BATTLE` - Combates
- ✅ `UNIT_DEATH` - Muerte de unidades
- ✅ `CONQUEST` - Conquista de territorios
- ✅ `BUILD` - Construcción de estructuras

### Archivo modificado

- [replayStorage.js](replayStorage.js): 467 líneas (simplificado de ~532 líneas)

### Archivos de utilidad creados

- [test_replay_structure.js](test_replay_structure.js): Script de prueba para verificar estructura

## 🧪 Cómo Probar

1. **Para replays nuevos**:
   - Jugar una partida completa
   - Abrir crónica desde el menú
   - Verificar que los eventos muestren texto descriptivo (no "Evento desconocido")

2. **Para replays existentes (con datos corruptos)**:
   ```javascript
   // En consola del navegador:
   await ReplayStorage.diagnoseReplay('match_5f25d4ed')
   ```

3. **Verificación rápida**:
   - Abrir consola durante replay
   - Buscar: `[ReplayRenderer] Reproduciendo turno X`
   - **NO** debe aparecer "Evento desconocido" en la lista de eventos

## ⚠️ Nota sobre Replays Antiguos

Los replays guardados ANTES de este fix pueden tener datos corruptos (solo contadores en lugar de eventos completos). Estos replays **NO se pueden recuperar** porque los datos originales fueron sobrescritos.

Para estos casos:
- Volver a jugar la partida
- O ignorar esos replays antiguos

Los replays guardados DESPUÉS de este fix funcionarán correctamente.

## 📝 Archivos Relacionados

- [replayStorage.js](replayStorage.js) - ✅ ARREGLADO
- [replayEngine.js](replayEngine.js) - ✅ Correcto (no requiere cambios)
- [replayRenderer.js](replayRenderer.js) - ✅ Correcto (no requiere cambios)
- [replayUI.js](replayUI.js) - ✅ Correcta la función `eventToText()`
- [migrations_replay.sql](migrations_replay.sql) - ✅ Campo TEXT correcto

## 🎯 Conclusión

El problema NO estaba en el guardado conceptualmente, sino en una **capa intermedia innecesaria de "compresión"** que:
1. No entendía la estructura de datos
2. Destruía los datos si excedían 250 bytes
3. No era necesaria porque el campo en BD es TEXT

La solución fue **eliminar toda esa complejidad** y guardar/cargar los datos directamente como JSON.
