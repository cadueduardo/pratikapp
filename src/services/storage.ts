import { supabaseClient } from './supabaseClient';

const BUCKET_NAME = 'video-thumbnails';

/**
 * Faz upload de uma thumbnail personalizada para o Supabase Storage
 * @param userId - ID do usuário
 * @param videoId - ID do vídeo (pode ser temporário, será substituído após criação)
 * @param file - Arquivo de imagem (File ou Blob)
 * @returns URL pública da thumbnail ou null se falhar
 */
export const uploadThumbnail = async (
  userId: string,
  videoId: string,
  file: File | Blob,
): Promise<string | null> => {
  try {
    // Determinar extensão do arquivo
    let extension = 'jpg';
    if (file instanceof File) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.png')) extension = 'png';
      else if (fileName.endsWith('.webp')) extension = 'webp';
      else if (fileName.endsWith('.jpeg')) extension = 'jpg';
    }

    // Caminho no storage: {userId}/{videoId}/thumbnail.{ext}
    const filePath = `${userId}/${videoId}/thumbnail.${extension}`;

    // Fazer upload
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Substituir se já existir
      });

    if (error) {
      console.error('[Storage] Erro ao fazer upload da thumbnail:', error);
      return null;
    }

    // Obter URL pública
    const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('[Storage] Erro inesperado ao fazer upload:', error);
    return null;
  }
};

/**
 * Remove uma thumbnail do Supabase Storage
 * @param url - URL pública da thumbnail ou caminho no storage
 * @returns true se removido com sucesso, false caso contrário
 */
export const deleteThumbnail = async (url: string): Promise<boolean> => {
  try {
    // Extrair caminho da URL se for URL pública
    let filePath = url;
    if (url.includes('/storage/v1/object/public/')) {
      // URL pública do Supabase Storage
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length > 1) {
        const pathParts = urlParts[1].split('/');
        if (pathParts.length > 1) {
          // Remover nome do bucket
          filePath = pathParts.slice(1).join('/');
        }
      }
    }

    const { error } = await supabaseClient.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
      console.error('[Storage] Erro ao remover thumbnail:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Storage] Erro inesperado ao remover thumbnail:', error);
    return false;
  }
};

/**
 * Obtém URL pública de uma thumbnail
 * @param path - Caminho no storage (formato: {userId}/{videoId}/thumbnail.{ext})
 * @returns URL pública da thumbnail
 */
export const getThumbnailUrl = (path: string): string => {
  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Valida se um arquivo é uma imagem válida
 * @param file - Arquivo a validar
 * @returns Objeto com valid (boolean) e error (string | null)
 */
export const validateThumbnailFile = (file: File): { valid: boolean; error: string | null } => {
  // Validar tipo MIME
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato de arquivo inválido. Use JPG, PNG ou WebP.',
    };
  }

  // Validar tamanho (5MB máximo)
  const maxSize = 5 * 1024 * 1024; // 5MB em bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Tamanho máximo: 5MB.',
    };
  }

  return { valid: true, error: null };
};

