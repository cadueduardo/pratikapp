-- Migration: Criar políticas RLS para o bucket video-thumbnails
-- IMPORTANTE: Aplique esta migration manualmente no Supabase Dashboard
-- Acesse: https://supabase.com/dashboard/project/gamjwsjtefwyxauizoty/sql/new

-- Habilitar RLS no storage.objects (se ainda não estiver habilitado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can upload their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own thumbnails" ON storage.objects;

-- Políticas para o bucket video-thumbnails
-- Permitir upload de thumbnails próprios
CREATE POLICY "Users can upload their own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'video-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir visualização de thumbnails próprios
CREATE POLICY "Users can view their own thumbnails"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'video-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir atualização de thumbnails próprios
CREATE POLICY "Users can update their own thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'video-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'video-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir exclusão de thumbnails próprios
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'video-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

