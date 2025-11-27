-- Migration: Adicionar campos media_type e platform_media_types na tabela videos
-- Este campo armazena o tipo de mídia selecionado pelo usuário e mapeamento por plataforma

-- Adicionar coluna media_type (texto simples para armazenar o tipo principal)
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT NULL;

-- Adicionar coluna platform_media_types (JSONB para mapear tipo de mídia por plataforma)
-- Exemplo: {"youtube": "youtube-shorts", "instagram": "instagram-reels"}
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS platform_media_types JSONB DEFAULT NULL;

COMMENT ON COLUMN public.videos.media_type IS 'Tipo de mídia principal (ex: instagram-reels, youtube-shorts, tiktok-video)';
COMMENT ON COLUMN public.videos.platform_media_types IS 'Mapeamento de tipo de mídia por plataforma selecionada (JSONB)';



