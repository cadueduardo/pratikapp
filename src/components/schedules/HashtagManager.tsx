import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { hashtagsRepository, platformsRepository } from '@/services/database';
import type { Platform } from '@/services/database/types';
import { getPlatformInfo } from '@/utils/platforms';
import { getHashtagLimit, hasHashtagLimit, isValidHashtagCount } from '@/utils/hashtagLimits';

interface HashtagManagerProps {
  userId: string;
  selectedPlatformIds: string[] | null;
  platformHashtags: Record<string, string[]> | null;
  onPlatformHashtagsChange: (hashtags: Record<string, string[]>) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

export const HashtagManager = ({
  userId,
  selectedPlatformIds,
  platformHashtags,
  onPlatformHashtagsChange,
}: HashtagManagerProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [favoriteHashtags, setFavoriteHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [platformsData, setPlatformsData] = useState<Platform[]>([]);

  // Carregar dados das plataformas
  useEffect(() => {
    const loadPlatforms = async () => {
      if (!selectedPlatformIds || selectedPlatformIds.length === 0) {
        setPlatformsData([]);
        return;
      }

      try {
        const platforms = await Promise.all(
          selectedPlatformIds.map((id) => platformsRepository.getById(id)),
        );
        setPlatformsData(platforms.filter((p): p is Platform => p !== null));
      } catch (error) {
        console.error('Erro ao carregar plataformas:', error);
      }
    };

    void loadPlatforms();
  }, [selectedPlatformIds]);

  // Obter plataformas selecionadas
  const platforms = selectedPlatformIds || [];
  const activePlatform = platforms[activeTab] || null;

  // Carregar hashtags favoritas
  useEffect(() => {
    const loadFavorites = async () => {
      if (!userId) return;
      try {
        const favorites = await hashtagsRepository.listByUser(userId, 20);
        setFavoriteHashtags(favorites.map((h) => h.hashtag));
      } catch (error) {
        console.error('Erro ao carregar hashtags favoritas:', error);
      }
    };

    void loadFavorites();
  }, [userId]);

  const getPlatformHashtags = (platformId: string): string[] => {
    return platformHashtags?.[platformId] || [];
  };

  const addHashtag = (platformId: string, hashtag: string) => {
    if (!hashtag.trim()) return;

    // Normalizar hashtag (adicionar # se não tiver)
    const normalized = hashtag.trim().startsWith('#') ? hashtag.trim() : `#${hashtag.trim()}`;

    const current = getPlatformHashtags(platformId);
    
    // Verificar se já existe
    if (current.includes(normalized)) {
      return;
    }

    // Não bloquear adição, apenas permitir (o aviso visual será mostrado)

    const updated = {
      ...platformHashtags,
      [platformId]: [...current, normalized],
    };
    onPlatformHashtagsChange(updated);

    // Salvar como favorita
    void hashtagsRepository.createOrIncrement({
      userId,
      hashtag: normalized,
    });

    setNewHashtag('');
  };

  const removeHashtag = (platformId: string, hashtag: string) => {
    const current = getPlatformHashtags(platformId);
    const updated = {
      ...platformHashtags,
      [platformId]: current.filter((h) => h !== hashtag),
    };
    onPlatformHashtagsChange(updated);
  };

  const handleAddFromFavorites = (hashtag: string) => {
    if (activePlatform) {
      addHashtag(activePlatform, hashtag);
    }
  };

  const handleCopyFromOtherPlatform = (sourcePlatformId: string) => {
    if (!activePlatform) return;
    
    const sourceHashtags = getPlatformHashtags(sourcePlatformId);
    if (sourceHashtags.length === 0) return;

    // Adicionar todas as hashtags da plataforma origem
    const current = getPlatformHashtags(activePlatform);
    const newHashtags = [...new Set([...current, ...sourceHashtags])]; // Remover duplicatas
    
    const updated = {
      ...platformHashtags,
      [activePlatform]: newHashtags,
    };
    onPlatformHashtagsChange(updated);
  };

  if (platforms.length === 0) {
    return (
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Selecione pelo menos uma plataforma para gerenciar hashtags
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gerenciar Hashtags
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        {platforms.map((platformId, index) => {
          const platform = platformsData.find((p) => p.id === platformId);
          const platformInfo = platform ? getPlatformInfo(platform.name) : null;
          const platformName = platformInfo?.displayName || platform?.name || platformId;
          const hashtags = getPlatformHashtags(platformId);
          const limit = getHashtagLimit(platformName);

          return (
            <Tab
              key={platformId}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{platformName}</span>
                  {hasHashtagLimit(platformName) && (
                    <Chip
                      label={`${hashtags.length}/${limit}`}
                      size="small"
                      color={hashtags.length > limit ? 'error' : 'default'}
                    />
                  )}
                </Stack>
              }
            />
          );
        })}
      </Tabs>

      {platforms.map((platformId, index) => {
        const platform = platformsData.find((p) => p.id === platformId);
        const platformInfo = platform ? getPlatformInfo(platform.name) : null;
        const platformName = platformInfo?.displayName || platform?.name || platformId;
        const hashtags = getPlatformHashtags(platformId);
        const limit = getHashtagLimit(platformName);

        return (
          <TabPanel key={platformId} value={activeTab} index={index}>
            <Stack spacing={2}>
              {/* Aviso visual se exceder limite */}
              {hasHashtagLimit(platformName) && hashtags.length > (limit || 0) && (
                <Alert severity="warning">
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Limite excedido: {platformName} aceita no máximo {limit} hashtags
                  </Typography>
                  <Typography variant="caption">
                    Você tem {hashtags.length} hashtags. Remova {hashtags.length - (limit || 0)}{' '}
                    hashtag(s) para atender ao limite.
                  </Typography>
                </Alert>
              )}

              {/* Copiar hashtags de outras plataformas */}
              {platforms.length > 1 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Copiar hashtags de outras plataformas
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {platforms
                      .filter((pid) => pid !== platformId)
                      .map((otherPlatformId) => {
                        const otherPlatform = platformsData.find((p) => p.id === otherPlatformId);
                        const otherPlatformInfo = otherPlatform
                          ? getPlatformInfo(otherPlatform.name)
                          : null;
                        const otherPlatformName =
                          otherPlatformInfo?.displayName || otherPlatform?.name || otherPlatformId;
                        const otherHashtags = getPlatformHashtags(otherPlatformId);

                        if (otherHashtags.length === 0) return null;

                        return (
                          <Button
                            key={otherPlatformId}
                            size="small"
                            variant="outlined"
                            startIcon={<ContentCopyIcon />}
                            onClick={() => handleCopyFromOtherPlatform(otherPlatformId)}
                          >
                            Copiar de {otherPlatformName} ({otherHashtags.length})
                          </Button>
                        );
                      })}
                  </Box>
                </Box>
              )}

              {/* Input para adicionar hashtag */}
              <Stack direction="row" spacing={1}>
                <TextField
                  placeholder="Digite uma hashtag"
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addHashtag(platformId, newHashtag);
                    }
                  }}
                  fullWidth
                  size="small"
                  helperText={
                    hasHashtagLimit(platformName)
                      ? `Limite: ${limit} hashtags (${hashtags.length}/${limit})`
                      : undefined
                  }
                  error={hasHashtagLimit(platformName) && hashtags.length > (limit || 0)}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => addHashtag(platformId, newHashtag)}
                  disabled={!newHashtag.trim()}
                >
                  Adicionar
                </Button>
              </Stack>

              {/* Hashtags da plataforma */}
              {hashtags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Hashtags para {platformName} ({hashtags.length}
                    {hasHashtagLimit(platformName) && ` / ${limit} máximo`})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {hashtags.map((hashtag, idx) => {
                      // Destacar hashtags que excedem o limite
                      const exceedsLimit =
                        hasHashtagLimit(platformName) && idx >= (limit || 0);
                      return (
                        <Chip
                          key={idx}
                          label={hashtag}
                          onDelete={() => removeHashtag(platformId, hashtag)}
                          deleteIcon={<DeleteIcon />}
                          color={exceedsLimit ? 'error' : 'default'}
                          variant={exceedsLimit ? 'outlined' : 'filled'}
                          sx={{
                            border: exceedsLimit ? '2px solid' : 'none',
                            borderColor: exceedsLimit ? 'error.main' : 'transparent',
                          }}
                        />
                      );
                    })}
                  </Box>
                  {hasHashtagLimit(platformName) && hashtags.length > (limit || 0) && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      ⚠️ As hashtags destacadas em vermelho excedem o limite. Remova-as antes de
                      salvar.
                    </Typography>
                  )}
                </Box>
              )}

              {/* Hashtags favoritas */}
              {favoriteHashtags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Hashtags Favoritas
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {favoriteHashtags
                      .filter((h) => !hashtags.includes(h))
                      .map((hashtag, idx) => (
                        <Chip
                          key={idx}
                          label={hashtag}
                          onClick={() => handleAddFromFavorites(hashtag)}
                          clickable
                          variant="outlined"
                        />
                      ))}
                  </Box>
                </Box>
              )}
            </Stack>
          </TabPanel>
        );
      })}
    </Box>
  );
};

