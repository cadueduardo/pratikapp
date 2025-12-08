import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SortIcon from '@mui/icons-material/Sort';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PublishIcon from '@mui/icons-material/Publish';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AuthTextField } from '@/components/auth';
import {
  CharacterCounter,
  ConfirmDialog,
  EmptyState,
  LoadingButton,
  StatusChip,
  useNotification,
} from '@/components/common';
import { GoogleDriveBrowser } from '@/components/googleDrive/GoogleDriveBrowser';
import { useAuth } from '@/hooks/useAuth';
import { platformsRepository, postsRepository, videosRepository } from '@/services/database';
import type { Platform, Post, Video, VideoStatus } from '@/services/database/types';
import type { GoogleDriveFile } from '@/services/googleDrive';
import { extractFileIdFromUrl, getFileMetadata, getThumbnailUrl } from '@/services/googleDrive';
import { mapSupabaseError } from '@/utils/errorMessages';
import { getPlatformInfo } from '@/utils/platforms';
import { isValidGoogleDriveUrl } from '@/utils/validation';
import { useNavigate } from 'react-router-dom';

export const SchedulesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoPosts, setVideoPosts] = useState<Record<string, Post[]>>({});
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string | null>>({});
  const [allPlatforms, setAllPlatforms] = useState<Record<string, Platform>>({}); // Mapeamento de todas as plataformas por ID
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'scheduledDate' | 'title' | 'createdAt' | 'status'>(
    'scheduledDate',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [publishingVideoId, setPublishingVideoId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [googleDriveBrowserOpen, setGoogleDriveBrowserOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urlDrive, setUrlDrive] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledDateDisplay, setScheduledDateDisplay] = useState('');
  const [scheduledTimeDisplay, setScheduledTimeDisplay] = useState('');
  const [status, setStatus] = useState<VideoStatus>('draft');
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    urlDrive?: string;
    scheduledDate?: string;
    platforms?: string;
  }>({});

  useEffect(() => {
    if (user?.id) {
      loadVideos();
      loadPlatforms();
    }
  }, [user?.id]);

  const loadPlatforms = useCallback(async () => {
    if (!user?.id) return;

    try {
      setPlatformsLoading(true);
      const userPlatforms = await platformsRepository.listByUser(user.id);
      // Filtrar apenas plataformas de publicação (não Google Drive)
      const publishPlatforms = userPlatforms.filter(
        (p) => p.name !== 'google-drive' && getPlatformInfo(p.name) !== null,
      );
      setAvailablePlatforms(publishPlatforms);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setPlatformsLoading(false);
    }
  }, [user?.id, showError]);

  const loadVideos = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userVideos = await videosRepository.listByUser(user.id);
      setVideos(userVideos);

      // Coletar todos os IDs de plataformas únicos dos vídeos
      const platformIds = new Set<string>();
      userVideos.forEach((video) => {
        if (video.selectedPlatformIds) {
          video.selectedPlatformIds.forEach((id) => platformIds.add(id));
        }
        // Também coletar dos posts
        // (será feito abaixo)
      });

      // Carregar todas as plataformas necessárias
      const platformsMap: Record<string, Platform> = {};
      await Promise.all(
        Array.from(platformIds).map(async (platformId) => {
          try {
            const platform = await platformsRepository.getById(platformId);
            if (platform) {
              platformsMap[platformId] = platform;
            }
          } catch {
            // Ignorar erros ao carregar plataforma
          }
        }),
      );

      // Carregar posts e thumbnails para cada vídeo
      const postsMap: Record<string, Post[]> = {};
      const thumbnailsMap: Record<string, string | null> = {};
      await Promise.all(
        userVideos.map(async (video) => {
          try {
            const posts = await postsRepository.listByVideo(video.id);
            postsMap[video.id] = posts;
            // Coletar IDs de plataformas dos posts também
            posts.forEach((post) => platformIds.add(post.platformId));
          } catch {
            // Ignorar erros ao carregar posts
            postsMap[video.id] = [];
          }

          // Buscar thumbnail do vídeo
          if (video.urlDrive && isValidGoogleDriveUrl(video.urlDrive)) {
            try {
              const fileId = extractFileIdFromUrl(video.urlDrive);
              if (fileId) {
                const metadata = await getFileMetadata(user.id, fileId);
                if (metadata) {
                  thumbnailsMap[video.id] = getThumbnailUrl(metadata.thumbnailLink, 'low', metadata.id, metadata.mimeType) || null;
                } else {
                  thumbnailsMap[video.id] = null;
                }
              }
            } catch {
              // Ignorar erros ao buscar thumbnail
              thumbnailsMap[video.id] = null;
            }
          }
        }),
      );

      // Carregar plataformas dos posts também
      const postPlatformIds = new Set<string>();
      Object.values(postsMap).forEach((posts) => {
        posts.forEach((post) => postPlatformIds.add(post.platformId));
      });
      await Promise.all(
        Array.from(postPlatformIds).map(async (platformId) => {
          if (!platformsMap[platformId]) {
            try {
              const platform = await platformsRepository.getById(platformId);
              if (platform) {
                platformsMap[platformId] = platform;
              }
            } catch {
              // Ignorar erros
            }
          }
        }),
      );

      setVideoPosts(postsMap);
      setVideoThumbnails(thumbnailsMap);
      setAllPlatforms(platformsMap);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setLoading(false);
    }
  }, [user?.id, showError]);

  const handleDialogOpen = (video?: Video) => {
    if (video) {
      setEditingVideo(video);
      setTitle(video.title);
      setDescription(video.description || '');
      setUrlDrive(video.urlDrive);
      setSelectedPlatformIds(video.selectedPlatformIds || []);
      if (video.scheduledDate) {
        const date = new Date(video.scheduledDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setScheduledDateDisplay(`${day}/${month}/${year}`);
        setScheduledTimeDisplay(`${hours}:${minutes}`);
        setScheduledDate(video.scheduledDate);
      } else {
        setScheduledDateDisplay('');
        setScheduledTimeDisplay('');
        setScheduledDate('');
      }
      setStatus(video.status);
    } else {
      setEditingVideo(null);
      setTitle('');
      setDescription('');
      setUrlDrive('');
      setVideoThumbnail(null);
      setSelectedPlatformIds([]);
      setScheduledDate('');
      setScheduledDateDisplay('');
      setScheduledTimeDisplay('');
      setStatus('draft');
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingVideo(null);
    setTitle('');
    setDescription('');
      setUrlDrive('');
      setVideoThumbnail(null);
      setSelectedPlatformIds([]);
      setScheduledDate('');
      setScheduledDateDisplay('');
      setScheduledTimeDisplay('');
      setStatus('draft');
      setFormErrors({});
  };

  const validateForm = () => {
    const errors: { title?: string; urlDrive?: string; scheduledDate?: string; platforms?: string } = {};
    
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
      errors.urlDrive = 'Informe uma URL válida do Google Drive (ex: https://drive.google.com/file/d/...)';
    }
    
    // Validar data e hora separadamente
    const hasDate = scheduledDateDisplay.trim().length > 0;
    const hasTime = scheduledTimeDisplay.trim().length > 0;
    
    // Se houver data/hora agendada, validar que pelo menos uma plataforma foi selecionada
    if (hasDate && hasTime) {
      if (selectedPlatformIds.length === 0) {
        errors.platforms = 'Selecione pelo menos uma plataforma para publicação quando houver agendamento.';
      }
    }
    
    if (hasDate || hasTime) {
      // Se preencheu um, precisa preencher o outro
      if (hasDate && !hasTime) {
        errors.scheduledDate = 'Informe também a hora de agendamento.';
      } else if (hasTime && !hasDate) {
        errors.scheduledDate = 'Informe também a data de agendamento.';
      } else {
        // Validar formato de data DD/MM/YYYY
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const dateMatch = scheduledDateDisplay.trim().match(dateRegex);
        
        // Validar formato de hora HH:mm
        const timeRegex = /^(\d{2}):(\d{2})$/;
        const timeMatch = scheduledTimeDisplay.trim().match(timeRegex);
        
        if (!dateMatch) {
          errors.scheduledDate = 'Formato de data inválido. Use DD/MM/YYYY (ex: 25/12/2024)';
        } else if (!timeMatch) {
          errors.scheduledDate = 'Formato de hora inválido. Use HH:mm (ex: 14:30)';
        } else {
          const [, day, month, year] = dateMatch;
          const [, hours, minutes] = timeMatch;
          
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          const hoursNum = parseInt(hours, 10);
          const minutesNum = parseInt(minutes, 10);

          // Validar valores
          if (monthNum < 1 || monthNum > 12) {
            errors.scheduledDate = 'Mês inválido. Use valores entre 01 e 12.';
          } else if (dayNum < 1 || dayNum > 31) {
            errors.scheduledDate = 'Dia inválido. Use valores entre 01 e 31.';
          } else if (hoursNum < 0 || hoursNum > 23) {
            errors.scheduledDate = 'Hora inválida. Use valores entre 00 e 23.';
          } else if (minutesNum < 0 || minutesNum > 59) {
            errors.scheduledDate = 'Minutos inválidos. Use valores entre 00 e 59.';
          } else {
            // Criar data no formato ISO
            const scheduledDateTime = new Date(yearNum, monthNum - 1, dayNum, hoursNum, minutesNum);
            
            // Verificar se a data é válida (ex: 31/02 não existe)
            if (
              scheduledDateTime.getDate() !== dayNum ||
              scheduledDateTime.getMonth() !== monthNum - 1 ||
              scheduledDateTime.getFullYear() !== yearNum
            ) {
              errors.scheduledDate = 'Data inválida.';
            } else {
              const now = new Date();
              now.setSeconds(0, 0);
              if (scheduledDateTime < now) {
                errors.scheduledDate = 'A data de agendamento não pode ser no passado.';
              } else {
                const oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                if (scheduledDateTime > oneYearFromNow) {
                  errors.scheduledDate = 'A data de agendamento não pode ser mais de 1 ano no futuro.';
                } else {
                  // Converter para ISO string para armazenar
                  setScheduledDate(scheduledDateTime.toISOString());
                }
              }
            }
          }
        }
      }
    } else {
      setScheduledDate('');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = useCallback(async () => {
    if (!user?.id || !validateForm()) return;

    try {
      setLoading(true);

      if (editingVideo) {
        await videosRepository.update(editingVideo.id, {
          title,
          description: description || null,
          urlDrive,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          status: scheduledDate ? 'scheduled' : status,
          selectedPlatformIds: selectedPlatformIds.length > 0 ? selectedPlatformIds : null,
        });
        showSuccess('Agendamento atualizado com sucesso!');
      } else {
        await videosRepository.create({
          userId: user.id,
          title,
          description: description || null,
          urlDrive,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          status: scheduledDate ? 'scheduled' : 'draft',
          selectedPlatformIds: selectedPlatformIds.length > 0 ? selectedPlatformIds : null,
        });
        showSuccess('Agendamento criado com sucesso!');
      }

      await loadVideos();
      handleDialogClose();
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setLoading(false);
    }
  }, [user?.id, editingVideo, title, description, urlDrive, scheduledDate, scheduledDateDisplay, scheduledTimeDisplay, status, selectedPlatformIds, loadVideos, showSuccess, showError]);

  const handleDeleteClick = useCallback((videoId: string) => {
    setVideoToDelete(videoId);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!videoToDelete) return;

    try {
      setLoading(true);
      await videosRepository.remove(videoToDelete);
      showSuccess('Agendamento removido com sucesso!');
      await loadVideos();
      setDeleteConfirmOpen(false);
      setVideoToDelete(null);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setLoading(false);
    }
  }, [videoToDelete, loadVideos, showSuccess, showError]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setVideoToDelete(null);
  }, []);

  const handlePublishNow = useCallback(
    async (videoId: string) => {
      if (!user?.id) return;

      try {
        setPublishingVideoId(videoId);

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
        
        // Aguardar um pouco e recarregar os vídeos
        setTimeout(() => {
          loadVideos();
        }, 2000);
      } catch (err) {
        showError(mapSupabaseError(err instanceof Error ? err : undefined));
      } finally {
        setPublishingVideoId(null);
      }
    },
    [user?.id, loadVideos, showSuccess, showError],
  );

  const handleGoogleDriveSelect = useCallback(async (file: GoogleDriveFile) => {
    // Preencher URL do Google Drive
    setUrlDrive(file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`);
    
    // Preencher título se estiver vazio
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remover extensão do nome
    }
    
    // Buscar thumbnail
    const thumbnail = getThumbnailUrl(file.thumbnailLink, 'low', file.id, file.mimeType);
    setVideoThumbnail(thumbnail);
    
    // Limpar erro de URL
    setFormErrors((prev) => ({ ...prev, urlDrive: undefined }));
  }, [title]);

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
        if (metadata) {
          const thumbnail = getThumbnailUrl(metadata.thumbnailLink, 'low', metadata.id, metadata.mimeType);
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

  const filteredAndSortedVideos = useMemo(() => {
    let filtered = videos;

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.description?.toLowerCase().includes(query),
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    // Ordenação
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'scheduledDate':
          const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
          const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'pt-BR');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [videos, searchQuery, statusFilter, sortBy, sortOrder]);

  const scheduledVideos = filteredAndSortedVideos.filter(
    (v) => v.status === 'scheduled' || v.status === 'pending',
  );
  const draftVideos = filteredAndSortedVideos.filter((v) => v.status === 'draft');
  const otherVideos = filteredAndSortedVideos.filter(
    (v) => v.status !== 'draft' && v.status !== 'scheduled' && v.status !== 'pending',
  );

  const statusLabels: Record<VideoStatus | 'all', string> = {
    all: 'Todos',
    draft: 'Rascunho',
    scheduled: 'Agendado',
    pending: 'Pendente',
    processing: 'Processando',
    posted: 'Publicado',
    failed: 'Falhou',
  };

  const availableStatuses: Array<VideoStatus | 'all'> = [
    'all',
    'draft',
    'scheduled',
    'pending',
    'processing',
    'posted',
    'failed',
  ];

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Agendamentos
        </Typography>
        <Tooltip title="Criar um novo agendamento de vídeo">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleDialogOpen()}
            disabled={loading}
          >
            Novo agendamento
          </Button>
        </Tooltip>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              fullWidth
              placeholder="Buscar por título ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
                <FilterListIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  Filtrar por status:
                </Typography>
                {availableStatuses.map((status) => (
                  <Chip
                    key={status}
                    label={statusLabels[status]}
                    onClick={() => setStatusFilter(status)}
                    color={statusFilter === status ? 'primary' : 'default'}
                    variant={statusFilter === status ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              {searchQuery || statusFilter !== 'all' ? (
                <Typography variant="body2" color="text.secondary">
                  {filteredAndSortedVideos.length} vídeo(s) encontrado(s)
                </Typography>
              ) : (
                <Box />
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SortIcon color="action" />
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  size="small"
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="scheduledDate">Data agendamento</MenuItem>
                  <MenuItem value="title">Título</MenuItem>
                  <MenuItem value="createdAt">Data criação</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                </Select>
                <Tooltip title={sortOrder === 'asc' ? 'Ordenar decrescente' : 'Ordenar crescente'}>
                  <Button
                    size="small"
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    variant="outlined"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>


      {loading && videos.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredAndSortedVideos.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title={
                searchQuery || statusFilter !== 'all'
                  ? 'Nenhum vídeo encontrado'
                  : 'Nenhum agendamento cadastrado'
              }
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros ou a busca para encontrar vídeos.'
                  : 'Comece criando seu primeiro agendamento de vídeo.'
              }
              action={
                !searchQuery && statusFilter === 'all'
                  ? {
                      label: 'Criar primeiro agendamento',
                      onClick: () => handleDialogOpen(),
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          {scheduledVideos.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Agendados
              </Typography>
              <Stack spacing={2}>
                {scheduledVideos.map((video) => (
                  <Card key={video.id}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 2,
                          }}
                        >
                          {/* Thumbnail do vídeo */}
                          {videoThumbnails[video.id] && (
                            <Box
                              sx={{
                                width: 120,
                                height: 90,
                                borderRadius: 1,
                                overflow: 'hidden',
                                flexShrink: 0,
                                backgroundColor: 'grey.200',
                              }}
                            >
                              <img
                                src={videoThumbnails[video.id]!}
                                alt={video.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  // Ocultar imagem se falhar ao carregar
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </Box>
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={600}>
                              {video.title}
                            </Typography>
                            {video.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {video.description}
                              </Typography>
                            )}
                            {video.scheduledDate && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Agendado para:{' '}
                                {new Date(video.scheduledDate).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            )}
                            {/* Exibir plataformas selecionadas */}
                            {video.selectedPlatformIds && video.selectedPlatformIds.length > 0 && (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                  Plataformas:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                                  {video.selectedPlatformIds.map((platformId) => {
                                    const platform = allPlatforms[platformId] || availablePlatforms.find((p) => p.id === platformId);
                                    const platformInfo = platform ? getPlatformInfo(platform.name) : null;
                                    return (
                                      <Chip
                                        key={platformId}
                                        label={platformInfo?.displayName || platform?.name || 'Plataforma'}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                      />
                                    );
                                  })}
                                </Stack>
                              </Box>
                            )}
                            {/* Exibir hashtags por plataforma */}
                            {video.platformHashtags && video.selectedPlatformIds && Object.keys(video.platformHashtags).length > 0 && (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                  Hashtags:
                                </Typography>
                                <Stack spacing={0.5}>
                                  {video.selectedPlatformIds.map((platformId) => {
                                    const platform = allPlatforms[platformId] || availablePlatforms.find((p) => p.id === platformId);
                                    if (!platform) return null;
                                    const hashtags = video.platformHashtags?.[platform.name];
                                    if (!hashtags || hashtags.length === 0) return null;
                                    const platformInfo = getPlatformInfo(platform.name);
                                    return (
                                      <Box key={platformId}>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                                          {platformInfo?.displayName || platform.name}:
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                          {hashtags.map((hashtag, index) => (
                                            <Chip
                                              key={index}
                                              label={hashtag}
                                              size="small"
                                              variant="filled"
                                              sx={{ fontSize: '0.7rem' }}
                                            />
                                          ))}
                                        </Stack>
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              </Box>
                            )}
                            {/* Exibir status de posts por plataforma */}
                            {videoPosts[video.id] && videoPosts[video.id].length > 0 && (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                  Status por plataforma:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                                  {videoPosts[video.id].map((post) => {
                                    const platform = allPlatforms[post.platformId] || availablePlatforms.find((p) => p.id === post.platformId);
                                    const platformInfo = platform ? getPlatformInfo(platform.name) : null;
                                    return (
                                      <Chip
                                        key={post.id}
                                        label={`${platformInfo?.displayName || platform?.name || 'Plataforma'}: ${post.status === 'posted' ? 'Publicado' : post.status === 'failed' ? 'Falhou' : post.status === 'uploading' ? 'Enviando' : 'Pendente'}`}
                                        size="small"
                                        color={
                                          post.status === 'posted'
                                            ? 'success'
                                            : post.status === 'failed'
                                              ? 'error'
                                              : post.status === 'uploading'
                                                ? 'warning'
                                                : 'default'
                                        }
                                        variant="outlined"
                                      />
                                    );
                                  })}
                                </Stack>
                              </Box>
                            )}
                          </Box>
                          <StatusChip status={video.status} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          {video.status === 'scheduled' && (
                            <Tooltip title="Publicar vídeo agora, mesmo que esteja agendado para o futuro">
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<PublishIcon />}
                                  onClick={() => handlePublishNow(video.id)}
                                  disabled={loading || publishingVideoId === video.id}
                                >
                                  {publishingVideoId === video.id ? 'Publicando...' : 'Publicar Agora'}
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip title="Ver informações detalhadas do vídeo">
                            <span>
                              <Button
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => navigate(`/videos/${video.id}`)}
                                disabled={loading}
                              >
                                Ver detalhes
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Editar agendamento">
                            <span>
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleDialogOpen(video)}
                                disabled={loading}
                              >
                                Editar
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remover agendamento">
                            <span>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeleteClick(video.id)}
                                disabled={loading}
                              >
                                Remover
                              </Button>
                            </span>
                          </Tooltip>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {draftVideos.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Rascunhos
              </Typography>
              <Stack spacing={2}>
                {draftVideos.map((video) => (
                  <Card key={video.id}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 2,
                          }}
                        >
                          {/* Thumbnail do vídeo */}
                          {videoThumbnails[video.id] && (
                            <Box
                              sx={{
                                width: 120,
                                height: 90,
                                borderRadius: 1,
                                overflow: 'hidden',
                                flexShrink: 0,
                                backgroundColor: 'grey.200',
                              }}
                            >
                              <img
                                src={videoThumbnails[video.id]!}
                                alt={video.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  // Ocultar imagem se falhar ao carregar
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </Box>
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={600}>
                              {video.title}
                            </Typography>
                            {video.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {video.description}
                              </Typography>
                            )}
                          </Box>
                          <StatusChip status={video.status} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="Ver informações detalhadas do vídeo">
                            <span>
                              <Button
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => navigate(`/videos/${video.id}`)}
                                disabled={loading}
                              >
                                Ver detalhes
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Editar agendamento">
                            <span>
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleDialogOpen(video)}
                                disabled={loading}
                              >
                                Editar
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remover agendamento">
                            <span>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeleteClick(video.id)}
                                disabled={loading}
                              >
                                Remover
                              </Button>
                            </span>
                          </Tooltip>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {otherVideos.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Outros
              </Typography>
              <Stack spacing={2}>
                {otherVideos.map((video) => (
                  <Card key={video.id}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 2,
                          }}
                        >
                          {/* Thumbnail do vídeo */}
                          {videoThumbnails[video.id] && (
                            <Box
                              sx={{
                                width: 120,
                                height: 90,
                                borderRadius: 1,
                                overflow: 'hidden',
                                flexShrink: 0,
                                backgroundColor: 'grey.200',
                              }}
                            >
                              <img
                                src={videoThumbnails[video.id]!}
                                alt={video.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  // Ocultar imagem se falhar ao carregar
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </Box>
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={600}>
                              {video.title}
                            </Typography>
                            {video.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {video.description}
                              </Typography>
                            )}
                          </Box>
                          <StatusChip status={video.status} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="Ver informações detalhadas do vídeo">
                            <span>
                              <Button
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => navigate(`/videos/${video.id}`)}
                                disabled={loading}
                              >
                                Ver detalhes
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Editar agendamento">
                            <span>
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleDialogOpen(video)}
                                disabled={loading}
                              >
                                Editar
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remover agendamento">
                            <span>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeleteClick(video.id)}
                                disabled={loading}
                              >
                                Remover
                              </Button>
                            </span>
                          </Tooltip>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingVideo ? 'Editar agendamento' : 'Novo agendamento'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack spacing={1}>
              <AuthTextField
                label="Título do vídeo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={Boolean(formErrors.title)}
                helperText={formErrors.title}
                fullWidth
                inputProps={{ maxLength: 200 }}
              />
              {!formErrors.title && (
                <CharacterCounter current={title.length} max={200} min={3} showMin />
              )}
            </Stack>

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

            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <AuthTextField
                  label="URL do Google Drive"
                  value={urlDrive}
                  onChange={(e) => setUrlDrive(e.target.value)}
                  error={Boolean(formErrors.urlDrive)}
                  helperText={formErrors.urlDrive || 'Cole o link compartilhado do arquivo no Google Drive'}
                  fullWidth
                  placeholder="https://drive.google.com/file/d/..."
                />
                {user?.id && (
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setGoogleDriveBrowserOpen(true)}
                    sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
                  >
                    Selecionar
                  </Button>
                )}
              </Stack>

              {/* Preview do vídeo */}
              {videoThumbnail && (
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 300,
                    aspectRatio: '16/9',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <img
                    src={videoThumbnail}
                    alt="Preview do vídeo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              )}
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
                                    setSelectedPlatformIds(selectedPlatformIds.filter((id) => id !== platform.id));
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

            <Stack direction="row" spacing={2}>
              <Stack spacing={1} sx={{ flex: 1 }}>
                <TextField
                  label="Data de agendamento"
                  value={scheduledDateDisplay}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Remover caracteres não numéricos exceto /
                    value = value.replace(/[^\d\/]/g, '');
                    
                    // Aplicar máscara automática
                    if (value.length <= 2) {
                      // DD
                      setScheduledDateDisplay(value);
                    } else if (value.length <= 5) {
                      // DD/MM
                      if (value.length === 3 && !value.includes('/')) {
                        value = value.slice(0, 2) + '/' + value.slice(2);
                      }
                      setScheduledDateDisplay(value);
                    } else if (value.length <= 10) {
                      // DD/MM/YYYY
                      if (value.length === 6 && value.split('/').length === 2) {
                        value = value.slice(0, 5) + '/' + value.slice(5);
                      }
                      setScheduledDateDisplay(value);
                    } else {
                      // Limitar a 10 caracteres (DD/MM/YYYY)
                      setScheduledDateDisplay(value.slice(0, 10));
                    }
                  }}
                  placeholder="DD/MM/YYYY"
                  error={Boolean(formErrors.scheduledDate)}
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                  helperText="Ex: 25/12/2024"
                />
              </Stack>
              
              <Stack spacing={1} sx={{ flex: 1 }}>
                <TextField
                  label="Hora de agendamento"
                  value={scheduledTimeDisplay}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Remover caracteres não numéricos exceto :
                    value = value.replace(/[^\d:]/g, '');
                    
                    // Aplicar máscara automática
                    if (value.length <= 2) {
                      // HH
                      setScheduledTimeDisplay(value);
                    } else if (value.length <= 5) {
                      // HH:mm
                      if (value.length === 3 && !value.includes(':')) {
                        value = value.slice(0, 2) + ':' + value.slice(2);
                      }
                      setScheduledTimeDisplay(value);
                    } else {
                      // Limitar a 5 caracteres (HH:mm)
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={loading}>
            Cancelar
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleSave}
            loading={loading}
            loadingText={editingVideo ? 'Atualizando...' : 'Criando...'}
          >
            {editingVideo ? 'Atualizar' : 'Criar'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Confirmar exclusão"
        message="Tem certeza que deseja remover este agendamento? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {user?.id && (
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
