# SISTEMA DE REPLAY/CRÓNICAS - GUÍA DE PRUEBA

## Estado Actual: LISTO PARA PRUEBAS ✅

El sistema de replay y crónicas ha sido completamente implementado. Aquí está el estado de cada componente:

### Componentes Implementados

#### 1. **replayEngine.js** ✅
- Captura todos los eventos durante la partida
- Registra movimientos, batallas, construcciones, conquistas
- Genera timeline ordenado por turno
- Finaliza y prepara datos para guardar

#### 2. **replayRenderer.js** ✅
- Renderiza el replay visualmente en canvas
- Soporta controles: play, pause, next, previous, speed (1x, 2x, 4x)
- Anima movimientos de unidades suavemente
- Muestra efectos visuales de batallas y muertes
- Scrubber para saltar a turno específico

#### 3. **replayUI.js** ✅
- Modal "Crónica de Batalla" con interfaz 3-columnas
- Columna izquierda: Log de eventos (narrativo)
- Columna central: Canvas de reproducción
- Columna derecha: Controles de reproducción
- Convertidor evento→texto para crónica

#### 4. **replayStorage.js** ✅
- Guarda replays comprimidos en Supabase
- Carga replays de la BD
- Genera tokens de compartir
- Carga replays compartidos por token
- Compresión/descompresión de timeline

#### 5. **replayIntegration.js** ✅ NUEVO
- Interfaz entre gameFlow y ReplayEngine
- Hooks no invasivos para captura de eventos
- Métodos wrapper para cada tipo de evento

#### 6. **replayApi.js** ✅ NUEVO
- Endpoints REST para replay API
- Obtener replays compartidos
- Generar tokens de compartir
- Listar replays públicos y personales
- Eliminar replays

#### 7. **Modal HTML en index.html** ✅
- Ya existe en línea 1837
- Estructura 3-columnas lista
- Botones de control configurados
- Canvas dedicado

### Hooks Integrados en el Juego

#### gameFlow.js
- ✅ Inicializa ReplayEngine al empezar partida (main.js línea ~1243)
- ✅ Registra fin de turno (gameFlow.js línea ~2167)
- ✅ Finaliza grabación al terminar batalla (endTacticalBattle)

#### unit_Actions.js
- ✅ Registra movimientos de unidades (línea ~3148)

### Base de Datos (Supabase)

La migración SQL ya fue ejecutada:
- ✅ Tabla `game_replays` creada
- ✅ Tabla `replay_shares` creada (opcional)
- ✅ RLS policies configuradas
- ✅ Índices creados para búsquedas rápidas

---

## PLAN DE PRUEBAS

### Prueba 1: Captura de Eventos Básica
1. Abre el juego en el navegador
2. Inicia una nueva partida (escaramuza)
3. Mueve una unidad → Revisa consola:
   - Debe ver: `[ReplayEngine] recordMove: ...`
   - Verifica que el evento se agregó a `currentTurnEvents`

**Esperado**: Sin errores en consola

### Prueba 2: Fin de Turno
1. Completa un turno haciendo acciones
2. Haz clic en "Fin de Turno"
3. Revisa consola:
   - Debe ver: `[ReplayEngine] recordTurnEnd: Turno X`
   - Timeline debe tener entrada con todos los eventos del turno

**Esperado**: Los eventos se agrupan correctamente por turno

### Prueba 3: Fin de Partida y Guardado
1. Juega hasta que alguien gane
2. Revisa consola:
   - `[ReplayIntegration] Replay guardado en Supabase`
   - `[endTacticalBattle] Replay guardado: exitoso`
3. En Supabase, tabla `game_replays`, debe haber una fila nueva

**Esperado**: Replay se guarda sin errores

### Prueba 4: Ver Crónica
*Próxima fase* - Requiere integración con menú de historial
1. Abre "Mis Partidas" → "Crónicas"
2. Selecciona un replay
3. Debe abrir modal con:
   - Lista de eventos a la izquierda
   - Canvas vacío (se llenará con render)
   - Controles a la derecha

**Esperado**: Modal se abre sin errores

### Prueba 5: Reproducción Visual
*Fase avanzada* - Requiere que ReplayRenderer esté completamente integrado
1. Abre una crónica
2. Haz clic en "PLAY"
3. Las unidades deben moverse animadas en el canvas
4. Los botones de velocidad (1x, 2x, 4x) deben funcionar

**Esperado**: Animación suave sin lag

### Prueba 6: Compartir Replay
*Fase final* - Requiere integración con botón "Copiar Enlace"
1. Abre una crónica
2. Haz clic en "Copiar Enlace de Replay"
3. Se copia una URL como: `https://iberion.game/?replay=TOKEN123`
4. Envía a otro usuario
5. Otros usuarios pueden ver el replay incluso sin tener la partida guardada

**Esperado**: Links funcionan y redirigen correctamente

---

## Debugging

### Comandos en Consola para Pruebas

```javascript
// Ver estado actual del ReplayEngine
ReplayEngine.getState()

// Ver todos los eventos capturados
gameState.turnNumber; // Turnos jugados
ReplayEngine.timeline; // Array con todos los turnos y eventos

// Forzar un evento de prueba
ReplayIntegration.recordUnitMove('unit_1', 'Mi Unidad', 1, 0, 0, 1, 1);

// Ver replays guardados del usuario
await ReplayStorage.getUserReplays()

// Obtener un replay compartido
await ReplayStorage.loadSharedReplay('TOKEN_AQUI')
```

### Checklist de Verificación

- [ ] Consola limpia de errores al iniciar partida
- [ ] ReplayEngine se inicializa al comenzar
- [ ] Los eventos se registran sin errores
- [ ] Timeline se agrupa correctamente por turno
- [ ] Replay se guarda en Supabase al terminar
- [ ] Modal de Crónica se abre sin errores
- [ ] ReplayRenderer dibuja el canvas base
- [ ] ReplayUI convierte eventos a texto narrativo

### Posibles Errores

1. **"ReplayIntegration is not defined"**
   - Asegúrate que `replayIntegration.js` está incluido en index.html
   - Verifica el orden de scripts (debe ser ANTES de main.js)

2. **"replayIntegration.recordUnitMove is not a function"**
   - Verifica que ReplayIntegration.initialize() fue llamado
   - Revisa que el objeto está expuesto globalmente

3. **"Cannot read property 'isEnabled' of undefined"**
   - ReplayEngine no se inicializó
   - Revisa que `ReplayIntegration.startGameRecording()` se llama en main.js

4. **Replay no se guarda en Supabase**
   - Verifica que PlayerDataManager.currentPlayer existe
   - Confirma que supabaseClient está disponible
   - Revisa credenciales en supabaseConfig.js

---

## Próximos Pasos (Futuro)

1. Integración visual completa en el modal de Historial
2. Botón "Generar Enlace" en la pantalla de resultados
3. Filtros para la crónica (solo militares, económicos, etc.)
4. Replay en "Modo Espectador" vs "Modo Jugador"
5. Replay compartido en la pantalla de inicio
6. Leaderboard de "Replays Más Vistos"

---

**Última actualización**: Febrero 1, 2026
**Versión**: 1.0 Completa
**Status**: LISTO PARA PRUEBAS ✅
