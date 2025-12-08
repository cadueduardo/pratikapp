-- Migration: Criar tabela ai_generation_history para aprendizado contínuo
-- Armazena histórico de gerações e escolhas do usuário

CREATE TABLE IF NOT EXISTS public.ai_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    gemini_result JSONB DEFAULT NULL,
    openai_result JSONB DEFAULT NULL,
    chosen_provider TEXT CHECK (chosen_provider IN ('gemini', 'openai')) DEFAULT NULL,
    chosen_result JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- Índice para buscar histórico por usuário ordenado por data
CREATE INDEX IF NOT EXISTS idx_ai_generation_history_user_id ON public.ai_generation_history(user_id, created_at DESC);

COMMENT ON TABLE public.ai_generation_history IS 'Histórico de gerações de conteúdo por IA para aprendizado contínuo';
COMMENT ON COLUMN public.ai_generation_history.prompt IS 'Prompt usado pelo usuário para gerar conteúdo';
COMMENT ON COLUMN public.ai_generation_history.gemini_result IS 'Resultado da geração do Gemini (JSONB com title, description, hashtags)';
COMMENT ON COLUMN public.ai_generation_history.openai_result IS 'Resultado da geração do OpenAI (JSONB com title, description, hashtags)';
COMMENT ON COLUMN public.ai_generation_history.chosen_provider IS 'Qual IA foi escolhida pelo usuário (gemini ou openai)';
COMMENT ON COLUMN public.ai_generation_history.chosen_result IS 'Resultado final escolhido pelo usuário (pode ser editado)';




