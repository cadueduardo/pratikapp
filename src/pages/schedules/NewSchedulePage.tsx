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
import { AIChatDialog } from '@/components/schedules/AIChatDialog';
import { HashtagManager } from '@/components/schedules/HashtagManager';
import { MediaUploadArea } from '@/components/schedules/MediaUploadArea';
import { ThumbnailUploader } from '@/components/schedules/ThumbnailUploader';
import { GoogleDriveBrowser } from '@/components/googleDrive/GoogleDriveBrowser';
import { useAuth } from '@/hooks/useAuth';
import { platformsRepository, usersRepository, videosRepository, postsRepository } from '@/services/database';
import type { Platform, VideoStatus } from '@/services/database/types';
import type { GoogleDriveFile } from '@/services/googleDrive';
import { extractFileIdFromUrl, getFileMetadata, getThumbnailUrl, isAuthenticated } from '@/services/googleDrive';
import { uploadThumbnail } from '@/services/storage';
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
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState<string | null>(null);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null); // Duração em segundos
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // URL do vídeo para preview

  // Função wrapper para limpar URL e thumbnail
  const handleUrlChange = useCallback((url: string) => {
    setUrlDrive(url);
    // Se a URL for limpa, também limpar a thumbnail, duração e URL do vídeo
    if (!url) {
      // Limpar arquivo local se houver
      setSelectedLocalFile(null);
      // Limpar object URLs se existirem
      if (videoThumbnail && videoThumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(videoThumbnail);
      }
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoThumbnail(null);
      setVideoDuration(null);
      setVideoUrl(null);
    }
  }, [videoThumbnail, videoUrl]);

  // Limpar object URLs quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (videoThumbnail && videoThumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(videoThumbnail);
      }
    };
  }, [videoThumbnail]);
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
  const [aiAutoGenerate, setAiAutoGenerate] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null); // Arquivo local selecionado
  const [platformHashtags, setPlatformHashtags] = useState<Record<string, string[]>>({});
  const [aiChatDialogOpen, setAiChatDialogOpen] = useState(false);
  const [pendingHashtags, setPendingHashtags] = useState<string[]>([]);

  // Distribuir hashtags pendentes quando forem geradas ou quando plataformas forem selecionadas
  useEffect(() => {
    if (pendingHashtags.length > 0 && selectedPlatformIds.length > 0) {
      // Distribuir hashtags para TODAS as plataformas selecionadas (espelhar)
      const updated: Record<string, string[]> = { ...platformHashtags };

      selectedPlatformIds.forEach((platformId) => {
        // Sempre atualizar com as hashtags pendentes (espelhar)
        updated[platformId] = [...pendingHashtags];
      });

      setPlatformHashtags(updated);
      // Limpar hashtags pendentes após distribuir
      setPendingHashtags([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHashtags.length, selectedPlatformIds.join(',')]);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    urlDrive?: string;
    scheduledDate?: string;
    platforms?: string;
    platformMediaTypes?: Record<string, string>;
    media?: string; // Erro geral para mídia não selecionada
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
      setCustomThumbnailUrl(video.customThumbnailUrl || null);
      
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

      // Carregar platformHashtags
      if (video.platformHashtags) {
        // Converter de formato {platformName: hashtags[]} para {platformId: hashtags[]}
        const platformHashtagsMap: Record<string, string[]> = {};
        if (video.selectedPlatformIds) {
          video.selectedPlatformIds.forEach((platformId) => {
            const platform = connectedPlatforms.find((p) => p.id === platformId);
            if (platform && video.platformHashtags?.[platform.name]) {
              platformHashtagsMap[platformId] = video.platformHashtags[platform.name];
            }
          });
        }
        setPlatformHashtags(platformHashtagsMap);
      }

      // Buscar thumbnail, duração e URL do vídeo do Google Drive
      try {
        // Se houver thumbnail customizada, definir primeiro
        if (video.customThumbnailUrl) {
          setVideoThumbnail(video.customThumbnailUrl);
        }
        
        if (isValidGoogleDriveUrl(video.urlDrive)) {
          const fileId = extractFileIdFromUrl(video.urlDrive);
          if (fileId) {
            const metadata = await getFileMetadata(user.id, fileId);
            if (metadata) {
              // Só buscar thumbnail do Google Drive se não houver thumbnail customizada
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
                  // Usar a Edge Function proxy-google-drive-video com userId
                  setVideoUrl(`${supabaseUrl}/functions/v1/proxy-google-drive-video?fileId=${fileId}&userId=${user.id}`);
                } else {
                  // Fallback: URL direta (pode não funcionar sem autenticação)
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
      
      // Carregar configuração de geração automática da IA
      const loadAIConfig = async () => {
        try {
          const userData = await usersRepository.getById(user.id);
          if (userData) {
            setAiAutoGenerate(userData.aiAutoGenerate);
          }
        } catch (err) {
          // Silenciosamente falhar - usuário pode não ter dados ainda
          console.warn('Erro ao carregar configuração de IA:', err);
        }
      };
      void loadAIConfig();
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
      // Limpar arquivo local se houver
      setSelectedLocalFile(null);
      
      // Preencher URL do Google Drive
      const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
      setUrlDrive(driveUrl);
      
      // Armazenar fileId para geração de IA
      setSelectedFileId(file.id);

      // Preencher título se estiver vazio
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remover extensão do nome
      }

      // Buscar thumbnail apenas se não houver thumbnail customizada
      // Verificar customThumbnailUrl para garantir prioridade
      if (!customThumbnailUrl) {
        const thumbnail = await getThumbnailUrl(file.thumbnailLink, 'low', file.id, file.mimeType, user.id);
        if (thumbnail) {
          // Verificar novamente antes de definir (pode ter sido definida durante a busca assíncrona)
          if (!customThumbnailUrl) {
            setVideoThumbnail(thumbnail);
          }
        }
      }

      // Buscar duração do vídeo se for um vídeo
      if (file.mimeType?.startsWith('video/')) {
        if (file.videoMediaMetadata?.durationMillis) {
          const durationSeconds = Math.floor(parseInt(file.videoMediaMetadata.durationMillis, 10) / 1000);
          setVideoDuration(durationSeconds);
        } else {
          // Se não tiver duração nos metadados, buscar novamente com campos completos
          try {
            const metadata = await getFileMetadata(user.id, file.id);
            if (metadata?.videoMediaMetadata?.durationMillis) {
              const durationSeconds = Math.floor(parseInt(metadata.videoMediaMetadata.durationMillis, 10) / 1000);
              setVideoDuration(durationSeconds);
            } else {
              setVideoDuration(null);
            }
          } catch (err) {
            console.warn('Erro ao buscar duração do vídeo:', err);
            setVideoDuration(null);
          }
        }
        
        // Definir URL do vídeo para preview usando Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
          // Usar a Edge Function proxy-google-drive-video com userId
          setVideoUrl(`${supabaseUrl}/functions/v1/proxy-google-drive-video?fileId=${file.id}&userId=${user.id}`);
        } else {
          // Fallback: URL direta (pode não funcionar sem autenticação)
          setVideoUrl(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
        }
      } else {
        setVideoDuration(null);
        setVideoUrl(null);
      }

      // Limpar erro de URL
      setFormErrors((prev) => ({ ...prev, urlDrive: undefined }));
    },
    [title, user?.id, showSuccess, customThumbnailUrl],
  );

  // Buscar thumbnail quando URL for alterada manualmente
  useEffect(() => {
    const fetchThumbnailFromUrl = async () => {
      if (!urlDrive || !user?.id || !isValidGoogleDriveUrl(urlDrive)) {
        // Só limpar se não houver thumbnail customizada
        if (!customThumbnailUrl) {
          setVideoThumbnail(null);
        }
        setSelectedFileId(null);
        return;
      }

      const fileId = extractFileIdFromUrl(urlDrive);
      if (!fileId) {
        // Só limpar se não houver thumbnail customizada
        if (!customThumbnailUrl) {
          setVideoThumbnail(null);
        }
        setSelectedFileId(null);
        return;
      }

      // Armazenar fileId para geração de IA
      setSelectedFileId(fileId);

      // Se já houver thumbnail customizada, não buscar do Google Drive
      if (customThumbnailUrl) {
        return;
      }

      try {
            const metadata = await getFileMetadata(user.id, fileId);
            if (metadata) {
              // Só buscar thumbnail do Google Drive se não houver thumbnail customizada
              // Verificar novamente customThumbnailUrl para garantir que não foi definida durante a busca
              if (!customThumbnailUrl) {
                const thumbnail = await getThumbnailUrl(metadata.thumbnailLink, 'low', metadata.id, metadata.mimeType, user.id);
                if (thumbnail) {
                  // Verificar novamente antes de definir (pode ter sido definida durante a busca assíncrona)
                  if (!customThumbnailUrl) {
                    setVideoThumbnail(thumbnail);
                  }
                }
              }
        } else {
          // Só limpar se não houver thumbnail customizada
          if (!customThumbnailUrl) {
            setVideoThumbnail(null);
          }
        }
      } catch (err) {
        // Se falhar, apenas não mostrar thumbnail se não houver customizada
        if (!customThumbnailUrl) {
          setVideoThumbnail(null);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      void fetchThumbnailFromUrl();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [urlDrive, user?.id, customThumbnailUrl]);

  const validateForm = useCallback(() => {
    const errors: {
      title?: string;
      urlDrive?: string;
      scheduledDate?: string;
      platforms?: string;
      platformMediaTypes?: Record<string, string>;
      media?: string; // Erro geral para mídia não selecionada
    } = {};

    if (!title.trim()) {
      errors.title = 'Informe o título do vídeo.';
    } else if (title.trim().length < 3) {
      errors.title = 'O título deve ter pelo menos 3 caracteres.';
    } else if (title.trim().length > 200) {
      errors.title = 'O título não pode ter mais de 200 caracteres.';
    }

    // Validar se há mídia selecionada (arquivo local OU URL do Google Drive)
    const hasLocalFile = selectedLocalFile !== null;
    const hasGoogleDriveUrl = urlDrive.trim().length > 0 && isValidGoogleDriveUrl(urlDrive.trim());
    
    if (!hasLocalFile && !hasGoogleDriveUrl) {
      errors.media = 'Selecione um vídeo ou imagem. Faça upload de um arquivo local ou selecione um arquivo do Google Drive.';
      errors.urlDrive = 'Selecione um vídeo ou imagem para continuar.';
    } else if (hasGoogleDriveUrl && !isValidGoogleDriveUrl(urlDrive.trim())) {
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
    const isValid = Object.keys(errors).length === 0;
    
    // Se houver erro de mídia, mostrar toast
    if (!isValid && errors.media) {
      showError(errors.media);
    }
    
    return isValid;
  }, [
    title,
    urlDrive,
    scheduledDate,
    scheduledTimeDisplay,
    selectedPlatformIds,
    platformMediaTypes,
    availablePlatforms,
    selectedLocalFile,
    showError,
  ]);

  const handleSave = useCallback(async () => {
    if (!user?.id || !validateForm()) return;

    try {
      setLoading(true);

      // Converter data e hora para ISO string em UTC
      // IMPORTANTE: O YouTube espera o publishAt em formato ISO 8601 UTC (YYYY-MM-DDThh:mm:ssZ)
      // Criar a data no horário local e depois converter para UTC
      let scheduledDateISO: string | null = null;
      if (scheduledDate && scheduledTimeDisplay) {
        const timeMatch = scheduledTimeDisplay.match(/^(\d{2}):(\d{2})$/);
        if (timeMatch) {
          const [, hours, minutes] = timeMatch;
          // scheduledDate já está no formato YYYY-MM-DD
          // Criar data no horário local usando o construtor Date com parâmetros locais
          // Isso garante que a data seja interpretada no timezone local do navegador
          const [year, month, day] = scheduledDate.split('-').map(Number);
          const localDate = new Date(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          
          // Converter para ISO string (UTC) - formato esperado pelo YouTube
          // O YouTube espera: YYYY-MM-DDThh:mm:ssZ (sem milissegundos)
          const isoString = localDate.toISOString();
          // Remover milissegundos: 2025-12-09T14:45:00.000Z -> 2025-12-09T14:45:00Z
          scheduledDateISO = isoString.replace(/\.\d{3}Z$/, 'Z');
          
          // Verificar o timezone do usuário para logs
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const timezoneOffset = -localDate.getTimezoneOffset(); // Offset em minutos
          
          console.log('[NewSchedulePage] Conversão de data/hora:', {
            input: { scheduledDate, scheduledTimeDisplay },
            userTimezone,
            timezoneOffsetMinutes: timezoneOffset,
            timezoneOffsetHours: timezoneOffset / 60,
            localDateString: localDate.toLocaleString('pt-BR', { timeZone: userTimezone }),
            localTimeString: localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: userTimezone }),
            utcDateString: localDate.toUTCString(),
            isoString: scheduledDateISO,
            // Verificar se a conversão está correta
            expectedLocalTime: `${hours}:${minutes}`,
            actualLocalTime: localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: userTimezone }),
            // Verificar UTC equivalente
            utcTime: new Date(scheduledDateISO).toUTCString(),
          });
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

      // Converter platformHashtags de {platformId: hashtags[]} para {platformName: hashtags[]}
      const platformHashtagsMap: Record<string, string[]> = {};
      selectedPlatformIds.forEach((platformId) => {
        const platform = availablePlatforms.find((p) => p.id === platformId);
        const hashtags = platformHashtags[platformId];
        if (platform && hashtags && hashtags.length > 0) {
          platformHashtagsMap[platform.name] = hashtags;
        }
      });

      // Upload da thumbnail personalizada se houver arquivo
      let finalThumbnailUrl = customThumbnailUrl;
      if (customThumbnailFile) {
        const tempVideoId = videoId || `temp-${Date.now()}`;
        const uploadedUrl = await uploadThumbnail(user.id, tempVideoId, customThumbnailFile);
        if (uploadedUrl) {
          finalThumbnailUrl = uploadedUrl;
        }
      }

      let savedVideo;
      if (isEditing && videoId) {
        // Atualizar vídeo existente
        savedVideo = await videosRepository.update(videoId, {
          title,
          description: description || null,
          urlDrive,
          scheduledDate: scheduledDateISO,
          status: scheduledDateISO ? 'scheduled' : 'draft',
          selectedPlatformIds: selectedPlatformIds.length > 0 ? selectedPlatformIds : null,
          mediaType: primaryMediaType,
          platformMediaTypes: Object.keys(platformMediaTypesMap).length > 0 ? platformMediaTypesMap : null,
          platformHashtags: Object.keys(platformHashtagsMap).length > 0 ? platformHashtagsMap : null,
          customThumbnailUrl: finalThumbnailUrl,
        });

        // Se o vídeo foi criado com ID temporário e agora temos o ID real, fazer upload novamente
        if (customThumbnailFile && savedVideo.id !== videoId) {
          const uploadedUrl = await uploadThumbnail(user.id, savedVideo.id, customThumbnailFile);
          if (uploadedUrl) {
            savedVideo = await videosRepository.update(savedVideo.id, { customThumbnailUrl: uploadedUrl });
          }
        }
      } else {
        // Criar novo vídeo
        savedVideo = await videosRepository.create({
          userId: user.id,
          title,
          description: description || null,
          urlDrive,
          scheduledDate: scheduledDateISO,
          status: scheduledDateISO ? 'scheduled' : 'draft',
          selectedPlatformIds: selectedPlatformIds.length > 0 ? selectedPlatformIds : null,
          mediaType: primaryMediaType,
          platformMediaTypes: Object.keys(platformMediaTypesMap).length > 0 ? platformMediaTypesMap : null,
          platformHashtags: Object.keys(platformHashtagsMap).length > 0 ? platformHashtagsMap : null,
          customThumbnailUrl: finalThumbnailUrl,
        });

        // Se a thumbnail foi feita com ID temporário, fazer upload novamente com o ID real
        if (customThumbnailFile && savedVideo.id) {
          const uploadedUrl = await uploadThumbnail(user.id, savedVideo.id, customThumbnailFile);
          if (uploadedUrl) {
            savedVideo = await videosRepository.update(savedVideo.id, { customThumbnailUrl: uploadedUrl });
          }
        }
      }

      // Se há data agendada e plataformas selecionadas, enviar imediatamente para a plataforma
      console.log('[NewSchedulePage] ===== VERIFICANDO CONDIÇÕES PARA UPLOAD =====');
      console.log('[NewSchedulePage] Verificando condições para upload:', {
        scheduledDateISO,
        scheduledDate,
        scheduledTimeDisplay,
        selectedPlatformIds: selectedPlatformIds.length,
        selectedPlatformIdsArray: selectedPlatformIds,
        hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasSupabaseAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        savedVideoId: savedVideo?.id,
        savedVideoUrlDrive: savedVideo?.urlDrive,
      });

      if (scheduledDateISO && selectedPlatformIds.length > 0) {
        console.log('[NewSchedulePage] ✓ Condições atendidas, iniciando upload...');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
          const { supabaseClient } = await import('@/services/supabaseClient');
          const {
            data: { session },
          } = await supabaseClient.auth.getSession();

          console.log('[NewSchedulePage] Session:', { hasSession: !!session });

          if (session) {
            // Preparar descrição com hashtags
            let descriptionWithHashtags = description || '';
            selectedPlatformIds.forEach((platformId) => {
              const platform = availablePlatforms.find((p) => p.id === platformId);
              const hashtags = platformHashtags[platformId];
              if (platform && hashtags && hashtags.length > 0) {
                const platformInfo = getPlatformInfo(platform.name);
                if (platformInfo?.name === 'youtube') {
                  // Para YouTube, adicionar #Shorts se for shorts
                  const mediaType = platformMediaTypes[platformId];
                  if (mediaType === 'youtube-shorts') {
                    if (!descriptionWithHashtags.includes('#Shorts')) {
                      descriptionWithHashtags = `#Shorts\n\n${descriptionWithHashtags}`;
                    }
                  }
                  // Adicionar hashtags ao final
                  if (hashtags.length > 0) {
                    descriptionWithHashtags += `\n\n${hashtags.join(' ')}`;
                  }
                } else {
                  // Para outras plataformas, apenas adicionar hashtags
                  if (hashtags.length > 0) {
                    descriptionWithHashtags += `\n\n${hashtags.join(' ')}`;
                  }
                }
              }
            });

            // Enviar para cada plataforma selecionada
            console.log('[NewSchedulePage] Plataformas selecionadas:', selectedPlatformIds);
            console.log('[NewSchedulePage] Plataformas disponíveis:', availablePlatforms.map(p => ({ id: p.id, name: p.name })));
            
            for (const platformId of selectedPlatformIds) {
              const platform = availablePlatforms.find((p) => p.id === platformId);
              console.log('[NewSchedulePage] Processando plataforma:', { platformId, platform: platform ? { id: platform.id, name: platform.name } : null });
              
              if (!platform) {
                console.warn('[NewSchedulePage] Plataforma não encontrada:', platformId);
                continue;
              }

              const platformInfo = getPlatformInfo(platform.name);
              console.log('[NewSchedulePage] Platform info:', { name: platform.name, platformInfo: platformInfo?.name });
              
              if (platformInfo?.name === 'youtube') {
                console.log('[NewSchedulePage] Plataforma é YouTube, iniciando processo...');
                // Verificar se já existe um post para esta plataforma
                const existingPosts = await postsRepository.listByVideo(savedVideo.id);
                let post = existingPosts.find((p) => p.platformId === platformId);

                if (!post) {
                  console.log('[NewSchedulePage] Criando novo post...');
                  // Criar post
                  const newPost = await postsRepository.create({
                    videoId: savedVideo.id,
                    platformId: platform.id,
                    status: 'pending',
                  });
                  post = newPost; // RepositoryResult é Promise<T>, não { data: T }
                  console.log('[NewSchedulePage] Post criado:', post ? { id: post.id } : null);
                }

                if (post) {
                  console.log('[NewSchedulePage] Post disponível, verificando se já foi enviado...');
                  // Determinar se é Shorts
                  const mediaType = platformMediaTypes[platformId];
                  const isShorts = mediaType === 'youtube-shorts';

                  // Se o vídeo já foi enviado (tem platformVideoId), fazer update
                  if (post.platformVideoId) {
                    try {
                      const updateResponse = await fetch(`${supabaseUrl}/functions/v1/update-youtube-video`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${session.access_token}`,
                          apikey: supabaseAnonKey,
                        },
                        body: JSON.stringify({
                          platformVideoId: post.platformVideoId,
                          platformId: platform.id,
                          userId: user.id,
                          title: savedVideo.title,
                          description: descriptionWithHashtags,
                          publishAt: scheduledDateISO,
                          customThumbnailUrl: finalThumbnailUrl || undefined,
                          isShorts: isShorts,
                        }),
                      });

                      if (updateResponse.ok) {
                        // Atualizar status do vídeo
                        await videosRepository.update(savedVideo.id, {
                          status: 'scheduled',
                        });
                      } else {
                        const errorData = await updateResponse.json();
                        console.error('[NewSchedulePage] Erro ao atualizar vídeo:', errorData);
                        // Atualizar post com erro
                        await postsRepository.update(post.id, {
                          status: 'failed',
                          errorMessage: errorData.error || 'Erro ao atualizar vídeo',
                        });
                      }
                    } catch (updateError) {
                      console.error('[NewSchedulePage] Erro ao atualizar vídeo:', updateError);
                      await postsRepository.update(post.id, {
                        status: 'failed',
                        errorMessage: updateError instanceof Error ? updateError.message : 'Erro desconhecido',
                      });
                    }
                  } else {
                    // Vídeo ainda não foi enviado, fazer upload imediato com publishAt
                    console.log('[NewSchedulePage] Vídeo ainda não foi enviado, fazendo upload...');
                    console.log('[NewSchedulePage] Dados do upload:', {
                      videoId: savedVideo.id,
                      videoUrl: savedVideo.urlDrive,
                      platformId: platform.id,
                      publishAt: scheduledDateISO,
                      isShorts,
                      hasThumbnail: !!finalThumbnailUrl,
                      title: savedVideo.title,
                      descriptionLength: descriptionWithHashtags.length,
                    });
                    try {
                      console.log('[NewSchedulePage] Iniciando upload para YouTube:', {
                        videoId: savedVideo.id,
                        platformId: platform.id,
                        publishAt: scheduledDateISO,
                        isShorts,
                        hasThumbnail: !!finalThumbnailUrl,
                      });

                      const uploadPayload = {
                        videoUrl: savedVideo.urlDrive,
                        title: savedVideo.title,
                        description: descriptionWithHashtags,
                        privacyStatus: 'private', // Será alterado para private automaticamente quando publishAt for fornecido
                        platformId: platform.id,
                        userId: user.id,
                        customThumbnailUrl: finalThumbnailUrl || undefined,
                        isShorts: isShorts,
                        publishAt: scheduledDateISO, // Agendamento nativo do YouTube
                      };
                      
                      console.log('[NewSchedulePage] 📤 Enviando requisição para upload-to-youtube:', {
                        url: `${supabaseUrl}/functions/v1/upload-to-youtube`,
                        payload: {
                          ...uploadPayload,
                          description: uploadPayload.description?.substring(0, 100) + '...',
                          publishAt: uploadPayload.publishAt, // Log explícito do publishAt
                          publishAtType: typeof uploadPayload.publishAt,
                          publishAtLength: uploadPayload.publishAt?.length,
                        },
                      });

                      const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/upload-to-youtube`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${session.access_token}`,
                          apikey: supabaseAnonKey,
                        },
                        body: JSON.stringify(uploadPayload),
                      });
                      
                      console.log('[NewSchedulePage] 📥 Resposta recebida do upload-to-youtube:', {
                        status: uploadResponse.status,
                        statusText: uploadResponse.statusText,
                        ok: uploadResponse.ok,
                        headers: Object.fromEntries(uploadResponse.headers.entries()),
                      });

                      console.log('[NewSchedulePage] Resposta do upload:', {
                        status: uploadResponse.status,
                        ok: uploadResponse.ok,
                      });

                      if (uploadResponse.ok) {
                        const uploadData = await uploadResponse.json();
                        console.log('[NewSchedulePage] Upload bem-sucedido:', uploadData);
                        // Atualizar post com platformVideoId e status
                        await postsRepository.update(post.id, {
                          platformVideoId: uploadData.videoId || uploadData.platformVideoId,
                          status: 'posted',
                        });
                        // Atualizar status do vídeo
                        await videosRepository.update(savedVideo.id, {
                          status: 'scheduled',
                        });
                        showSuccess(`Vídeo enviado para o YouTube e agendado para ${new Date(scheduledDateISO).toLocaleString('pt-BR')}`);
                      } else {
                        const errorText = await uploadResponse.text();
                        let errorData;
                        try {
                          errorData = JSON.parse(errorText);
                        } catch {
                          errorData = { error: errorText || 'Erro desconhecido' };
                        }
                        console.error('[NewSchedulePage] Erro ao fazer upload:', errorData);
                        // Atualizar post com erro
                        await postsRepository.update(post.id, {
                          status: 'failed',
                          errorMessage: errorData.error || 'Erro ao fazer upload',
                        });
                        showError(`Erro ao enviar vídeo para YouTube: ${errorData.error || 'Erro desconhecido'}`);
                      }
                    } catch (uploadError) {
                      console.error('[NewSchedulePage] Erro ao fazer upload:', uploadError);
                      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Erro desconhecido';
                      await postsRepository.update(post.id, {
                        status: 'failed',
                        errorMessage: errorMessage,
                      });
                      showError(`Erro ao enviar vídeo para YouTube: ${errorMessage}`);
                    }
                  }
                }
              }
              // TODO: Adicionar suporte para outras plataformas (TikTok, Instagram) aqui
            }
          } else {
            console.warn('[NewSchedulePage] Session não encontrada, não é possível fazer upload');
          }
        } else {
          console.warn('[NewSchedulePage] ⚠ Supabase URL ou Anon Key não configurados');
        }
      } else {
        console.warn('[NewSchedulePage] ⚠ Condições NÃO atendidas para upload:', {
          hasScheduledDate: !!scheduledDateISO,
          scheduledDateISO,
          hasPlatforms: selectedPlatformIds.length > 0,
          selectedPlatformIdsCount: selectedPlatformIds.length,
        });
      }

      // Aguardar um pouco antes de navegar para garantir que os logs sejam visíveis
      await new Promise(resolve => setTimeout(resolve, 100));

      if (isEditing && videoId) {
        showSuccess('Agendamento atualizado com sucesso!');
        navigate(`/videos/${videoId}`);
      } else {
        showSuccess('Agendamento criado e enviado para a plataforma!');
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
    // Armazenar arquivo local selecionado
    setSelectedLocalFile(file);
    
    // Limpar URL do Google Drive se houver
    if (urlDrive) {
      setUrlDrive('');
      setSelectedFileId(null);
    }
    
    // Limpar thumbnail anterior se existir
    if (videoThumbnail && videoThumbnail.startsWith('blob:')) {
      URL.revokeObjectURL(videoThumbnail);
    }

    // Se for uma imagem, criar URL do objeto diretamente
    if (file.type.startsWith('image/')) {
      const thumbnailUrl = URL.createObjectURL(file);
      setVideoThumbnail(thumbnailUrl);
      setVideoDuration(null);
      setVideoUrl(null);
      return;
    }

    // Se for um vídeo, criar thumbnail do primeiro frame
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const videoObjectUrl = URL.createObjectURL(file);

      video.preload = 'metadata';
      video.muted = true; // Necessário para alguns navegadores
      video.playsInline = true; // Necessário para iOS

      const cleanup = () => {
        URL.revokeObjectURL(videoObjectUrl);
        video.src = '';
        video.load(); // Limpar o vídeo
      };

      video.onloadedmetadata = () => {
        // Definir dimensões do canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Obter duração do vídeo
        const duration = Math.floor(video.duration);
        setVideoDuration(duration || null);
        
        // Definir URL do vídeo para preview
        setVideoUrl(videoObjectUrl);

        // Capturar o primeiro frame
        video.currentTime = 0.1; // Ir para 0.1s para garantir que há um frame
      };

      video.onseeked = () => {
        if (ctx) {
          try {
            // Desenhar o frame no canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Converter canvas para blob e criar URL
            canvas.toBlob((blob) => {
              if (blob) {
                const thumbnailUrl = URL.createObjectURL(blob);
                setVideoThumbnail(thumbnailUrl);
              }
              cleanup();
            }, 'image/jpeg', 0.8);
          } catch (err) {
            console.error('Erro ao gerar thumbnail do vídeo:', err);
            setVideoThumbnail(null);
            cleanup();
          }
        }
      };

      video.onerror = () => {
        // Se falhar, limpar thumbnail
        setVideoThumbnail(null);
        setVideoDuration(null);
        setVideoUrl(null);
        cleanup();
      };

      // Carregar o vídeo
      video.src = videoObjectUrl;
    }
  }, [videoThumbnail]);

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
                {/* Alerta de mídia não selecionada */}
                {formErrors.media && (
                  <Alert severity="error" onClose={() => {
                    setFormErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.media;
                      return updated;
                    });
                  }}>
                    {formErrors.media}
                  </Alert>
                )}
                
                {/* Título */}
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
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
                    {user?.id && (
                      <Button
                        variant="outlined"
                        onClick={() => setAiChatDialogOpen(true)}
                        disabled={loading || loadingVideo}
                        size="small"
                      >
                        Gerar com IA
                      </Button>
                    )}
                  </Box>
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

                {/* Gerenciador de Hashtags */}
                {selectedPlatformIds.length > 0 && user?.id && (
                  <Stack spacing={1}>
                    <HashtagManager
                      userId={user.id}
                      selectedPlatformIds={selectedPlatformIds}
                      platformHashtags={platformHashtags}
                      onPlatformHashtagsChange={setPlatformHashtags}
                    />
                  </Stack>
                )}

                {/* Capa Personalizada */}
                {user?.id && (
                  <ThumbnailUploader
                    userId={user.id}
                    videoId={videoId}
                    currentThumbnailUrl={customThumbnailUrl}
                    onThumbnailChange={(url, file) => {
                      setCustomThumbnailUrl(url);
                      setCustomThumbnailFile(file || null);
                      // Quando uma thumbnail customizada é adicionada, substituir a do Google Drive
                      if (url) {
                        setVideoThumbnail(url);
                      } else {
                        // Se a thumbnail customizada foi removida, restaurar a do Google Drive se houver
                        if (urlDrive && user?.id && isValidGoogleDriveUrl(urlDrive)) {
                          const fileId = extractFileIdFromUrl(urlDrive);
                          if (fileId) {
                            // Buscar thumbnail do Google Drive em background
                            getFileMetadata(user.id, fileId)
                              .then((metadata) => {
                                if (metadata?.thumbnailLink) {
                                  return getThumbnailUrl(metadata.thumbnailLink, 'low', metadata.id, metadata.mimeType, user.id);
                                }
                                return null;
                              })
                              .then((thumbnail) => {
                                if (thumbnail) {
                                  setVideoThumbnail(thumbnail);
                                }
                              })
                              .catch((err) => {
                                console.warn('[NewSchedulePage] Erro ao restaurar thumbnail do Google Drive:', err);
                              });
                          }
                        }
                      }
                    }}
                    disabled={loading}
                    selectedMediaTypes={Object.values(platformMediaTypes).filter(
                      (mt): mt is MediaType => mt !== null && mt !== undefined,
                    )}
                  />
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
                <FormControl fullWidth error={Boolean(formErrors.scheduledDate)}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Hora de agendamento
                  </Typography>
                  <Select
                    value={scheduledTimeDisplay}
                    onChange={(e) => setScheduledTimeDisplay(e.target.value)}
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
                  {formErrors.scheduledDate && (
                    <FormHelperText>{formErrors.scheduledDate}</FormHelperText>
                  )}
                  {!formErrors.scheduledDate && (
                    <FormHelperText>
                      Horários disponíveis em intervalos de 15 minutos (conforme YouTube)
                    </FormHelperText>
                  )}
                </FormControl>
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
            onUrlChange={handleUrlChange}
            onGoogleDriveSelect={handleGoogleDriveSelectClick}
            onFileSelect={handleFileSelect}
            thumbnail={videoThumbnail}
            onThumbnailChange={setVideoThumbnail}
            userId={user?.id}
            isGoogleDriveConnected={isGoogleDriveConnected}
            checkingGoogleDrive={checkingGoogleDrive}
            videoDuration={videoDuration}
            videoUrl={videoUrl}
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

      {/* Dialog de Chat com IA */}
      {user?.id && (
        <AIChatDialog
          open={aiChatDialogOpen}
          userId={user.id}
          onClose={() => setAiChatDialogOpen(false)}
          onContentSelected={(content) => {
            setTitle(content.title);
            setDescription(content.description);
            // Armazenar hashtags para distribuir quando plataformas forem selecionadas
            setPendingHashtags(content.hashtags || []);
          }}
        />
      )}

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

