-- ============================================================================
-- Script para BORRAR TODAS LAS BATALLAS del historial
-- ============================================================================
-- 
-- Este script elimina COMPLETAMENTE el historial de batallas guardadas:
-- - Todos los replays de la tabla game_replays
-- - Todos los tokens de compartición de replay_shares
--
-- ⚠️ ADVERTENCIA: Esta operación es IRREVERSIBLE
-- Úsalo solo si quieres hacer un "borrón y cuenta nueva"
--
-- NOTA: También debes limpiar localStorage desde el navegador
-- ============================================================================

-- PASO 1: Ver estadísticas antes de eliminar (SEGURO - solo consulta)
SELECT 
    'game_replays' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT user_id) as usuarios_afectados,
    MIN(created_at) as replay_mas_antiguo,
    MAX(created_at) as replay_mas_reciente,
    pg_size_pretty(pg_total_relation_size('game_replays')) as tamaño_tabla
FROM game_replays

UNION ALL

SELECT 
    'replay_shares' as tabla,
    COUNT(*) as total_registros,
    NULL as usuarios_afectados,
    MIN(created_at) as replay_mas_antiguo,
    MAX(created_at) as replay_mas_reciente,
    pg_size_pretty(pg_total_relation_size('replay_shares')) as tamaño_tabla
FROM replay_shares;

-- ============================================================================
-- PASO 2: Ver detalle de replays por usuario (SEGURO - solo consulta)
-- ============================================================================

SELECT 
    user_id,
    COUNT(*) as num_replays,
    MIN(created_at) as primer_replay,
    MAX(created_at) as ultimo_replay
FROM game_replays
GROUP BY user_id
ORDER BY num_replays DESC;

-- ============================================================================
-- PASO 3: Ver algunos ejemplos de match_ids que se eliminarán
-- ============================================================================

SELECT 
    match_id,
    user_id,
    created_at,
    LEFT(metadata::TEXT, 100) as metadata_preview
FROM game_replays
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 🚨 PASO 4: ELIMINAR TODO (IRREVERSIBLE)
-- ============================================================================
-- Descomenta las siguientes líneas solo si quieres REALMENTE eliminar TODO

/*
-- Primero eliminar replay_shares (tabla dependiente)
DELETE FROM replay_shares;

-- Luego eliminar todos los replays
DELETE FROM game_replays;

-- Verificar que se eliminó todo
SELECT 
    (SELECT COUNT(*) FROM game_replays) as replays_restantes,
    (SELECT COUNT(*) FROM replay_shares) as shares_restantes;
*/

-- ============================================================================
-- PASO 5: Si solo quieres eliminar TUS replays (usuario actual)
-- ============================================================================
-- Usa esta versión más segura si estás conectado como usuario específico

/*
-- Ver cuántos replays tienes
SELECT COUNT(*) as mis_replays
FROM game_replays
WHERE user_id = auth.uid();

-- Eliminar solo tus replays
DELETE FROM game_replays
WHERE user_id = auth.uid();
*/

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Después de ejecutar el DELETE, también debes limpiar localStorage
--    desde la consola del navegador ejecutando:
--    localStorage.removeItem('localReplays');
--
-- 2. Si tienes un backup, este es el momento de verificarlo
--
-- 3. El tamaño de la tabla se recuperará con VACUUM FULL (opcional)
--    VACUUM FULL game_replays;
-- ============================================================================
