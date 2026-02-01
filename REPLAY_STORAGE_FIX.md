# Fix para Error 22001 en game_replays

## Problema
El campo `timeline_compressed` en la tabla `game_replays` está definido como `VARCHAR(255)`, pero los timelines comprimidos pueden exceder ese límite.

Código de error: `22001` - "value too long for type character varying(255)"

## Solución

### Opción 1: Alterar la tabla en Supabase (RECOMENDADO)

Ejecuta este SQL en la consola de Supabase:

```sql
-- Cambiar timeline_compressed a TEXT (sin límite de longitud)
ALTER TABLE game_replays 
  ALTER COLUMN timeline_compressed SET DATA TYPE TEXT;

-- Si también metadata es VARCHAR(255) y necesita ser más grande:
ALTER TABLE game_replays 
  ALTER COLUMN metadata SET DATA TYPE TEXT;
```

### Opción 2: Compresión en el cliente (YA IMPLEMENTADA)

El código en `replayStorage.js` ahora:
- Comprime el timeline de forma ultra-eficiente
- Limita el tamaño a 240 caracteres máximo
- Usa representación minimalista (arrays en lugar de objetos)
- Trunca metadata a 255 caracteres

## Verificación

Después de aplicar los cambios, deberías ver logs como:
```
[ReplayStorage] Tamaño del timeline comprimido: 234 bytes
[ReplayStorage] Tamaño de metadata: 150 bytes
[ReplayStorage] Replay [id] guardado exitosamente
```

## Nota Técnica

- Si el timeline es muy largo, se limita automáticamente a los primeros N eventos
- La descompresión seguirá siendo exacta con los eventos que sí se guardaron
- Los replays con muchos eventos pueden perder datos de final de partida (mejor que fallar)
