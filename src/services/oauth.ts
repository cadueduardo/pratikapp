/**
 * Serviço de OAuth para plataformas sociais
 *
 * Gerencia o fluxo de autenticação OAuth 2.0 para YouTube, Instagram e TikTok
 */

import type { PlatformType } from '@/utils/platforms';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string; // Apenas para server-side
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Timestamp em milissegundos
  tokenType?: string;
}

export interface OAuthResult {
  success: boolean;
  tokens?: OAuthToken;
  error?: string;
  errorDescription?: string;
}

/**
 * Configurações OAuth para cada plataforma
 * TODO: Mover para variáveis de ambiente ou Supabase Vault
 */
const OAUTH_CONFIGS: Record<PlatformType, OAuthConfig> = {
  youtube: {
    clientId: import.meta.env.VITE_YOUTUBE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback/youtube`,
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  instagram: {
    clientId: import.meta.env.VITE_INSTAGRAM_APP_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback/instagram`,
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
  },
  tiktok: {
    clientId: import.meta.env.VITE_TIKTOK_CLIENT_KEY || '',
    redirectUri: `${window.location.origin}/oauth/callback/tiktok`,
    scopes: ['video.upload', 'user.info.basic'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token',
  },
  'google-drive': {
    clientId: import.meta.env.VITE_YOUTUBE_CLIENT_ID || '', // Reutiliza credenciais do YouTube
    redirectUri: `${window.location.origin}/oauth/callback/google-drive`,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
};

/**
 * Gera a URL de autorização OAuth para uma plataforma
 */
export const getOAuthUrl = (platform: PlatformType, state?: string): string => {
  const config = OAUTH_CONFIGS[platform];
  if (!config.clientId) {
    throw new Error(`Client ID não configurado para ${platform}`);
  }

  // Verificar se a redirect URI está correta
  const redirectUri = config.redirectUri;
  if (!redirectUri || redirectUri === `${window.location.origin}/undefined`) {
    throw new Error(`Redirect URI inválida para ${platform}: ${redirectUri}`);
  }

  // TikTok usa 'client_key' na URL de autorização, outras plataformas usam 'client_id'
  const clientIdParam = platform === 'tiktok' ? 'client_key' : 'client_id';
  
  // Validar clientId antes de continuar
  if (!config.clientId || config.clientId.trim() === '') {
    const envVar = platform === 'tiktok' ? 'VITE_TIKTOK_CLIENT_KEY' : platform === 'google-drive' ? 'VITE_YOUTUBE_CLIENT_ID' : `VITE_${platform.toUpperCase()}_CLIENT_ID`;
    throw new Error(`Client ID não configurado para ${platform}. Verifique ${envVar} no .env.local`);
  }
  
  // TikTok usa vírgula para separar scopes, outras plataformas usam espaço
  const scopeSeparator = platform === 'tiktok' ? ',' : ' ';
  
  const params = new URLSearchParams({
    [clientIdParam]: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(scopeSeparator),
    ...(state && { state }),
    // YouTube e Google Drive precisam de access_type e prompt para refresh token
    ...((platform === 'youtube' || platform === 'google-drive') && { access_type: 'offline', prompt: 'consent' }),
  });

  const url = `${config.authUrl}?${params.toString()}`;
  
  // Log para debug
  console.log('Parâmetros OAuth TikTok:', {
    platform,
    client_key: config.clientId,
    redirect_uri: redirectUri,
    scopes: config.scopes.join(','),
    has_state: !!state,
    full_url: url,
  });

  return url;
};

/**
 * Inicia o fluxo OAuth redirecionando o usuário para a página de autorização
 */
export const initiateOAuth = (platform: PlatformType, userId: string): void => {
  const config = OAUTH_CONFIGS[platform];
  
  // Validar configuração antes de prosseguir
  if (!config.clientId) {
    throw new Error(`Client ID não configurado para ${platform}`);
  }

  // Log para debug (remover em produção)
  console.log('Iniciando OAuth:', {
    platform,
    clientId: config.clientId.substring(0, 20) + '...',
    redirectUri: config.redirectUri,
    origin: window.location.origin,
  });

  // Gerar state para segurança (prevenir CSRF)
  const state = btoa(JSON.stringify({ platform, userId, timestamp: Date.now() }));
  sessionStorage.setItem(`oauth_state_${platform}`, state);

  const authUrl = getOAuthUrl(platform, state);
  
  // Log da URL gerada para debug
  console.log('URL OAuth gerada:', authUrl);
  
  window.location.href = authUrl;
};

/**
 * Inicia o fluxo OAuth em um popup
 * @param platform - Plataforma OAuth
 * @param userId - ID do usuário
 * @param returnUrl - URL para redirecionar após autenticação (opcional)
 * @returns Promise que resolve quando o popup é fechado ou quando a autenticação é concluída
 */
export const initiateOAuthPopup = (
  platform: PlatformType,
  userId: string,
  returnUrl?: string,
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const config = OAUTH_CONFIGS[platform];
    
    // Validar configuração antes de prosseguir
    if (!config.clientId) {
      resolve({ success: false, error: `Client ID não configurado para ${platform}` });
      return;
    }

    // Gerar state para segurança (prevenir CSRF) e incluir returnUrl
    const stateData = {
      platform,
      userId,
      timestamp: Date.now(),
      returnUrl: returnUrl || window.location.pathname + window.location.search,
      isPopup: true,
    };
    const state = btoa(JSON.stringify(stateData));
    sessionStorage.setItem(`oauth_state_${platform}`, state);

    const authUrl = getOAuthUrl(platform, state);
    
    // Abrir popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      `oauth_${platform}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup) {
      resolve({ success: false, error: 'Não foi possível abrir o popup. Verifique se os popups estão habilitados.' });
      return;
    }

    // Declarar variáveis para limpeza
    let checkClosed: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Ouvir mensagens do popup via postMessage
    const messageHandler = (event: MessageEvent) => {
      // Verificar origem por segurança
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'oauth_success') {
        if (checkClosed) clearInterval(checkClosed);
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        resolve({ success: true });
      } else if (event.data.type === 'oauth_error') {
        if (checkClosed) clearInterval(checkClosed);
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        resolve({ success: false, error: event.data.error || 'Erro na autenticação' });
      }
    };

    window.addEventListener('message', messageHandler);

    // Verificar se o popup foi fechado
    checkClosed = setInterval(() => {
      if (popup.closed) {
        if (checkClosed) clearInterval(checkClosed);
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        
        // Verificar se a autenticação foi bem-sucedida verificando o sessionStorage
        const successKey = `oauth_success_${platform}`;
        const success = sessionStorage.getItem(successKey);
        sessionStorage.removeItem(successKey);
        
        if (success === 'true') {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'Autenticação cancelada' });
        }
      }
    }, 500);

    // Timeout de segurança (10 minutos)
    timeoutId = setTimeout(() => {
      if (!popup.closed) {
        popup.close();
      }
      if (checkClosed) clearInterval(checkClosed);
      window.removeEventListener('message', messageHandler);
      resolve({ success: false, error: 'Tempo limite excedido' });
    }, 10 * 60 * 1000);
  });
};

/**
 * Valida o state do OAuth (prevenção de CSRF)
 */
export const validateOAuthState = (platform: PlatformType, receivedState: string): boolean => {
  const storedState = sessionStorage.getItem(`oauth_state_${platform}`);
  if (!storedState) {
    return false;
  }

  try {
    const stored = JSON.parse(atob(storedState));
    const received = JSON.parse(atob(receivedState));

    // Validar que o state corresponde e não é muito antigo (5 minutos)
    const isExpired = Date.now() - stored.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      sessionStorage.removeItem(`oauth_state_${platform}`);
      return false;
    }

    return stored.platform === received.platform && stored.userId === received.userId;
  } catch {
    return false;
  }
};

/**
 * Obtém informações do state do OAuth (incluindo returnUrl se disponível)
 */
export const getOAuthStateData = (platform: PlatformType): { returnUrl?: string; isPopup?: boolean } | null => {
  const storedState = sessionStorage.getItem(`oauth_state_${platform}`);
  if (!storedState) {
    return null;
  }

  try {
    const stored = JSON.parse(atob(storedState));
    return {
      returnUrl: stored.returnUrl,
      isPopup: stored.isPopup,
    };
  } catch {
    return null;
  }
};

/**
 * Troca o código de autorização por tokens de acesso
 * Esta função deve ser chamada do lado do servidor (Edge Function) por segurança
 */
export const exchangeCodeForTokens = async (
  platform: PlatformType,
  code: string,
): Promise<OAuthResult> => {
  const config = OAUTH_CONFIGS[platform];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: 'Configuração do Supabase não encontrada',
    };
  }

  try {
    // Obter token de autenticação do usuário atual
    const { supabaseClient } = await import('./supabaseClient');
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Usuário não autenticado',
      };
    }

    // Chamar Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/oauth-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        platform,
        code,
        redirectUri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Erro ao trocar código por tokens',
      };
    }

    const data = await response.json();
    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
        tokenType: data.token_type || 'Bearer',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
};

/**
 * Atualiza um token de acesso usando refresh token
 */
export const refreshAccessToken = async (
  platform: PlatformType,
  refreshToken: string,
): Promise<OAuthResult> => {
  try {
    // TODO: Implementar via Edge Function
    const response = await fetch('/api/oauth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Erro ao atualizar token',
      };
    }

    const data = await response.json();
    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
        tokenType: data.token_type || 'Bearer',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
};

/**
 * Verifica se um token está expirado
 */
export const isTokenExpired = (token: OAuthToken): boolean => {
  if (!token.expiresAt) {
    return false; // Token sem expiração
  }
  return Date.now() >= token.expiresAt;
};

