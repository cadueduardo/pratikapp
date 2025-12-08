import { useEffect, useState } from 'react';

import { platformsRepository, postsRepository, videosRepository } from '@/services/database';
import type { Platform, Post, Video } from '@/services/database/types';

interface VideoDetails {
  video: Video | null;
  posts: Post[];
  platforms: Platform[];
  loading: boolean;
  error: string | null;
}

export const useVideoDetails = (videoId: string | undefined) => {
  const [data, setData] = useState<VideoDetails>({
    video: null,
    posts: [],
    platforms: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!videoId) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchData = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        const [video, posts] = await Promise.all([
          videosRepository.getById(videoId),
          postsRepository.listByVideo(videoId),
        ]);

        if (!video) {
          setData({
            video: null,
            posts: [],
            platforms: [],
            loading: false,
            error: 'Vídeo não encontrado.',
          });
          return;
        }

        // Buscar plataformas dos posts e das plataformas selecionadas
        const platformIds = new Set<string>();
        posts.forEach((p) => platformIds.add(p.platformId));
        if (video.selectedPlatformIds) {
          video.selectedPlatformIds.forEach((id) => platformIds.add(id));
        }
        const platforms = await Promise.all(
          Array.from(platformIds).map((id) => platformsRepository.getById(id)),
        );

        setData({
          video,
          posts,
          platforms: platforms.filter((p): p is Platform => p !== null),
          loading: false,
          error: null,
        });
      } catch (error) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro ao carregar detalhes do vídeo.',
        }));
      }
    };

    void fetchData();
  }, [videoId]);

  return data;
};








