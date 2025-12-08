/**
 * Limites de hashtags por plataforma
 */
export const HASHTAG_LIMITS: Record<string, number> = {
  tiktok: 5,
  // Outras plataformas não têm limite definido (null = sem limite)
};

/**
 * Obtém o limite de hashtags para uma plataforma
 * @param platformName Nome da plataforma (case-insensitive)
 * @returns Limite de hashtags ou null se não houver limite
 */
export function getHashtagLimit(platformName: string): number | null {
  const normalized = platformName.toLowerCase();
  return HASHTAG_LIMITS[normalized] ?? null;
}

/**
 * Verifica se uma plataforma tem limite de hashtags
 * @param platformName Nome da plataforma (case-insensitive)
 * @returns true se a plataforma tem limite, false caso contrário
 */
export function hasHashtagLimit(platformName: string): boolean {
  return getHashtagLimit(platformName) !== null;
}

/**
 * Valida se o número de hashtags está dentro do limite
 * @param platformName Nome da plataforma (case-insensitive)
 * @param hashtagCount Número de hashtags
 * @returns true se está dentro do limite, false caso contrário
 */
export function isValidHashtagCount(platformName: string, hashtagCount: number): boolean {
  const limit = getHashtagLimit(platformName);
  if (limit === null) {
    return true; // Sem limite
  }
  return hashtagCount <= limit;
}




