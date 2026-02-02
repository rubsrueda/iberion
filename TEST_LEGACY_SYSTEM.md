# TEST: Sistema de Crónica (Legacy)

## Pasos para Probar

### 1. **Abre la Consola de Desarrollador (F12)**
   - Ve a la pestaña **Console**

### 2. **Verifica que todos los módulos están cargados**
   ```javascript
   console.log('StatTracker:', typeof StatTracker)
   console.log('LegacyManager:', typeof LegacyManager)
   console.log('LegacyUI:', typeof LegacyUI)
   ```
   - Todos deben decir: `"object"`

### 3. **Verifica que el modal existe en el DOM**
   ```javascript
   console.log('Modal encontrado:', !!document.getElementById('legacyModal'))
   console.log('Modal element:', document.getElementById('legacyModal'))
   ```
   - Debe mostrar: `true` y el elemento HTML

### 4. **Verifica que LegacyUI está inicializado**
   ```javascript
   console.log('modalElement:', LegacyUI.modalElement)
   console.log('isVisible:', LegacyUI.isVisible)
   ```
   - `modalElement` debe ser un elemento HTML
   - `isVisible` debe ser `false` inicialmente

### 5. **Simula el final de una partida manualmente**
   ```javascript
   // Forzar gameStats con datos de prueba
   StatTracker.gameStats = {
       startTime: Date.now(),
       numPlayers: 4,
       currentTurn: 50,
       players: {
           1: { playerId: 1, civilization: 'Roma', score: 5000, cities: 10, population: 50 },
           2: { playerId: 2, civilization: 'Persia', score: 4500, cities: 8, population: 40 },
           3: { playerId: 3, civilization: 'Grecia', score: 3000, cities: 5, population: 25 },
           4: { playerId: 4, civilization: 'Egipto', score: 2500, cities: 3, population: 15 }
       }
   }
   ```

### 6. **Abre la Crónica**
   ```javascript
   LegacyManager.open(1)  // 1 = ID del ganador
   ```
   - Deberías ver mucho logging en la consola:
     - `[LegacyManager.open] Abriendo Crónica...`
     - `[LegacyManager.open] LegacyUI disponible? true`
     - `[LegacyManager.open] Mostrando modal...`
     - `[LegacyUI.showModal] Intentando mostrar modal`
     - `[LegacyManager._updateTimeline] Iniciando...`
     - `[LegacyUI.displayTimeline] Iniciando con datos...`
     - `[LegacyUI.displayTimeline] Content elemento encontrado: true`
     - `[LegacyUI.displayTimeline] Asignando HTML...`

### 7. **Verifica la visibilidad del modal**
   ```javascript
   console.log('Modal visible?', LegacyUI.modalElement.style.display === 'flex')
   console.log('Modal content:', LegacyUI.modalElement.innerHTML.substring(0, 200))
   ```

### 8. **Si el modal se ve vacío, verifica el contenido específico**
   ```javascript
   const timelineContent = document.querySelector('[data-legacy-content="timeline"]')
   console.log('Timeline content:', timelineContent)
   console.log('Timeline innerHTML:', timelineContent?.innerHTML.substring(0, 200))
   ```

## Logs Esperados (En Orden)

### Si TODO funciona:
```
[LegacyManager.open] Abriendo Crónica. Ganador: 1
[LegacyManager.open] LegacyUI disponible? true
[LegacyManager.open] Mostrando modal...
[LegacyUI.showModal] Intentando mostrar modal
[LegacyUI.showModal] modalElement existe? true
[LegacyManager.open] Displays actualizados
[LegacyManager._updateTimeline] Iniciando...
[LegacyManager._updateTimeline] Stats: {...}
[LegacyManager._updateTimeline] Jugadores encontrados: 4
[LegacyUI.displayTimeline] Iniciando con datos:
[LegacyUI.displayTimeline] Content elemento encontrado: true
[LegacyUI.displayTimeline] Asignando HTML con longitud: 2547
[LegacyUI.displayTimeline] HTML asignado
```

### Si hay error:
- Busca líneas con `ERROR` o `WARN` que indiquen dónde falla
- Verifica que los IDs y selectores sean correctos en el HTML

## Problemas Comunes y Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| `modalElement` es `null` | Element HTML no encontrado | Verifica que el HTML tenga `id="legacyModal"` |
| Modal se muestra pero vacío | `displayTimeline()` no se ejecuta | Verifica los logs de `LegacyUI.displayTimeline` |
| Tabs no funcionan | Event listeners no configurados | Verifica `[data-legacy-tab]` attributes en HTML |
| SVG no se ve | Problema de renderización | Verifica que el SVG sea válido (no tiene errores de sintaxis) |

## Test de Fin de Partida Real

Una vez que todo funcione manualmente:

1. Inicia una partida normal
2. Juega 2-3 turnos
3. Termina la partida (cuando se determine un ganador)
4. La Crónica debe abrirse automáticamente
5. Verifica que se vean los gráficos y datos
