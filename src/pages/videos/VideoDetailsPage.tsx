import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { StatusChip, useNotification } from '@/components/common';
import { useVideoDetails } from '@/hooks/useVideoDetails';

const getPlatformName = (platformId: string, platforms: Array<{ id: string; name: string }>) => {
  return platforms.find((p) => p.id === platformId)?.name || 'Plataforma desconhecida';
};

export const VideoDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useNotification();
  const { video, posts, platforms, loading, error } = useVideoDetails(id);

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
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/schedules/${id}/edit`)}
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

