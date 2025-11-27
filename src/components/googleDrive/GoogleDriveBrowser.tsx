/**
 * Componente para navegar e selecionar vídeos do Google Drive
 */

import FolderIcon from '@mui/icons-material/Folder';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState, useNotification } from '@/components/common';
import type { GoogleDriveFile } from '@/services/googleDrive';
import {
  getFileMetadata,
  getThumbnailUrl,
  listFolders,
  listVideosInFolder,
  searchVideos,
} from '@/services/googleDrive';

interface GoogleDriveBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: GoogleDriveFile) => void;
  userId: string;
}

interface BreadcrumbItem {
  id?: string;
  name: string;
}

export const GoogleDriveBrowser = ({
  open,
  onClose,
  onSelect,
  userId,
}: GoogleDriveBrowserProps) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<GoogleDriveFile[]>([]);
  const [videos, setVideos] = useState<GoogleDriveFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ name: 'Meu Drive' }]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const loadFolder = useCallback(
    async (folderId?: string) => {
      if (!userId) return;

      try {
        setLoading(true);
        setSearching(false);
        const [foldersData, videosData] = await Promise.all([
          listFolders(userId, folderId),
          listVideosInFolder(userId, folderId),
        ]);

        setFolders(foldersData);
        setVideos(videosData);
        setCurrentFolderId(folderId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar pasta';
        showError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userId, showError],
  );

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !userId) {
        // Recarregar pasta atual se busca estiver vazia
        setSearching(false);
        try {
          setLoading(true);
          const [foldersData, videosData] = await Promise.all([
            listFolders(userId, currentFolderId),
            listVideosInFolder(userId, currentFolderId),
          ]);
          setFolders(foldersData);
          setVideos(videosData);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar pasta';
          showError(errorMessage);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setSearching(true);
        setLoading(true);
        const results = await searchVideos(userId, query);
        setVideos(results);
        setFolders([]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar vídeos';
        showError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userId, currentFolderId, showError],
  );

  useEffect(() => {
    if (open && userId) {
      loadFolder();
      setSearchQuery('');
      setBreadcrumbs([{ name: 'Meu Drive' }]);
      setCurrentFolderId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]); // Removido loadFolder das dependências para evitar loop infinito

  const handleFolderClick = async (folder: GoogleDriveFile) => {
    const newBreadcrumbs = [...breadcrumbs, { id: folder.id, name: folder.name }];
    setBreadcrumbs(newBreadcrumbs);
    await loadFolder(folder.id);
  };

  const handleBreadcrumbClick = async (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    const targetFolder = newBreadcrumbs[index];
    await loadFolder(targetFolder.id);
  };

  const handleVideoSelect = async (video: GoogleDriveFile) => {
    // Buscar metadados completos incluindo thumbnail
    try {
      const fullMetadata = await getFileMetadata(userId, video.id);
      if (fullMetadata) {
        onSelect(fullMetadata);
        onClose();
      } else {
        onSelect(video);
        onClose();
      }
    } catch (err) {
      // Se falhar, usar os dados que já temos
      onSelect(video);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">Selecionar vídeo do Google Drive</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Breadcrumb */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {breadcrumbs.map((crumb, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && <Typography sx={{ mx: 0.5 }}>/</Typography>}
                <Button
                  size="small"
                  onClick={() => handleBreadcrumbClick(index)}
                  disabled={index === breadcrumbs.length - 1}
                  sx={{ textTransform: 'none', minWidth: 'auto' }}
                >
                  {crumb.name}
                </Button>
              </Box>
            ))}
          </Stack>

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar vídeos..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              void handleSearch(e.target.value);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* Loading */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Folders and Videos */}
          {!loading && (folders.length > 0 || videos.length > 0) && (
            <ImageList cols={3} gap={16} sx={{ m: 0 }}>
              {/* Folders */}
              {folders.map((folder) => (
                <ImageListItem
                  key={folder.id}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleFolderClick(folder)}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 150,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <FolderIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', px: 1 }}>
                      {folder.name}
                    </Typography>
                  </Box>
                </ImageListItem>
              ))}

              {/* Videos */}
              {videos.map((video) => {
                const thumbnailUrl = getThumbnailUrl(video.thumbnailLink, 'medium');
                return (
                  <ImageListItem
                    key={video.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleVideoSelect(video)}
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={video.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: 150,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 150,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <VideoFileIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                      </Box>
                    )}
                    <ImageListItemBar
                      title={video.name}
                      subtitle={
                        video.size
                          ? `${(video.size / 1024 / 1024).toFixed(1)} MB`
                          : undefined
                      }
                      sx={{
                        '& .MuiImageListItemBar-title': {
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    />
                  </ImageListItem>
                );
              })}
            </ImageList>
          )}

          {/* Empty State */}
          {!loading && folders.length === 0 && videos.length === 0 && (
            <EmptyState
              title={searching ? 'Nenhum vídeo encontrado' : 'Pasta vazia'}
              description={
                searching
                  ? `Não foram encontrados vídeos com "${searchQuery}"`
                  : 'Esta pasta não contém vídeos ou pastas'
              }
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
};

