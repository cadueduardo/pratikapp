import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import ImageIcon from '@mui/icons-material/Image';
import CropIcon from '@mui/icons-material/Crop';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

import { GoogleDriveBrowser } from '@/components/googleDrive/GoogleDriveBrowser';
import type { GoogleDriveFile } from '@/services/googleDrive';
import { downloadFile } from '@/services/googleDrive';
import { deleteThumbnail, uploadThumbnail, validateThumbnailFile } from '@/services/storage';
import type { MediaType } from '@/utils/mediaTypes';
import { getAspectRatioFromMediaTypes, aspectRatioToNumber } from '@/utils/mediaTypes';

interface ThumbnailUploaderProps {
  userId: string;
  videoId?: string; // ID do vídeo (pode ser temporário)
  currentThumbnailUrl?: string | null; // URL da thumbnail atual (se já existir)
  onThumbnailChange: (url: string | null, file?: File | null) => void; // Callback quando thumbnail mudar (url, file)
  disabled?: boolean;
  selectedMediaTypes?: (MediaType | null | undefined)[]; // Tipos de mídia selecionados para determinar aspect ratio
}

export const ThumbnailUploader = ({
  userId,
  videoId,
  currentThumbnailUrl,
  onThumbnailChange,
  disabled = false,
  selectedMediaTypes = [],
}: ThumbnailUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentThumbnailUrl || null);
  const [googleDriveBrowserOpen, setGoogleDriveBrowserOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempVideoId] = useState(() => videoId || `temp-${Date.now()}`);
  
  // Estados para crop
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);
  
  // Estado para modal de visualização
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Calcular aspect ratio baseado nos tipos de mídia selecionados
  const aspectRatioString = getAspectRatioFromMediaTypes(selectedMediaTypes);
  const aspectRatio = aspectRatioToNumber(aspectRatioString) || 16 / 9; // Default 16:9

  // Debug: log quando aspect ratio muda (apenas quando realmente muda e não for undefined)
  const prevAspectRatioRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (import.meta.env.DEV && aspectRatioString && aspectRatioString !== prevAspectRatioRef.current) {
      prevAspectRatioRef.current = aspectRatioString;
      console.log('[ThumbnailUploader] Aspect ratio:', aspectRatioString, 'from media types:', selectedMediaTypes);
    }
  }, [aspectRatioString, selectedMediaTypes]);

  // Sincronizar preview com currentThumbnailUrl quando mudar externamente
  useEffect(() => {
    if (currentThumbnailUrl !== previewUrl) {
      setPreviewUrl(currentThumbnailUrl || null);
    }
  }, [currentThumbnailUrl]);

  // Função para criar imagem a partir de canvas
  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });
  };

  // Função para fazer crop da imagem
  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Definir tamanho do canvas para o crop
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Desenhar imagem cortada
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    // Converter para blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  // Função para processar imagem após crop
  const handleCropComplete = useCallback(async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      setCropping(true);
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      
      if (!croppedBlob) {
        setError('Erro ao processar imagem. Tente novamente.');
        setCropDialogOpen(false);
        return;
      }

      // Criar File a partir do Blob
      const croppedFile = new File([croppedBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
      
      // Criar preview local
      const localPreviewUrl = URL.createObjectURL(croppedFile);
      setPreviewUrl(localPreviewUrl);

      // Se já temos um videoId, fazer upload imediatamente
      if (videoId) {
        setUploading(true);
        const uploadedUrl = await uploadThumbnail(userId, videoId, croppedFile);
        if (uploadedUrl) {
          // Limpar preview local
          URL.revokeObjectURL(localPreviewUrl);
          setPreviewUrl(uploadedUrl);
          onThumbnailChange(uploadedUrl, null);
        } else {
          setError('Erro ao fazer upload da capa. Tente novamente.');
          setPreviewUrl(null);
          onThumbnailChange(null, null);
        }
        setUploading(false);
      } else {
        // Se não temos videoId ainda, apenas manter preview local
        // O upload será feito quando o vídeo for criado
        onThumbnailChange(localPreviewUrl, croppedFile);
      }

      // Limpar estados do crop e blob URL
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
      setCropDialogOpen(false);
      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (err) {
      console.error('[ThumbnailUploader] Erro ao processar crop:', err);
      setError('Erro ao processar imagem.');
      // Limpar blob URL em caso de erro
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
      setCropDialogOpen(false);
      setImageToCrop(null);
    } finally {
      setCropping(false);
    }
  }, [imageToCrop, croppedAreaPixels, videoId, userId, onThumbnailChange]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);

      // Validar arquivo
      const validation = validateThumbnailFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Arquivo inválido');
        return;
      }

      // Se temos aspect ratio definido, abrir dialog de crop
      if (aspectRatioString) {
        const localPreviewUrl = URL.createObjectURL(file);
        setImageToCrop(localPreviewUrl);
        setCropDialogOpen(true);
      } else {
        // Se não temos aspect ratio, processar normalmente
        const localPreviewUrl = URL.createObjectURL(file);
        setPreviewUrl(localPreviewUrl);

        // Se já temos um videoId, fazer upload imediatamente
        if (videoId) {
          try {
            setUploading(true);
            const uploadedUrl = await uploadThumbnail(userId, videoId, file);
            if (uploadedUrl) {
              // Limpar preview local
              URL.revokeObjectURL(localPreviewUrl);
              setPreviewUrl(uploadedUrl);
              onThumbnailChange(uploadedUrl, null);
            } else {
              setError('Erro ao fazer upload da capa. Tente novamente.');
              setPreviewUrl(null);
              onThumbnailChange(null, null);
            }
          } catch (err) {
            console.error('[ThumbnailUploader] Erro ao fazer upload:', err);
            setError('Erro ao fazer upload da capa.');
            setPreviewUrl(null);
            onThumbnailChange(null, null);
          } finally {
            setUploading(false);
          }
        } else {
          // Se não temos videoId ainda, apenas manter preview local
          // O upload será feito quando o vídeo for criado
          onThumbnailChange(localPreviewUrl, file);
        }
      }
    },
    [userId, videoId, onThumbnailChange, aspectRatioString],
  );

  const handleGoogleDriveSelect = useCallback(
    async (file: GoogleDriveFile) => {
      setError(null);
      setGoogleDriveBrowserOpen(false);

      // Se for uma imagem do Google Drive
      if (file.mimeType?.startsWith('image/')) {
        try {
          // Baixar imagem do Google Drive
          const arrayBuffer = await downloadFile(userId, file.id);
          if (!arrayBuffer) {
            setError('Erro ao baixar imagem do Google Drive.');
            return;
          }

          // Criar blob e file
          const blob = new Blob([arrayBuffer], { type: file.mimeType || 'image/jpeg' });
          const imageFile = new File([blob], file.name || 'image.jpg', { type: blob.type });

          // Validar arquivo
          const validation = validateThumbnailFile(imageFile);
          if (!validation.valid) {
            setError(validation.error || 'Arquivo inválido');
            return;
          }

          // Se temos aspect ratio definido, abrir dialog de crop
          if (aspectRatioString) {
            const localPreviewUrl = URL.createObjectURL(imageFile);
            setImageToCrop(localPreviewUrl);
            setCropDialogOpen(true);
          } else {
            // Sem aspect ratio, processar normalmente
            const localPreviewUrl = URL.createObjectURL(imageFile);
            setPreviewUrl(localPreviewUrl);

            // Se já temos um videoId, fazer upload imediatamente
            if (videoId) {
              try {
                setUploading(true);
                const uploadedUrl = await uploadThumbnail(userId, videoId, imageFile);
                if (uploadedUrl) {
                  // Limpar preview local
                  URL.revokeObjectURL(localPreviewUrl);
                  setPreviewUrl(uploadedUrl);
                  onThumbnailChange(uploadedUrl, null);
                } else {
                  setError('Erro ao fazer upload da capa. Tente novamente.');
                  setPreviewUrl(null);
                  onThumbnailChange(null, null);
                }
              } catch (err) {
                console.error('[ThumbnailUploader] Erro ao fazer upload:', err);
                setError('Erro ao fazer upload da capa.');
                setPreviewUrl(null);
                onThumbnailChange(null, null);
              } finally {
                setUploading(false);
              }
            } else {
              // Se não temos videoId ainda, apenas manter preview local
              // O upload será feito quando o vídeo for criado
              onThumbnailChange(localPreviewUrl, imageFile);
            }
          }
        } catch (err) {
          console.error('[ThumbnailUploader] Erro ao baixar imagem do Google Drive:', err);
          setError('Erro ao baixar imagem do Google Drive. Verifique sua conexão.');
        }
      } else {
        setError('Selecione uma imagem do Google Drive.');
      }
    },
    [userId, videoId, onThumbnailChange, aspectRatioString],
  );

  const handleRemove = useCallback(async () => {
    setError(null);

    // Se temos uma URL do storage, remover do storage
    if (previewUrl && previewUrl.includes('/storage/v1/object/public/')) {
      try {
        await deleteThumbnail(previewUrl);
      } catch (err) {
        console.error('[ThumbnailUploader] Erro ao remover thumbnail:', err);
      }
    }

    // Limpar preview local se for blob URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    onThumbnailChange(null, null);
  }, [previewUrl, onThumbnailChange]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void handleFileSelect(files[0]);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Capa Personalizada
            </Typography>
            {aspectRatioString && (
              <Typography variant="caption" color="primary" fontWeight={600}>
                Aspect Ratio: {aspectRatioString}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {aspectRatioString
              ? `Adicione uma capa personalizada para o vídeo. A imagem será ajustada para ${aspectRatioString}.`
              : 'Adicione uma capa personalizada para o vídeo. Suporta upload local ou seleção do Google Drive.'}
          </Typography>
          {!aspectRatioString && selectedMediaTypes.length === 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Selecione uma plataforma e tipo de mídia para ativar o ajuste automático de aspect ratio.
            </Alert>
          )}

          {/* Preview da capa - Preview pequeno */}
          {previewUrl && (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: 200,
                aspectRatio: `${aspectRatio}`,
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  '& .zoom-icon': {
                    opacity: 1,
                  },
                },
              }}
              onClick={() => setPreviewModalOpen(true)}
            >
              <img
                src={previewUrl}
                alt="Preview da capa"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                className="zoom-icon"
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  bgcolor: alpha('#000', 0.7),
                  color: 'white',
                  borderRadius: 1,
                  p: 0.5,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ZoomInIcon fontSize="small" />
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled || uploading}
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
              {uploading && (
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
                    bgcolor: alpha('#000', 0.5),
                  }}
                >
                  <CircularProgress size={32} sx={{ color: 'white' }} />
                </Box>
              )}
            </Box>
          )}

          {/* Mensagem de erro */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Botões de ação - Só aparecem se houver tipo de mídia selecionado */}
          {!previewUrl && aspectRatioString && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                onClick={handleBrowseClick}
                disabled={disabled || uploading}
                fullWidth
              >
                Upload Local
              </Button>
              <Button
                variant="outlined"
                startIcon={<DriveFolderUploadIcon />}
                onClick={() => setGoogleDriveBrowserOpen(true)}
                disabled={disabled || uploading}
                fullWidth
              >
                Google Drive
              </Button>
            </Stack>
          )}
          
          {!previewUrl && !aspectRatioString && (
            <Alert severity="info">
              Selecione uma plataforma e tipo de mídia para fazer upload da capa personalizada.
            </Alert>
          )}

          {previewUrl && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={handleBrowseClick}
                disabled={disabled || uploading}
                fullWidth
              >
                Trocar Imagem
              </Button>
              <Button
                variant="outlined"
                startIcon={<DriveFolderUploadIcon />}
                onClick={() => setGoogleDriveBrowserOpen(true)}
                disabled={disabled || uploading}
                fullWidth
              >
                Trocar do Drive
              </Button>
            </Stack>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
        </Stack>
      </CardContent>

      {/* Dialog do Google Drive */}
      <GoogleDriveBrowser
        open={googleDriveBrowserOpen}
        onClose={() => setGoogleDriveBrowserOpen(false)}
        onSelect={handleGoogleDriveSelect}
        userId={userId}
      />

      {/* Modal de Visualização da Thumbnail */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Visualização da Capa</Typography>
            <IconButton onClick={() => setPreviewModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box
              sx={{
                width: '100%',
                aspectRatio: `${aspectRatio}`,
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <img
                src={previewUrl}
                alt="Capa do vídeo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Crop */}
      <Dialog
        open={cropDialogOpen}
        onClose={() => {
          if (!cropping) {
            setCropDialogOpen(false);
            if (imageToCrop) {
              URL.revokeObjectURL(imageToCrop);
              setImageToCrop(null);
            }
          }
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
          },
        }}
      >
        <DialogTitle>
          Ajustar Capa
          {aspectRatioString && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({aspectRatioString})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {imageToCrop && (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 400,
                bgcolor: '#000',
              }}
            >
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedAreaPixels) => {
                  setCroppedAreaPixels(croppedAreaPixels);
                }}
                cropShape="rect"
                showGrid={true}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCropDialogOpen(false);
              if (imageToCrop) {
                URL.revokeObjectURL(imageToCrop);
                setImageToCrop(null);
              }
            }}
            disabled={cropping}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCropComplete}
            disabled={cropping || !croppedAreaPixels}
            startIcon={cropping ? <CircularProgress size={16} /> : <CropIcon />}
          >
            {cropping ? 'Processando...' : 'Aplicar Crop'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

