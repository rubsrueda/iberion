# GUÍA DE ESTABILIZACIÓN - SISTEMA DE CUADERNO Y REPLAYS
**Fecha**: 1 de Febrero, 2026
**Estado**: Fixes aplicados - Listo para pruebas

---

## ✅ CAMBIOS APLICADOS

### 1. **Fix del Botón del Cuaderno** 
**Problema**: Botón no aparecía en la UI
**Solución**: 
- ✅ Agregado reintentos automáticos en `ledgerIntegration.js`
- ✅ Agregada llamada explícita desde `main.js` línea ~1276
- ✅ Agregada verificación anti-duplicados

**Archivos modificados**:
- `ledgerIntegration.js` (líneas 29-42)
- `main.js` (líneas 1271-1281)

### 2. **Integración de Replays en Crónicas Históricas**
**Problema**: Replays no aparecían en "Crónicas Históricas"
**Solución**:
- ✅ Creado `chronicleIntegration.js` (nuevo archivo)
- ✅ Modificado `modalLogic.js` función `openFullCodex()` para usar nuevo sistema
- ✅ Agregado script en `index.html`

**Archivos modificados**:
- `chronicleIntegration.js` (NUEVO - 200 líneas)
- `modalLogic.js` (líneas 3691-3699)
- `index.html` (línea ~1841)

### 3. **Notificación Post-Partida con Link a Replay**
**Problema**: No se mostraba link al replay después de terminar
**Solución**:
- ✅ Agregada notificación toast en `chronicleIntegration.js`
- ✅ Integrado en `gameFlow.js` función `endTacticalBattle()`
- ✅ Guardado automático en tabla `match_history` para compatibilidad

**Archivos modificados**:
- `gameFlow.js` (líneas 1179-1187)

### 4. **Script de Diagnóstico**
**Nuevo archivo**: `test-systems.js`
- Verifica que todos los objetos existan
- Verifica elementos DOM
- Proporciona comandos de prueba

---

## 🧪 INSTRUCCIONES DE PRUEBA

### PASO 1: Cargar el juego y verificar inicialización
1. Abre el juego en el navegador
2. Abre DevTools (F12) → Pestaña Console
3. **Ejecuta el diagnóstico**: Copia y pega todo el contenido de `test-systems.js` en la consola
4. Verifica que veas:
   ```
   LedgerManager: ✅ Existe
   LedgerUI: ✅ Existe
   LedgerIntegration: ✅ Existe
   ChronicleIntegration: ✅ Existe
   ReplayEngine: ✅ Existe
   btn-open-ledger: ✅ Existe (Botón Cuaderno)
   ```

### PASO 2: Iniciar una partida
1. Desde el menú principal, inicia una partida (cualquier modo)
2. Espera a que cargue el tablero
3. **Verifica en consola**:
   ```
   [Main] ReplayEngine inicializado
   [Main] StatTracker inicializado
   [Main] LedgerUI inicializado
   [Main] LedgerIntegration inicializado
   [ReplayEngine] ✅ Inicializado. isEnabled=true
   [LedgerIntegration] Botón del Cuaderno agregado al menú superior
   ```

### PASO 3: Verificar botón del Cuaderno
1. Mira la barra superior del juego
2. Deberías ver un botón **📖 Cuaderno** con fondo cyan
3. **Si NO aparece**, ejecuta en consola:
   ```javascript
   LedgerIntegration.initialize()
   ```
4. Haz clic en el botón → debería abrir el modal del Cuaderno de Estado

### PASO 4: Jugar y terminar la partida
1. Juega algunos turnos (al menos 2-3)
2. Termina la partida (elimina a todos los oponentes o cumple condición de victoria)
3. **Verifica en consola al terminar**:
   ```
   [ReplayEngine] finalize() llamado con: {winner: X, turnNumber: Y}
   [ReplayEngine] ✅ Replay finalizado: Y turnos registrados
   [ReplayStorage] Tamaños (bytes): {...}
   [ReplayStorage] ✅ Replay ... guardado exitosamente en Supabase
   [ChronicleIntegration] Link guardado en match_history
   ```

### PASO 5: Verificar notificación de replay
Después de terminar la partida, deberías ver:
- Una **notificación toast** en la esquina superior derecha
- Título: "📜 ¡CRÓNICA DE BATALLA GUARDADA!"
- Botón: "▶️ Ver Crónica Ahora"
- Si haces clic, debería abrir el visor de replay

### PASO 6: Verificar Crónicas Históricas
1. Ve al menú de perfil
2. Haz clic en "📚 CRÓNICAS HISTÓRICAS"
3. Deberías ver tu partida listada con:
   - ID de batalla
   - Fecha y hora
   - Ganador
   - Número de turnos
   - Botón "▶️ Ver Crónica"

---

## 🔍 VERIFICACIONES MANUALES EN CONSOLA

### Verificar que el botón existe
```javascript
document.getElementById('btn-open-ledger')
// ✅ Debería devolver: <button id="btn-open-ledger">...
// ❌ Si devuelve null → El botón NO se creó
```

### Abrir Cuaderno manualmente
```javascript
LedgerIntegration.openLedger()
// ✅ Debería abrir el modal
```

### Ver replays guardados
```javascript
await ReplayStorage.listReplays()
// ✅ Debería devolver array con tus replays
```

### Ver eventos capturados durante partida
```javascript
console.log('Eventos:', ReplayEngine.timeline.length)
console.log('Turno actual:', ReplayEngine.currentTurn)
// ✅ Los números deberían aumentar con cada turno
```

### Abrir Crónicas Históricas manualmente
```javascript
ChronicleIntegration.showReplaysInCodexModal()
// ✅ Debería abrir el modal con lista de replays
```

---

## ❓ QUÉ HACER SI ALGO FALLA

### ❌ Botón no aparece después de iniciar partida
**Solución temporal**:
```javascript
LedgerIntegration.initialize()
```

### ❌ Error "ChronicleIntegration is not defined"
**Causa**: Script no cargado
**Verificar**: 
```javascript
typeof ChronicleIntegration
// Debería devolver "object"
```
**Fix**: Recarga la página (Ctrl+F5)

### ❌ Error "ReplayStorage ✅ Replay guardado" NO aparece
**Causa**: Posibles problemas:
1. No estás autenticado → Verifica `PlayerDataManager.currentPlayer`
2. Error SQL aún presente → Verifica que ejecutaste el ALTER TABLE
3. Timeline vacío → Verifica `ReplayEngine.timeline.length > 0`

**Diagnóstico**:
```javascript
console.log('Autenticado:', PlayerDataManager.currentPlayer?.auth_id)
console.log('Replay enabled:', ReplayEngine.isEnabled)
console.log('Eventos:', ReplayEngine.timeline.length)
```

### ❌ Crónicas Históricas muestra "No hay crónicas"
**Causa**: No hay replays en BD o no estás autenticado
**Verificar**:
```javascript
await ReplayStorage.listReplays()
// Si devuelve [], no hay replays guardados
```

---

## 📊 CHECKLIST FINAL

Marca cada item después de verificarlo:

- [ ] Botón "📖 Cuaderno" aparece en barra superior
- [ ] Botón abre el modal del Cuaderno al hacer clic
- [ ] Modal muestra datos (Resumen, Demografía, Militar, Economía)
- [ ] Al terminar partida, aparece notificación de replay
- [ ] Notificación tiene botón "Ver Crónica Ahora"
- [ ] "Crónicas Históricas" muestra lista de partidas
- [ ] Al hacer clic en una crónica, se abre el visor de replay
- [ ] En consola aparece: `[ReplayStorage] ✅ Replay ... guardado`

---

## 🎯 RESULTADO ESPERADO

Si todo funciona correctamente:

1. ✅ Botón del Cuaderno visible y funcional
2. ✅ Modal del Cuaderno con 4 pestañas operativas
3. ✅ Replays se guardan automáticamente en Supabase
4. ✅ Notificación post-partida con link al replay
5. ✅ Crónicas Históricas muestra lista de todas las partidas
6. ✅ Visor de replay abre al hacer clic

---

## 📝 NOTAS ADICIONALES

- Los replays se guardan en tabla `game_replays`
- También se crea entrada en `match_history` para compatibilidad
- El sistema requiere autenticación (Google OAuth)
- Los replays son privados por defecto (solo visibles para el jugador)

---

**Última actualización**: 1 Feb 2026, 21:30
**Autor**: GitHub Copilot
**Versión**: 1.0
