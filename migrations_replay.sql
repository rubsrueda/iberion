-- Migración: Crear tabla game_replays para Supabase
-- Ejecutar esta migración en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS game_replays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE,
  
  -- Metadata de la partida
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timeline comprimido (puede ser JSON o texto comprimido)
  timeline_compressed TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Índices para búsqueda rápida
  UNIQUE(user_id, match_id)
);

-- Crear índices
CREATE INDEX idx_game_replays_user_id ON game_replays(user_id);
CREATE INDEX idx_game_replays_match_id ON game_replays(match_id);
CREATE INDEX idx_game_replays_share_token ON game_replays(share_token);
CREATE INDEX idx_game_replays_created_at ON game_replays(created_at DESC);

-- Activar RLS (Row Level Security)
ALTER TABLE game_replays ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios replays
CREATE POLICY "Users can view own replays"
  ON game_replays FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios pueden insertar replays
CREATE POLICY "Users can insert own replays"
  ON game_replays FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar sus replays
CREATE POLICY "Users can update own replays"
  ON game_replays FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden borrar sus replays
CREATE POLICY "Users can delete own replays"
  ON game_replays FOR DELETE
  USING (auth.uid() = user_id);

-- Tabla para controlar acceso a replays compartidos (opcional)
CREATE TABLE IF NOT EXISTS replay_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  replay_id UUID NOT NULL REFERENCES game_replays(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_replay_shares_token ON replay_shares(share_token);
