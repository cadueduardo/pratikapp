import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import UploadIcon from '@mui/icons-material/Upload';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthTextField } from '@/components/auth';
import { CharacterCounter, LoadingButton, useNotification } from '@/components/common';
import { GoogleDriveBrowser } from '@/components/googleDrive/GoogleDriveBrowser';
import { AIChatDialog } from '@/components/schedules/AIChatDialog';
import { HashtagManager } from '@/components/schedules/HashtagManager';
import { ThumbnailUploader } from '@/components/schedules/ThumbnailUploader';
import { useAuth } from '@/hooks/useAuth';
import { platformsRepository, videosRepository, postsRepository } from '@/services/database';
import type { Platform, VideoStatus } from '@/services/database/types';
import type { GoogleDriveFile } from '@/services/googleDrive';
import { isAuthenticated } from '@/services/googleDrive';
import { uploadThumbnail } from '@/services/storage';
import { mapSupabaseError } from '@/utils/errorMessages';
import type { MediaType } from '@/utils/mediaTypes';
import { getMediaTypesByPlatform, getMediaTypeInfo } from '@/utils/mediaTypes';
import { getPlatformInfo } from '@/utils/platforms';

interface VideoConfig {
  file: GoogleDriveFile;
  title: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  selectedPlatformIds: string[];
  platformMediaTypes: Record<string, MediaType>;
  platformHashtags: Record<string, string[]>;
  customThumbnailUrl: string | null;
  customThumbnailFile: File | null;
}

export const BatchImportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveFile[]>([]);
  const [videoConfigs, setVideoConfigs] = useState<Record<string, VideoConfig>>({});
  const [googleDriveBrowserOpen, setGoogleDriveBrowserOpen] = useState(false);
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [checkingGoogleDrive, setCheckingGoogleDrive] = useState(false);
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);
  const [aiChatDialogOpen, setAiChatDialogOpen] = useState(false);
  const [aiChatForFileId, setAiChatForFileId] = useState<string | null>(null);
  // Hashtags pendentes por vídeo (aguardando seleção de plataformas)
  const [pendingHashtags, setPendingHashtags] = useState<Record<string, string[]>>({});
  
  // Fila de upload
  interface UploadQueueItem {
    videoId: string;
    videoTitle: string;
    fileId: string;
    status: 'pending' | 'uploading' | 'success' | 'failed';
    platforms: Array<{
      platformId: string;
      platformName: string;
      status: 'pending' | 'uploading' | 'success' | 'failed';
      error?: string;
    }>;
    error?: string;
  }
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [showUploadQueue, setShowUploadQueue] = useState(false);

  const checkGoogleDriveConnection = useCallback(async () => {
    if (!user?.id) return;

    try {
      setCheckingGoogleDrive(true);
      const connected = await isAuthenticated(user.id);
      setIsGoogleDriveConnected(connected);
    } catch (err) {
      setIsGoogleDriveConnected(false);
    } finally {
      setCheckingGoogleDrive(false);
    }
  }, [user?.id]);

  const loadPlatforms = useCallback(async () => {
    if (!user?.id) return;

    try {
      const userPlatforms = await platformsRepository.listByUser(user.id);
      const connectedPlatforms = userPlatforms.filter(
        (p) => p.name !== 'google-drive' && p.apiToken && getPlatformInfo(p.name) !== null,
      );
      setAvailablePlatforms(connectedPlatforms);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    }
  }, [user?.id, showError]);

  useEffect(() => {
    if (user?.id) {
      checkGoogleDriveConnection();
      loadPlatforms();
    }
  }, [user?.id, checkGoogleDriveConnection, loadPlatforms]);

  // Inicializar configurações quando arquivos são selecionados
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const newConfigs: Record<string, VideoConfig> = {};
      selectedFiles.forEach((file) => {
        if (!videoConfigs[file.id]) {
          // Remover extensão do nome do arquivo para usar como título padrão
          const defaultTitle = file.name.replace(/\.[^/.]+$/, '');
          newConfigs[file.id] = {
            file,
            title: defaultTitle,
            description: '',
            scheduledDate: '',
            scheduledTime: '',
            selectedPlatformIds: [],
            platformMediaTypes: {},
            platformHashtags: {},
            customThumbnailUrl: null,
            customThumbnailFile: null,
          };
        } else {
          newConfigs[file.id] = videoConfigs[file.id];
        }
      });
      setVideoConfigs(newConfigs);
    }
  }, [selectedFiles]);

  // Distribuir hashtags pendentes quando plataformas forem selecionadas
  useEffect(() => {
    Object.entries(pendingHashtags).forEach(([fileId, hashtags]) => {
      if (hashtags.length > 0) {
        const config = videoConfigs[fileId];
        if (config && config.selectedPlatformIds.length > 0) {
          // Distribuir hashtags para TODAS as plataformas selecionadas (espelhar)
          const updated: Record<string, string[]> = { ...config.platformHashtags };
          
          config.selectedPlatformIds.forEach((platformId) => {
            // Sempre atualizar com as hashtags pendentes (espelhar)
            updated[platformId] = [...hashtags];
          });

          updateVideoConfig(fileId, { platformHashtags: updated });
          
          // Remover hashtags pendentes deste vídeo
          setPendingHashtags((prev) => {
            const newPending = { ...prev };
            delete newPending[fileId];
            return newPending;
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Dependências: quando as plataformas selecionadas mudam para cada vídeo
    Object.keys(videoConfigs).map(id => videoConfigs[id]?.selectedPlatformIds.join(',') || '').join('|'),
    // E quando há hashtags pendentes
    Object.keys(pendingHashtags).join(','),
  ]);

  const handleGoogleDriveSelect = useCallback((files: GoogleDriveFile[]) => {
    console.log('[BatchImportPage] Arquivos selecionados:', {
      count: files.length,
      fileIds: files.map(f => f.id),
      fileNames: files.map(f => f.name),
    });
    setSelectedFiles(files);
    setGoogleDriveBrowserOpen(false);
  }, []);

  const updateVideoConfig = useCallback((fileId: string, updates: Partial<VideoConfig>) => {
    setVideoConfigs((prev) => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        ...updates,
      },
    }));
  }, []);

  const validateConfigs = useCallback((): boolean => {
    for (const config of Object.values(videoConfigs)) {
      if (!config.title.trim()) {
        showError(`O vídeo "${config.file.name}" precisa de um título.`);
        return false;
      }
      if (config.selectedPlatformIds.length === 0) {
        showError(`O vídeo "${config.file.name}" precisa de pelo menos uma plataforma selecionada.`);
        return false;
      }
      if (config.scheduledDate && !config.scheduledTime) {
        showError(`O vídeo "${config.file.name}" precisa de uma hora se tiver data agendada.`);
        return false;
      }
    }
    return true;
  }, [videoConfigs, showError]);

  // Processar fila de upload
  const processUploadQueue = useCallback(async (queue: UploadQueueItem[]) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !user?.id) {
      console.error('[BatchImport] Configuração do Supabase não encontrada');
      return;
    }

    const { supabaseClient } = await import('@/services/supabaseClient');
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      console.error('[BatchImport] Session não encontrada');
      return;
    }

    // Processar cada vídeo na fila
    for (const queueItem of queue) {
      // Atualizar status do vídeo para "uploading"
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.videoId === queueItem.videoId ? { ...item, status: 'uploading' } : item,
        ),
      );

      try {
        // Buscar vídeo e configuração
        const video = await videosRepository.getById(queueItem.videoId);
        if (!video) {
          throw new Error('Vídeo não encontrado');
        }

        const config = videoConfigs[queueItem.fileId];
        if (!config) {
          throw new Error('Configuração do vídeo não encontrada');
        }

        // Converter data e hora para ISO string
        let scheduledDateISO: string | null = null;
        if (config.scheduledDate && config.scheduledTime) {
          const timeMatch = config.scheduledTime.match(/^(\d{2}):(\d{2})$/);
          if (timeMatch) {
            const [, hours, minutes] = timeMatch;
            const [year, month, day] = config.scheduledDate.split('-').map(Number);
            const localDate = new Date(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            scheduledDateISO = localDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
          }
        }

        // Preparar descrição com hashtags
        let descriptionWithHashtags = config.description || '';
        config.selectedPlatformIds.forEach((platformId) => {
          const platform = availablePlatforms.find((p) => p.id === platformId);
          const hashtags = config.platformHashtags[platformId];
          if (platform && hashtags && hashtags.length > 0) {
            const platformInfo = getPlatformInfo(platform.name);
            if (platformInfo?.name === 'youtube') {
              const mediaType = config.platformMediaTypes[platformId];
              if (mediaType === 'youtube-shorts') {
                if (!descriptionWithHashtags.includes('#Shorts')) {
                  descriptionWithHashtags = `#Shorts\n\n${descriptionWithHashtags}`;
                }
              }
              if (hashtags.length > 0) {
                descriptionWithHashtags += `\n\n${hashtags.join(' ')}`;
              }
            } else {
              if (hashtags.length > 0) {
                descriptionWithHashtags += `\n\n${hashtags.join(' ')}`;
              }
            }
          }
        });

        // Obter thumbnail final
        const finalThumbnailUrl = video.customThumbnailUrl;

        // Processar cada plataforma
        let allPlatformsSuccess = true;
        for (const platformInfo of queueItem.platforms) {
          // Atualizar status da plataforma para "uploading"
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.videoId === queueItem.videoId
                ? {
                    ...item,
                    platforms: item.platforms.map((p) =>
                      p.platformId === platformInfo.platformId ? { ...p, status: 'uploading' } : p,
                    ),
                  }
                : item,
            ),
          );

          try {
            const platform = availablePlatforms.find((p) => p.id === platformInfo.platformId);
            if (!platform) {
              throw new Error('Plataforma não encontrada');
            }

            const platformInfoType = getPlatformInfo(platform.name);
            if (platformInfoType?.name === 'youtube') {
              // Verificar se já existe um post para esta plataforma
              const existingPosts = await postsRepository.listByVideo(video.id);
              let post = existingPosts.find((p) => p.platformId === platform.id);

              if (!post) {
                // Criar post
                post = await postsRepository.create({
                  videoId: video.id,
                  platformId: platform.id,
                  status: 'pending',
                });
              }

              if (post) {
                // Determinar se é Shorts
                const mediaType = config.platformMediaTypes[platform.id];
                const isShorts = mediaType === 'youtube-shorts';

                const uploadPayload = {
                  videoUrl: video.urlDrive,
                  title: video.title,
                  description: descriptionWithHashtags,
                  privacyStatus: 'private' as const,
                  platformId: platform.id,
                  userId: user.id,
                  customThumbnailUrl: finalThumbnailUrl || undefined,
                  isShorts: isShorts,
                  publishAt: scheduledDateISO,
                };

                const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/upload-to-youtube`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: supabaseAnonKey,
                  },
                  body: JSON.stringify(uploadPayload),
                });

                if (uploadResponse.ok) {
                  const uploadData = await uploadResponse.json();
                  // Atualizar post com platformVideoId e status
                  await postsRepository.update(post.id, {
                    platformVideoId: uploadData.videoId || uploadData.platformVideoId,
                    status: 'posted',
                  });
                  // Atualizar status do vídeo
                  await videosRepository.update(video.id, {
                    status: 'scheduled',
                  });

                  // Atualizar status da plataforma para "success"
                  setUploadQueue((prev) =>
                    prev.map((item) =>
                      item.videoId === queueItem.videoId
                        ? {
                            ...item,
                            platforms: item.platforms.map((p) =>
                              p.platformId === platformInfo.platformId ? { ...p, status: 'success' } : p,
                            ),
                          }
                        : item,
                    ),
                  );
                } else {
                  const errorText = await uploadResponse.text();
                  let errorData;
                  try {
                    errorData = JSON.parse(errorText);
                  } catch {
                    errorData = { error: errorText || 'Erro desconhecido' };
                  }
                  throw new Error(errorData.error || 'Erro ao fazer upload');
                }
              }
            }
            // TODO: Adicionar suporte para outras plataformas (TikTok, Instagram) aqui
          } catch (platformError) {
            allPlatformsSuccess = false;
            const errorMessage = platformError instanceof Error ? platformError.message : 'Erro desconhecido';
            
            // Atualizar status da plataforma para "failed"
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.videoId === queueItem.videoId
                  ? {
                      ...item,
                      platforms: item.platforms.map((p) =>
                        p.platformId === platformInfo.platformId
                          ? { ...p, status: 'failed', error: errorMessage }
                          : p,
                      ),
                    }
                  : item,
              ),
            );
          }
        }

        // Atualizar status do vídeo
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.videoId === queueItem.videoId
              ? { ...item, status: allPlatformsSuccess ? 'success' : 'failed' }
              : item,
          ),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.videoId === queueItem.videoId
              ? { ...item, status: 'failed', error: errorMessage }
              : item,
          ),
        );
      }
    }
  }, [user?.id, videoConfigs, availablePlatforms]);

  const handleBatchSave = useCallback(async () => {
    if (!user?.id || !validateConfigs()) return;

    try {
      setLoading(true);
      setSavingProgress({ current: 0, total: Object.keys(videoConfigs).length });

      const results: { success: number; failed: number } = { success: 0, failed: 0 };
      const newUploadQueue: UploadQueueItem[] = [];

      for (const [fileId, config] of Object.entries(videoConfigs)) {
        try {
          // Converter data e hora para ISO string
          let scheduledDateISO: string | null = null;
          if (config.scheduledDate && config.scheduledTime) {
            const timeMatch = config.scheduledTime.match(/^(\d{2}):(\d{2})$/);
            if (timeMatch) {
              const [, hours, minutes] = timeMatch;
              const [year, month, day] = config.scheduledDate.split('-').map(Number);
              const localDate = new Date(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
              scheduledDateISO = localDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
            }
          }

          // Preparar platform_media_types
          const platformMediaTypesMap: Record<string, string> = {};
          config.selectedPlatformIds.forEach((platformId) => {
            const platform = availablePlatforms.find((p) => p.id === platformId);
            const mediaType = config.platformMediaTypes[platformId];
            if (platform && mediaType) {
              platformMediaTypesMap[platform.name] = mediaType;
            }
          });

          // Preparar platform_hashtags
          const platformHashtagsMap: Record<string, string[]> = {};
          config.selectedPlatformIds.forEach((platformId) => {
            const platform = availablePlatforms.find((p) => p.id === platformId);
            const hashtags = config.platformHashtags[platformId];
            if (platform && hashtags && hashtags.length > 0) {
              platformHashtagsMap[platform.name] = hashtags;
            }
          });

          // Criar vídeo
          const video = await videosRepository.create({
            userId: user.id,
            title: config.title,
            description: config.description || null,
            urlDrive: config.file.webViewLink || `https://drive.google.com/file/d/${config.file.id}/view`,
            scheduledDate: scheduledDateISO,
            status: scheduledDateISO ? 'scheduled' : 'draft',
            selectedPlatformIds: config.selectedPlatformIds.length > 0 ? config.selectedPlatformIds : null,
            mediaType: config.selectedPlatformIds.length > 0 && config.platformMediaTypes[config.selectedPlatformIds[0]]
              ? config.platformMediaTypes[config.selectedPlatformIds[0]]
              : null,
            platformMediaTypes: Object.keys(platformMediaTypesMap).length > 0 ? platformMediaTypesMap : null,
            platformHashtags: Object.keys(platformHashtagsMap).length > 0 ? platformHashtagsMap : null,
            customThumbnailUrl: null, // Será atualizado após upload
          });

          // Fazer upload da thumbnail se houver
          let finalThumbnailUrl: string | null = null;
          if (config.customThumbnailFile) {
            const uploadedUrl = await uploadThumbnail(user.id, video.id, config.customThumbnailFile);
            if (uploadedUrl) {
              await videosRepository.update(video.id, {
                customThumbnailUrl: uploadedUrl,
              });
              finalThumbnailUrl = uploadedUrl;
              // Limpar blob URL se existir
              if (config.customThumbnailUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(config.customThumbnailUrl);
              }
            }
          } else if (config.customThumbnailUrl && !config.customThumbnailUrl.startsWith('blob:')) {
            // Se já é uma URL (do Google Drive), apenas salvar
            await videosRepository.update(video.id, {
              customThumbnailUrl: config.customThumbnailUrl,
            });
            finalThumbnailUrl = config.customThumbnailUrl;
          }

          // Se há data agendada e plataformas selecionadas, adicionar à fila de upload
          if (scheduledDateISO && config.selectedPlatformIds.length > 0) {
            const queueItem: UploadQueueItem = {
              videoId: video.id,
              videoTitle: config.title,
              fileId,
              status: 'pending',
              platforms: config.selectedPlatformIds.map((platformId) => {
                const platform = availablePlatforms.find((p) => p.id === platformId);
                return {
                  platformId,
                  platformName: platform ? (getPlatformInfo(platform.name)?.displayName || platform.name) : 'Desconhecida',
                  status: 'pending' as const,
                };
              }),
            };
            newUploadQueue.push(queueItem);
          }

          results.success++;
        } catch (err) {
          console.error(`[BatchImport] Erro ao salvar vídeo ${config.file.name}:`, err);
          results.failed++;
        }

        setSavingProgress((prev) => (prev ? { ...prev, current: prev.current + 1 } : null));
      }

      if (results.success > 0) {
        // Se há itens na fila de upload, mostrar interface e processar
        if (newUploadQueue.length > 0) {
          setUploadQueue(newUploadQueue);
          setShowUploadQueue(true);
          showSuccess(`${results.success} de ${Object.keys(videoConfigs).length} vídeo(s) salvos! Iniciando uploads...`);
          
          // Limpar seleção para voltar à tela inicial
          setSelectedFiles([]);
          setVideoConfigs({});
          
          // Processar fila de upload em background (usar setTimeout para não bloquear)
          setTimeout(() => {
            void processUploadQueue(newUploadQueue);
          }, 500);
        } else {
          showSuccess(`${results.success} de ${Object.keys(videoConfigs).length} vídeo(s) salvos com sucesso!`);
          // Limpar seleção para voltar à tela inicial
          setSelectedFiles([]);
          setVideoConfigs({});
          // Não navegar, manter na página de importação em lote
        }
      } else {
        showError('Nenhum vídeo foi salvo. Verifique os erros e tente novamente.');
      }
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setLoading(false);
      setSavingProgress(null);
    }
  }, [user?.id, videoConfigs, availablePlatforms, validateConfigs, navigate, showSuccess, showError, processUploadQueue]);

  if (!user?.id) {
    return null;
  }

  if (!user?.id) {
    return null;
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/schedules')} disabled={loading}>
          Voltar
        </Button>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Importação em Lote
        </Typography>
      </Box>

      {savingProgress && (
        <Alert severity="info">
          Salvando {savingProgress.current} de {savingProgress.total} vídeo(s)...
        </Alert>
      )}

      {selectedFiles.length === 0 ? (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
                <Typography variant="h6">Selecione vídeos do Google Drive</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Selecione múltiplos vídeos do seu Google Drive para configurar e agendar todos de uma vez.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<DriveFolderUploadIcon />}
                  onClick={() => setGoogleDriveBrowserOpen(true)}
                  disabled={checkingGoogleDrive || !isGoogleDriveConnected}
                >
                  {checkingGoogleDrive
                    ? 'Verificando...'
                    : isGoogleDriveConnected
                      ? 'Selecionar Vídeos do Google Drive'
                      : 'Conectar Google Drive'}
                </Button>
                {!isGoogleDriveConnected && !checkingGoogleDrive && (
                  <Alert severity="warning">
                    O Google Drive não está conectado. Conecte sua conta nas configurações primeiro.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Fila de Upload - Mostrar na tela inicial */}
          {showUploadQueue && uploadQueue.length > 0 && (
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Fila de Upload</Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        const allCompleted = uploadQueue.every(
                          (item) => item.status === 'success' || item.status === 'failed',
                        );
                        if (allCompleted) {
                          setShowUploadQueue(false);
                          setUploadQueue([]);
                          showSuccess('Fila de upload fechada.');
                        }
                      }}
                      disabled={!uploadQueue.every((item) => item.status === 'success' || item.status === 'failed')}
                    >
                      Fechar
                    </Button>
                  </Box>

                  <Grid container spacing={2}>
                    {uploadQueue.map((item) => {
                      const getStatusIcon = () => {
                        switch (item.status) {
                          case 'pending':
                            return <PendingIcon color="disabled" />;
                          case 'uploading':
                            return <CircularProgress size={20} />;
                          case 'success':
                            return <CheckCircleIcon color="success" />;
                          case 'failed':
                            return <ErrorIcon color="error" />;
                          default:
                            return null;
                        }
                      };

                      const getStatusColor = () => {
                        switch (item.status) {
                          case 'pending':
                            return 'default';
                          case 'uploading':
                            return 'info';
                          case 'success':
                            return 'success';
                          case 'failed':
                            return 'error';
                          default:
                            return 'default';
                        }
                      };

                      return (
                        <Grid item xs={12} sm={6} md={4} key={item.videoId}>
                          <Card variant="outlined">
                            <CardContent>
                              <Stack spacing={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getStatusIcon()}
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                                    {item.videoTitle}
                                  </Typography>
                                  <Chip
                                    label={item.status === 'pending' ? 'Aguardando' : item.status === 'uploading' ? 'Enviando...' : item.status === 'success' ? 'Concluído' : 'Erro'}
                                    size="small"
                                    color={getStatusColor() as any}
                                  />
                                </Box>

                                {item.status === 'uploading' && (
                                  <LinearProgress sx={{ mt: 1 }} />
                                )}

                                {item.error && (
                                  <Alert severity="error" sx={{ mt: 1 }}>
                                    {item.error}
                                  </Alert>
                                )}

                                <Stack spacing={0.5} sx={{ mt: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Plataformas:
                                  </Typography>
                                  {item.platforms.map((platform) => {
                                    const getPlatformStatusIcon = () => {
                                      switch (platform.status) {
                                        case 'pending':
                                          return <PendingIcon sx={{ fontSize: 16 }} color="disabled" />;
                                        case 'uploading':
                                          return <CircularProgress size={14} />;
                                        case 'success':
                                          return <CheckCircleIcon sx={{ fontSize: 16 }} color="success" />;
                                        case 'failed':
                                          return <ErrorIcon sx={{ fontSize: 16 }} color="error" />;
                                        default:
                                          return null;
                                      }
                                    };

                                    return (
                                      <Box
                                        key={platform.platformId}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                          pl: 1,
                                        }}
                                      >
                                        {getPlatformStatusIcon()}
                                        <Typography variant="caption">
                                          {platform.platformName}
                                          {platform.error && ` - ${platform.error}`}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {uploadQueue.filter((item) => item.status === 'success').length} de {uploadQueue.length} vídeo(s) concluído(s)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {uploadQueue.filter((item) => item.status === 'uploading').length} enviando...
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedFiles.length} vídeo(s) selecionado(s)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DriveFolderUploadIcon />}
              onClick={() => setGoogleDriveBrowserOpen(true)}
              disabled={loading}
            >
              Alterar Seleção
            </Button>
          </Box>

          {Object.entries(videoConfigs).map(([fileId, config]) => {
            return (
              <Accordion key={fileId} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                      {config.title || config.file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {config.selectedPlatformIds.length} plataforma(s)
                    </Typography>
                    <Tooltip title="Remover vídeo">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Remover do videoConfigs e do selectedFiles
                          setVideoConfigs((prev) => {
                            const newConfigs = { ...prev };
                            delete newConfigs[fileId];
                            return newConfigs;
                          });
                          setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
                          // Limpar blob URL se existir
                          if (config.customThumbnailUrl?.startsWith('blob:')) {
                            URL.revokeObjectURL(config.customThumbnailUrl);
                          }
                        }}
                        disabled={loading}
                        sx={{ ml: 2 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={3}>
                    {/* Título com botão de IA */}
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <AuthTextField
                        label="Título do vídeo"
                        value={config.title}
                        onChange={(e) => updateVideoConfig(fileId, { title: e.target.value })}
                        fullWidth
                        required
                        inputProps={{ maxLength: 200 }}
                        sx={{ flex: 1 }}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => {
                          setAiChatForFileId(fileId);
                          setAiChatDialogOpen(true);
                        }}
                        sx={{ mt: 1 }}
                        disabled={loading}
                      >
                        Gerar com IA
                      </Button>
                    </Stack>

                    {/* Descrição */}
                    <AuthTextField
                      label="Descrição (opcional)"
                      value={config.description}
                      onChange={(e) => updateVideoConfig(fileId, { description: e.target.value })}
                      multiline
                      rows={3}
                      fullWidth
                      inputProps={{ maxLength: 1000 }}
                    />

                    {/* Data e Hora */}
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Data de agendamento"
                        type="date"
                        value={config.scheduledDate}
                        onChange={(e) => updateVideoConfig(fileId, { scheduledDate: e.target.value })}
                        fullWidth
                        slotProps={{
                          inputLabel: { shrink: true },
                          input: {
                            min: new Date().toISOString().split('T')[0],
                          },
                        }}
                      />
                      <FormControl fullWidth>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Hora de agendamento
                        </Typography>
                        <Select
                          value={config.scheduledTime}
                          onChange={(e) => updateVideoConfig(fileId, { scheduledTime: e.target.value })}
                          displayEmpty
                          fullWidth
                        >
                          <MenuItem value="">
                            <em>Selecione a hora</em>
                          </MenuItem>
                          {Array.from({ length: 96 }, (_, i) => {
                            // 96 = 24 horas * 4 (intervalos de 15 minutos)
                            const hours = Math.floor(i / 4);
                            const minutes = (i % 4) * 15;
                            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                            return (
                              <MenuItem key={timeString} value={timeString}>
                                {timeString}
                              </MenuItem>
                            );
                          })}
                        </Select>
                        <FormHelperText>
                          Horários disponíveis em intervalos de 15 minutos (conforme YouTube)
                        </FormHelperText>
                      </FormControl>
                    </Stack>

                    {/* Plataformas */}
                    <FormControl fullWidth>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Plataformas para publicação *
                      </Typography>
                      <FormGroup>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {availablePlatforms.map((platform) => {
                            const platformInfo = getPlatformInfo(platform.name);
                            const platformDisplayName = platformInfo?.displayName || platform.name;
                            const isSelected = config.selectedPlatformIds.includes(platform.id);

                            return (
                              <FormControlLabel
                                key={platform.id}
                                control={
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newPlatformIds = e.target.checked
                                        ? [...config.selectedPlatformIds, platform.id]
                                        : config.selectedPlatformIds.filter((id) => id !== platform.id);
                                      updateVideoConfig(fileId, { selectedPlatformIds: newPlatformIds });
                                    }}
                                  />
                                }
                                label={platformDisplayName}
                              />
                            );
                          })}
                        </Stack>
                      </FormGroup>
                    </FormControl>

                    {/* Tipo de Mídia por Plataforma */}
                    {config.selectedPlatformIds.length > 0 && (
                      <Stack spacing={2}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Tipo de Mídia por Plataforma
                        </Typography>
                        {config.selectedPlatformIds.map((platformId) => {
                          const platform = availablePlatforms.find((p) => p.id === platformId);
                          const platformInfo = platform ? getPlatformInfo(platform.name) : null;
                          const availableMediaTypes = platform
                            ? getMediaTypesByPlatform(platformInfo?.type || 'youtube')
                            : [];
                          const platformDisplayName = platformInfo?.displayName || platform?.name || '';

                          return (
                            <FormControl key={platformId} fullWidth>
                              <Select
                                value={config.platformMediaTypes[platformId] || ''}
                                onChange={(e) => {
                                  const newMediaTypes = {
                                    ...config.platformMediaTypes,
                                    [platformId]: e.target.value as MediaType,
                                  };
                                  updateVideoConfig(fileId, { platformMediaTypes: newMediaTypes });
                                }}
                                displayEmpty
                              >
                                <MenuItem value="">
                                  <em>Selecione o tipo de mídia para {platformDisplayName}</em>
                                </MenuItem>
                                {availableMediaTypes.map((mt) => {
                                  const info = getMediaTypeInfo(mt);
                                  return (
                                    <MenuItem key={mt} value={mt}>
                                      <Box>
                                        <Typography variant="body1" fontWeight={600}>
                                          {info.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {info.description}
                                        </Typography>
                                      </Box>
                                    </MenuItem>
                                  );
                                })}
                              </Select>
                            </FormControl>
                          );
                        })}
                      </Stack>
                    )}

                    {/* Hashtags por Plataforma */}
                    {config.selectedPlatformIds.length > 0 && (
                      <HashtagManager
                        selectedPlatformIds={config.selectedPlatformIds}
                        availablePlatforms={availablePlatforms}
                        platformHashtags={config.platformHashtags}
                        onHashtagsChange={(platformHashtags) => {
                          updateVideoConfig(fileId, { platformHashtags });
                        }}
                        userId={user.id}
                      />
                    )}

                    {/* Capa Personalizada */}
                    <ThumbnailUploader
                      userId={user.id}
                      currentThumbnailUrl={config.customThumbnailUrl}
                      onThumbnailChange={(url, file) => {
                        updateVideoConfig(fileId, {
                          customThumbnailUrl: url,
                          customThumbnailFile: file || null,
                        });
                      }}
                      disabled={loading}
                      selectedMediaTypes={Object.values(config.platformMediaTypes || {}).filter(
                        (mt): mt is MediaType => mt !== null && mt !== undefined,
                      )}
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
            <Button onClick={() => navigate('/schedules')} disabled={loading}>
              Cancelar
            </Button>
            <LoadingButton
              variant="contained"
              onClick={handleBatchSave}
              loading={loading}
              disabled={Object.keys(videoConfigs).length === 0}
            >
              Salvar Todos ({Object.keys(videoConfigs).length})
            </LoadingButton>
          </Box>
        </Stack>
      )}

      {/* Google Drive Browser */}
      {user.id && isGoogleDriveConnected && (
        <GoogleDriveBrowser
          open={googleDriveBrowserOpen}
          onClose={() => setGoogleDriveBrowserOpen(false)}
          onSelect={(file) => {
            // Esta função não deve ser chamada em modo múltiplo
            // Mas mantemos para compatibilidade com a interface
            console.warn('[BatchImportPage] onSelect chamado em modo múltiplo, ignorando:', file);
          }}
          userId={user.id}
          multiSelect={true}
          selectedFiles={selectedFiles}
          onSelectionChange={handleGoogleDriveSelect}
        />
      )}

      {/* Dialog de Chat com IA */}
      {user?.id && aiChatForFileId && (
        <AIChatDialog
          open={aiChatDialogOpen}
          userId={user.id}
          onClose={() => {
            setAiChatDialogOpen(false);
            setAiChatForFileId(null);
          }}
          onContentSelected={(content, provider) => {
            // Atualizar título e descrição do vídeo específico
            updateVideoConfig(aiChatForFileId, {
              title: content.title,
              description: content.description,
            });
            
            // Se houver hashtags, armazenar como pendentes para distribuir quando plataformas forem selecionadas
            if (content.hashtags && content.hashtags.length > 0) {
              const config = videoConfigs[aiChatForFileId];
              
              if (config && config.selectedPlatformIds.length > 0) {
                // Se já há plataformas selecionadas, distribuir imediatamente para todas
                const updated: Record<string, string[]> = { ...config.platformHashtags };
                
                config.selectedPlatformIds.forEach((platformId) => {
                  // Sempre atualizar com as hashtags geradas (espelhar)
                  updated[platformId] = [...content.hashtags];
                });
                
                updateVideoConfig(aiChatForFileId, {
                  platformHashtags: updated,
                });
              } else {
                // Se não há plataformas selecionadas, armazenar como pendentes
                setPendingHashtags((prev) => ({
                  ...prev,
                  [aiChatForFileId]: content.hashtags,
                }));
              }
            }
            
            setAiChatDialogOpen(false);
            setAiChatForFileId(null);
          }}
        />
      )}
    </Stack>
  );
};

