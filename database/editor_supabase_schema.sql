-- ===================================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE PARA EDITOR DE ESCENARIOS Y CAMPAÑAS
-- ===================================================================
-- Proyecto: IBERION - Sistema de Edición UGC
-- Fecha: 8 de Febrero, 2026
--
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard → SQL Editor
-- 2. Copia y pega este script completo
-- 3. Ejecuta el script (Run)
-- 4. Verifica que las tablas se crearon correctamente en Table Editor
--
-- ===================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Para búsquedas de texto con similitud

-- ===================================================================
-- TABLA: scenarios
-- Almacena escenarios individuales creados por usuarios
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    scenario_data JSONB NOT NULL,  -- El JSON completo del escenario
    is_public BOOLEAN DEFAULT false,
    downloads INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT name_not_empty CHECK (length(name) > 0),
    CONSTRAINT downloads_positive CHECK (downloads >= 0),
    CONSTRAINT rating_valid CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT rating_count_positive CHECK (rating_count >= 0)
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_scenarios_author ON public.scenarios(author_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_public ON public.scenarios(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_scenarios_downloads ON public.scenarios(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_rating ON public.scenarios(rating DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_created ON public.scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_name ON public.scenarios USING gin(name gin_trgm_ops);

-- Índice JSONB para búsquedas en metadata del escenario
CREATE INDEX IF NOT EXISTS idx_scenarios_data ON public.scenarios USING gin(scenario_data);

-- ===================================================================
-- TABLA: campaigns
-- Almacena campañas (secuencias de escenarios)
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    campaign_data JSONB NOT NULL,  -- Array de escenarios
    is_public BOOLEAN DEFAULT false,
    downloads INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT title_not_empty CHECK (length(title) > 0),
    CONSTRAINT campaign_downloads_positive CHECK (downloads >= 0),
    CONSTRAINT campaign_rating_valid CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT campaign_rating_count_positive CHECK (rating_count >= 0)
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_campaigns_author ON public.campaigns(author_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_public ON public.campaigns(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON public.campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_title ON public.campaigns USING gin(title gin_trgm_ops);

-- Índice JSONB para metadata de campaña
CREATE INDEX IF NOT EXISTS idx_campaigns_data ON public.campaigns USING gin(campaign_data);

-- ===================================================================
-- TABLA: scenario_ratings
-- Almacena valoraciones individuales de escenarios
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.scenario_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un usuario solo puede valorar un escenario una vez
    UNIQUE(scenario_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_scenario_ratings_scenario ON public.scenario_ratings(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_ratings_user ON public.scenario_ratings(user_id);

-- ===================================================================
-- TABLA: campaign_ratings
-- Almacena valoraciones individuales de campañas
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.campaign_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un usuario solo puede valorar una campaña una vez
    UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_ratings_campaign ON public.campaign_ratings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ratings_user ON public.campaign_ratings(user_id);

-- ===================================================================
-- FUNCIONES RPC
-- Para operaciones complejas que necesitan lógica en servidor
-- ===================================================================

-- Función para incrementar descargas de un escenario
CREATE OR REPLACE FUNCTION increment_scenario_downloads(scenario_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.scenarios
    SET downloads = downloads + 1
    WHERE id = scenario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar descargas de una campaña
CREATE OR REPLACE FUNCTION increment_campaign_downloads(campaign_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.campaigns
    SET downloads = downloads + 1
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular y actualizar rating promedio de un escenario
CREATE OR REPLACE FUNCTION update_scenario_rating(scenario_id UUID)
RETURNS void AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_ratings INT;
BEGIN
    SELECT AVG(rating), COUNT(*) 
    INTO avg_rating, total_ratings
    FROM public.scenario_ratings
    WHERE scenario_ratings.scenario_id = update_scenario_rating.scenario_id;
    
    UPDATE public.scenarios
    SET rating = COALESCE(avg_rating, 0),
        rating_count = COALESCE(total_ratings, 0)
    WHERE id = update_scenario_rating.scenario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular y actualizar rating promedio de una campaña
CREATE OR REPLACE FUNCTION update_campaign_rating(campaign_id UUID)
RETURNS void AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_ratings INT;
BEGIN
    SELECT AVG(rating), COUNT(*) 
    INTO avg_rating, total_ratings
    FROM public.campaign_ratings
    WHERE campaign_ratings.campaign_id = update_campaign_rating.campaign_id;
    
    UPDATE public.campaigns
    SET rating = COALESCE(avg_rating, 0),
        rating_count = COALESCE(total_ratings, 0)
    WHERE id = update_campaign_rating.campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- TRIGGERS
-- Para mantener integridad y actualizar campos automáticamente
-- ===================================================================

-- Trigger para actualizar updated_at en scenarios
CREATE OR REPLACE FUNCTION update_scenarios_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenarios_update_timestamp
    BEFORE UPDATE ON public.scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_scenarios_timestamp();

-- Trigger para actualizar updated_at en campaigns
CREATE OR REPLACE FUNCTION update_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_update_timestamp
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_timestamp();

-- Trigger para actualizar rating cuando se añade/modifica valoración de escenario
CREATE OR REPLACE FUNCTION trigger_update_scenario_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_scenario_rating(NEW.scenario_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenario_rating_changed
    AFTER INSERT OR UPDATE ON public.scenario_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_scenario_rating();

-- Trigger para actualizar rating cuando se añade/modifica valoración de campaña
CREATE OR REPLACE FUNCTION trigger_update_campaign_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_campaign_rating(NEW.campaign_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_rating_changed
    AFTER INSERT OR UPDATE ON public.campaign_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_campaign_rating();

-- ===================================================================
-- ROW LEVEL SECURITY (RLS)
-- Configurar permisos de acceso a las tablas
-- ===================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas para scenarios
-- Cualquiera puede ver escenarios públicos
CREATE POLICY "Escenarios públicos son visibles para todos"
    ON public.scenarios FOR SELECT
    USING (is_public = true);

-- Los usuarios pueden ver sus propios escenarios (públicos o privados)
CREATE POLICY "Usuarios pueden ver sus propios escenarios"
    ON public.scenarios FOR SELECT
    USING (auth.uid() = author_id);

-- Los usuarios pueden insertar sus propios escenarios
CREATE POLICY "Usuarios pueden crear escenarios"
    ON public.scenarios FOR INSERT
    WITH CHECK (auth.uid() = author_id);

-- Los usuarios pueden actualizar sus propios escenarios
CREATE POLICY "Usuarios pueden editar sus propios escenarios"
    ON public.scenarios FOR UPDATE
    USING (auth.uid() = author_id);

-- Los usuarios pueden eliminar sus propios escenarios
CREATE POLICY "Usuarios pueden eliminar sus propios escenarios"
    ON public.scenarios FOR DELETE
    USING (auth.uid() = author_id);

-- Políticas para campaigns (similares a scenarios)
CREATE POLICY "Campañas públicas son visibles para todos"
    ON public.campaigns FOR SELECT
    USING (is_public = true);

CREATE POLICY "Usuarios pueden ver sus propias campañas"
    ON public.campaigns FOR SELECT
    USING (auth.uid() = author_id);

CREATE POLICY "Usuarios pueden crear campañas"
    ON public.campaigns FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Usuarios pueden editar sus propias campañas"
    ON public.campaigns FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Usuarios pueden eliminar sus propias campañas"
    ON public.campaigns FOR DELETE
    USING (auth.uid() = author_id);

-- Políticas para ratings
CREATE POLICY "Usuarios pueden crear valoraciones"
    ON public.scenario_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden ver todas las valoraciones"
    ON public.scenario_ratings FOR SELECT
    USING (true);

CREATE POLICY "Usuarios pueden editar sus propias valoraciones"
    ON public.scenario_ratings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear valoraciones de campañas"
    ON public.campaign_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden ver todas las valoraciones de campañas"
    ON public.campaign_ratings FOR SELECT
    USING (true);

CREATE POLICY "Usuarios pueden editar sus propias valoraciones de campañas"
    ON public.campaign_ratings FOR UPDATE
    USING (auth.uid() = user_id);

-- ===================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ===================================================================

COMMENT ON TABLE public.scenarios IS 'Escenarios personalizados creados por usuarios';
COMMENT ON TABLE public.campaigns IS 'Campañas (secuencias de escenarios) creadas por usuarios';
COMMENT ON TABLE public.scenario_ratings IS 'Valoraciones de escenarios por usuarios';
COMMENT ON TABLE public.campaign_ratings IS 'Valoraciones de campañas por usuarios';

COMMENT ON COLUMN public.scenarios.scenario_data IS 'JSON completo del escenario (board, units, settings, etc.)';
COMMENT ON COLUMN public.campaigns.campaign_data IS 'JSON con array de escenarios y metadata de campaña';
COMMENT ON COLUMN public.scenarios.is_public IS 'Si el escenario está disponible públicamente para otros jugadores';

-- ===================================================================
-- FIN DEL SCRIPT
-- ===================================================================

-- Verificar que todo se creó correctamente
SELECT 'Tablas creadas correctamente:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scenarios', 'campaigns', 'scenario_ratings', 'campaign_ratings');

SELECT 'Funciones RPC creadas correctamente:' as status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'increment_scenario_downloads', 
    'increment_campaign_downloads',
    'update_scenario_rating',
    'update_campaign_rating'
);

-- Script completado
SELECT '✅ SCRIPT DE CONFIGURACIÓN COMPLETADO' as status;
