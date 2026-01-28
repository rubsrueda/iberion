-- Script para agregar la columna rewards_data a la tabla alliance_raids
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna rewards_data como JSONB (permite almacenar datos estructurados)
ALTER TABLE alliance_raids 
ADD COLUMN IF NOT EXISTS rewards_data JSONB DEFAULT NULL;

-- 2. Crear índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_alliance_raids_rewards_data 
ON alliance_raids USING GIN (rewards_data);

-- 3. Agregar columna completed_at si no existe (para timestamp de finalización)
ALTER TABLE alliance_raids 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Verificar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'alliance_raids'
ORDER BY ordinal_position;

-- ESTRUCTURA ESPERADA de rewards_data:
-- {
--   "uid1": {
--     "gems": 100,
--     "gold": 500,
--     "seals": 10,
--     "xp": 250,
--     "contribution_pct": 0.35,
--     "claimed": false,
--     "claimed_at": null
--   },
--   "uid2": {
--     ...
--   }
-- }
