-- ============================================================================
-- Script para eliminar SOLO las partidas que NO fueron contra humanos en red
-- ============================================================================
-- 
-- Este script elimina:
-- 1. Todas las partidas locales vs IA
-- 2. Todas las partidas locales multijugador (sin red)
-- 3. Todos los autosaves de partidas locales
--
-- MANTIENE intactas:
-- - Todas las partidas en red (multiplayer con otros jugadores reales)
-- - Las sesiones activas en red (active_matches)
--
-- ============================================================================

-- OPCIÓN 1: Ver cuántas partidas se van a eliminar (SEGURA - sin cambios)
SELECT 
    COUNT(*) as total_games_to_delete,
    COUNT(CASE WHEN (game_state->>'gameType') = 'skirmish_ai' THEN 1 END) as skirmish_ai_count,
    COUNT(CASE WHEN (game_state->>'gameType') = 'skirmish_local' THEN 1 END) as skirmish_local_count,
    COUNT(CASE WHEN (game_state->>'gameType') = 'campaign' THEN 1 END) as campaign_count,
    COUNT(CASE WHEN (game_state->>'gameType') = 'raid' THEN 1 END) as raid_count
FROM game_saves
WHERE 
    -- Seleccionar SOLO las partidas NO multijugador en red
    (game_state->>'gameType') IN ('skirmish_ai', 'skirmish_local', 'campaign', 'raid')
    OR (game_state->>'gameType') IS NULL;

-- ============================================================================
-- OPCIÓN 2: ELIMINAR (IRREVERSIBLE - usar solo si estás seguro)
-- ============================================================================
-- Descomenta la siguiente línea solo si quieres REALMENTE eliminarlas

/*
DELETE FROM game_saves
WHERE 
    -- Seleccionar SOLO las partidas NO multijugador en red
    (game_state->>'gameType') IN ('skirmish_ai', 'skirmish_local', 'campaign', 'raid')
    OR (game_state->>'gameType') IS NULL;
*/

-- ============================================================================
-- OPCIÓN 3: Ver detalles de las partidas que se eliminarían
-- ============================================================================

SELECT 
    id,
    user_id,
    save_name,
    created_at,
    (game_state->>'gameType') as game_type,
    CASE 
        WHEN (game_state->>'gameType') = 'skirmish_ai' THEN 'Escaramuza vs IA'
        WHEN (game_state->>'gameType') = 'skirmish_local' THEN 'Escaramuza Local'
        WHEN (game_state->>'gameType') = 'campaign' THEN 'Campaña'
        WHEN (game_state->>'gameType') = 'raid' THEN 'Raid'
        WHEN (game_state->>'gameType') = 'network' THEN '❌ RED - NO ELIMINAR'
        ELSE 'Desconocido'
    END as description
FROM game_saves
WHERE 
    (game_state->>'gameType') IN ('skirmish_ai', 'skirmish_local', 'campaign', 'raid')
    OR (game_state->>'gameType') IS NULL
ORDER BY created_at DESC;

-- ============================================================================
-- OPCIÓN 4: Eliminar partidas antiguas (ej: más de 30 días sin red)
-- ============================================================================
-- Usa esto si quieres ser más conservador y eliminar solo las antiguas

/*
DELETE FROM game_saves
WHERE 
    (game_state->>'gameType') IN ('skirmish_ai', 'skirmish_local', 'campaign', 'raid')
    AND created_at < NOW() - INTERVAL '30 days';
*/

-- ============================================================================
-- NOTAS DE SEGURIDAD
-- ============================================================================
--
-- ANTES DE EJECUTAR:
-- 1. Ejecuta primero la OPCIÓN 1 para ver cuántas partidas se eliminarán
-- 2. Ejecuta la OPCIÓN 3 para revisar qué partidas se irán
-- 3. HACED UN BACKUP si es crítico
-- 4. Solo entonces descomenta y ejecuta la OPCIÓN 2
--
-- Las partidas en red (network) se pueden identificar por:
-- - game_state->>'gameType' = 'network' (si las guardaste así)
-- - Estar en la tabla active_matches con un match_id
-- - Tener guest_id completado
--
-- ============================================================================
