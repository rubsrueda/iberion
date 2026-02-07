# 🗑️ BORRÓN Y CUENTA NUEVA - Historial de Batallas

## TL;DR - Inicio Rápido

**Lo que necesitas saber:**
- ✅ Se crearon herramientas para borrar TODO el historial de batallas
- ✅ Es necesario para empezar con el nuevo sistema de guardado funcional
- ✅ NO afecta partidas guardadas ni progresión del jugador
- ⚠️ La operación es IRREVERSIBLE

---

## 🚀 Opción 1: Interfaz Visual (MÁS FÁCIL)

1. Abre en tu navegador: **`limpiar-historial.html`**
2. Haz clic en "Verificar Estado"
3. Haz clic en "Limpiar Todo"
4. ¡Listo! ✅

---

## 🖥️ Opción 2: Consola del Navegador

1. Abre el juego (F12 para abrir consola)
2. Copia y pega el contenido de **`clear-battle-history.js`**
3. Ejecuta:
   ```javascript
   await clearAllBattleHistory()
   ```
4. ¡Listo! ✅

---

## 🗄️ Opción 3: Solo Supabase (Administradores)

1. Abre Supabase SQL Editor
2. Copia el contenido de **`DELETE_ALL_BATTLE_HISTORY.sql`**
3. Descomenta la sección `DELETE FROM game_replays;`
4. Ejecuta
5. Limpia localStorage manualmente:
   ```javascript
   localStorage.removeItem('localReplays')
   ```

---

## 📁 Archivos Creados

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| `limpiar-historial.html` | Interfaz visual de limpieza | Abrir en navegador |
| `clear-battle-history.js` | Script de limpieza desde consola | Copiar/pegar en consola |
| `DELETE_ALL_BATTLE_HISTORY.sql` | Script SQL para Supabase | Ejecutar en SQL Editor |
| `GUIA_LIMPIAR_HISTORIAL.md` | Guía completa detallada | Documentación |

---

## ✅ Verificación

Después de limpiar, verifica:

```javascript
// En consola del navegador:
JSON.parse(localStorage.getItem('localReplays') || '[]').length
// Debe devolver: 0
```

```sql
-- En Supabase:
SELECT COUNT(*) FROM game_replays WHERE user_id = auth.uid();
-- Debe devolver: 0
```

---

## ❓ ¿Qué se elimina?

- ✅ Todos los replays de batalla (tabla `game_replays`)
- ✅ Replays en localStorage (`localReplays`)
- ✅ Tokens de compartición (tabla `replay_shares`)

## ❓ ¿Qué NO se elimina?

- ❌ Partidas guardadas (`game_saves`)
- ❌ Progresión del jugador
- ❌ Datos de campaña
- ❌ Configuraciones

---

## 🆘 ¿Problemas?

Lee la guía completa: **`GUIA_LIMPIAR_HISTORIAL.md`**

---

**Fecha:** 7 de Febrero de 2026  
**Razón:** Implementación del nuevo sistema de guardado que sí funciona
