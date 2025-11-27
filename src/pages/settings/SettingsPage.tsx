import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AuthTextField } from '@/components/auth';
import { ConfirmDialog, LoadingButton, useNotification } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { mapSupabaseError } from '@/utils/errorMessages';
import { platformsRepository, usersRepository } from '@/services/database';
import type { Platform } from '@/services/database/types';
import { supabaseClient } from '@/services/supabaseClient';
import { PLATFORM_LIST, getPlatformInfo, type PlatformType } from '@/utils/platforms';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

export const SettingsPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);

  // Perfil
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Plataformas
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [selectedPlatformType, setSelectedPlatformType] = useState<PlatformType | ''>('');
  const [platformErrors, setPlatformErrors] = useState<{ platform?: string }>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [platformDialogLoading, setPlatformDialogLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.name || user.email?.split('@')[0] || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Sincronizar aba com URL na inicialização e quando a URL mudar
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      const tabNum = parseInt(tab, 10);
      if (!isNaN(tabNum)) {
        setTabValue(tabNum);
      }
    } else {
      // Se não há tab na URL, usar aba padrão (Perfil = 0)
      setTabValue(0);
    }
  }, [searchParams]);

  // Atualizar URL quando a aba mudar
  const handleTabChange = useCallback((_: unknown, newValue: number) => {
    setTabValue(newValue);
    const newParams = new URLSearchParams(searchParams);
    if (newValue === 0) {
      newParams.delete('tab');
    } else {
      newParams.set('tab', newValue.toString());
    }
    newParams.delete('reload'); // Remover parâmetro de reload após usar
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchPlatforms = async () => {
      if (user?.id) {
        try {
          setPlatformsLoading(true);
          const userPlatforms = await platformsRepository.listByUser(user.id);
          setPlatforms(userPlatforms);
        } catch (err) {
          const errorMessage = mapSupabaseError(err instanceof Error ? err : undefined);
          showError(errorMessage);
          setPlatforms([]);
        } finally {
          setPlatformsLoading(false);
        }
      } else {
        setPlatformsLoading(false);
        setPlatforms([]);
      }
    };

    void fetchPlatforms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Recarregar plataformas quando o parâmetro reload=true estiver presente
  useEffect(() => {
    const reload = searchParams.get('reload');
    if (reload === 'true' && user?.id) {
      const reloadPlatforms = async () => {
        try {
          setPlatformsLoading(true);
          const userPlatforms = await platformsRepository.listByUser(user.id);
          setPlatforms(userPlatforms);
        } catch (err) {
          const errorMessage = mapSupabaseError(err instanceof Error ? err : undefined);
          showError(errorMessage);
        } finally {
          setPlatformsLoading(false);
        }
      };
      void reloadPlatforms();
      
      // Remover o parâmetro reload da URL após usar
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('reload');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, user?.id, setSearchParams, showError]);

  const loadPlatforms = useCallback(async () => {
    if (!user?.id) {
      setPlatformsLoading(false);
      return;
    }

    try {
      setPlatformsLoading(true);
      const userPlatforms = await platformsRepository.listByUser(user.id);
      setPlatforms(userPlatforms);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
      setPlatforms([]); // Limpar lista em caso de erro
    } finally {
      setPlatformsLoading(false);
    }
  }, [user?.id, showError]);

  const handleProfileSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setProfileLoading(true);
      // Atualizar perfil no Supabase Auth
      const { error: updateError } = await supabaseClient.auth.updateUser({
        data: { name },
      });

      if (updateError) throw updateError;

      // Atualizar na tabela users se existir
      try {
        await usersRepository.update(user.id, { name });
      } catch {
        // Se não existir na tabela, criar
        try {
          await usersRepository.create({
            name,
            email: user.email || '',
          });
        } catch {
          // Ignora erro se já existir
        }
      }

      showSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setProfileLoading(false);
    }
  }, [user, name, showSuccess, showError]);

  const handlePlatformDialogOpen = (platform?: Platform) => {
    if (platform) {
      setEditingPlatform(platform);
      const platformInfo = getPlatformInfo(platform.name);
      setSelectedPlatformType(platformInfo?.type || '');
    } else {
      setEditingPlatform(null);
      setSelectedPlatformType('');
    }
    setPlatformErrors({});
    setPlatformDialogOpen(true);
  };

  const handlePlatformDialogClose = () => {
    setPlatformDialogOpen(false);
    setEditingPlatform(null);
    setSelectedPlatformType('');
    setPlatformErrors({});
    setConnectingPlatform(null); // Resetar estado de conexão ao fechar
    setPlatformDialogLoading(false); // Resetar loading do dialog
  };

  const validatePlatform = () => {
    const errors: { platform?: string } = {};
    if (!selectedPlatformType) {
      errors.platform = 'Selecione uma plataforma.';
    }
    setPlatformErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddPlatform = useCallback(async () => {
    if (!user?.id || !selectedPlatformType) return;

    if (!validatePlatform()) {
      return;
    }

    setPlatformDialogLoading(true);
    try {
      const platformInfo = PLATFORM_LIST.find((p) => p.type === selectedPlatformType);
      if (!platformInfo) {
        setPlatformDialogLoading(false);
        return;
      }

      // Verificar se a plataforma já existe
      const existingPlatform = platforms.find(
        (p) => p.name.toLowerCase() === platformInfo.name.toLowerCase(),
      );

      if (existingPlatform) {
        showError('Esta plataforma já está adicionada.');
        setPlatformDialogLoading(false);
        return;
      }

      // Criar plataforma (sem token por enquanto - será adicionado via OAuth)
      await platformsRepository.create({
        userId: user.id,
        name: platformInfo.name,
        apiToken: null, // Será preenchido após OAuth
      });

      showSuccess(`${platformInfo.displayName} adicionada com sucesso!`);
      await loadPlatforms();
      handlePlatformDialogClose();
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setPlatformDialogLoading(false);
    }
  }, [selectedPlatformType, platforms, user?.id, loadPlatforms, showSuccess, showError, handlePlatformDialogClose]);

  const handleConnectPlatform = useCallback(async (platformType: PlatformType) => {
    if (!user?.id) return;
    
    setConnectingPlatform(platformType);
    try {
      const platformInfo = PLATFORM_LIST.find((p) => p.type === platformType);
      if (!platformInfo) {
        showError('Plataforma não encontrada');
        setConnectingPlatform(null);
        return;
      }

      // Verificar se a plataforma já está adicionada
      const existingPlatform = platforms.find(
        (p) => p.name.toLowerCase() === platformInfo.name.toLowerCase(),
      );

      if (!existingPlatform) {
        showError('Adicione a plataforma primeiro antes de conectar');
        setConnectingPlatform(null);
        return;
      }

      // Iniciar fluxo OAuth
      const { initiateOAuth } = await import('@/services/oauth');
      initiateOAuth(platformType, user.id);
      // O usuário será redirecionado, então não precisamos resetar o estado aqui
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
      setConnectingPlatform(null);
    }
  }, [user?.id, platforms, showError]);

  const handleDisconnectPlatform = useCallback(async (platformId: string) => {
    try {
      setPlatformsLoading(true);
      await platformsRepository.remove(platformId);
      showSuccess('Plataforma desconectada com sucesso!');
      await loadPlatforms();
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setPlatformsLoading(false);
    }
  }, [loadPlatforms, showSuccess, showError]);

  const handlePlatformDeleteClick = useCallback((platformId: string) => {
    setPlatformToDelete(platformId);
    setDeleteConfirmOpen(true);
  }, []);

  const handlePlatformDeleteConfirm = useCallback(async () => {
    if (!platformToDelete) return;

    try {
      setPlatformsLoading(true);
      await platformsRepository.remove(platformToDelete);
      showSuccess('Plataforma removida com sucesso!');
      await loadPlatforms();
      setDeleteConfirmOpen(false);
      setPlatformToDelete(null);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setPlatformsLoading(false);
    }
  }, [platformToDelete, loadPlatforms, showSuccess, showError]);

  const handlePlatformDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setPlatformToDelete(null);
  }, []);

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" fontWeight={700}>
        Configurações
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Perfil" />
            <Tab label="Plataformas" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant="h6" fontWeight={600}>
                Informações do perfil
              </Typography>

              <Stack spacing={2}>
                <Stack spacing={1}>
                  <AuthTextField
                    label="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Stack>

                <Stack spacing={1}>
                  <AuthTextField
                    label="E-mail"
                    type="email"
                    value={email}
                    disabled
                    helperText="O e-mail não pode ser alterado aqui."
                  />
                </Stack>

                <Box>
                  <LoadingButton
                    variant="contained"
                    onClick={handleProfileSave}
                    loading={profileLoading}
                    loadingText="Salvando..."
                  >
                    Salvar alterações
                  </LoadingButton>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={600}>
                  Plataformas conectadas
                </Typography>
                <Tooltip title="Conectar uma nova plataforma social para publicar vídeos">
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handlePlatformDialogOpen()}
                  >
                    Adicionar plataforma
                  </Button>
                </Tooltip>
              </Box>

              {platformsLoading && platforms.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : platforms.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  Nenhuma plataforma configurada ainda.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {platforms.map((platform) => (
                    <Box
                      key={platform.id}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {getPlatformInfo(platform.name)?.displayName || platform.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {platform.apiToken
                            ? 'Conectado'
                            : 'Não conectado - Clique em "Conectar" para autorizar'}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {!platform.apiToken ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              const platformInfo = getPlatformInfo(platform.name);
                              if (platformInfo) {
                                handleConnectPlatform(platformInfo.type);
                              }
                            }}
                            disabled={platformsLoading || connectingPlatform !== null}
                          >
                            Conectar
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDisconnectPlatform(platform.id)}
                            disabled={platformsLoading}
                          >
                            Desconectar
                          </Button>
                        )}
                        <Tooltip title="Remover plataforma">
                          <IconButton
                            size="small"
                            onClick={() => handlePlatformDeleteClick(platform.id)}
                            aria-label="Remover plataforma"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </TabPanel>
      </Card>

      <Dialog open={platformDialogOpen} onClose={handlePlatformDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPlatform ? 'Gerenciar plataforma' : 'Adicionar nova plataforma'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack spacing={1}>
              <TextField
                select
                label="Plataforma"
                value={selectedPlatformType}
                onChange={(e) => setSelectedPlatformType(e.target.value as PlatformType)}
                error={Boolean(platformErrors.platform)}
                fullWidth
                disabled={!!editingPlatform}
                helperText={
                  editingPlatform
                    ? 'A plataforma não pode ser alterada após a adição'
                    : 'Selecione a plataforma que deseja adicionar'
                }
              >
                {PLATFORM_LIST.map((platform) => {
                  // Verificar se a plataforma já está conectada
                  const isConnected = platforms.some(
                    (p) => p.name.toLowerCase() === platform.name.toLowerCase(),
                  );
                  return (
                    <MenuItem
                      key={platform.type}
                      value={platform.type}
                      disabled={isConnected}
                    >
                      {platform.displayName}
                      {isConnected && ' (já conectada)'}
                    </MenuItem>
                  );
                })}
              </TextField>
              {platformErrors.platform && (
                <FormHelperText error>{platformErrors.platform}</FormHelperText>
              )}
            </Stack>

            {selectedPlatformType && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {PLATFORM_LIST.find((p) => p.type === selectedPlatformType)?.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Após adicionar a plataforma, você poderá conectá-la clicando no botão "Conectar" na lista.
                  Você será redirecionado para autorizar o acesso à sua conta. Os tokens serão armazenados de forma segura.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePlatformDialogClose}>Cancelar</Button>
          <LoadingButton
            variant="contained"
            onClick={handleAddPlatform}
            loading={platformDialogLoading}
            loadingText="Adicionando..."
            disabled={!selectedPlatformType || platformDialogLoading}
          >
            Adicionar
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Confirmar exclusão"
        message="Tem certeza que deseja remover esta plataforma? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        confirmColor="error"
        onConfirm={handlePlatformDeleteConfirm}
        onCancel={handlePlatformDeleteCancel}
      />
    </Stack>
  );
};
