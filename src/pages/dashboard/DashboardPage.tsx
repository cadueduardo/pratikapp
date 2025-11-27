import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';

import { EmptyState, StatusChip, useNotification } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { PostStatus, VideoStatus } from '@/services/database/types';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { videos, posts, stats, loading, error } = useDashboardData(user?.id);
  const { showError } = useNotification();

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    scheduled: 'Agendado',
    pending: 'Pendente',
    processing: 'Processando',
    posted: 'Publicado',
    failed: 'Falhou',
  };

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" fontWeight={700}>
        Dashboard
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <VideoLibraryIcon color="primary" />
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.totalVideos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de vídeos
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <ScheduleIcon color="info" />
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.scheduledVideos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Agendados
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <PendingIcon color="warning" />
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.pendingPosts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pendentes
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.postedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Publicados
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
                Próximos agendamentos
              </Typography>
              {stats.nextScheduled.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum agendamento futuro.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {stats.nextScheduled.map((video) => (
                    <Box
                      key={video.id}
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => navigate(`/videos/${video.id}`)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {video.title}
                          </Typography>
                          {video.scheduledDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {new Date(video.scheduledDate).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          )}
                        </Box>
                        <StatusChip status={video.status as VideoStatus} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
                Distribuição por status
              </Typography>
              {Object.keys(stats.statusDistribution).length === 0 ? (
                <EmptyState
                  title="Nenhum vídeo cadastrado"
                  description="Comece criando seu primeiro agendamento de vídeo."
                />
              ) : (
                <Stack spacing={1.5}>
                  {Object.entries(stats.statusDistribution).map(([status, count]) => (
                    <Box
                      key={status}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: 'action.hover',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusChip status={status as VideoStatus} />
                        <Typography variant="body2" color="text.secondary">
                          {statusLabels[status] || status}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={600}>
                        {count}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
                Vídeos recentes
              </Typography>
              {videos.length === 0 ? (
                <EmptyState
                  title="Nenhum vídeo recente"
                  description="Os vídeos que você criar aparecerão aqui."
                />
              ) : (
                <Stack spacing={2}>
                  {videos.map((video) => (
                    <Box
                      key={video.id}
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => navigate(`/videos/${video.id}`)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {video.title}
                          </Typography>
                          {video.scheduledDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {new Date(video.scheduledDate).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          )}
                        </Box>
                        <StatusChip status={video.status as VideoStatus} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
                Postagens pendentes
              </Typography>
              {posts.length === 0 ? (
                <EmptyState
                  title="Nenhuma postagem pendente"
                  description="Todas as postagens foram processadas com sucesso."
                />
              ) : (
                <Stack spacing={2}>
                  {posts.map((post) => (
                    <Box key={post.id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">Postagem #{post.id.slice(0, 8)}</Typography>
                        <StatusChip status={post.status as PostStatus} />
                      </Stack>
                      {post.errorMessage && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                          {post.errorMessage}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};
