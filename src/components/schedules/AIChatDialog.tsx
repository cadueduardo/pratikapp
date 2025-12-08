import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatIcon from '@mui/icons-material/Chat';
import {
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
import { usersRepository } from '@/services/database';
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

  // Verificar quais IAs o usuário tem configuradas
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

    if (open) {
      void checkAPIKeys();
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

      setGeminiResult(result.gemini || null);
      setOpenaiResult(result.openai || null);
      setGenerationId(result.generationId);
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
      // Usar hashtags selecionadas
      const finalResult: AIGeneratedContent = {
        ...result,
        hashtags: selectedHashtags[provider],
      };

      // Registrar escolha no histórico
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

