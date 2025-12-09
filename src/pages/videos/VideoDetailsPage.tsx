import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import PublishIcon from '@mui/icons-material/Publish';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { LoadingButton, StatusChip, useNotification, ConfirmDialog } from '@/components/common';
import { useVideoDetails } from '@/hooks/useVideoDetails';
import { videosRepository } from '@/services/database';
import { mapSupabaseError } from '@/utils/errorMessages';
import { getPlatformInfo } from '@/utils/platforms';
import { useAuth } from '@/hooks/useAuth';
import { getFileMetadata, getThumbnailUrl, extractFileIdFromUrl } from '@/services/googleDrive';
import { isValidGoogleDriveUrl } from '@/utils/validation';
import { formatDurationFromSeconds } from '@/utils/formatDuration';

const getPlatformName = (platformId: string, platforms: Array<{ id: string; name: string }>) => {
  return platforms.find((p) => p.id === platformId)?.name || 'Plataforma desconhecida';
};

export const VideoDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const { video, posts, platforms, loading, error } = useVideoDetails(id);
  const [publishingNow, setPublishingNow] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [authenticatedVideoUrl, setAuthenticatedVideoUrl] = useState<string | null>(null);
  const [loadingVideoUrl, setLoadingVideoUrl] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const previousVideoUrlRef = useRef<string | null>(null);
  const authenticatedVideoUrlRef = useRef<string | null>(null);

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

  const handleDeleteClick = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!id) return;

    try {
      setDeleting(true);
      await videosRepository.remove(id);
      showSuccess('Agendamento excluído com sucesso!');
      navigate('/schedules');
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }, [id, navigate, showSuccess, showError]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
  }, []);

  // Carregar thumbnail, duração e URL do vídeo quando o vídeo for carregado
  useEffect(() => {
    if (!video || !user?.id) return;

    const loadVideoMedia = async () => {
      try {
        // Priorizar thumbnail customizada se existir
        if (video.customThumbnailUrl) {
          setVideoThumbnail(video.customThumbnailUrl);
        }

        // Se tiver URL do Google Drive, buscar metadados
        if (video.urlDrive && isValidGoogleDriveUrl(video.urlDrive)) {
          const fileId = extractFileIdFromUrl(video.urlDrive);
          if (fileId) {
            const metadata = await getFileMetadata(user.id, fileId);
            if (metadata) {
              // Se não tiver thumbnail customizada, buscar do Google Drive
              if (!video.customThumbnailUrl) {
                const thumbnail = await getThumbnailUrl(metadata.thumbnailLink, 'low', metadata.id, metadata.mimeType, user.id);
                if (thumbnail) {
                  setVideoThumbnail(thumbnail);
                }
              }
              
              // Se for um vídeo, buscar duração e configurar URL para preview
              if (metadata.mimeType?.startsWith('video/')) {
                // Buscar duração
                if (metadata.videoMediaMetadata?.durationMillis) {
                  const durationSeconds = Math.floor(parseInt(metadata.videoMediaMetadata.durationMillis, 10) / 1000);
                  setVideoDuration(durationSeconds);
                } else {
                  setVideoDuration(null);
                }
                
                // Configurar URL do vídeo para preview usando Edge Function
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (supabaseUrl) {
                  setVideoUrl(`${supabaseUrl}/functions/v1/proxy-google-drive-video?fileId=${fileId}&userId=${user.id}`);
                } else {
                  setVideoUrl(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
                }
              } else {
                setVideoDuration(null);
                setVideoUrl(null);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[VideoDetailsPage] Erro ao carregar mídia do vídeo:', err);
      }
    };

    void loadVideoMedia();
  }, [video, user?.id]);

  // Carregar URL autenticada do vídeo quando videoUrl mudar
  useEffect(() => {
    // Limpar URL anterior se existir e videoUrl mudou
    const previousUrl = previousVideoUrlRef.current;
    if (previousUrl !== videoUrl) {
      setAuthenticatedVideoUrl((prevUrl) => {
        if (prevUrl && prevUrl.startsWith('blob:')) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
      previousVideoUrlRef.current = videoUrl || null;
    }

    if (!videoUrl || !user?.id) {
      return;
    }

    // Se já é uma blob URL (arquivo local), usar diretamente
    if (videoUrl.startsWith('blob:')) {
      setAuthenticatedVideoUrl(videoUrl);
      return;
    }

    // Se é uma URL da Edge Function, precisamos adicionar autenticação
    if (videoUrl.includes('/functions/v1/proxy-google-drive-video')) {
      const loadAuthenticatedUrl = async () => {
        try {
          setLoadingVideoUrl(true);
          const { supabaseClient } = await import('@/services/supabaseClient');
          const {
            data: { session },
          } = await supabaseClient.auth.getSession();

          if (session?.access_token) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            if (supabaseUrl && supabaseAnonKey) {
              const response = await fetch(videoUrl, {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  apikey: supabaseAnonKey,
                },
              });

              if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                authenticatedVideoUrlRef.current = blobUrl;
                setAuthenticatedVideoUrl(blobUrl);
              } else {
                console.error('[VideoDetailsPage] Erro ao carregar vídeo:', response.status);
                authenticatedVideoUrlRef.current = null;
                setAuthenticatedVideoUrl(null);
              }
            }
          }
        } catch (error) {
          console.error('[VideoDetailsPage] Erro ao obter URL autenticada:', error);
          authenticatedVideoUrlRef.current = null;
          setAuthenticatedVideoUrl(null);
        } finally {
          setLoadingVideoUrl(false);
        }
      };

      void loadAuthenticatedUrl();
    } else {
      authenticatedVideoUrlRef.current = videoUrl;
      setAuthenticatedVideoUrl(videoUrl);
    }

    // Cleanup: revogar blob URL quando componente desmontar
    return () => {
      const currentUrl = authenticatedVideoUrlRef.current;
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
        authenticatedVideoUrlRef.current = null;
      }
    };
  }, [videoUrl, user?.id]);

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
          sx={{ mr: 1 }}
        >
          Editar
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteClick}
          disabled={publishingNow || deleting}
        >
          Excluir
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

            {/* Preview do Vídeo */}
            {videoThumbnail && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Preview da Mídia
                </Typography>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 600,
                    aspectRatio: '16/9',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: videoUrl ? 'pointer' : 'default',
                    mt: 1,
                  }}
                  onClick={() => {
                    if (videoUrl) {
                      setPreviewModalOpen(true);
                    }
                  }}
                >
                  <img
                    src={videoThumbnail}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                  {videoUrl && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha('#000', 0.4),
                        opacity: 0,
                        transition: 'opacity 0.2s ease-in-out',
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          bgcolor: alpha('#fff', 0.9),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PlayArrowIcon sx={{ fontSize: 40, color: 'primary.main', ml: 0.5 }} />
                      </Box>
                      {videoDuration !== null && (
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: alpha('#000', 0.7),
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            mt: 1,
                          }}
                        >
                          {formatDurationFromSeconds(videoDuration)}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {videoDuration !== null && !videoUrl && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        bgcolor: alpha('#000', 0.7),
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption">{formatDurationFromSeconds(videoDuration)}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
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

      {/* Modal de Preview do Vídeo */}
      <Dialog open={previewModalOpen} onClose={() => setPreviewModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Preview do Vídeo</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setPreviewModalOpen(false)}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingVideoUrl ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
              }}
            >
              <CircularProgress />
            </Box>
          ) : authenticatedVideoUrl ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                bgcolor: '#000',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <video
                src={authenticatedVideoUrl}
                controls
                preload="metadata"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  console.error('[VideoDetailsPage] Erro ao carregar vídeo:', e);
                  const videoElement = e.currentTarget;
                  if (videoElement.error) {
                    console.error('[VideoDetailsPage] Erro do vídeo:', videoElement.error.code, videoElement.error.message);
                  }
                }}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              URL do vídeo não disponível
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Stack>
  );
};

