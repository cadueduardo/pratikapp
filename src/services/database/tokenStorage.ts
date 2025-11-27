/**
 * Utilitários para armazenamento seguro de tokens OAuth
 *
 * Por enquanto, tokens são armazenados como JSON no campo api_token.
 * Em produção, migrar para Supabase Vault.
 */

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  storedAt: number;
}

/**
 * Parse do token armazenado (pode ser string simples ou JSON)
 */
export const parseStoredToken = (apiToken: string | null): StoredToken | null => {
  if (!apiToken) {
    return null;
  }

  try {
    // Tentar parsear como JSON primeiro
    const parsed = JSON.parse(apiToken);
    if (parsed.accessToken) {
      return parsed as StoredToken;
    }
    // Se não for JSON válido, tratar como token simples (legado)
    return {
      accessToken: apiToken,
      storedAt: Date.now(),
    };
  } catch {
    // Se falhar, tratar como token simples (legado)
    return {
      accessToken: apiToken,
      storedAt: Date.now(),
    };
  }
};

/**
 * Verifica se um token está expirado
 */
export const isTokenExpired = (token: StoredToken): boolean => {
  if (!token.expiresAt) {
    return false; // Token sem expiração
  }
  return Date.now() >= token.expiresAt;
};

/**
 * Obtém o access token de uma plataforma
 */
export const getAccessToken = (apiToken: string | null): string | null => {
  const token = parseStoredToken(apiToken);
  return token?.accessToken || null;
};








