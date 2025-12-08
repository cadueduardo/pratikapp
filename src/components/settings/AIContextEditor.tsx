import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoIcon from '@mui/icons-material/Info';
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';

import { CharacterCounter } from '@/components/common';

interface AIContextEditorProps {
  aiContext: string | null;
  aiAutoGenerate: boolean;
  onContextChange: (context: string) => void;
  onAutoGenerateChange: (enabled: boolean) => void;
  loading?: boolean;
}

export const AIContextEditor = ({
  aiContext,
  aiAutoGenerate,
  onContextChange,
  onAutoGenerateChange,
  loading = false,
}: AIContextEditorProps) => {
  const [showExamples, setShowExamples] = useState(false);

  const exampleContext = `Sou um chef de cozinha especializado em receitas veganas e sustentáveis. Meu público-alvo são pessoas interessadas em alimentação saudável, vegetarianos e veganos iniciantes. 

Meu estilo de conteúdo é:
- Educativo e prático
- Foco em receitas fáceis e rápidas
- Dicas de sustentabilidade na cozinha
- Valorização de ingredientes locais

Hashtags fixas que sempre uso:
#receitasveganas #comidasaudavel #chefvegano #sustentabilidade #alimentacaoconsciente`;

  const handleLoadExample = useCallback(() => {
    onContextChange(exampleContext);
    setShowExamples(false);
  }, [onContextChange, exampleContext]);

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Contexto para Geração de Conteúdo
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure o contexto do seu perfil para que a IA gere títulos e descrições personalizados
          baseados no seu nicho, público-alvo e estilo de conteúdo.
        </Typography>
      </Box>

      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Dica:</strong> Quanto mais detalhado for o contexto, melhores serão os resultados
          da IA. Inclua informações sobre seu nicho, público-alvo, estilo de conteúdo e hashtags
          que você costuma usar.
        </Typography>
      </Alert>

      <Stack spacing={2}>
        <Box>
          <TextField
            label="Contexto do Perfil"
            value={aiContext || ''}
            onChange={(e) => onContextChange(e.target.value)}
            multiline
            rows={12}
            fullWidth
            placeholder="Descreva seu perfil, nicho, público-alvo, estilo de conteúdo e hashtags fixas..."
            disabled={loading}
            inputProps={{ maxLength: 2000 }}
          />
          <CharacterCounter current={(aiContext || '').length} max={2000} showMin={false} />
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={aiAutoGenerate}
                onChange={(e) => onAutoGenerateChange(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Gerar automaticamente ao selecionar vídeo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Quando habilitado, a IA gerará título e descrição automaticamente ao selecionar
                  um vídeo no formulário de agendamento
                </Typography>
              </Box>
            }
          />
        </Box>

        {!showExamples && (
          <Box>
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setShowExamples(true)}
            >
              Ver exemplo de contexto
            </Typography>
          </Box>
        )}

        {showExamples && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Stack spacing={2}>
              <Typography variant="subtitle2" fontWeight={600}>
                Exemplo de Contexto:
              </Typography>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                  m: 0,
                }}
              >
                {exampleContext}
              </Typography>
              <Box>
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', textDecoration: 'underline', display: 'inline' }}
                  onClick={handleLoadExample}
                >
                  Usar este exemplo
                </Typography>
                {' • '}
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', textDecoration: 'underline', display: 'inline' }}
                  onClick={() => setShowExamples(false)}
                >
                  Ocultar exemplo
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        <FormHelperText>
          Este contexto será usado pela IA para entender seu perfil e gerar conteúdo alinhado com
          seu estilo e público-alvo.
        </FormHelperText>
      </Stack>
    </Stack>
  );
};

