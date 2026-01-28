# Comandos de Debug - Consola del Navegador

Este documento contiene comandos útiles para pruebas y debugging del juego. Todos los comandos se ejecutan desde la consola del navegador (F12).

---

## 💰 Comandos de Monedas (PlayerDataManager)

### Agregar Oro
```javascript
// Agregar 1000 de oro (por defecto)
PlayerDataManager.debugAddGold();

// Agregar cantidad específica
PlayerDataManager.debugAddGold(5000);
PlayerDataManager.debugAddGold(100000);

// Quitar oro (cantidad negativa)
PlayerDataManager.debugAddGold(-500);
```

### Agregar Gemas
```javascript
// Agregar 100 gemas (por defecto)
PlayerDataManager.debugAddGems();

// Agregar cantidad específica
PlayerDataManager.debugAddGems(500);
PlayerDataManager.debugAddGems(10000);
```

### Agregar Todas las Monedas
```javascript
// Agregar cantidades estándar de todas las monedas
PlayerDataManager.debugAddAllCurrencies();
// Agrega: 10,000 oro, 500 gemas, 50 edictos, 1,000 influencia, 20 sellos

// Con multiplicador
PlayerDataManager.debugAddAllCurrencies(2);
// Agrega el doble: 20,000 oro, 1,000 gemas, etc.

PlayerDataManager.debugAddAllCurrencies(10);
// Agrega 10x: 100,000 oro, 5,000 gemas, etc.
```

### Ver Monedas Actuales
```javascript
// Mostrar tabla con todas las monedas del jugador
PlayerDataManager.debugShowCurrencies();
```

---

## ⚔️ Comandos de Raid (RaidManager)

### Verificar Estado del Raid
```javascript
// Ver estado completo del raid actual
RaidManager.debugShowRaidState();

// Verificar consistencia de datos (incluye HP)
RaidManager.debugCheckConsistency();
```

### Gestión de Fases
```javascript
// Forzar transición a la siguiente fase
RaidManager.debugForceNextStage();

// Reparar HP de la caravana si está corrupto
RaidManager.debugRepairCaravanHP();
```

### Resetear Raid
```javascript
// Resetear raid actual (usa tu alliance_id)
RaidManager.debugResetRaid('tu-alliance-id');
```

---

## 🎮 Comandos Generales

### Ver Estado del Juego
```javascript
// Ver gameState completo
console.log(gameState);

// Ver jugador actual
console.log(PlayerDataManager.currentPlayer);

// Ver unidades en el tablero
console.log(units);

// Ver tablero
console.log(board);
```

### Información del Perfil
```javascript
// Ver héroe específico
const hero = PlayerDataManager.currentPlayer.heroes.find(h => h.id === "g_fabius");
console.log(hero);

// Ver inventario
console.log(PlayerDataManager.currentPlayer.inventory);

// Ver nivel y XP
console.log("Nivel:", PlayerDataManager.currentPlayer.level);
console.log("XP:", PlayerDataManager.currentPlayer.xp);
```

---

## 🔧 Ejemplos de Uso Común

### Prepararse para Pruebas de Raid
```javascript
// 1. Agregar oro para entrar al raid
PlayerDataManager.debugAddGold(10000);

// 2. Verificar que tengas suficiente
PlayerDataManager.debugShowCurrencies();

// 3. Entrar al raid desde el HQ de tu alianza
// (hacer clic en el botón "ATACAR")

// 4. Verificar consistencia del raid
RaidManager.debugCheckConsistency();
```

### Probar Transiciones de Fase
```javascript
// 1. Entrar al raid
// 2. Verificar fase actual
RaidManager.debugShowRaidState();

// 3. Forzar transición a la siguiente fase
RaidManager.debugForceNextStage();

// 4. Sal y vuelve a entrar desde el HQ

// 5. Verificar que el HP sea correcto
RaidManager.debugCheckConsistency();
```

### Prueba Completa del Sistema de Monedas
```javascript
// 1. Ver estado inicial
PlayerDataManager.debugShowCurrencies();

// 2. Agregar mucho de todo
PlayerDataManager.debugAddAllCurrencies(5);

// 3. Verificar cambios
PlayerDataManager.debugShowCurrencies();

// 4. Probar compra en la tienda (debería funcionar sin problemas)
```

---

## 📊 Salidas de Ejemplo

### debugShowCurrencies()
```
=== MONEDAS DEL JUGADOR ===
Jugador: MiUsuario
ID: abc-123-def-456

Monedas actuales:
┌─────────────────┬────────┐
│     (index)     │ Values │
├─────────────────┼────────┤
│      gold       │ 15000  │
│      gems       │  600   │
│     edicts      │   50   │
│   influence     │  1000  │
│ sellos_guerra   │   20   │
└─────────────────┴────────┘
```

### debugAddAllCurrencies(2)
```
=== AGREGAR TODAS LAS MONEDAS (DEBUG) ===
Jugador: MiUsuario
┌─────────────────┬────────┬──────────┬──────────┐
│     (index)     │ antes  │ agregado │ después  │
├─────────────────┼────────┼──────────┼──────────┤
│      Oro        │  5000  │  20000   │  25000   │
│     Gemas       │  100   │   1000   │   1100   │
│    Edictos      │   10   │   100    │   110    │
│  Influencia     │    0   │   2000   │   2000   │
│ Sellos de Guerra│   10   │    40    │    50    │
└─────────────────┴────────┴──────────┴──────────┘
✅ Todas las monedas actualizadas y guardadas
```

---

## ⚠️ Notas Importantes

1. **Autenticación Requerida**: Debes estar logueado para que funcionen los comandos de PlayerDataManager
2. **Sincronización con BD**: Los cambios se guardan automáticamente en Supabase
3. **Actualización de UI**: La interfaz se actualiza automáticamente después de cambiar monedas
4. **Solo para Desarrollo**: Estos comandos son para pruebas, no para producción
5. **Persistencia**: Los cambios son permanentes (se guardan en la base de datos)

---

## 🐛 Resolución de Problemas

### "No hay jugador activo"
**Solución**: Inicia sesión con Google o email/contraseña primero

### Los cambios no se reflejan en la UI
**Solución**: Recarga la página o actualiza manualmente con:
```javascript
UIManager.updateResourceDisplays();
```

### Error al guardar en Supabase
**Solución**: Verifica tu conexión a internet y que estés autenticado:
```javascript
console.log(PlayerDataManager.currentPlayer?.auth_id);
// Si es null o undefined, no estás autenticado
```

---

## 📝 Agregar Nuevos Comandos de Debug

Para agregar tus propios comandos de debug, sigue este patrón:

```javascript
debugNombreFuncion: async function(parametro = valorDefecto) {
    if (!this.currentPlayer) {
        console.error("%c[Debug] No hay jugador activo", 'background: #ff0000; color: #fff; font-weight: bold;');
        return;
    }

    console.log("%c=== TU COMANDO DEBUG ===", 'background: #color; color: #fff; font-weight: bold; padding: 10px;');
    
    // Tu lógica aquí
    
    await this.saveCurrentPlayer(); // Si modificas datos del jugador
    console.log("%c✅ Operación completada", 'background: #00ff00; color: #000; font-weight: bold;');
}
```

---

**Última actualización**: 2026-01-28
