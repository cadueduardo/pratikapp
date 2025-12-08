-- Migration: Adicionar campos de API Keys na tabela users
-- Cada usuário pode configurar suas próprias chaves do Gemini e OpenAI

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT DEFAULT NULL;

COMMENT ON COLUMN public.users.gemini_api_key IS 'API Key do Google Gemini do usuário';
COMMENT ON COLUMN public.users.openai_api_key IS 'API Key do OpenAI do usuário';




