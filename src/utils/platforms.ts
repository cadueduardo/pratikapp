/**
 * Plataformas sociais suportadas pelo sistema
 */

export type PlatformType = 'youtube' | 'instagram' | 'tiktok' | 'google-drive';

export interface PlatformInfo {
  type: PlatformType;
  name: string;
  displayName: string;
  icon?: string;
  description: string;
  oauthUrl?: string; // URL para iniciar OAuth (será implementado)
}

export const SUPPORTED_PLATFORMS: Record<PlatformType, PlatformInfo> = {
  youtube: {
    type: 'youtube',
    name: 'youtube',
    displayName: 'YouTube',
    description: 'Publique vídeos no YouTube automaticamente',
  },
  instagram: {
    type: 'instagram',
    name: 'instagram',
    displayName: 'Instagram',
    description: 'Publique vídeos e reels no Instagram',
  },
  tiktok: {
    type: 'tiktok',
    name: 'tiktok',
    displayName: 'TikTok',
    description: 'Publique vídeos no TikTok',
  },
  'google-drive': {
    type: 'google-drive',
    name: 'google-drive',
    displayName: 'Google Drive',
    description: 'Acesse seus vídeos do Google Drive',
  },
};

export const PLATFORM_LIST: PlatformInfo[] = Object.values(SUPPORTED_PLATFORMS);

export const getPlatformInfo = (platformName: string): PlatformInfo | null => {
  const normalized = platformName.toLowerCase().trim();
  return SUPPORTED_PLATFORMS[normalized as PlatformType] || null;
};

export const isSupportedPlatform = (platformName: string): boolean => {
  return getPlatformInfo(platformName) !== null;
};





