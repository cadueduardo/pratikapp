/**
 * Tipos de mídia suportados por cada plataforma
 */

export type MediaType =
  // Instagram
  | 'instagram-feed-post' // Post no Feed (imagem/vídeo/carousel)
  | 'instagram-reels' // Reels (vídeo curto vertical)
  | 'instagram-stories' // Stories (imagem/vídeo temporária)
  | 'instagram-igtv' // IGTV (vídeo longo)
  | 'instagram-live' // Live (transmissão ao vivo)
  // YouTube
  | 'youtube-video' // Vídeo tradicional (longo)
  | 'youtube-shorts' // Shorts (vídeo curto vertical)
  | 'youtube-live' // Live Stream (transmissão ao vivo)
  | 'youtube-community-post' // Community Post (post com texto/imagem)
  // TikTok
  | 'tiktok-video' // Vídeo (curto vertical)
  | 'tiktok-livestream' // Livestream (transmissão ao vivo)
  | 'tiktok-photo' // Photo (imagem única);

export type PlatformType = 'instagram' | 'youtube' | 'tiktok';

export interface MediaTypeInfo {
  value: MediaType;
  label: string;
  description: string;
  platform: PlatformType;
  supportsImage: boolean;
  supportsVideo: boolean;
  maxDuration?: number; // em segundos
  minDuration?: number; // em segundos
  aspectRatio?: string; // ex: '9:16', '16:9', '1:1'
}

/**
 * Mapeamento de tipos de mídia por plataforma
 */
export const MEDIA_TYPES_BY_PLATFORM: Record<PlatformType, MediaType[]> = {
  instagram: [
    'instagram-feed-post',
    'instagram-reels',
    'instagram-stories',
    'instagram-igtv',
    'instagram-live',
  ],
  youtube: ['youtube-video', 'youtube-shorts', 'youtube-live', 'youtube-community-post'],
  tiktok: ['tiktok-video', 'tiktok-livestream', 'tiktok-photo'],
};

/**
 * Informações detalhadas sobre cada tipo de mídia
 */
export const MEDIA_TYPE_INFO: Record<MediaType, MediaTypeInfo> = {
  // Instagram
  'instagram-feed-post': {
    value: 'instagram-feed-post',
    label: 'Feed Post',
    description: 'Post no Feed (imagem, vídeo ou carousel)',
    platform: 'instagram',
    supportsImage: true,
    supportsVideo: true,
    aspectRatio: '1:1, 4:5, 16:9',
  },
  'instagram-reels': {
    value: 'instagram-reels',
    label: 'Reels',
    description: 'Vídeo curto vertical (até 90 segundos)',
    platform: 'instagram',
    supportsImage: false,
    supportsVideo: true,
    maxDuration: 90,
    minDuration: 3,
    aspectRatio: '9:16',
  },
  'instagram-stories': {
    value: 'instagram-stories',
    label: 'Stories',
    description: 'Imagem ou vídeo temporário (24 horas)',
    platform: 'instagram',
    supportsImage: true,
    supportsVideo: true,
    maxDuration: 15,
    aspectRatio: '9:16',
  },
  'instagram-igtv': {
    value: 'instagram-igtv',
    label: 'IGTV',
    description: 'Vídeo longo vertical (até 60 minutos)',
    platform: 'instagram',
    supportsImage: false,
    supportsVideo: true,
    maxDuration: 3600,
    minDuration: 60,
    aspectRatio: '9:16',
  },
  'instagram-live': {
    value: 'instagram-live',
    label: 'Live',
    description: 'Transmissão ao vivo',
    platform: 'instagram',
    supportsImage: false,
    supportsVideo: true,
    aspectRatio: '9:16, 16:9',
  },
  // YouTube
  'youtube-video': {
    value: 'youtube-video',
    label: 'Vídeo',
    description: 'Vídeo tradicional (longo)',
    platform: 'youtube',
    supportsImage: false,
    supportsVideo: true,
    maxDuration: 43200, // 12 horas
    aspectRatio: '16:9',
  },
  'youtube-shorts': {
    value: 'youtube-shorts',
    label: 'Shorts',
    description: 'Vídeo curto vertical (até 60 segundos)',
    platform: 'youtube',
    supportsImage: false,
    supportsVideo: true,
    maxDuration: 60,
    minDuration: 1,
    aspectRatio: '9:16',
  },
  'youtube-live': {
    value: 'youtube-live',
    label: 'Live Stream',
    description: 'Transmissão ao vivo',
    platform: 'youtube',
    supportsImage: false,
    supportsVideo: true,
    aspectRatio: '16:9',
  },
  'youtube-community-post': {
    value: 'youtube-community-post',
    label: 'Community Post',
    description: 'Post na comunidade (texto, imagem ou vídeo)',
    platform: 'youtube',
    supportsImage: true,
    supportsVideo: true,
  },
  // TikTok
  'tiktok-video': {
    value: 'tiktok-video',
    label: 'Vídeo',
    description: 'Vídeo curto vertical (até 10 minutos)',
    platform: 'tiktok',
    supportsImage: false,
    supportsVideo: true,
    maxDuration: 600,
    minDuration: 3,
    aspectRatio: '9:16',
  },
  'tiktok-livestream': {
    value: 'tiktok-livestream',
    label: 'Livestream',
    description: 'Transmissão ao vivo',
    platform: 'tiktok',
    supportsImage: false,
    supportsVideo: true,
    aspectRatio: '9:16',
  },
  'tiktok-photo': {
    value: 'tiktok-photo',
    label: 'Photo',
    description: 'Imagem única',
    platform: 'tiktok',
    supportsImage: true,
    supportsVideo: false,
    aspectRatio: '9:16',
  },
};

/**
 * Obtém tipos de mídia disponíveis para uma plataforma específica
 */
export const getMediaTypesByPlatform = (platform: PlatformType): MediaType[] => {
  return MEDIA_TYPES_BY_PLATFORM[platform] || [];
};

/**
 * Obtém informações sobre um tipo de mídia
 */
export const getMediaTypeInfo = (mediaType: MediaType): MediaTypeInfo => {
  return MEDIA_TYPE_INFO[mediaType];
};

/**
 * Obtém tipos de mídia disponíveis para múltiplas plataformas
 * Retorna apenas tipos de mídia que são suportados por pelo menos uma das plataformas
 */
export const getMediaTypesByPlatforms = (platforms: PlatformType[]): MediaType[] => {
  const allMediaTypes = new Set<MediaType>();
  
  platforms.forEach((platform) => {
    const mediaTypes = getMediaTypesByPlatform(platform);
    mediaTypes.forEach((mediaType) => allMediaTypes.add(mediaType));
  });

  return Array.from(allMediaTypes);
};

/**
 * Valida se um tipo de mídia é suportado por uma plataforma
 */
export const isMediaTypeSupportedByPlatform = (
  mediaType: MediaType,
  platform: PlatformType,
): boolean => {
  return MEDIA_TYPES_BY_PLATFORM[platform]?.includes(mediaType) ?? false;
};

/**
 * Valida se um tipo de mídia é suportado por pelo menos uma das plataformas selecionadas
 */
export const isMediaTypeSupportedByPlatforms = (
  mediaType: MediaType,
  platforms: PlatformType[],
): boolean => {
  return platforms.some((platform) => isMediaTypeSupportedByPlatform(mediaType, platform));
};

/**
 * Obtém o nome amigável da plataforma
 */
export const getPlatformDisplayName = (platform: PlatformType): string => {
  const names: Record<PlatformType, string> = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
  };
  return names[platform];
};

/**
 * Agrupa tipos de mídia por plataforma
 */
export const groupMediaTypesByPlatform = (
  mediaTypes: MediaType[],
): Record<PlatformType, MediaType[]> => {
  const grouped: Record<PlatformType, MediaType[]> = {
    instagram: [],
    youtube: [],
    tiktok: [],
  };

  mediaTypes.forEach((mediaType) => {
    const info = getMediaTypeInfo(mediaType);
    grouped[info.platform].push(mediaType);
  });

  return grouped;
};

/**
 * Obtém o aspect ratio primário de um tipo de mídia
 * Se houver múltiplos aspect ratios, retorna o primeiro
 */
export const getPrimaryAspectRatio = (mediaType: MediaType): string | undefined => {
  const info = MEDIA_TYPE_INFO[mediaType];
  if (info?.aspectRatio) {
    // Se houver múltiplos, pega o primeiro
    return info.aspectRatio.split(',')[0].trim();
  }
  return undefined;
};

/**
 * Converte uma string de aspect ratio (ex: "16:9") para um número (ex: 16/9)
 * Se houver múltiplos aspect ratios, usa o primeiro
 */
export const aspectRatioToNumber = (aspectRatioString: string | undefined): number | undefined => {
  if (!aspectRatioString) return undefined;
  const parts = aspectRatioString.split(':');
  if (parts.length === 2) {
    const width = parseFloat(parts[0]);
    const height = parseFloat(parts[1]);
    if (!isNaN(width) && !isNaN(height) && height !== 0) {
      return width / height;
    }
  }
  return undefined;
};

/**
 * Obtém o aspect ratio a partir de uma lista de tipos de mídia
 * Retorna o primeiro aspect ratio válido encontrado
 */
export const getAspectRatioFromMediaTypes = (
  mediaTypes: (MediaType | null | undefined)[],
): string | undefined => {
  for (const mediaType of mediaTypes) {
    if (mediaType) {
      const aspectRatio = getPrimaryAspectRatio(mediaType);
      if (aspectRatio) {
        return aspectRatio;
      }
    }
  }
  return undefined;
};

