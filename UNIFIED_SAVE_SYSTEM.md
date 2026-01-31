# Sistema de Guardado Unificado (v2.0)

## Cambios Implementados

### Objetivo
Unificar el sistema de guardado para que **todas las partidas** (red, vs IA, local) se traten de la misma forma, sin importar el tipo de oponente. El oponente es un "accidente" que puede cambiar en tiempo de ejecución (hoy IA, mañana humano).

---

## Cambios en `saveLoad.js`

### 1. Nueva Función Central: `saveGameUnified()`

```javascript
async function saveGameUnified(saveName, isAutoSave = false)
```

**Características:**
- ✅ **Unificada**: Una sola función para guardar cualquier tipo de partida
- ✅ **Automática**: Genera nombre automático si no se proporciona
- ✅ **Segura**: Valida autenticación antes de guardar
- ✅ **UPSERT**: Si el nombre existe, lo sobrescribe (útil para autosaves)
- ✅ **Metadata**: Guarda información sobre el tipo de partida sin afectarla

**Estructura de Guardado:**
```javascript
{
  save_name: string,
  user_id: string,
  board_state: Array<Array<HexData>>,
  game_state: {
    gameState: Object,
    units: Array<UnitData>,
    unitIdCounter: number,
    metadata: {
      gameType: "network_multiplayer" | "local_multiplayer" | "local_vs_ai",
      turnNumber: number,
      currentPlayer: number,
      gamePhase: string,
      winner: number | null,
      isAutoSave: boolean,
      savedAt: string (ISO)
    },
    playerInfo: {
      playerTypes: Object,
      playerCivilizations: Object,
      playerResources: Object
    }
  },
  created_at: string (ISO)
}
```

### 2. Función `handleSaveGame()` (Mejorada)

- Ahora llama a `saveGameUnified()`
- Mantiene interfaz compatible con la anterior
- Permite guardar manual con nombre personalizado

### 3. Función `handleLoadGame()` (Mejorada)

**Nuevas características:**
- Muestra tipo de partida al listar guardados
- Emojis para diferenciar tipos: 🌐 (Red), 👥 (Local), 🤖 (IA)
- Muestra número de turno y fase actual
- Información descriptiva al cargar

### 4. Funciones Helper para Detectar Tipo de Partida

```javascript
function getGameTypeFromSave(gameStateObject) → string
function getGameTypeInfo(gameType) → Object {icon, label, description}
```

Útiles para otros sistemas que necesiten saber qué tipo de partida se está jugando.

---

## Cambios en `gameFlow.js`

### 1. `endTacticalBattle()` - Guardado Unificado

**Antes:**
```javascript
// Diferenciación por tipo de partida
if ((typeof NetworkManager === 'undefined' || !NetworkManager.miId) && PlayerDataManager.currentPlayer) {
    // Guardar local vs IA específicamente
    supabaseClient.from('game_saves').upsert({...});
}
```

**Después:**
```javascript
// Una sola función para todo
if (PlayerDataManager.currentPlayer && typeof saveGameUnified === 'function') {
    const autoSaveName = "AUTOSAVE_RECENT";
    saveGameUnified(autoSaveName, true);
}
```

✅ **Beneficios:**
- Código más limpio
- Garantiza que todas las partidas se guarden igual
- No hay excepciones por tipo de partida

### 2. Autosaves Periódicos (Cada 5 Turnos)

Agregado en `handleEndTurn()`:

```javascript
// Autosave automático cada 5 turnos
if (gameState.turnNumber % 5 === 0 && PlayerDataManager.currentPlayer && typeof saveGameUnified === 'function') {
    console.log(`[AutoSave] Guardando en turno ${gameState.turnNumber}...`);
    saveGameUnified(`AUTOSAVE_TURN_${gameState.turnNumber}`, true);
}
```

✅ **Beneficios:**
- Recuperación automática si se cierra el navegador
- No requiere acción manual del usuario
- Nombres con timestamp permiten ver progresión

---

## Flujo de Guardado Automático

```
Inicio de Partida
       ↓
Cada turno × 5
       ↓
saveGameUnified("AUTOSAVE_TURN_X", true) ← Guardado periódico
       ↓
Fin de Partida (Batalla Terminada)
       ↓
saveGameUnified("AUTOSAVE_RECENT", true) ← Guardado final
       ↓
También se sincronizan progresiones, Battle Pass, carrera, etc.
```

---

## Metadatos de Partida

Cada guardado ahora incluye metadata que identifica:

| Campo | Valores | Propósito |
|-------|---------|----------|
| `gameType` | `network_multiplayer`, `local_multiplayer`, `local_vs_ai` | Identificar tipo de partida sin afectarla |
| `turnNumber` | número | Para autosaves progresivos |
| `currentPlayer` | 1-N | Saber de quién era el turno |
| `gamePhase` | `deployment`, `play`, `gameOver` | Estado del juego |
| `winner` | número o null | Resultado final |
| `isAutoSave` | boolean | Distinguir autosaves de guardados manuales |
| `savedAt` | ISO string | Timestamp del guardado |

---

## Impacto en Otros Sistemas

### Para `PlayerDataManager`
- Sigue funcionando igual
- Los guardados siguen siendo síncronos a través de `saveGameUnified()`
- Compatible hacia atrás con cualquier código que cargue guardados

### Para `NetworkManager`
- No requiere cambios
- Las partidas de red simplemente se marcan con `gameType: "network_multiplayer"` en metadata
- El guardado unificado es agnóstico al origen

### Para `campaignManager`
- Funciona sin cambios
- Cada batalla táctica se guarda automáticamente con su metadata

### Para `BattlePassManager`
- Se integra con `endTacticalBattle()`
- El guardado unificado no interfiere con progresiones

---

## Ventajas del Sistema

### Arquitectura
✅ Una sola función centralizada para guardar  
✅ Menos duplicación de código  
✅ Más fácil de mantener  

### Consistencia
✅ Todas las partidas se guardan igual  
✅ No hay diferencias entre red y local  
✅ Futuro: cambiar oponente sin perder progreso  

### Recuperación
✅ Autosaves cada 5 turnos + fin de partida  
✅ Recuperación automática si se cierra navegador  
✅ Nombres descriptivos para encontrar guardados  

### Escalabilidad
✅ Fácil agregar nuevos tipos de partida (ej: campañas cooperativas)  
✅ Sistemas helper para detectar tipo de partida  
✅ Metadata extensible sin afectar código anterior  

---

## Cómo Usar

### Guardar Manual (Usuario presiona botón)
```javascript
handleSaveGame();  // Pide nombre personalizado
```

### Guardar Automático (Sistema)
```javascript
// Cada 5 turnos en handleEndTurn()
saveGameUnified("AUTOSAVE_TURN_X", true);

// Al final de partida en endTacticalBattle()
saveGameUnified("AUTOSAVE_RECENT", true);
```

### Cargar
```javascript
handleLoadGame();  // Muestra lista con tipo de partida
```

### Detectar Tipo de Partida (Otros Sistemas)
```javascript
const gameType = getGameTypeFromSave(gameState);
const info = getGameTypeInfo(gameType);
console.log(`Juego: ${info.label} - ${info.description}`);
```

---

## Notas Técnicas

### UPSERT Behavior
El `upsert()` con `onConflict: 'user_id,save_name'` significa:
- Si `(user_id, save_name)` no existe → INSERT
- Si existe → UPDATE
- Esto evita acumular autosaves, solo guarda el más reciente

### Serialización Segura
`_prepareGameDataForSave()` elimina:
- Referencias a DOM (`element: undefined`)
- Referencias circulares
- Datos no serializables

### Sin Breaking Changes
- Código anterior que carga guardados sigue funcionando
- La metadata es nueva pero opcional (fallback disponible)
- Funciones antiguas se adaptan internamente

---

## Testing Recomendado

1. **Partida vs IA Local**
   - Iniciar → 5 turnos → Verificar `AUTOSAVE_TURN_5` existe
   - Terminar → Verificar `AUTOSAVE_RECENT` existe

2. **Partida Multijugador Local**
   - Iniciar → Fin turno humano → Verificar guardado
   - Cargar → Verificar icono 👥 en lista

3. **Partida en Red**
   - Iniciar red → Fin de partida → Verificar icono 🌐 en lista
   - Cargar → Debe continuar partida de red

4. **Interfaz de Carga**
   - Verificar que muestra tipo, turno, fase
   - Verificar que carga correctamente desde cualquier tipo

---

## Versión
- **Sistema Anterior**: Diferenciado por tipo de partida
- **v2.0 (Actual)**: Unificado, agnóstico al tipo de oponente
- **Fecha**: Enero 2026

