-- Migration: Adicionar campo ai_context na tabela users
-- Este campo armazena o contexto completo do perfil para geração de conteúdo pela IA

-- Adicionar coluna ai_context (texto longo para contexto completo do perfil)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS ai_context TEXT DEFAULT NULL;

-- Adicionar coluna ai_auto_generate (boolean para habilitar/desabilitar geração automática)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS ai_auto_generate BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.users.ai_context IS 'Contexto completo do perfil para geração de conteúdo pela IA (descrição, nicho, público-alvo, estilo, hashtags fixas, etc.)';
COMMENT ON COLUMN public.users.ai_auto_generate IS 'Habilita geração automática de título/descrição ao selecionar vídeo';
