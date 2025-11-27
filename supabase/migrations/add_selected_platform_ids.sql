-- Migration: Adicionar campo selected_platform_ids na tabela videos
-- Este campo armazena os IDs das plataformas selecionadas pelo usuário para cada vídeo

ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS selected_platform_ids TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.videos.selected_platform_ids IS 'Array de IDs das plataformas selecionadas para publicação deste vídeo';



