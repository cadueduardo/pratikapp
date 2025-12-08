import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  Alert,
  Box,
  FormHelperText,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { AuthTextField } from '@/components/auth';
import { LoadingButton } from '@/components/common';
import { useNotification } from '@/components/common/NotificationProvider';
import { usersRepository } from '@/services/database';

interface AIKeysEditorProps {
  userId: string;
  loading?: boolean;
}

export const AIKeysEditor = ({ userId, loading: externalLoading }: AIKeysEditorProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [hasGemini, setHasGemini] = useState(false);
  const [hasOpenAI, setHasOpenAI] = useState(false);

  // Carregar API keys do usuário
  useEffect(() => {
    const loadAPIKeys = async () => {
      if (!userId) return;

      try {
        const user = await usersRepository.getById(userId);
        if (user) {
          setGeminiApiKey(user.geminiApiKey || '');
          setOpenaiApiKey(user.openaiApiKey || '');
          setHasGemini(!!user.geminiApiKey);
          setHasOpenAI(!!user.openaiApiKey);
        }
      } catch (error) {
        console.error('Erro ao carregar API keys:', error);
      }
    };

    void loadAPIKeys();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      await usersRepository.update(userId, {
        geminiApiKey: geminiApiKey.trim() || null,
        openaiApiKey: openaiApiKey.trim() || null,
      });

      setHasGemini(!!geminiApiKey.trim());
      setHasOpenAI(!!openaiApiKey.trim());

      showSuccess('Chaves de IA salvas com sucesso!');
    } catch (error) {
      showError('Erro ao salvar chaves de IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Chaves de API para IA
      </Typography>

      <Alert severity="info">
        Configure suas próprias chaves de API do Gemini e/ou OpenAI. As chaves são armazenadas de
        forma segura e usadas apenas para gerar conteúdo para seus vídeos.
      </Alert>

      <Stack spacing={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Google Gemini API Key</Typography>
            {hasGemini && <CheckCircleIcon color="success" fontSize="small" />}
          </Stack>
          <AuthTextField
            type="password"
            label="Gemini API Key"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="AIza..."
            fullWidth
            helperText={hasGemini ? 'Chave configurada' : ''}
          />
          {!hasGemini && (
            <FormHelperText>
              Obtenha sua chave em{' '}
              <Link
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google AI Studio
              </Link>
            </FormHelperText>
          )}
        </Box>

        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle2">OpenAI API Key</Typography>
            {hasOpenAI && <CheckCircleIcon color="success" fontSize="small" />}
          </Stack>
          <AuthTextField
            type="password"
            label="OpenAI API Key"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="sk-..."
            fullWidth
            helperText={hasOpenAI ? 'Chave configurada' : ''}
          />
          {!hasOpenAI && (
            <FormHelperText>
              Obtenha sua chave em{' '}
              <Link
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenAI Platform
              </Link>
            </FormHelperText>
          )}
        </Box>
      </Stack>

      <Box>
        <LoadingButton
          variant="contained"
          onClick={handleSave}
          loading={loading || externalLoading}
          loadingText="Salvando..."
          disabled={loading || externalLoading}
        >
          Salvar chaves
        </LoadingButton>
      </Box>

      {!hasGemini && !hasOpenAI && (
        <Alert severity="warning">
          Configure pelo menos uma chave de API para usar a geração de conteúdo com IA.
        </Alert>
      )}
    </Stack>
  );
};

