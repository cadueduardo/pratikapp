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
      console.error('[Google Drive] Configuração do Supabase não encontrada');
      return null;
    }

    // Obter sessão atual
    const { supabaseClient } = await import('./supabaseClient');
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      console.error('[Google Drive] Sessão expirada');
      return null;
    }

    // TODO: Criar Edge Function para renovar token do Google Drive
    // Por enquanto, retornar null para forçar reconexão
    console.warn('[Google Drive] Token expirado. Reconecte sua conta do Google Drive.');
    return null;
  } catch (error) {
    console.error('[Google Drive] Erro ao renovar token:', error);
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
    if (isTokenExpired(storedToken) && storedToken.refreshToken) {
      // Tentar renovar o token
      const refreshed = await refreshGoogleDriveToken(userId, storedToken.refreshToken);
      if (refreshed) {
        // Atualizar o token no banco de dados (via Edge Function)
        // Por enquanto, apenas retornar o novo token
        // TODO: Salvar o novo token no banco
        return refreshed.accessToken;
      }
      // Se falhar ao renovar, lançar erro para que o usuário reconecte
      throw new Error('Token do Google Drive expirado. Por favor, reconecte sua conta nas Configurações.');
    }
    
    return storedToken.accessToken;
  } catch (error) {
    console.error('[Google Drive] Erro ao obter token:', error);
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
 * Obtém URL do thumbnail de um vídeo em baixa qualidade
 * @param thumbnailLink - URL do thumbnail do Google Drive
 * @param size - Tamanho do thumbnail ('low', 'medium', 'high')
 * @returns URL do thumbnail com parâmetros de tamanho
 */
export const getThumbnailUrl = (
  thumbnailLink: string | undefined,
  size: 'low' | 'medium' | 'high' = 'low',
): string | null => {
  if (!thumbnailLink) {
    return null;
  }

  const sizes = {
    low: 'w200-h200-p-k-nu',
    medium: 'w400-h400-p-k-nu',
    high: 'w800-h800-p-k-nu',
  };

  // Se já tem parâmetros, adiciona; senão, adiciona = no final
  return thumbnailLink.includes('=') 
    ? `${thumbnailLink}-${sizes[size]}`
    : `${thumbnailLink}=${sizes[size]}`;
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
 * Lista vídeos em uma pasta específica do Google Drive (alias para compatibilidade)
 * @deprecated Use listVideosInFolder ao invés
 */
export const listVideosFromDrive = async (folderId?: string): Promise<GoogleDriveFile[]> => {
  console.warn('[Google Drive] listVideosFromDrive está deprecated, use listVideosInFolder');
  // Por enquanto mantém compatibilidade, mas não funciona sem userId
  return [];
};







