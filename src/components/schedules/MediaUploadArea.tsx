import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { useCallback, useRef, useState, useEffect } from 'react';

import type { GoogleDriveFile } from '@/services/googleDrive';
import { isValidGoogleDriveUrl } from '@/utils/validation';
import { formatDurationFromSeconds } from '@/utils/formatDuration';

interface MediaUploadAreaProps {
  urlDrive: string;
  onUrlChange: (url: string) => void;
  onGoogleDriveSelect: () => void;
  onFileSelect?: (file: File) => void;
  thumbnail?: string | null;
  onThumbnailChange?: (thumbnail: string | null) => void;
  userId?: string;
  isGoogleDriveConnected?: boolean;
  checkingGoogleDrive?: boolean;
  videoDuration?: number | null; // Duração em segundos
  videoUrl?: string | null; // URL do vídeo para preview (pode ser Edge Function URL)
}

export const MediaUploadArea = ({
  urlDrive,
  onUrlChange,
  onGoogleDriveSelect,
  onFileSelect,
  thumbnail,
  onThumbnailChange,
  userId,
  isGoogleDriveConnected = false,
  checkingGoogleDrive = false,
  videoDuration,
  videoUrl,
}: MediaUploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [authenticatedVideoUrl, setAuthenticatedVideoUrl] = useState<string | null>(null);
  const [loadingVideoUrl, setLoadingVideoUrl] = useState(false);
  const previousVideoUrlRef = useRef<string | null>(null);
  const authenticatedVideoUrlRef = useRef<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const videoOrImageFile = files.find(
        (file) => file.type.startsWith('video/') || file.type.startsWith('image/'),
      );

      if (videoOrImageFile && onFileSelect) {
        onFileSelect(videoOrImageFile);
      }
    },
    [onFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && onFileSelect) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect],
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    // Limpar object URLs se existirem
    if (thumbnail && thumbnail.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnail);
    }
    onUrlChange('');
    if (onThumbnailChange) {
      onThumbnailChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setImageDimensions(null);
  };

  // Detectar dimensões da imagem quando thumbnail mudar
  useEffect(() => {
    if (!thumbnail) {
      setImageDimensions(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      setImageDimensions(null);
    };
    img.src = thumbnail;
  }, [thumbnail]);

  // Carregar URL autenticada do vídeo quando videoUrl mudar
  useEffect(() => {
    // Limpar URL anterior se existir e videoUrl mudou
    if (previousVideoUrlRef.current !== videoUrl) {
      const prevUrl = authenticatedVideoUrlRef.current;
      if (prevUrl && prevUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrl);
      }
      previousVideoUrlRef.current = videoUrl;
      authenticatedVideoUrlRef.current = null;
      setAuthenticatedVideoUrl(null);
    }

    if (!videoUrl || !userId) {
      return;
    }

    // Se já é uma blob URL (arquivo local), usar diretamente
    if (videoUrl.startsWith('blob:')) {
      authenticatedVideoUrlRef.current = videoUrl;
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
              // Fazer fetch da Edge Function com autenticação e criar blob URL
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
                console.error('[MediaUploadArea] Erro ao carregar vídeo:', response.status);
                authenticatedVideoUrlRef.current = null;
                setAuthenticatedVideoUrl(null);
              }
            }
          }
        } catch (error) {
          console.error('[MediaUploadArea] Erro ao obter URL autenticada:', error);
          authenticatedVideoUrlRef.current = null;
          setAuthenticatedVideoUrl(null);
        } finally {
          setLoadingVideoUrl(false);
        }
      };

      void loadAuthenticatedUrl();
    } else {
      // URL direta, usar como está
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
  }, [videoUrl, userId]);

  // Calcular aspect ratio e objectFit baseado nas dimensões
  const getPreviewStyle = () => {
    if (!imageDimensions) {
      // Se não temos dimensões, usar 16:9 padrão com contain para não cortar
      return {
        aspectRatio: '16/9' as const,
        objectFit: 'contain' as const,
      };
    }

    // Sempre usar aspect ratio real da imagem e contain para não cortar
    return {
      aspectRatio: `${imageDimensions.width}/${imageDimensions.height}` as const,
      objectFit: 'contain' as const,
    };
  };

  const previewStyle = getPreviewStyle();

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 16,
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Mídia
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Faça upload da sua mídia ou selecione do Google Drive
        </Typography>

        {/* Preview */}
        {thumbnail && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: previewStyle.aspectRatio,
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: videoUrl ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (videoUrl) {
                  setPreviewModalOpen(true);
                }
              }}
            >
              <img
                src={thumbnail}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: previewStyle.objectFit,
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
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
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
                    {videoDuration && (
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: alpha('#000', 0.7),
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 600,
                        }}
                      >
                        {formatDurationFromSeconds(videoDuration)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              {videoDuration && !videoUrl && (
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
                  <Typography variant="caption" fontWeight={600}>
                    {formatDurationFromSeconds(videoDuration)}
                  </Typography>
                </Box>
              )}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: alpha('#000', 0.7),
                  color: 'white',
                  '&:hover': {
                    bgcolor: alpha('#000', 0.9),
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Upload Area */}
        <Box
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{
            border: 2,
            borderColor: isDragging ? 'primary.main' : 'divider',
            borderStyle: 'dashed',
            borderRadius: 2,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            bgcolor: isDragging ? alpha('#1565d8', 0.05) : 'transparent',
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            minHeight: 'auto',
          }}
          onClick={handleBrowseClick}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 40,
              color: (theme) => (theme.palette.mode === 'dark' ? 'common.white' : 'primary.main'),
              mb: 1,
            }}
          />
          <Typography variant="body1" fontWeight={600} gutterBottom>
            Arraste e solte sua mídia aqui
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ou clique para selecionar um arquivo
          </Typography>
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons */}
        <Stack spacing={1.5}>
          {checkingGoogleDrive ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1.5 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                Verificando conexão...
              </Typography>
            </Box>
          ) : (
            <>
              {!isGoogleDriveConnected && userId && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 1 }}>
                  <Typography variant="caption" component="div">
                    Google Drive não está conectado. Clique no botão abaixo para conectar.
                  </Typography>
                </Alert>
              )}
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DriveFolderUploadIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onGoogleDriveSelect();
                }}
                disabled={!userId}
                color={!isGoogleDriveConnected && userId ? 'warning' : 'primary'}
              >
                {isGoogleDriveConnected ? 'Selecionar do Google Drive' : 'Conectar Google Drive'}
              </Button>
            </>
          )}

          <Button
            fullWidth
            variant="outlined"
            startIcon={<ImageIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
          >
            Upload Local
          </Button>

          {urlDrive && (
            <>
              <Divider sx={{ my: 1 }} />
              <TextField
                fullWidth
                size="small"
                label="URL do Google Drive"
                value={urlDrive}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                InputProps={{
                  startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </>
          )}
        </Stack>

        {/* Info */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Dica:</strong> Você pode fazer upload de um arquivo local ou selecionar um vídeo do Google Drive
            conectado.
          </Typography>
        </Box>
      </CardContent>

      {/* Modal de Preview de Vídeo */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
          },
        }}
      >
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
                  console.error('[MediaUploadArea] Erro ao carregar vídeo:', e);
                  const videoElement = e.currentTarget;
                  if (videoElement.error) {
                    console.error('[MediaUploadArea] Erro do vídeo:', videoElement.error.code, videoElement.error.message);
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
    </Card>
  );
};

