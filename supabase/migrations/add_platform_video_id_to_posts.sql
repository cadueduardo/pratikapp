-- Adicionar coluna platform_video_id na tabela posts
-- Esta coluna armazena o ID do vídeo na plataforma (ex: TikTok publish_id, YouTube video_id)

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS platform_video_id TEXT;

-- Adicionar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_posts_platform_video_id ON public.posts(platform_video_id);

-- Comentário explicativo
COMMENT ON COLUMN public.posts.platform_video_id IS 'ID do vídeo na plataforma de destino (ex: TikTok publish_id, YouTube video_id)';


