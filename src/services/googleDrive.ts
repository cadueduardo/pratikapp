/**
 * Serviço de integração com Google Drive
 *
 * Este módulo fornece funções para autenticar e interagir com o Google Drive API.
 */

import { platformsRepository } from '@/services/database';
import { getAccessToken, isTokenExpired, parseStoredToken } from '@/services/database/tokenStorage';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

interface GoogleDriveAuthResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

interface GoogleDriveApiResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

/**
 * Renova o token do Google Drive usando refresh token via Edge Function
 */
const refreshGoogleDriveToken = async (
  userId: string,
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: number } | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      if (import.meta.env.DEV) {
        console.warn('[Google Drive] Configuração do Supabase não encontrada');
      }
      return null;
    }

    // Obter sessão atual
    const { supabaseClient } = await import('./supabaseClient');
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      if (import.meta.env.DEV) {
        console.warn('[Google Drive] Sessão expirada');
      }
      return null;
    }

    // Buscar plataforma do Google Drive para obter o platformId
    const platforms = await platformsRepository.listByUser(userId);
    const googleDrivePlatform = platforms.find((p) => p.name === 'google-drive');
    
    if (!googleDrivePlatform) {
      if (import.meta.env.DEV) {
        console.warn('[Google Drive] Plataforma Google Drive não encontrada');
      }
      return null;
    }

    // Chamar Edge Function para renovar token
    const response = await fetch(`${supabaseUrl}/functions/v1/refresh-oauth-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        platform: 'google-drive',
        refreshToken,
        platformId: googleDrivePlatform.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (import.meta.env.DEV) {
        console.warn('[Google Drive] Erro ao renovar token:', error);
      }
      return null;
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_at || (data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 3600000),
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Google Drive] Erro ao renovar token:', error);
    }
    return null;
  }
};

/**
 * Obtém o token de acesso do Google Drive para o usuário
 * Renova automaticamente se expirado
 * @param userId - ID do usuário
 * @returns Promise com o token de acesso ou null se não autenticado
 */
export const getGoogleDriveToken = async (userId: string): Promise<string | null> => {
  try {
    const platforms = await platformsRepository.listByUser(userId);
    const googleDrivePlatform = platforms.find((p) => p.name === 'google-drive');
    
    if (!googleDrivePlatform || !googleDrivePlatform.apiToken) {
      return null;
    }
    
    const storedToken = parseStoredToken(googleDrivePlatform.apiToken);
    if (!storedToken) {
      return null;
    }

    // Verificar se o token expirou
    if (isTokenExpired(storedToken)) {
      // Tentar renovar o token se houver refresh token
      if (storedToken.refreshToken) {
        const refreshed = await refreshGoogleDriveToken(userId, storedToken.refreshToken);
        if (refreshed) {
          // A Edge Function já atualiza o token no banco de dados
          // Retornar o novo token
          return refreshed.accessToken;
        }
      }
      // Se não houver refresh token ou falhar ao renovar, retornar null silenciosamente
      // O erro será tratado na interface quando o usuário tentar usar o Google Drive
      return null;
    }
    
    return storedToken.accessToken;
  } catch (error) {
    // Log apenas em modo de desenvolvimento
    if (import.meta.env.DEV) {
      console.warn('[Google Drive] Erro ao obter token:', error);
    }
    return null;
  }
};

/**
 * Verifica se o usuário está autenticado no Google Drive
 * @param userId - ID do usuário
 * @returns true se autenticado, false caso contrário
 */
export const isAuthenticated = async (userId: string): Promise<boolean> => {
  const token = await getGoogleDriveToken(userId);
  return token !== null;
};

/**
 * Lista pastas do Google Drive
 * @param userId - ID do usuário
 * @param parentFolderId - ID da pasta pai (opcional, lista pasta raiz se não informado)
 * @returns Promise com lista de pastas
 */
export const listFolders = async (
  userId: string,
  parentFolderId?: string,
): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken(userId);
  if (!token) {
    throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
  }

  let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  } else {
    // Quando não há parentFolderId, listar apenas itens da raiz (Meu Drive)
    query += ` and 'root' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao listar pastas: ${error}`);
  }

  const data: GoogleDriveApiResponse = await response.json();
  return data.files;
};

/**
 * Lista imagens em uma pasta específica do Google Drive
 * @param userId - ID do usuário
 * @param folderId - ID da pasta no Google Drive (opcional, lista raiz se não informado)
 * @returns Promise com lista de arquivos de imagem
 */
export const listImagesInFolder = async (
  userId: string,
  folderId?: string,
): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken(userId);
  if (!token) {
    throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
  }

  let query = "mimeType contains 'image/' and trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  } else {
    // Quando não há folderId, listar apenas imagens da raiz (Meu Drive)
    query += ` and 'root' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao listar imagens: ${error}`);
  }

  const data: GoogleDriveApiResponse = await response.json();
  return data.files;
};

/**
 * Lista vídeos em uma pasta específica do Google Drive
 * @param userId - ID do usuário
 * @param folderId - ID da pasta no Google Drive (opcional, lista raiz se não informado)
 * @returns Promise com lista de arquivos de vídeo
 */
export const listVideosInFolder = async (
  userId: string,
  folderId?: string,
): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken(userId);
  if (!token) {
    throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
  }

  let query = "mimeType contains 'video/' and trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  } else {
    // Quando não há folderId, listar apenas vídeos da raiz (Meu Drive)
    query += ` and 'root' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao listar vídeos: ${error}`);
  }

  const data: GoogleDriveApiResponse = await response.json();
  return data.files;
};

/**
 * Lista mídia (vídeos e imagens) em uma pasta específica do Google Drive
 * @param userId - ID do usuário
 * @param folderId - ID da pasta no Google Drive (opcional, lista raiz se não informado)
 * @returns Promise com lista de arquivos de mídia (vídeos e imagens)
 */
export const listMediaInFolder = async (
  userId: string,
  folderId?: string,
): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken(userId);
  if (!token) {
    throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
  }

  let query = "(mimeType contains 'video/' or mimeType contains 'image/') and trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  } else {
    // Quando não há folderId, listar apenas mídia da raiz (Meu Drive)
    query += ` and 'root' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao listar mídia: ${error}`);
  }

  const data: GoogleDriveApiResponse = await response.json();
  return data.files;
};

/**
 * Busca vídeos por nome no Google Drive
 * @param userId - ID do usuário
 * @param searchQuery - Termo de busca
 * @returns Promise com lista de vídeos encontrados
 */
export const searchVideos = async (userId: string, searchQuery: string): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken(userId);
  if (!token) {
    throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
  }

  const query = `name contains '${searchQuery}' and mimeType contains 'video/' and trashed=false`;

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao buscar vídeos: ${error}`);
  }

  const data: GoogleDriveApiResponse = await response.json();
  return data.files;
};

/**
 * Busca mídia (vídeos e imagens) por nome no Google Drive
 * @param userId - ID do usuário
 * @param searchQuery - Termo de busca
 * @returns Promise com lista de mídia encontrada
 */
export const searchMedia = async (userId: string, searchQuery: string): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken(userId);
  if (!token) {
    throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
  }

  const query = `name contains '${searchQuery}' and (mimeType contains 'video/' or mimeType contains 'image/') and trashed=false`;

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents)&orderBy=name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao buscar mídia: ${error}`);
  }

  const data: GoogleDriveApiResponse = await response.json();
  return data.files;
};

/**
 * Retorna metadados de um arquivo específico do Google Drive
 * @param userId - ID do usuário
 * @param fileId - ID do arquivo no Google Drive
 * @returns Promise com metadados do arquivo
 */
export const getFileMetadata = async (userId: string, fileId: string): Promise<GoogleDriveFile | null> => {
  const token = await getGoogleDriveToken(userId);
  if (!token) {
    throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.text();
    throw new Error(`Erro ao buscar metadados: ${error}`);
  }

  const file: GoogleDriveFile = await response.json();
  return file;
};

/**
 * Obtém URL do thumbnail de um arquivo do Google Drive
 * @param fileId - ID do arquivo no Google Drive
 * @param thumbnailLink - URL do thumbnail do Google Drive (opcional)
 * @param mimeType - Tipo MIME do arquivo (opcional)
 * @param size - Tamanho do thumbnail ('low', 'medium', 'high')
 * @returns URL do thumbnail
 */
export const getThumbnailUrl = (
  thumbnailLink: string | undefined,
  size: 'low' | 'medium' | 'high' = 'low',
  fileId?: string,
  mimeType?: string,
): string | null => {
  // Priorizar usar fileId com a URL de thumbnail do Google Drive que funciona no frontend
  // Isso evita problemas de CORS com lh3.googleusercontent.com
  if (fileId) {
    const sizeMap = {
      low: 200,
      medium: 400,
      high: 800,
    };
    
    // Usar o endpoint de thumbnail do Google Drive que funciona no frontend
    // Formato: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400-h400
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${sizeMap[size]}-h${sizeMap[size]}`;
  }

  // Se não temos fileId mas temos thumbnailLink, tentar usar (pode falhar por CORS)
  // Mas é melhor ter fileId sempre que possível
  if (thumbnailLink) {
    const sizes = {
      low: 'w200-h200-p-k-nu',
      medium: 'w400-h400-p-k-nu',
      high: 'w800-h800-p-k-nu',
    };

    try {
      let url = thumbnailLink;
      
      // Remover parâmetros de tamanho existentes se houver
      url = url.replace(/[=]-?w\d+-h\d+-p-k-nu/g, '');
      
      // Adicionar novo parâmetro de tamanho
      if (url.includes('=')) {
        url = `${url}-${sizes[size]}`;
      } else {
        url = `${url}=${sizes[size]}`;
      }
      
      return url;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Google Drive] Erro ao processar thumbnail URL:', error);
      }
      return thumbnailLink;
    }
  }

  return null;
};

/**
 * Obtém URL do thumbnail autenticada usando o token de acesso
 * @param userId - ID do usuário
 * @param fileId - ID do arquivo no Google Drive
 * @param size - Tamanho do thumbnail ('low', 'medium', 'high')
 * @returns URL do thumbnail ou null se não disponível
 */
export const getAuthenticatedThumbnailUrl = async (
  userId: string,
  fileId: string,
  size: 'low' | 'medium' | 'high' = 'low',
): Promise<string | null> => {
  try {
    const token = await getGoogleDriveToken(userId);
    if (!token) {
      return null;
    }

    // Usar a API do Google Drive para obter thumbnail com autenticação
    const sizes = {
      low: 200,
      medium: 400,
      high: 800,
    };

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/thumbnail?sz=${sizes[size]}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    // A API retorna um redirect para a imagem, então precisamos seguir o redirect
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Google Drive] Erro ao obter thumbnail autenticada:', error);
    }
    return null;
  }
};

/**
 * Extrai o ID do arquivo de uma URL do Google Drive
 * @param url - URL do Google Drive
 * @returns ID do arquivo ou null se não encontrado
 */
export const extractFileIdFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    // Formato: https://drive.google.com/file/d/FILE_ID/view
    const match = urlObj.pathname.match(/\/d\/([^/]+)/);
    if (match) {
      return match[1];
    }
    
    // Formato: https://drive.google.com/open?id=FILE_ID
    const idParam = urlObj.searchParams.get('id');
    if (idParam) {
      return idParam;
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Obtém URL de download direta de um arquivo do Google Drive
 * @param userId - ID do usuário
 * @param fileId - ID do arquivo no Google Drive
 * @returns Promise com URL de download ou null se não disponível
 */
export const getDownloadUrl = async (userId: string, fileId: string): Promise<string | null> => {
  try {
    const token = await getGoogleDriveToken(userId);
    if (!token) {
      throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
    }

    // Obter metadados do arquivo para verificar se é um Google Workspace file
    const metadata = await getFileMetadata(userId, fileId);
    if (!metadata) {
      return null;
    }

    // Se for um Google Workspace file (Google Docs, Sheets, etc.), usar export
    if (metadata.mimeType?.startsWith('application/vnd.google-apps.')) {
      // Para Google Workspace files, precisamos exportar
      // Mas para vídeos, isso não se aplica
      return null;
    }

    // Para arquivos normais (vídeos, etc.), usar o endpoint de download
    // A URL de download requer o token de acesso na query string ou header
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Google Drive] Erro ao obter URL de download:', error);
    }
    return null;
  }
};

/**
 * Faz download de um arquivo do Google Drive e retorna como ArrayBuffer
 * Útil para Edge Functions que precisam do conteúdo do arquivo
 * @param userId - ID do usuário
 * @param fileId - ID do arquivo no Google Drive
 * @returns Promise com ArrayBuffer do arquivo ou null se falhar
 */
export const downloadFile = async (userId: string, fileId: string): Promise<ArrayBuffer | null> => {
  try {
    const token = await getGoogleDriveToken(userId);
    if (!token) {
      throw new Error('Google Drive não está conectado. Conecte sua conta primeiro.');
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao baixar arquivo: ${error}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Google Drive] Erro ao baixar arquivo:', error);
    }
    return null;
  }
};

/**
 * Lista vídeos em uma pasta específica do Google Drive (alias para compatibilidade)
 * @deprecated Use listVideosInFolder ao invés
 */
export const listVideosFromDrive = async (folderId?: string): Promise<GoogleDriveFile[]> => {
  console.warn('[Google Drive] listVideosFromDrive está deprecated, use listVideosInFolder');
  // Por enquanto mantém compatibilidade, mas não funciona sem userId
  return [];
};







