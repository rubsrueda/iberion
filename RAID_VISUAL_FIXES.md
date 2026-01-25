# Correcciones Visuales del Sistema de Raids

**Fecha**: 25 de Enero de 2026

---

## Problemas Corregidos

### 1. ✅ Slot del Jugador No Asignado (mySlotIdx: -1)

**Problema**: El jugador entraba al raid pero su slot no se asignaba correctamente, quedando `mySlotIdx: -1`.

**Causa**: Al guardar el slot en la DB, no se actualizaba el objeto local `currentRaid` con los datos recién guardados.

**Solución**:
```javascript
// Antes
const { error } = await supabaseClient.from('alliance_raids')
    .update({ stage_data: stageData })
    .eq('id', this.currentRaid.id);

// Después
const { error, data: updatedRaid } = await supabaseClient.from('alliance_raids')
    .update({ stage_data: stageData })
    .eq('id', this.currentRaid.id)
    .select()
    .single();

// CRÍTICO: Actualizar currentRaid con los datos recién guardados
this.currentRaid = updatedRaid;
```

**Archivo**: [raidManager.js](raidManager.js#L134-L147)

---

### 2. ✅ Caravana en Posición Incorrecta (Tierra en vez de Agua)

**Problema**: La caravana aparecía en `(6, 0)` que es la fortaleza de salida (tierra), cuando debería estar en `(6, 1)` que es agua.

**Solución**:
- Cambiado `caravan_pos: { r: 6, c: 0 }` → `caravan_pos: { r: 6, c: 1 }`
- Actualizado el fallback en `boardManager.js`: `c: stageData.caravan_pos?.c || 1`

**Archivos**:
- [raidManager.js](raidManager.js#L44) (inicialización del raid)
- [boardManager.js](boardManager.js#L1747) (lectura de posición)

---

### 3. ✅ Error "Hexágono Inválido" al Crear Ciudades

**Problema**: La función `addCityToBoardData` fallaba con "hexágono inválido" porque se llamaba antes de que `board[r][c]` estuviera inicializado.

**Causa**: El orden de las operaciones estaba invertido:
1. Se llamaba a `addCityToBoardData(r, c, ...)` 
2. Luego se inicializaba `board[r][c] = {...}`

**Solución**: Invertir el orden
1. Primero inicializar `board[r][c] = {...}`
2. Luego llamar a funciones que dependen de esa celda

**Archivo**: [boardManager.js](boardManager.js#L1668-L1699)

---

### 4. ✅ Fortalezas Renderizadas Como Ciudades

**Problema**: Las fortalezas de los jugadores aparecían con sprites de ciudad Y fortaleza simultáneamente, causando un aspecto visual extraño.

**Causa**: Se marcaba `isCity: true` para las fortalezas, lo que hacía que `renderSingleHexVisuals` les aplicara la clase CSS `.city`.

**Solución**:
- Cambiar `isCity: false` para todas las fortalezas en modo Raid
- Las fortalezas son solo puntos de spawn, NO ciudades funcionales
- Solo agregar a `gameState.cities` la fortaleza del jugador actual (owner=1) para que funcione el botón "Crear División"

**Archivo**: [boardManager.js](boardManager.js#L1641-L1643)

---

### 5. ✅ Banca Accesible en Modo Raid

**Problema**: Al hacer clic en las fortalezas, se abría el modal de La Banca, lo cual no tiene sentido en el contexto de un Raid.

**Solución**: Agregar validación `!gameState.isRaid` antes de abrir el modal de la banca.

```javascript
// Antes
if (hexDataClicked && hexDataClicked.owner === BankManager.PLAYER_ID) {
    openBankModal();
}

// Después  
if (hexDataClicked && hexDataClicked.owner === BankManager.PLAYER_ID && !gameState.isRaid) {
    openBankModal();
}
```

**Archivo**: [main.js](main.js#L34-L37)

---

## Resumen de Cambios por Archivo

### raidManager.js
- ✅ Actualizar `currentRaid` después de guardar slot en DB
- ✅ Cambiar posición inicial de caravana de `(6,0)` a `(6,1)`

### boardManager.js
- ✅ Inicializar `board[r][c]` ANTES de llamar a funciones que dependen de él
- ✅ Marcar fortalezas con `isCity: false` en lugar de `true`
- ✅ Solo agregar a `gameState.cities` la fortaleza del jugador actual
- ✅ Cambiar fallback de posición de caravana de `c: 0` a `c: 1`
- ✅ Eliminar llamadas innecesarias a `addCityToBoardData`

### main.js
- ✅ Deshabilitar banca en modo Raid (`!gameState.isRaid`)

---

## Verificación Visual Esperada

Después de estos cambios, al entrar al Raid deberías ver:

1. ✅ **8 Fortalezas** bien distribuidas (4 arriba, 4 abajo)
   - Solo con sprite de fortaleza (⛰️ o imagen de fortaleza)
   - Sin sprite de ciudad superpuesto

2. ✅ **Tu Fortaleza** (la que corresponde a tu slot)
   - Marcada como `owner: 1`
   - Aparece en `gameState.cities` para permitir crear divisiones
   - La cámara se centra en ella automáticamente

3. ✅ **Caravana/Galeón**
   - Posicionada en `(6, 1)` que es agua
   - NO en `(6, 0)` que es la fortaleza de salida
   - Con barra de vida al 100%

4. ✅ **Al hacer clic en fortalezas**
   - NO se abre la banca
   - Comportamiento normal de selección de hex

---

## Log de Consola Esperado

```
[Raid] Slot asignado: 0
[Raid] Slot guardado exitosamente en la base de datos
[Raid] Slot actualizado en currentRaid: ["user_id_1", null, null, null, null, null, null, null]
[Raid Map] Mi UID: user_id_1
[Raid Map] Slots disponibles: ["user_id_1", null, null, null, null, null, null, null]
[Raid Map] Mi slot index: 0
[Raid Map] Creando MI fortaleza en {r: 1, c: 2, portIndex: 0, mySlotIdx: 0}
[Raid Map] Fortaleza disponible en {r: 1, c: 6, portIndex: 1}
...
[placeBossUnit] Colocando unidad boss: Galeón del Tesoro en posición {r: 6, c: 1}
[Raid Map] Boss colocado exitosamente. Total de unidades: 1
```

**Nota**: Ya NO debería aparecer `mySlotIdx: -1` ni errores de "hexágono inválido".

---

## Próximas Pruebas Recomendadas

1. **Test de Múltiples Jugadores**:
   - Entrar con 2-3 cuentas diferentes al mismo raid
   - Verificar que cada uno ocupa un slot diferente
   - Confirmar que cada uno ve su propia fortaleza como `owner: 1`

2. **Test de Reconexión**:
   - Entrar al raid
   - Cerrar el navegador
   - Volver a entrar
   - Debería reconocer que ya tienes un slot y reconectar

3. **Test de Aforo Completo**:
   - Intentar entrar cuando los 8 slots están ocupados
   - Debería mostrar mensaje "El mapa está lleno (8/8)"

4. **Test de Combate**:
   - Atacar a la caravana
   - Verificar que el daño se registra
   - Confirmar que la barra de HP se actualiza

---

**Estado**: ✅ Todos los problemas visuales corregidos
