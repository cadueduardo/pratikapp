import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthTextField } from '@/components/auth';
import { CharacterCounter, LoadingButton, useNotification } from '@/components/common';
import { GoogleDriveBrowser } from '@/components/googleDrive/GoogleDriveBrowser';
import { HashtagManager } from '@/components/schedules/HashtagManager';
import { ThumbnailUploader } from '@/components/schedules/ThumbnailUploader';
import { useAuth } from '@/hooks/useAuth';
import { platformsRepository, videosRepository } from '@/services/database';
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

  const handleGoogleDriveSelect = useCallback((files: GoogleDriveFile[]) => {
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

  const handleBatchSave = useCallback(async () => {
    if (!user?.id || !validateConfigs()) return;

    try {
      setLoading(true);
      setSavingProgress({ current: 0, total: Object.keys(videoConfigs).length });

      const results: { success: number; failed: number } = { success: 0, failed: 0 };

      for (const [fileId, config] of Object.entries(videoConfigs)) {
        try {
          // Converter data e hora para ISO string
          let scheduledDateISO: string | null = null;
          if (config.scheduledDate && config.scheduledTime) {
            const timeMatch = config.scheduledTime.match(/^(\d{2}):(\d{2})$/);
            if (timeMatch) {
              const [, hours, minutes] = timeMatch;
              const date = new Date(`${config.scheduledDate}T${hours}:${minutes}:00`);
              scheduledDateISO = date.toISOString();
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
          if (config.customThumbnailFile) {
            const uploadedUrl = await uploadThumbnail(user.id, video.id, config.customThumbnailFile);
            if (uploadedUrl) {
              await videosRepository.update(video.id, {
                customThumbnailUrl: uploadedUrl,
              });
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
          }

          results.success++;
        } catch (err) {
          console.error(`[BatchImport] Erro ao salvar vídeo ${config.file.name}:`, err);
          results.failed++;
        }

        setSavingProgress((prev) => (prev ? { ...prev, current: prev.current + 1 } : null));
      }

      if (results.success > 0) {
        showSuccess(`${results.success} de ${Object.keys(videoConfigs).length} vídeo(s) salvos com sucesso!`);
        navigate('/schedules');
      } else {
        showError('Nenhum vídeo foi salvo. Verifique os erros e tente novamente.');
      }
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setLoading(false);
      setSavingProgress(null);
    }
  }, [user?.id, videoConfigs, availablePlatforms, validateConfigs, navigate, showSuccess, showError]);

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
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={3}>
                    {/* Título */}
                    <AuthTextField
                      label="Título do vídeo"
                      value={config.title}
                      onChange={(e) => updateVideoConfig(fileId, { title: e.target.value })}
                      fullWidth
                      required
                      inputProps={{ maxLength: 200 }}
                    />

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
                      <TextField
                        label="Hora"
                        value={config.scheduledTime}
                        onChange={(e) => {
                          let value = e.target.value;
                          value = value.replace(/[^\d:]/g, '');
                          if (value.length <= 2) {
                            updateVideoConfig(fileId, { scheduledTime: value });
                          } else if (value.length <= 5) {
                            if (value.length === 3 && !value.includes(':')) {
                              value = value.slice(0, 2) + ':' + value.slice(2);
                            }
                            updateVideoConfig(fileId, { scheduledTime: value });
                          } else {
                            updateVideoConfig(fileId, { scheduledTime: value.slice(0, 5) });
                          }
                        }}
                        placeholder="HH:mm"
                        fullWidth
                        slotProps={{
                          inputLabel: { shrink: true },
                        }}
                      />
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
          onSelect={() => {}} // Não usado em modo múltiplo
          userId={user.id}
          multiSelect={true}
          selectedFiles={selectedFiles}
          onSelectionChange={handleGoogleDriveSelect}
        />
      )}
    </Stack>
  );
};

