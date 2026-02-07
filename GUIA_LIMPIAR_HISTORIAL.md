# 🗑️ Guía: Borrar Historial de Batallas (Borrón y Cuenta Nueva)

**Fecha:** 7 de Febrero de 2026  
**Razón:** Implementación del sistema de guardado funcional - limpiar batallas antiguas que no se guardaron correctamente

---

## 📋 Resumen

Este documento describe cómo eliminar **completamente** el historial de batallas guardadas hasta ahora, para empezar de cero con el nuevo sistema de guardado funcional.

### ¿Qué se va a eliminar?
- ✅ Todos los replays de batalla en **Supabase** (tabla `game_replays`)
- ✅ Todos los replays en **localStorage** del navegador
- ✅ Tokens de compartición (tabla `replay_shares`)

### ¿Qué NO se elimina?
- ❌ Partidas guardadas (tabla `game_saves`)
- ❌ Datos de progresión del jugador
- ❌ Datos de campaña
- ❌ Configuraciones del juego

---

## 🚀 Método 1: Limpieza desde el Navegador (Recomendado)

Este método limpia tanto localStorage como Supabase en un solo paso.

### Paso 1: Abrir la consola del navegador
1. Abre el juego en tu navegador
2. Presiona **F12** (o clic derecho → Inspeccionar → Consola)

### Paso 2: Cargar el script
```javascript
// Copiar y pegar el contenido completo del archivo:
// clear-battle-history.js
```

O bien, si el archivo ya está incluido en el HTML:
```javascript
// Simplemente ejecutar:
verifyBattleHistoryStatus()  // Para ver qué hay
clearAllBattleHistory()      // Para eliminar todo
```

### Paso 3: Ejecutar la limpieza
```javascript
// 1. Primero verificar (opcional)
await verifyBattleHistoryStatus();

// 2. Ejecutar limpieza
await clearAllBattleHistory();
```

### Resultado esperado:
```
🗑️ LIMPIEZA DE HISTORIAL DE BATALLAS
1️⃣ Limpiando localStorage...
   📊 Replays locales encontrados: 15
   ✅ localStorage limpiado correctamente

2️⃣ Limpiando Supabase...
   👤 Usuario autenticado: usuario@ejemplo.com
   📊 Replays en Supabase: 23
   ✅ Supabase limpiado correctamente

📊 RESUMEN DE LIMPIEZA
✅ localStorage:  LIMPIADO
✅ Supabase:      LIMPIADO

🎉 ¡LIMPIEZA COMPLETA! Borrón y cuenta nueva exitoso
```

---

## 🗄️ Método 2: Limpieza desde Supabase SQL Editor

Si prefieres ejecutar SQL directamente en Supabase:

### Paso 1: Abrir Supabase Dashboard
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto Iberion
3. Ir a **SQL Editor**

### Paso 2: Ejecutar consultas de verificación
```sql
-- Ver estadísticas actuales
SELECT 
    'game_replays' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT user_id) as usuarios_afectados,
    MIN(created_at) as replay_mas_antiguo,
    MAX(created_at) as replay_mas_reciente
FROM game_replays;
```

### Paso 3: Eliminar (IRREVERSIBLE)
```sql
-- Eliminar todos los replays
DELETE FROM game_replays;

-- Verificar
SELECT COUNT(*) FROM game_replays;
```

### Paso 4: Limpiar localStorage manualmente
En la consola del navegador:
```javascript
localStorage.removeItem('localReplays');
console.log('✅ localStorage limpiado');
```

---

## 🔍 Verificación Post-Limpieza

Después de la limpieza, verificar que todo esté correcto:

### En el navegador:
```javascript
// Debe devolver un array vacío
JSON.parse(localStorage.getItem('localReplays') || '[]')
// []
```

### En Supabase:
```sql
-- Debe devolver 0
SELECT COUNT(*) FROM game_replays WHERE user_id = auth.uid();
```

### En el juego:
1. Abrir el juego
2. Ir a "Códice de Batallas" o historial
3. Debe mostrar: "No hay partidas guardadas"

---

## ⚠️ Advertencias Importantes

### Esta operación es IRREVERSIBLE
- No hay forma de recuperar los replays eliminados
- Asegúrate de que realmente quieres hacer esto

### Backup (opcional)
Si quieres hacer un backup antes de eliminar:

```sql
-- Crear tabla de backup temporal
CREATE TABLE game_replays_backup AS
SELECT * FROM game_replays;

-- Luego eliminar
DELETE FROM game_replays;

-- Si necesitas restaurar:
-- INSERT INTO game_replays SELECT * FROM game_replays_backup;
```

---

## 🎯 Casos de Uso

### Caso 1: Desarrollo/Testing
Estás probando el sistema de guardado y quieres empezar limpio.
- ✅ Usar Método 1 (navegador)

### Caso 2: Usuario tiene datos corruptos
El historial muestra errores o datos inconsistentes.
- ✅ Usar Método 1 (navegador)

### Caso 3: Administrador/DBA
Necesitas limpiar la base de datos de todos los usuarios.
- ✅ Usar Método 2 (SQL), pero omite el `WHERE user_id = auth.uid()`

### Caso 4: Solo limpiar localStorage
Solo quieres eliminar los replays locales, no los de la nube.
- ✅ Ejecutar solo: `localStorage.removeItem('localReplays')`

---

## 📊 Impacto del Sistema

### Antes de la limpieza:
- ❌ Replays guardados con datos incompletos o corruptos
- ❌ Inconsistencias entre localStorage y Supabase
- ❌ Errores al cargar el historial

### Después de la limpieza:
- ✅ Historial vacío listo para nuevas batallas
- ✅ Sistema de guardado funcionando correctamente
- ✅ Verificación de guardado implementada (commit 2026-02-07)

---

## 🛠️ Troubleshooting

### Error: "supabaseClient is not defined"
**Solución:** Asegúrate de ejecutar el script después de que el juego haya cargado completamente.

### Error: "No autenticado"
**Solución:** Inicia sesión en el juego antes de ejecutar la limpieza de Supabase.

### Error: "Permission denied"
**Solución:** Verifica que las políticas RLS de Supabase permitan DELETE en `game_replays`.

### localStorage no se limpia
**Solución:** 
```javascript
// Forzar limpieza
localStorage.clear(); // ⚠️ Esto borra TODO el localStorage
// O específicamente:
localStorage.removeItem('localReplays');
```

---

## 📝 Checklist de Limpieza

Antes de ejecutar:
- [ ] Hacer backup si es necesario
- [ ] Verificar que el nuevo sistema de guardado funciona
- [ ] Avisar a otros desarrolladores/testers si corresponde

Durante la ejecución:
- [ ] Ejecutar script de verificación (`verifyBattleHistoryStatus()`)
- [ ] Anotar cuántos replays se eliminarán
- [ ] Ejecutar limpieza (`clearAllBattleHistory()`)

Después de ejecutar:
- [ ] Verificar que replays = 0 en localStorage
- [ ] Verificar que replays = 0 en Supabase
- [ ] Jugar una partida de prueba y verificar que se guarda correctamente
- [ ] Verificar que el historial ahora funciona sin errores

---

## 📞 Soporte

Si algo sale mal durante la limpieza:

1. **Revisa los logs de la consola** - Te dirá exactamente qué falló
2. **Verifica permisos en Supabase** - RLS debe permitir DELETE
3. **Intenta método alternativo** - Si falla navegador, usa SQL y viceversa
4. **Contacta al equipo de desarrollo** - Si nada funciona

---

## 🔗 Archivos Relacionados

- `clear-battle-history.js` - Script de limpieza desde navegador
- `DELETE_ALL_BATTLE_HISTORY.sql` - Script SQL para Supabase
- `replayStorage.js` - Sistema de almacenamiento de replays
- `gameHistoryManager.js` - Gestor del historial de partidas

---

**Última actualización:** 7 de febrero de 2026  
**Versión del documento:** 1.0  
**Autor:** Sistema Iberion - Limpieza de Historial
