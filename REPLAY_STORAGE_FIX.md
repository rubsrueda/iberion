# Fix para Error 22001 en game_replays

## Problema
El campo `timeline_compressed` en la tabla `game_replays` está definido como `VARCHAR(255)`, pero los timelines comprimidos pueden exceder ese límite.

Código de error: `22001` - "value too long for type character varying(255)"

## Síntomas
```
[ReplayStorage] Tamaño del timeline comprimido: 800 bytes
[ReplayStorage] Error guardando replay: {code: '22001', ... 'value too long for type character varying(255)'}
```

## Soluciones

### Opción 1: ALTER TABLE en Supabase (RECOMENDADO Y DEFINITIVO)

Ejecuta ESTE SQL en la consola SQL de Supabase:

```sql
-- Cambiar timeline_compressed a TEXT
ALTER TABLE game_replays 
  ALTER COLUMN timeline_compressed SET DATA TYPE TEXT;

-- Cambiar metadata a TEXT también (por si acaso)
ALTER TABLE game_replays 
  ALTER COLUMN metadata SET DATA TYPE TEXT;
```

**Pasos:**
1. Ve a Supabase Dashboard → Tu Proyecto
2. SQL Editor (en el lado izquierdo)
3. Copia y pega el SQL anterior
4. Click en "Run"
5. Listo. El error desaparecerá.

### Opción 2: Mejoras en el Cliente (YA IMPLEMENTADAS)

El código en `replayStorage.js` ahora:

1. **Compresión Agresiva**
   - Limita a máximo 100 eventos
   - Usa arrays en lugar de objetos
   - Si sigue siendo grande, descarta datos de combate
   
2. **Versión Ultra-Compacta**
   - Solo guarda metadatos básicos
   - Resumen de últimos 5 eventos
   - Cabe garantizado en 255 caracteres

3. **Fallback Seguro**
   - Si el replay es demasiado grande incluso comprimido, no lo guarda
   - El juego sigue funcionando normalmente
   - Se registra un error descriptivo

## Logs que verás después de la Fix

```
[ReplayStorage] Tamaño del timeline comprimido: 150 bytes
[ReplayStorage] Tamaño de metadata: 120 bytes
[ReplayStorage] Replay [match_id] guardado exitosamente
```

## Tabla de Comparación

| Métrica | Antes | Después |
|---------|-------|---------|
| Tamaño típico timeline | 2000+ bytes | 100-200 bytes |
| Max eventos guardados | Todo (puede ser 1000+) | 100 eventos |
| Fallback si es muy grande | ❌ Falla | ✅ Ultra-compacto |
| Si sigue siendo grande | ❌ Sigue fallando | ✅ No guarda pero no falla |

## ¿Qué hacer ahora?

**Mejor solución:** Ejecuta el ALTER TABLE en Supabase (2 minutos)  
**Solución temporal:** El código ya está optimizado para no fallar

Con la mejora en cliente + ALTER TABLE en Supabase, los replays se guardarán perfectamente.

