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
  Checkbox,
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
  multiSelect?: boolean; // Modo seleção múltipla
  selectedFiles?: GoogleDriveFile[]; // Arquivos já selecionados (controlado externamente)
  onSelectionChange?: (files: GoogleDriveFile[]) => void; // Callback quando seleção muda
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
  onSelect?: () => void; // Opcional - só usado em modo único
  multiSelect?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const MediaThumbnailItem = ({ 
  file, 
  userId, 
  isVideo, 
  isImage, 
  onSelect, 
  multiSelect = false,
  isSelected = false,
  onToggleSelect 
}: MediaThumbnailItemProps) => {
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

  const handleClick = (e: React.MouseEvent) => {
    // Sempre prevenir propagação e comportamento padrão
    e.preventDefault();
    e.stopPropagation();
    
    // Em modo múltiplo, NUNCA chamar onSelect, apenas toggle da seleção
    if (multiSelect) {
      if (onToggleSelect) {
        onToggleSelect();
      }
      // NÃO chamar onSelect em modo múltiplo para não fechar o modal
      return;
    }
    // Modo único: selecionar e fechar (só se onSelect existir)
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <ImageListItem
      sx={{ 
        cursor: 'pointer',
        position: 'relative',
        border: isSelected ? '2px solid' : '2px solid transparent',
        borderColor: isSelected ? 'primary.main' : 'transparent',
        borderRadius: 1,
      }}
      onClick={handleClick}
    >
      {/* Checkbox no modo seleção múltipla */}
      {multiSelect && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            bgcolor: 'background.paper',
            borderRadius: '50%',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleSelect) {
              onToggleSelect();
            }
          }}
        >
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleSelect) {
                onToggleSelect();
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            sx={{
              color: 'primary.main',
              '&.Mui-checked': {
                color: 'primary.main',
              },
            }}
          />
        </Box>
      )}
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

// Chave para salvar última pasta no localStorage
const getLastFolderKey = (userId: string) => `googleDrive_lastFolder_${userId}`;

// Interface para salvar estado da última pasta
interface LastFolderState {
  folderId?: string;
  breadcrumbs: BreadcrumbItem[];
}

// Função para salvar última pasta acessada
const saveLastFolder = (userId: string, folderId: string | undefined, breadcrumbs: BreadcrumbItem[]) => {
  try {
    const state: LastFolderState = {
      folderId,
      breadcrumbs,
    };
    localStorage.setItem(getLastFolderKey(userId), JSON.stringify(state));
  } catch (error) {
    console.warn('[GoogleDriveBrowser] Erro ao salvar última pasta:', error);
  }
};

// Função para carregar última pasta acessada
const loadLastFolder = (userId: string): LastFolderState | null => {
  try {
    const saved = localStorage.getItem(getLastFolderKey(userId));
    if (saved) {
      return JSON.parse(saved) as LastFolderState;
    }
  } catch (error) {
    console.warn('[GoogleDriveBrowser] Erro ao carregar última pasta:', error);
  }
  return null;
};

export const GoogleDriveBrowser = ({
  open,
  onClose,
  onSelect,
  userId,
  multiSelect = false,
  selectedFiles = [],
  onSelectionChange,
}: GoogleDriveBrowserProps) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<GoogleDriveFile[]>([]);
  const [media, setMedia] = useState<GoogleDriveFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ name: 'Meu Drive' }]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  // Estado interno para seleção múltipla (quando não é controlado externamente)
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<GoogleDriveFile[]>([]);
  
  // Em modo múltiplo, sempre usar estado interno para permitir seleção sem fechar o modal
  // selectedFiles externo é usado apenas para inicializar a seleção quando o modal abre
  // Em modo único, usar selectedFiles se fornecido (modo controlado)
  const currentSelectedFiles = multiSelect
    ? internalSelectedFiles
    : (onSelectionChange ? (selectedFiles || []) : internalSelectedFiles);
  
  // Função para atualizar seleção
  // IMPORTANTE: Em modo múltiplo, não chamar onSelectionChange imediatamente
  // Isso permite que o usuário selecione múltiplos arquivos sem fechar o modal
  // onSelectionChange só será chamado quando o usuário clicar em "Selecionar"
  const updateSelection = useCallback((files: GoogleDriveFile[]) => {
    console.log('[GoogleDriveBrowser] Atualizando seleção:', {
      filesCount: files.length,
      hasOnSelectionChange: !!onSelectionChange,
      fileIds: files.map(f => f.id),
      isMultiSelect: multiSelect,
    });
    
    // Em modo múltiplo, sempre usar estado interno para não fechar o modal
    // onSelectionChange será chamado apenas em handleConfirmSelection
    if (multiSelect) {
      setInternalSelectedFiles(files);
      // Se onSelectionChange existe, também atualizar selectedFiles externo
      // mas sem fechar o modal (isso é responsabilidade do componente pai)
      // Na verdade, em modo múltiplo, não devemos chamar onSelectionChange aqui
      // porque isso pode fechar o modal no componente pai
    } else if (onSelectionChange) {
      // Modo único: chamar onSelectionChange imediatamente
      onSelectionChange(files);
    } else {
      setInternalSelectedFiles(files);
    }
  }, [onSelectionChange, multiSelect]);

  const loadFolder = useCallback(
    async (folderId?: string, newBreadcrumbs?: BreadcrumbItem[]) => {
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
        
        // Atualizar breadcrumbs se fornecido
        if (newBreadcrumbs) {
          setBreadcrumbs(newBreadcrumbs);
        }
        
        // Salvar última pasta acessada
        const breadcrumbsToSave = newBreadcrumbs || breadcrumbs;
        saveLastFolder(userId, folderId, breadcrumbsToSave);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar pasta';
        showError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userId, showError, breadcrumbs],
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
      setSearchQuery('');
      
      // Em modo múltiplo, inicializar estado interno com selectedFiles se fornecido
      // Isso permite manter a seleção quando o modal reabre
      if (multiSelect) {
        if (selectedFiles && selectedFiles.length > 0) {
          // Sincronizar estado interno com selectedFiles externo
          setInternalSelectedFiles(selectedFiles);
        } else {
          // Limpar seleção se não houver arquivos selecionados
          setInternalSelectedFiles([]);
        }
      }
      
      // Tentar carregar última pasta acessada
      const lastFolder = loadLastFolder(userId);
      
      if (lastFolder && lastFolder.folderId) {
        // Carregar última pasta acessada
        setBreadcrumbs(lastFolder.breadcrumbs);
        void loadFolder(lastFolder.folderId, lastFolder.breadcrumbs);
      } else {
        // Começar na raiz (Meu Drive)
        setBreadcrumbs([{ name: 'Meu Drive' }]);
        void loadFolder(undefined, [{ name: 'Meu Drive' }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, multiSelect]); // Removido onSelectionChange e selectedFiles das dependências para evitar re-renders desnecessários

  const handleFolderClick = async (folder: GoogleDriveFile) => {
    const newBreadcrumbs = [...breadcrumbs, { id: folder.id, name: folder.name }];
    await loadFolder(folder.id, newBreadcrumbs);
  };

  const handleBreadcrumbClick = async (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    const targetFolder = newBreadcrumbs[index];
    await loadFolder(targetFolder.id, newBreadcrumbs);
  };

  const handleMediaSelect = async (file: GoogleDriveFile) => {
    // IMPORTANTE: Em modo múltiplo, NUNCA fechar o modal
    if (multiSelect) {
      // Em modo múltiplo, apenas toggle da seleção usando handleToggleSelect
      handleToggleSelect(file);
      return;
    }
    
    // Modo único: selecionar e fechar
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
      onSelect(file);
      onClose();
    }
  };
  
  const handleToggleSelect = useCallback((file: GoogleDriveFile) => {
    // Não usar async aqui para evitar problemas de concorrência
    if (multiSelect) {
      // Em modo múltiplo, sempre usar estado interno
      const isSelected = internalSelectedFiles.some(f => f.id === file.id);
      let newSelection: GoogleDriveFile[];
      
      console.log('[GoogleDriveBrowser] Toggle seleção:', {
        fileId: file.id,
        fileName: file.name,
        isSelected,
        currentCount: internalSelectedFiles.length,
        currentFileIds: internalSelectedFiles.map(f => f.id),
      });
      
      if (isSelected) {
        newSelection = internalSelectedFiles.filter(f => f.id !== file.id);
      } else {
        newSelection = [...internalSelectedFiles, file];
      }
      
      console.log('[GoogleDriveBrowser] Nova seleção:', {
        count: newSelection.length,
        fileIds: newSelection.map(f => f.id),
      });
      
      updateSelection(newSelection);
    } else {
      void handleMediaSelect(file);
    }
  }, [multiSelect, internalSelectedFiles, updateSelection, handleMediaSelect]);
  
  const handleConfirmSelection = () => {
    console.log('[GoogleDriveBrowser] Confirmando seleção:', {
      filesCount: currentSelectedFiles.length,
      fileIds: currentSelectedFiles.map(f => f.id),
      hasOnSelectionChange: !!onSelectionChange,
    });
    
    if (onSelectionChange && currentSelectedFiles.length > 0) {
      onSelectionChange(currentSelectedFiles);
      onClose();
    } else if (!onSelectionChange && currentSelectedFiles.length > 0) {
      // Modo não controlado - usar estado interno
      console.log('[GoogleDriveBrowser] Modo não controlado, usando estado interno');
    }
  };


  // Handler para fechar o modal - em modo múltiplo, só fecha se for explicitamente cancelado
  const handleDialogClose = useCallback((event: object, reason: string) => {
    // Em modo múltiplo, não permitir fechar clicando no backdrop ou pressionando ESC
    // Só permitir fechar através do botão "Cancelar" ou "Selecionar"
    if (multiSelect && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    onClose();
  }, [multiSelect, onClose]);

  return (
    <Dialog 
      open={open} 
      onClose={handleDialogClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={multiSelect} // Desabilitar ESC em modo múltiplo
    >
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
                const isSelected = currentSelectedFiles.some(f => f.id === file.id);
                
                return (
                  <MediaThumbnailItem
                    key={file.id}
                    file={file}
                    userId={userId}
                    isVideo={isVideo}
                    isImage={isImage}
                    onSelect={multiSelect ? undefined : () => handleMediaSelect(file)}
                    multiSelect={multiSelect}
                    isSelected={isSelected}
                    onToggleSelect={() => handleToggleSelect(file)}
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
        {multiSelect ? (
          <>
            <Typography sx={{ flexGrow: 1, ml: 2 }}>
              {currentSelectedFiles.length > 0 
                ? `${currentSelectedFiles.length} arquivo${currentSelectedFiles.length > 1 ? 's' : ''} selecionado${currentSelectedFiles.length > 1 ? 's' : ''}`
                : 'Nenhum arquivo selecionado'}
            </Typography>
            <Button onClick={onClose}>Cancelar</Button>
            <Button 
              variant="contained" 
              onClick={handleConfirmSelection}
              disabled={currentSelectedFiles.length === 0}
            >
              Selecionar {currentSelectedFiles.length > 0 ? `(${currentSelectedFiles.length})` : ''}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Cancelar</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

