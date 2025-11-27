import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublishIcon from '@mui/icons-material/Publish';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AuthTextField } from '@/components/auth';
import {
  CharacterCounter,
  LoadingButton,
  useNotification,
} from '@/components/common';
import { MediaUploadArea } from '@/components/schedules/MediaUploadArea';
import { GoogleDriveBrowser } from '@/components/googleDrive/GoogleDriveBrowser';
import { useAuth } from '@/hooks/useAuth';
import { platformsRepository, videosRepository } from '@/services/database';
import type { Platform, VideoStatus } from '@/services/database/types';
import type { GoogleDriveFile } from '@/services/googleDrive';
import { extractFileIdFromUrl, getFileMetadata, getThumbnailUrl, isAuthenticated } from '@/services/googleDrive';
import { mapSupabaseError } from '@/utils/errorMessages';
import type { MediaType, PlatformType } from '@/utils/mediaTypes';
import {
  getMediaTypesByPlatform,
  getMediaTypeInfo,
} from '@/utils/mediaTypes';
import { initiateOAuthPopup } from '@/services/oauth';
import { getPlatformInfo, PLATFORM_LIST } from '@/utils/platforms';
import { isValidGoogleDriveUrl } from '@/utils/validation';

export const NewSchedulePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: videoId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const isEditing = Boolean(videoId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urlDrive, setUrlDrive] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTimeDisplay, setScheduledTimeDisplay] = useState('');
  const [status, setStatus] = useState<VideoStatus>('draft');
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [googleDriveBrowserOpen, setGoogleDriveBrowserOpen] = useState(false);
  const [platformMediaTypes, setPlatformMediaTypes] = useState<Record<string, MediaType>>({});
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [googleDriveConnectDialogOpen, setGoogleDriveConnectDialogOpen] = useState(false);
  const [checkingGoogleDrive, setCheckingGoogleDrive] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    urlDrive?: string;
    scheduledDate?: string;
    platforms?: string;
    platformMediaTypes?: Record<string, string>;
  }>({});

  const checkGoogleDriveConnection = useCallback(async () => {
    if (!user?.id) return;

    try {
      setCheckingGoogleDrive(true);
      const connected = await isAuthenticated(user.id);
      setIsGoogleDriveConnected(connected);
    } catch (err) {
      setIsGoogleDriveConnected(false);
      // Não logar erro repetidamente - apenas em modo de desenvolvimento
      if (import.meta.env.DEV) {
        console.warn('[NewSchedulePage] Google Drive não conectado ou token expirado');
      }
    } finally {
      setCheckingGoogleDrive(false);
    }
  }, [user?.id]);

  const loadPlatforms = useCallback(async () => {
    if (!user?.id) return;

    try {
      setPlatformsLoading(true);
      const userPlatforms = await platformsRepository.listByUser(user.id);
      // Filtrar apenas plataformas de publicação conectadas (com apiToken) e não Google Drive
      const connectedPlatforms = userPlatforms.filter(
        (p) => p.name !== 'google-drive' && p.apiToken && getPlatformInfo(p.name) !== null,
      );
      setAvailablePlatforms(connectedPlatforms);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setPlatformsLoading(false);
    }
  }, [user?.id, showError]);

  const loadVideoForEdit = useCallback(async (id: string) => {
    if (!user?.id) return;

    try {
      setLoadingVideo(true);
      const video = await videosRepository.getById(id);
      
      if (!video) {
        showError('Vídeo não encontrado');
        navigate('/schedules');
        return;
      }

      // Verificar se o vídeo pertence ao usuário
      if (video.userId !== user.id) {
        showError('Você não tem permissão para editar este vídeo');
        navigate('/schedules');
        return;
      }

      // Preencher campos do formulário
      setTitle(video.title);
      setDescription(video.description || '');
      setUrlDrive(video.urlDrive);
      
      // Preencher data e hora
      if (video.scheduledDate) {
        const date = new Date(video.scheduledDate);
        setScheduledDate(date.toISOString().split('T')[0]); // YYYY-MM-DD
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setScheduledTimeDisplay(`${hours}:${minutes}`);
      }

      // Preencher plataformas selecionadas e tipos de mídia
      // Nota: Precisamos carregar as plataformas primeiro para mapear corretamente
      const userPlatforms = await platformsRepository.listByUser(user.id);
      const connectedPlatforms = userPlatforms.filter(
        (p) => p.name !== 'google-drive' && p.apiToken && getPlatformInfo(p.name) !== null,
      );
      
      if (video.selectedPlatformIds && video.selectedPlatformIds.length > 0) {
        setSelectedPlatformIds(video.selectedPlatformIds);
      }

      // Preencher tipos de mídia por plataforma
      if (video.platformMediaTypes && video.selectedPlatformIds) {
        const platformMediaTypesMap: Record<string, MediaType> = {};
        video.selectedPlatformIds.forEach((platformId) => {
          const platform = connectedPlatforms.find((p) => p.id === platformId);
          if (platform && video.platformMediaTypes?.[platform.name]) {
            platformMediaTypesMap[platformId] = video.platformMediaTypes[platform.name] as MediaType;
          }
        });
        setPlatformMediaTypes(platformMediaTypesMap);
      }

      // Buscar thumbnail do Google Drive
      try {
        if (isValidGoogleDriveUrl(video.urlDrive)) {
          const fileId = extractFileIdFromUrl(video.urlDrive);
          if (fileId) {
            const metadata = await getFileMetadata(user.id, fileId);
            if (metadata?.thumbnailLink) {
              const thumbnail = getThumbnailUrl(metadata.thumbnailLink, 'low');
              setVideoThumbnail(thumbnail);
            }
          }
        }
      } catch (err) {
        // Se falhar ao buscar thumbnail, continuar sem ele
        console.warn('[NewSchedulePage] Erro ao buscar thumbnail:', err);
      }
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
      navigate('/schedules');
    } finally {
      setLoadingVideo(false);
    }
  }, [user?.id, navigate, showError]);

  useEffect(() => {
    if (user?.id) {
      loadPlatforms();
      checkGoogleDriveConnection();
    }
  }, [user?.id, loadPlatforms, checkGoogleDriveConnection]);

  // Carregar vídeo para edição após carregar plataformas
  useEffect(() => {
    if (videoId && user?.id && availablePlatforms.length > 0 && !loadingVideo) {
      loadVideoForEdit(videoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, user?.id, availablePlatforms.length]);

  // Verificar conexão quando voltar da página de OAuth callback ou quando a página receber foco
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id) {
        void checkGoogleDriveConnection();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        void checkGoogleDriveConnection();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, checkGoogleDriveConnection]);

  // Preencher data/hora da URL se disponível
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');
    if (dateParam) {
      // Converter DD/MM/YYYY para YYYY-MM-DD (formato do input date)
      const dateParts = dateParam.split('/');
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        setScheduledDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    }
    if (timeParam) {
      setScheduledTimeDisplay(timeParam);
    }
  }, [searchParams]);

  // Limpar tipos de mídia de plataformas não mais selecionadas
  useEffect(() => {
    const selectedPlatformIdsSet = new Set(selectedPlatformIds);

    // Remover tipos de mídia de plataformas que não estão mais selecionadas
    setPlatformMediaTypes((prev) => {
      const cleanedMediaTypes: Record<string, MediaType> = {};
      Object.entries(prev).forEach(([platformId, mediaType]) => {
        if (selectedPlatformIdsSet.has(platformId)) {
          cleanedMediaTypes[platformId] = mediaType;
        }
      });
      
      // Só atualizar se houver mudança
      if (Object.keys(cleanedMediaTypes).length !== Object.keys(prev).length) {
        return cleanedMediaTypes;
      }
      return prev;
    });

    // Limpar erros de tipo de mídia ao remover plataformas
    setFormErrors((prev) => {
      if (!prev.platformMediaTypes || Object.keys(prev.platformMediaTypes).length === 0) {
        return prev;
      }

      const cleanedErrors: Record<string, string> = {};
      Object.entries(prev.platformMediaTypes).forEach(([platformId, error]) => {
        if (selectedPlatformIdsSet.has(platformId)) {
          cleanedErrors[platformId] = error;
        }
      });
      
      // Só atualizar se houver mudança
      if (Object.keys(cleanedErrors).length !== Object.keys(prev.platformMediaTypes).length) {
        return {
          ...prev,
          platformMediaTypes: Object.keys(cleanedErrors).length > 0 ? cleanedErrors : undefined,
        };
      }
      return prev;
    });
  }, [selectedPlatformIds]);

  const handleGoogleDriveSelect = useCallback(
    async (file: GoogleDriveFile) => {
      // Preencher URL do Google Drive
      setUrlDrive(file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`);

      // Preencher título se estiver vazio
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remover extensão do nome
      }

      // Buscar thumbnail
      const thumbnail = getThumbnailUrl(file.thumbnailLink, 'low');
      setVideoThumbnail(thumbnail);

      // Limpar erro de URL
      setFormErrors((prev) => ({ ...prev, urlDrive: undefined }));
    },
    [title],
  );

  // Buscar thumbnail quando URL for alterada manualmente
  useEffect(() => {
    const fetchThumbnailFromUrl = async () => {
      if (!urlDrive || !user?.id || !isValidGoogleDriveUrl(urlDrive)) {
        setVideoThumbnail(null);
        return;
      }

      const fileId = extractFileIdFromUrl(urlDrive);
      if (!fileId) {
        setVideoThumbnail(null);
        return;
      }

      try {
        const metadata = await getFileMetadata(user.id, fileId);
        if (metadata?.thumbnailLink) {
          const thumbnail = getThumbnailUrl(metadata.thumbnailLink, 'low');
          setVideoThumbnail(thumbnail);
        } else {
          setVideoThumbnail(null);
        }
      } catch (err) {
        // Se falhar, apenas não mostrar thumbnail
        setVideoThumbnail(null);
      }
    };

    const timeoutId = setTimeout(() => {
      void fetchThumbnailFromUrl();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [urlDrive, user?.id]);

  const validateForm = useCallback(() => {
    const errors: {
      title?: string;
      urlDrive?: string;
      scheduledDate?: string;
      platforms?: string;
      platformMediaTypes?: Record<string, string>;
    } = {};

    if (!title.trim()) {
      errors.title = 'Informe o título do vídeo.';
    } else if (title.trim().length < 3) {
      errors.title = 'O título deve ter pelo menos 3 caracteres.';
    } else if (title.trim().length > 200) {
      errors.title = 'O título não pode ter mais de 200 caracteres.';
    }

    if (!urlDrive.trim()) {
      errors.urlDrive = 'Informe a URL do Google Drive.';
    } else if (!isValidGoogleDriveUrl(urlDrive.trim())) {
      errors.urlDrive =
        'Informe uma URL válida do Google Drive. Exemplo: https://drive.google.com/file/d/ID_DO_ARQUIVO/view';
    }

    const hasDate = scheduledDate.trim().length > 0;
    const hasTime = scheduledTimeDisplay.trim().length > 0;

    // Se houver data/hora agendada, validar que pelo menos uma plataforma foi selecionada
    if (hasDate && hasTime) {
      if (selectedPlatformIds.length === 0) {
        errors.platforms = 'Selecione pelo menos uma plataforma para publicação quando houver agendamento.';
      } else {
        // Validar que cada plataforma selecionada tem um tipo de mídia escolhido
        const platformMediaTypeErrors: Record<string, string> = {};
        selectedPlatformIds.forEach((platformId) => {
          if (!platformMediaTypes[platformId]) {
            const platform = availablePlatforms.find((p) => p.id === platformId);
            const platformName = platform ? getPlatformInfo(platform.name)?.displayName || platform.name : 'Plataforma';
            platformMediaTypeErrors[platformId] = `Selecione o tipo de mídia para ${platformName}.`;
          }
        });
        
        if (Object.keys(platformMediaTypeErrors).length > 0) {
          errors.platformMediaTypes = platformMediaTypeErrors;
        }
      }
    }

    if (hasDate || hasTime) {
      if (!hasDate) {
        errors.scheduledDate = 'Informe a data de agendamento.';
      } else if (!hasTime) {
        errors.scheduledDate = 'Informe a hora de agendamento.';
      } else {
        // Validar formato da data (YYYY-MM-DD)
        const dateMatch = scheduledDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!dateMatch) {
          errors.scheduledDate = 'Data inválida.';
        } else {
          const [, year, month, day] = dateMatch;
          const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          if (
            date.getDate() !== parseInt(day, 10) ||
            date.getMonth() !== parseInt(month, 10) - 1 ||
            date.getFullYear() !== parseInt(year, 10)
          ) {
            errors.scheduledDate = 'Data inválida.';
          } else {
            // Verificar se a data não é no passado (comparar apenas data, não hora)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
              errors.scheduledDate = 'A data de agendamento deve ser futura ou hoje.';
            }
          }
        }

        // Validar formato da hora
        const timeMatch = scheduledTimeDisplay.match(/^(\d{2}):(\d{2})$/);
        if (!timeMatch) {
          errors.scheduledDate = 'Formato de hora inválido. Use HH:mm.';
        } else {
          const [, hours, minutes] = timeMatch;
          const hour = parseInt(hours, 10);
          const minute = parseInt(minutes, 10);
          if (hour > 23 || minute > 59) {
            errors.scheduledDate = 'Hora inválida.';
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [
    title,
    urlDrive,
    scheduledDate,
    scheduledTimeDisplay,
    selectedPlatformIds,
    platformMediaTypes,
    availablePlatforms,
  ]);

  const handleSave = useCallback(async () => {
    if (!user?.id || !validateForm()) return;

    try {
      setLoading(true);

      // Converter data e hora para ISO string
      let scheduledDateISO: string | null = null;
      if (scheduledDate && scheduledTimeDisplay) {
        const timeMatch = scheduledTimeDisplay.match(/^(\d{2}):(\d{2})$/);
        if (timeMatch) {
          const [, hours, minutes] = timeMatch;
          // scheduledDate já está no formato YYYY-MM-DD
          const date = new Date(`${scheduledDate}T${hours}:${minutes}:00`);
          scheduledDateISO = date.toISOString();
        }
      }

      // Preparar platform_media_types: mapear tipo de mídia por plataforma
      // Construir mapeamento de tipos de mídia por plataforma
      const platformMediaTypesMap: Record<string, string> = {};
      selectedPlatformIds.forEach((platformId) => {
        const platform = availablePlatforms.find((p) => p.id === platformId);
        const mediaType = platformMediaTypes[platformId];
        if (platform && mediaType) {
          platformMediaTypesMap[platform.name] = mediaType;
        }
      });

      // Determinar tipo de mídia principal (usar o primeiro tipo selecionado, se houver)
      const primaryMediaType = selectedPlatformIds.length > 0 && platformMediaTypes[selectedPlatformIds[0]]
        ? platformMediaTypes[selectedPlatformIds[0]]
        : null;

      if (isEditing && videoId) {
        // Atualizar vídeo existente
        await videosRepository.update(videoId, {
          title,
          description: description || null,
          urlDrive,
          scheduledDate: scheduledDateISO,
          status: scheduledDateISO ? 'scheduled' : 'draft',
          selectedPlatformIds: selectedPlatformIds.length > 0 ? selectedPlatformIds : null,
          mediaType: primaryMediaType,
          platformMediaTypes: Object.keys(platformMediaTypesMap).length > 0 ? platformMediaTypesMap : null,
        });

        showSuccess('Agendamento atualizado com sucesso!');
        navigate(`/videos/${videoId}`);
      } else {
        // Criar novo vídeo
        await videosRepository.create({
          userId: user.id,
          title,
          description: description || null,
          urlDrive,
          scheduledDate: scheduledDateISO,
          status: scheduledDateISO ? 'scheduled' : 'draft',
          selectedPlatformIds: selectedPlatformIds.length > 0 ? selectedPlatformIds : null,
          mediaType: primaryMediaType,
          platformMediaTypes: Object.keys(platformMediaTypesMap).length > 0 ? platformMediaTypesMap : null,
        });

        showSuccess('Agendamento criado com sucesso!');
        navigate('/schedules');
      }
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    title,
    description,
    urlDrive,
    scheduledDate,
    scheduledTimeDisplay,
    selectedPlatformIds,
    platformMediaTypes,
    availablePlatforms,
    validateForm,
    navigate,
    showSuccess,
    showError,
  ]);

  const handleFileSelect = useCallback((file: File) => {
    // Por enquanto, apenas mostrar que o arquivo foi selecionado
    // Em produção, você pode fazer upload para o servidor ou armazenar localmente
    console.log('Arquivo selecionado:', file.name, file.type);
    // TODO: Implementar upload de arquivo local
  }, []);

  const handlePublishNow = useCallback(async () => {
    if (!user?.id || !videoId) return;

    try {
      setPublishingNow(true);

      // Atualizar o vídeo para ser processado agora
      const now = new Date().toISOString();
      await videosRepository.update(videoId, {
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
      
      // Redirecionar para a página de detalhes após um momento
      setTimeout(() => {
        navigate(`/videos/${videoId}`);
      }, 1500);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setPublishingNow(false);
    }
  }, [user?.id, videoId, navigate, showSuccess, showError]);

  const handleGoogleDriveSelectClick = useCallback(async () => {
    if (!user?.id) {
      showError('Usuário não autenticado');
      return;
    }

    // Verificar se o Google Drive está conectado
    try {
      const connected = await isAuthenticated(user.id);
      if (!connected) {
        // Mostrar dialog para conectar
        setGoogleDriveConnectDialogOpen(true);
        return;
      }
      // Se conectado, abrir o modal
      setGoogleDriveBrowserOpen(true);
    } catch (err) {
      // Se houver erro, assumir que não está conectado
      setGoogleDriveConnectDialogOpen(true);
    }
  }, [user?.id, showError]);

  const handleConnectGoogleDrive = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Verificar se a plataforma Google Drive já existe
      const userPlatforms = await platformsRepository.listByUser(user.id);
      const googleDrivePlatform = userPlatforms.find((p) => p.name === 'google-drive');

      if (!googleDrivePlatform) {
        // Criar plataforma Google Drive se não existir
        await platformsRepository.create({
          userId: user.id,
          name: 'google-drive',
          apiToken: null,
        });
      }

      // Iniciar fluxo OAuth em popup
      const platformInfo = PLATFORM_LIST.find((p) => p.type === 'google-drive');
      if (!platformInfo) {
        showError('Plataforma Google Drive não encontrada');
        return;
      }

      setGoogleDriveConnectDialogOpen(false);
      
      // Iniciar OAuth em popup e aguardar resultado
      const result = await initiateOAuthPopup('google-drive', user.id, '/schedules/new');
      
      if (result.success) {
        showSuccess('Google Drive conectado com sucesso!');
        // Verificar conexão novamente
        await checkGoogleDriveConnection();
      } else if (result.error) {
        showError(result.error);
      }
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    }
  }, [user?.id, showError, showSuccess, checkGoogleDriveConnection]);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/schedules')}
          disabled={loading}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1" fontWeight={700}>
          {isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}
        </Typography>
      </Box>

      {(loadingVideo && isEditing) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Formulário Principal */}
        <Box sx={{ flex: { xs: '1', lg: '2' }, minWidth: 0 }}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                {/* Título */}
                <Stack spacing={1}>
                  <AuthTextField
                    label="Título do vídeo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={Boolean(formErrors.title)}
                    helperText={formErrors.title}
                    fullWidth
                    inputProps={{ maxLength: 200 }}
                    required
                  />
                  {!formErrors.title && (
                    <CharacterCounter current={title.length} max={200} min={3} showMin />
                  )}
                </Stack>

                {/* Descrição */}
                <Stack spacing={1}>
                  <AuthTextField
                    label="Descrição (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    inputProps={{ maxLength: 1000 }}
                  />
                  <CharacterCounter current={description.length} max={1000} />
                </Stack>

                {/* Seletor de Plataformas */}
                {availablePlatforms.length > 0 && (
                  <Stack spacing={1}>
                    <FormControl error={Boolean(formErrors.platforms)} fullWidth>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Plataformas para publicação *
                      </Typography>
                      <FormGroup>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {availablePlatforms.map((platform) => {
                            const platformInfo = getPlatformInfo(platform.name);
                            const platformDisplayName = platformInfo?.displayName || platform.name;
                            return (
                              <FormControlLabel
                                key={platform.id}
                                control={
                                  <Checkbox
                                    checked={selectedPlatformIds.includes(platform.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPlatformIds([...selectedPlatformIds, platform.id]);
                                      } else {
                                        setSelectedPlatformIds(
                                          selectedPlatformIds.filter((id) => id !== platform.id),
                                        );
                                        // Remover tipo de mídia da plataforma removida
                                        setPlatformMediaTypes((prev) => {
                                          const updated = { ...prev };
                                          delete updated[platform.id];
                                          return updated;
                                        });
                                        // Remover erro de tipo de mídia da plataforma removida
                                        setFormErrors((prev) => {
                                          const updated = { ...prev };
                                          if (updated.platformMediaTypes) {
                                            const updatedPlatformErrors = { ...updated.platformMediaTypes };
                                            delete updatedPlatformErrors[platform.id];
                                            updated.platformMediaTypes = Object.keys(updatedPlatformErrors).length > 0
                                              ? updatedPlatformErrors
                                              : undefined;
                                          }
                                          return updated;
                                        });
                                      }
                                      // Limpar erro ao selecionar
                                      if (formErrors.platforms) {
                                        setFormErrors((prev) => ({ ...prev, platforms: undefined }));
                                      }
                                    }}
                                  />
                                }
                                label={platformDisplayName}
                              />
                            );
                          })}
                        </Stack>
                      </FormGroup>
                      {formErrors.platforms && (
                        <FormHelperText error sx={{ mt: 0.5 }}>
                          {formErrors.platforms}
                        </FormHelperText>
                      )}
                      <FormHelperText sx={{ mt: 0.5 }}>
                        Selecione em quais plataformas este vídeo será publicado
                      </FormHelperText>
                    </FormControl>
                  </Stack>
                )}

                {/* Seletor de Tipo de Mídia por Plataforma */}
                {selectedPlatformIds.length > 0 && (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Tipo de Mídia por Plataforma *
                    </Typography>
                    {selectedPlatformIds.map((platformId) => {
                      const platform = availablePlatforms.find((p) => p.id === platformId);
                      if (!platform) return null;

                      const platformInfo = getPlatformInfo(platform.name);
                      const platformDisplayName = platformInfo?.displayName || platform.name;
                      const platformType = platform.name as PlatformType;
                      const availableMediaTypes = getMediaTypesByPlatform(platformType);
                      const selectedMediaType = platformMediaTypes[platformId] || '';
                      const platformError = formErrors.platformMediaTypes?.[platformId];

                      return (
                        <Stack key={platformId} spacing={1}>
                          <FormControl error={Boolean(platformError)} fullWidth>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                              {platformDisplayName}
                            </Typography>
                            <Select
                              value={selectedMediaType}
                              onChange={(e) => {
                                const selectedMediaType = e.target.value as MediaType;
                                setPlatformMediaTypes((prev) => ({
                                  ...prev,
                                  [platformId]: selectedMediaType,
                                }));
                                
                                // Limpar erro ao selecionar
                                if (platformError) {
                                  setFormErrors((prev) => {
                                    const updated = { ...prev };
                                    if (updated.platformMediaTypes) {
                                      const updatedPlatformErrors = { ...updated.platformMediaTypes };
                                      delete updatedPlatformErrors[platformId];
                                      updated.platformMediaTypes = Object.keys(updatedPlatformErrors).length > 0
                                        ? updatedPlatformErrors
                                        : undefined;
                                    }
                                    return updated;
                                  });
                                }
                              }}
                              displayEmpty
                              error={Boolean(platformError)}
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
                            {platformError && (
                              <FormHelperText error sx={{ mt: 0.5 }}>
                                {platformError}
                              </FormHelperText>
                            )}
                          </FormControl>
                        </Stack>
                      );
                    })}
                    <FormHelperText sx={{ color: 'text.secondary' }}>
                      Selecione o tipo de mídia que será publicado em cada plataforma selecionada
                    </FormHelperText>
                  </Stack>
                )}

                {/* Data e Hora */}
                <Stack direction="row" spacing={2}>
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <TextField
                      label="Data de agendamento"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => {
                        setScheduledDate(e.target.value);
                        // Limpar erro ao selecionar data
                        if (formErrors.scheduledDate) {
                          setFormErrors((prev) => ({ ...prev, scheduledDate: undefined }));
                        }
                      }}
                      error={Boolean(formErrors.scheduledDate)}
                      fullWidth
                      slotProps={{
                        inputLabel: { shrink: true },
                        input: {
                          min: new Date().toISOString().split('T')[0], // Data mínima: hoje
                        },
                      }}
                      helperText={formErrors.scheduledDate || 'Selecione a data de agendamento'}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Stack>

              <Stack spacing={1} sx={{ flex: 1 }}>
                <TextField
                  label="Hora de agendamento"
                  value={scheduledTimeDisplay}
                  onChange={(e) => {
                    let value = e.target.value;
                    value = value.replace(/[^\d:]/g, '');

                    if (value.length <= 2) {
                      setScheduledTimeDisplay(value);
                    } else if (value.length <= 5) {
                      if (value.length === 3 && !value.includes(':')) {
                        value = value.slice(0, 2) + ':' + value.slice(2);
                      }
                      setScheduledTimeDisplay(value);
                    } else {
                      setScheduledTimeDisplay(value.slice(0, 5));
                    }
                  }}
                  placeholder="HH:mm"
                  error={Boolean(formErrors.scheduledDate)}
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                  helperText="Ex: 14:30"
                />
              </Stack>
            </Stack>
            {formErrors.scheduledDate && (
              <FormHelperText error sx={{ mt: -1, ml: 1.5 }}>
                {formErrors.scheduledDate}
              </FormHelperText>
            )}
            <FormHelperText sx={{ ml: 1.5, color: 'text.secondary' }}>
              <strong>Rascunho:</strong> Salva o vídeo sem agendar. Você pode editar e agendar depois.
              <br />
              <strong>Agendado:</strong> Preencha data, hora e selecione as plataformas. O vídeo será publicado automaticamente na data agendada.
              <br />
              Deixe ambos os campos em branco para salvar como rascunho.
            </FormHelperText>

                {/* Actions */}
                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                  <Button onClick={() => navigate('/schedules')} disabled={loading || publishingNow}>
                    Cancelar
                  </Button>
                  {isEditing && status === 'scheduled' && (
                    <LoadingButton
                      variant="outlined"
                      color="primary"
                      startIcon={<PublishIcon />}
                      onClick={handlePublishNow}
                      loading={publishingNow}
                      loadingText="Publicando..."
                      disabled={loading || loadingVideo}
                    >
                      Publicar Agora
                    </LoadingButton>
                  )}
                  <LoadingButton
                    variant="contained"
                    onClick={handleSave}
                    loading={loading || loadingVideo}
                    loadingText={isEditing ? 'Salvando...' : 'Criando...'}
                    disabled={publishingNow}
                  >
                    {isEditing ? 'Salvar Alterações' : 'Criar Agendamento'}
                  </LoadingButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Sidebar de Upload */}
        <Box sx={{ flex: { xs: '1', lg: '1' }, minWidth: { xs: '100%', lg: 400 }, maxWidth: { xs: '100%', lg: 450 } }}>
          <MediaUploadArea
            urlDrive={urlDrive}
            onUrlChange={setUrlDrive}
            onGoogleDriveSelect={handleGoogleDriveSelectClick}
            onFileSelect={handleFileSelect}
            thumbnail={videoThumbnail}
            userId={user?.id}
            isGoogleDriveConnected={isGoogleDriveConnected}
            checkingGoogleDrive={checkingGoogleDrive}
          />
        </Box>
      </Box>
      )}

      {/* Dialog para conectar Google Drive */}
      <Dialog open={googleDriveConnectDialogOpen} onClose={() => setGoogleDriveConnectDialogOpen(false)}>
        <DialogTitle>Conectar Google Drive</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              O Google Drive não está conectado. Conecte sua conta para selecionar vídeos diretamente do Drive.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Você será redirecionado para autorizar o acesso ao seu Google Drive. Depois de autorizar, você poderá
              selecionar vídeos do Drive para agendar.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoogleDriveConnectDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConnectGoogleDrive}>
            Conectar Google Drive
          </Button>
        </DialogActions>
      </Dialog>

      {user?.id && isGoogleDriveConnected && (
        <GoogleDriveBrowser
          open={googleDriveBrowserOpen}
          onClose={() => setGoogleDriveBrowserOpen(false)}
          onSelect={handleGoogleDriveSelect}
          userId={user.id}
        />
      )}
    </Stack>
  );
};

