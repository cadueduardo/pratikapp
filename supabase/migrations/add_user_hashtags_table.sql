-- Migration: Criar tabela user_hashtags para armazenar hashtags favoritas do usuário
-- Com contador de uso para sugerir hashtags mais usadas

CREATE TABLE IF NOT EXISTS public.user_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hashtag TEXT NOT NULL,
    use_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id, hashtag)
);

-- Índice para buscar hashtags por usuário
CREATE INDEX IF NOT EXISTS idx_user_hashtags_user_id ON public.user_hashtags(user_id);

-- Índice para ordenar por uso
CREATE INDEX IF NOT EXISTS idx_user_hashtags_use_count ON public.user_hashtags(user_id, use_count DESC);

COMMENT ON TABLE public.user_hashtags IS 'Hashtags favoritas do usuário com contador de uso';
COMMENT ON COLUMN public.user_hashtags.hashtag IS 'Texto da hashtag (ex: #tecnologia)';
COMMENT ON COLUMN public.user_hashtags.use_count IS 'Número de vezes que a hashtag foi usada';




