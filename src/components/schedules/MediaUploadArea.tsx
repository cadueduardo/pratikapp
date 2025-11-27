import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { useCallback, useRef, useState } from 'react';

import type { GoogleDriveFile } from '@/services/googleDrive';
import { isValidGoogleDriveUrl } from '@/utils/validation';

interface MediaUploadAreaProps {
  urlDrive: string;
  onUrlChange: (url: string) => void;
  onGoogleDriveSelect: () => void;
  onFileSelect?: (file: File) => void;
  thumbnail?: string | null;
  userId?: string;
  isGoogleDriveConnected?: boolean;
  checkingGoogleDrive?: boolean;
}

export const MediaUploadArea = ({
  urlDrive,
  onUrlChange,
  onGoogleDriveSelect,
  onFileSelect,
  thumbnail,
  userId,
  isGoogleDriveConnected = false,
  checkingGoogleDrive = false,
}: MediaUploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    onUrlChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
                aspectRatio: '16/9',
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <img
                src={thumbnail}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <IconButton
                size="small"
                onClick={handleClear}
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
            flex: 1,
            border: 2,
            borderColor: isDragging ? 'primary.main' : 'divider',
            borderStyle: 'dashed',
            borderRadius: 2,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            bgcolor: isDragging ? alpha('#1565d8', 0.05) : 'transparent',
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            minHeight: 200,
          }}
          onClick={handleBrowseClick}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 64,
              color: (theme) => (theme.palette.mode === 'dark' ? 'common.white' : 'primary.main'),
              mb: 2,
            }}
          />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Arraste e solte sua mídia aqui
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ou clique para selecionar um arquivo
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Suporta vídeos e imagens
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
    </Card>
  );
};

