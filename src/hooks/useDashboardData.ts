import { useEffect, useState } from 'react';

import { postsRepository, videosRepository } from '@/services/database';
import type { Post, Video } from '@/services/database/types';
import { supabaseClient } from '@/services/supabaseClient';

interface DashboardStats {
  totalVideos: number;
  scheduledVideos: number;
  pendingPosts: number;
  postedCount: number;
  statusDistribution: Record<string, number>;
  nextScheduled: Video[];
}

interface DashboardData {
  videos: Video[];
  posts: Post[];
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
}

export const useDashboardData = (userId: string | undefined) => {
  const [data, setData] = useState<DashboardData>({
    videos: [],
    posts: [],
    stats: {
      totalVideos: 0,
      scheduledVideos: 0,
      pendingPosts: 0,
      postedCount: 0,
      statusDistribution: {},
      nextScheduled: [],
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchData = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        const videos = await videosRepository.listByUser(userId);
        const pendingPosts = await postsRepository.listPending();

        // Buscar posts publicados do usuário
        const videoIds = videos.map((v) => v.id);
        
        let postedCount = 0;
        if (videoIds.length > 0) {
          const { data: postedPosts } = await supabaseClient
            .from('posts')
            .select('id')
            .in('video_id', videoIds)
            .eq('status', 'posted');
          postedCount = postedPosts?.length || 0;
        }

        // Distribuição de status
        const statusDistribution: Record<string, number> = {};
        videos.forEach((v) => {
          statusDistribution[v.status] = (statusDistribution[v.status] || 0) + 1;
        });

        // Próximos agendamentos (próximos 3)
        const now = new Date();
        const nextScheduled = videos
          .filter((v) => v.scheduledDate && new Date(v.scheduledDate) > now)
          .sort((a, b) => {
            const dateA = new Date(a.scheduledDate!).getTime();
            const dateB = new Date(b.scheduledDate!).getTime();
            return dateA - dateB;
          })
          .slice(0, 3);

        const stats: DashboardStats = {
          totalVideos: videos.length,
          scheduledVideos: videos.filter((v) => v.status === 'scheduled' || v.status === 'pending')
            .length,
          pendingPosts: pendingPosts.length,
          postedCount,
          statusDistribution,
          nextScheduled,
        };

        setData({
          videos: videos.slice(0, 5),
          posts: pendingPosts.slice(0, 5),
          stats,
          loading: false,
          error: null,
        });
      } catch (error) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro ao carregar dados do dashboard.',
        }));
      }
    };

    void fetchData();
  }, [userId]);

  return data;
};

