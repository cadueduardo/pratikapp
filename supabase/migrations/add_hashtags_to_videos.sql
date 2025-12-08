-- Migration: Adicionar campo platform_hashtags na tabela videos
-- Armazena hashtags por plataforma em formato JSONB
-- Exemplo: {"tiktok": ["#tag1", "#tag2"], "youtube": ["#tag3"]}

ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS platform_hashtags JSONB DEFAULT NULL;

COMMENT ON COLUMN public.videos.platform_hashtags IS 'Hashtags por plataforma em formato JSONB (ex: {"tiktok": ["#tag1"], "youtube": ["#tag2"]})';




