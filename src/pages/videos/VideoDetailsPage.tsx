import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import PublishIcon from '@mui/icons-material/Publish';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { LoadingButton, StatusChip, useNotification } from '@/components/common';
import { useVideoDetails } from '@/hooks/useVideoDetails';
import { videosRepository } from '@/services/database';
import { mapSupabaseError } from '@/utils/errorMessages';
import { getPlatformInfo } from '@/utils/platforms';

const getPlatformName = (platformId: string, platforms: Array<{ id: string; name: string }>) => {
  return platforms.find((p) => p.id === platformId)?.name || 'Plataforma desconhecida';
};

export const VideoDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { video, posts, platforms, loading, error } = useVideoDetails(id);
  const [publishingNow, setPublishingNow] = useState(false);

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handlePublishNow = useCallback(async () => {
    if (!id) return;

    try {
      setPublishingNow(true);

      // Atualizar o vídeo para ser processado agora
      const now = new Date().toISOString();
      await videosRepository.update(id, {
        scheduledDate: now,
        status: 'pending',
      });

      // Chamar a Edge Function para processar o vídeo
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuração do Supabase não encontrada.');
      }

      const { supabaseClient } = await import('@/services/supabaseClient');
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        throw new Error('Usuário não autenticado.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/process-scheduled-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar vídeo');
      }

      showSuccess('Vídeo enviado para publicação! Aguarde alguns instantes.');
      
      // Recarregar a página após um momento
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setPublishingNow(false);
    }
  }, [id, showSuccess, showError]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!video) {
    return (
      <Stack spacing={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/schedules')}>
          Voltar
        </Button>
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center" py={2}>
              Vídeo não encontrado.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/schedules')} aria-label="Voltar">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight={700} sx={{ flex: 1 }}>
          Detalhes do vídeo
        </Typography>
        {video.status === 'scheduled' && (
          <LoadingButton
            variant="contained"
            color="primary"
            startIcon={<PublishIcon />}
            onClick={handlePublishNow}
            loading={publishingNow}
            loadingText="Publicando..."
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Publicar Agora
          </LoadingButton>
        )}
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/schedules/${id}/edit`)}
          disabled={publishingNow}
        >
          Editar
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
                {video.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                <StatusChip status={video.status} />
              </Box>
            </Box>

            {video.description && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Descrição
                  </Typography>
                  <Typography variant="body1">{video.description}</Typography>
                </Box>
              </>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                URL do Google Drive
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  component="a"
                  href={video.urlDrive}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                    wordBreak: 'break-all',
                  }}
                >
                  {video.urlDrive}
                </Typography>
                <LinkIcon fontSize="small" color="action" />
              </Box>
            </Box>

            {video.scheduledDate && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Data de agendamento
                  </Typography>
                  <Typography variant="body1">
                    {new Date(video.scheduledDate).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </>
            )}

            {video.selectedPlatformIds && video.selectedPlatformIds.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Plataformas
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {video.selectedPlatformIds.map((platformId) => {
                      const platform = platforms.find((p) => p.id === platformId);
                      const platformInfo = platform ? getPlatformInfo(platform.name) : null;
                      return (
                        <Chip
                          key={platformId}
                          label={platformInfo?.displayName || platform?.name || 'Plataforma'}
                          variant="outlined"
                          color="primary"
                        />
                      );
                    })}
                  </Box>
                </Box>
              </>
            )}

            {video.platformHashtags && video.selectedPlatformIds && Object.keys(video.platformHashtags).length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Hashtags
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    {video.selectedPlatformIds.map((platformId) => {
                      const platform = platforms.find((p) => p.id === platformId);
                      if (!platform) return null;
                      const hashtags = video.platformHashtags?.[platform.name];
                      if (!hashtags || hashtags.length === 0) return null;
                      const platformInfo = getPlatformInfo(platform.name);
                      return (
                        <Box key={platformId}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                            {platformInfo?.displayName || platform.name}:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {hashtags.map((hashtag, index) => (
                              <Chip
                                key={index}
                                label={hashtag}
                                size="small"
                                variant="filled"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Criado em
              </Typography>
              <Typography variant="body2">
                {new Date(video.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Postagens ({posts.length})
          </Typography>

          {posts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
              Nenhuma postagem criada para este vídeo ainda.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {posts.map((post) => (
                <Box
                  key={post.id}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {getPlatformName(post.platformId, platforms)}
                      </Typography>
                      <StatusChip status={post.status} />
                    </Box>

                    {post.postedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Publicado em:{' '}
                        {new Date(post.postedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    )}

                    {post.errorMessage && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        Erro: {post.errorMessage}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Criado em:{' '}
                      {new Date(post.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

