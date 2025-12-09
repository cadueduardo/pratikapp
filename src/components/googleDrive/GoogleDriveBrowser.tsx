/**
 * Componente para navegar e selecionar mídia (vídeos e imagens) do Google Drive
 */

import FolderIcon from '@mui/icons-material/Folder';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import ImageIcon from '@mui/icons-material/Image';
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
  listMediaInFolder,
  searchMedia,
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

interface MediaThumbnailItemProps {
  file: GoogleDriveFile;
  userId: string;
  isVideo: boolean;
  isImage: boolean;
  onSelect: () => void;
}

const MediaThumbnailItem = ({ file, userId, isVideo, isImage, onSelect }: MediaThumbnailItemProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        setLoading(true);
        const url = await getThumbnailUrl(file.thumbnailLink, 'medium', file.id, file.mimeType, userId);
        setThumbnailUrl(url);
      } catch (error) {
        console.error('[MediaThumbnailItem] Erro ao carregar thumbnail:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadThumbnail();
  }, [file.id, file.thumbnailLink, file.mimeType, userId]);

  return (
    <ImageListItem
      sx={{ cursor: 'pointer' }}
      onClick={onSelect}
    >
      {thumbnailUrl && !loading ? (
        <img
          src={thumbnailUrl}
          alt={file.name}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 150px; background-color: rgba(0,0,0,0.04); border-radius: 4px;';
              const iconSvg = isVideo 
                ? '<svg style="font-size: 64px; color: #1976d2;" viewBox="0 0 24 24"><path fill="currentColor" d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>'
                : '<svg style="font-size: 64px; color: #1976d2;" viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
              fallback.innerHTML = iconSvg;
              parent.appendChild(fallback);
            }
          }}
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
          {loading ? (
            <CircularProgress size={32} />
          ) : isVideo ? (
            <VideoFileIcon sx={{ fontSize: 64, color: 'primary.main' }} />
          ) : (
            <ImageIcon sx={{ fontSize: 64, color: 'primary.main' }} />
          )}
        </Box>
      )}
      <ImageListItemBar
        title={file.name}
        subtitle={
          file.size
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
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
};

export const GoogleDriveBrowser = ({
  open,
  onClose,
  onSelect,
  userId,
}: GoogleDriveBrowserProps) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<GoogleDriveFile[]>([]);
  const [media, setMedia] = useState<GoogleDriveFile[]>([]);
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
        const [foldersData, mediaData] = await Promise.all([
          listFolders(userId, folderId),
          listMediaInFolder(userId, folderId),
        ]);

        setFolders(foldersData);
        setMedia(mediaData);
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
          const [foldersData, mediaData] = await Promise.all([
            listFolders(userId, currentFolderId),
            listMediaInFolder(userId, currentFolderId),
          ]);
          setFolders(foldersData);
          setMedia(mediaData);
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
        const results = await searchMedia(userId, query);
        setMedia(results);
        setFolders([]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar mídia';
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

  const handleMediaSelect = async (file: GoogleDriveFile) => {
    // Buscar metadados completos incluindo thumbnail
    try {
      const fullMetadata = await getFileMetadata(userId, file.id);
      if (fullMetadata) {
        onSelect(fullMetadata);
        onClose();
      } else {
        onSelect(file);
        onClose();
      }
    } catch (err) {
      // Se falhar, usar os dados que já temos
      onSelect(file);
      onClose();
    }
  };


  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">Selecionar mídia do Google Drive</Typography>
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
            placeholder="Buscar vídeos e imagens..."
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

          {/* Folders and Media */}
          {!loading && (folders.length > 0 || media.length > 0) && (
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

              {/* Media (Videos and Images) */}
              {media.map((file) => {
                const isVideo = file.mimeType?.startsWith('video/');
                const isImage = file.mimeType?.startsWith('image/');
                
                return (
                  <MediaThumbnailItem
                    key={file.id}
                    file={file}
                    userId={userId}
                    isVideo={isVideo}
                    isImage={isImage}
                    onSelect={() => handleMediaSelect(file)}
                  />
                );
              })}
            </ImageList>
          )}

          {/* Empty State */}
          {!loading && folders.length === 0 && media.length === 0 && (
            <EmptyState
              title={searching ? 'Nenhuma mídia encontrada' : 'Pasta vazia'}
              description={
                searching
                  ? `Não foram encontrados vídeos ou imagens com "${searchQuery}"`
                  : 'Esta pasta não contém mídia ou pastas'
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

