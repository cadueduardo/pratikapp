import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { LoadingButton } from '@/components/common';
import { useNotification } from '@/components/common/NotificationProvider';
import { usersRepository, aiHistoryRepository } from '@/services/database';
import type { AIGenerationHistory } from '@/services/database/types';
import { generateContentFromPrompt, recordUserChoice, type AIGeneratedContent } from '@/services/aiGeneration';

interface AIChatDialogProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onContentSelected: (content: AIGeneratedContent, provider: 'gemini' | 'openai') => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIChatDialog = ({ open, userId, onClose, onContentSelected }: AIChatDialogProps) => {
  const { showSuccess, showError } = useNotification();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGemini, setHasGemini] = useState(false);
  const [hasOpenAI, setHasOpenAI] = useState(false);
  const [geminiResult, setGeminiResult] = useState<AIGeneratedContent | null>(null);
  const [openaiResult, setOpenaiResult] = useState<AIGeneratedContent | null>(null);
  const [generationId, setGenerationId] = useState<string | undefined>();
  const [selectedHashtags, setSelectedHashtags] = useState<{
    gemini: string[];
    openai: string[];
  }>({ gemini: [], openai: [] });
  const [history, setHistory] = useState<AIGenerationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Verificar quais IAs o usuário tem configuradas e carregar histórico
  useEffect(() => {
    const checkAPIKeys = async () => {
      if (!userId) return;
      try {
        const user = await usersRepository.getById(userId);
        if (user) {
          setHasGemini(!!user.geminiApiKey);
          setHasOpenAI(!!user.openaiApiKey);
        }
      } catch (error) {
        console.error('Erro ao verificar API keys:', error);
      }
    };

    const loadHistory = async () => {
      if (!userId) return;
      try {
        setLoadingHistory(true);
        const historyResult = await aiHistoryRepository.listByUser(userId, 10); // Últimos 10
        if (Array.isArray(historyResult)) {
          setHistory(historyResult);
        }
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (open) {
      void checkAPIKeys();
      void loadHistory();
    }
  }, [userId, open]);

  // Resetar estado ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setPrompt('');
      setMessages([]);
      setGeminiResult(null);
      setOpenaiResult(null);
      setGenerationId(undefined);
      setSelectedHashtags({ gemini: [], openai: [] });
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showError('Digite um prompt para descrever o vídeo');
      return;
    }

    if (!hasGemini && !hasOpenAI) {
      showError('Configure pelo menos uma API Key nas Configurações');
      return;
    }

    try {
      setLoading(true);
      
      // Adicionar mensagem do usuário
      const userMessage: ChatMessage = {
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Chamar API
      const result = await generateContentFromPrompt({
        prompt,
        userId,
      });

      // Log para debug
      console.log('[AIChatDialog] Resultado recebido:', {
        hasGemini: !!result.gemini,
        hasOpenAI: !!result.openai,
        gemini: result.gemini,
        openai: result.openai,
      });

      setGeminiResult(result.gemini || null);
      setOpenaiResult(result.openai || null);
      setGenerationId(result.generationId);
      
      // Se não houver resultado do Gemini mas o usuário tem a API key, mostrar aviso
      if (!result.gemini && hasGemini) {
        console.warn('[AIChatDialog] Gemini não retornou resultado, mas API key está configurada');
      }
      
      // Se não houver resultado do OpenAI mas o usuário tem a API key, mostrar aviso
      if (!result.openai && hasOpenAI) {
        console.warn('[AIChatDialog] OpenAI não retornou resultado, mas API key está configurada');
      }
      // Inicializar hashtags selecionadas com todas as hashtags
      setSelectedHashtags({
        gemini: result.gemini?.hashtags || [],
        openai: result.openai?.hashtags || [],
      });

      // Adicionar mensagem da IA
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: 'Conteúdo gerado com sucesso! Escolha uma das opções abaixo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Recarregar histórico após gerar novo conteúdo
      try {
        const historyResult = await aiHistoryRepository.listByUser(userId, 10);
        if (Array.isArray(historyResult)) {
          setHistory(historyResult);
        }
      } catch (error) {
        console.error('Erro ao recarregar histórico:', error);
      }

      // Limpar prompt
      setPrompt('');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao gerar conteúdo com IA');
    } finally {
      setLoading(false);
    }
  };

  const handleUseResult = async (result: AIGeneratedContent, provider: 'gemini' | 'openai') => {
    try {
      // Quando reutilizamos do histórico, sempre usar as hashtags do resultado
      // Se houver uma geração atual (generationId) e hashtags selecionadas pelo usuário, usar essas
      // Caso contrário, usar as hashtags do resultado
      const finalHashtags = (generationId && selectedHashtags[provider]?.length > 0)
        ? selectedHashtags[provider]
        : (result.hashtags || []);

      const finalResult: AIGeneratedContent = {
        ...result,
        hashtags: finalHashtags,
      };

      // Registrar escolha no histórico apenas se houver uma geração atual
      if (generationId) {
        await recordUserChoice(generationId, provider, finalResult);
      }

      // Chamar callback
      onContentSelected(finalResult, provider);
      showSuccess('Conteúdo aplicado com sucesso!');
      onClose();
    } catch (error) {
      showError('Erro ao aplicar conteúdo');
    }
  };

  const toggleHashtag = (provider: 'gemini' | 'openai', hashtag: string) => {
    setSelectedHashtags((prev) => {
      const current = prev[provider];
      const isSelected = current.includes(hashtag);
      return {
        ...prev,
        [provider]: isSelected
          ? current.filter((h) => h !== hashtag)
          : [...current, hashtag],
      };
    });
  };

  const handleAdjustPrompt = () => {
    setGeminiResult(null);
    setOpenaiResult(null);
    setGenerationId(undefined);
  };

  const getButtonText = () => {
    if (hasGemini && hasOpenAI) {
      return 'Gerar com Gemini e OpenAI';
    }
    if (hasGemini) {
      return 'Gerar com Gemini';
    }
    if (hasOpenAI) {
      return 'Gerar com OpenAI';
    }
    return 'Configure uma API Key';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ChatIcon color="primary" />
          <Typography variant="h6">Gerar Conteúdo com IA</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {!hasGemini && !hasOpenAI && (
            <Alert severity="warning">
              Configure pelo menos uma API Key nas Configurações para usar esta funcionalidade.
            </Alert>
          )}

          {/* Histórico de Prompts */}
          {history.length > 0 && (
            <Accordion expanded={historyExpanded} onChange={(_, expanded) => setHistoryExpanded(expanded)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <HistoryIcon fontSize="small" />
                  <Typography variant="subtitle2">
                    Histórico de Prompts ({history.length})
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {history.map((item) => (
                      <Card key={item.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={2}>
                            {/* Prompt */}
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                Prompt:
                              </Typography>
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                "{item.prompt}"
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {new Date(item.createdAt).toLocaleString('pt-BR')}
                              </Typography>
                            </Box>

                            {/* Resultados */}
                            {(item.geminiResult || item.openaiResult) && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  Resultados gerados:
                                </Typography>
                                <Stack direction="row" spacing={2}>
                                  {item.geminiResult && (
                                    <Card variant="outlined" sx={{ flex: 1, bgcolor: 'action.hover' }}>
                                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                          Gemini
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                                          {item.geminiResult.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                          {item.geminiResult.description}
                                        </Typography>
                                        {item.geminiResult.hashtags.length > 0 && (
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                            {item.geminiResult.hashtags.slice(0, 3).map((tag, idx) => (
                                              <Chip key={idx} label={tag} size="small" variant="outlined" />
                                            ))}
                                            {item.geminiResult.hashtags.length > 3 && (
                                              <Chip label={`+${item.geminiResult.hashtags.length - 3}`} size="small" variant="outlined" />
                                            )}
                                          </Box>
                                        )}
                                      </CardContent>
                                    </Card>
                                  )}
                                  {item.openaiResult && (
                                    <Card variant="outlined" sx={{ flex: 1, bgcolor: 'action.hover' }}>
                                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                          OpenAI
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                                          {item.openaiResult.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                          {item.openaiResult.description}
                                        </Typography>
                                        {item.openaiResult.hashtags.length > 0 && (
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                            {item.openaiResult.hashtags.slice(0, 3).map((tag, idx) => (
                                              <Chip key={idx} label={tag} size="small" variant="outlined" />
                                            ))}
                                            {item.openaiResult.hashtags.length > 3 && (
                                              <Chip label={`+${item.openaiResult.hashtags.length - 3}`} size="small" variant="outlined" />
                                            )}
                                          </Box>
                                        )}
                                      </CardContent>
                                    </Card>
                                  )}
                                </Stack>
                              </Box>
                            )}

                            {/* Escolha do usuário */}
                            {item.chosenResult && item.chosenProvider && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                  Escolhido ({item.chosenProvider}):
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {item.chosenResult.title}
                                </Typography>
                              </Box>
                            )}

                            {/* Botões para reutilizar */}
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setPrompt(item.prompt);
                                  setHistoryExpanded(false);
                                }}
                              >
                                Reutilizar prompt
                              </Button>
                              {item.geminiResult && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => {
                                    handleUseResult(item.geminiResult!, 'gemini');
                                    setHistoryExpanded(false);
                                  }}
                                >
                                  Usar Gemini
                                </Button>
                              )}
                              {item.openaiResult && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="secondary"
                                  onClick={() => {
                                    handleUseResult(item.openaiResult!, 'openai');
                                    setHistoryExpanded(false);
                                  }}
                                >
                                  Usar OpenAI
                                </Button>
                              )}
                              {item.chosenResult && item.chosenProvider && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => {
                                    handleUseResult(item.chosenResult!, item.chosenProvider!);
                                    setHistoryExpanded(false);
                                  }}
                                >
                                  Usar escolhido ({item.chosenProvider})
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Chat Messages */}
          {messages.length > 0 && (
            <Box
              sx={{
                maxHeight: 300,
                overflowY: 'auto',
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Stack spacing={2}>
                {messages.map((msg, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Card
                      sx={{
                        maxWidth: '70%',
                        bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                        color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="body2">{msg.content}</Typography>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Prompt Input */}
          <TextField
            label="Descreva o vídeo"
            placeholder="Ex: Vídeo sobre dicas de programação em React, mostrando código e exemplos práticos..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            multiline
            rows={3}
            fullWidth
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                void handleGenerate();
              }
            }}
            helperText="Pressione Ctrl+Enter para gerar"
          />

          {/* Results */}
          {(geminiResult || openaiResult) && (
            <>
              <Divider />
              <Typography variant="h6">Resultados Gerados</Typography>
              <Stack direction="row" spacing={2}>
                {geminiResult && (
                  <Card sx={{ flex: 1 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Gemini
                        </Typography>
                        <TextField
                          label="Título"
                          value={geminiResult.title}
                          fullWidth
                          multiline
                          rows={2}
                          InputProps={{ readOnly: true }}
                        />
                        <TextField
                          label="Descrição"
                          value={geminiResult.description}
                          fullWidth
                          multiline
                          rows={4}
                          InputProps={{ readOnly: true }}
                        />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Hashtags ({selectedHashtags.gemini.length} de {geminiResult.hashtags.length} selecionadas)
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {geminiResult.hashtags.map((tag, idx) => {
                              const isSelected = selectedHashtags.gemini.includes(tag);
                              return (
                                <Chip
                                  key={idx}
                                  label={tag}
                                  size="small"
                                  clickable
                                  onClick={() => toggleHashtag('gemini', tag)}
                                  color={isSelected ? 'primary' : 'default'}
                                  variant={isSelected ? 'filled' : 'outlined'}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => handleUseResult(geminiResult, 'gemini')}
                        >
                          Usar este
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {openaiResult && (
                  <Card sx={{ flex: 1 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          OpenAI
                        </Typography>
                        <TextField
                          label="Título"
                          value={openaiResult.title}
                          fullWidth
                          multiline
                          rows={2}
                          InputProps={{ readOnly: true }}
                        />
                        <TextField
                          label="Descrição"
                          value={openaiResult.description}
                          fullWidth
                          multiline
                          rows={4}
                          InputProps={{ readOnly: true }}
                        />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Hashtags ({selectedHashtags.openai.length} de {openaiResult.hashtags.length} selecionadas)
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {openaiResult.hashtags.map((tag, idx) => {
                              const isSelected = selectedHashtags.openai.includes(tag);
                              return (
                                <Chip
                                  key={idx}
                                  label={tag}
                                  size="small"
                                  clickable
                                  onClick={() => toggleHashtag('openai', tag)}
                                  color={isSelected ? 'primary' : 'default'}
                                  variant={isSelected ? 'filled' : 'outlined'}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => handleUseResult(openaiResult, 'openai')}
                        >
                          Usar este
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        {(geminiResult || openaiResult) && (
          <Button onClick={handleAdjustPrompt}>Ajustar Prompt</Button>
        )}
        <LoadingButton
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          onClick={handleGenerate}
          loading={loading}
          loadingText="Gerando..."
          disabled={!prompt.trim() || (!hasGemini && !hasOpenAI)}
        >
          {getButtonText()}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

