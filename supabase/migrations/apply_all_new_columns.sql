-- Migration Combinada: Adicionar todas as novas colunas na tabela videos
-- Execute este script no Supabase Dashboard SQL Editor

-- 1. Adicionar coluna selected_platform_ids
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS selected_platform_ids TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.videos.selected_platform_ids IS 'Array de IDs das plataformas selecionadas para publicação deste vídeo';

-- 2. Adicionar coluna media_type
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT NULL;

COMMENT ON COLUMN public.videos.media_type IS 'Tipo de mídia principal (ex: instagram-reels, youtube-shorts, tiktok-video)';

-- 3. Adicionar coluna platform_media_types
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS platform_media_types JSONB DEFAULT NULL;

COMMENT ON COLUMN public.videos.platform_media_types IS 'Mapeamento de tipo de mídia por plataforma selecionada (JSONB)';



