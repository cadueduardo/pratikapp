import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { LoadingButton } from '@/components/common';
import { useNotification } from '@/components/common/NotificationProvider';
import { generateVideoContent } from '@/services/aiGeneration';

interface AIGenerateButtonProps {
  fileId: string | null; // ID do arquivo no Google Drive
  userId: string;
  onContentGenerated: (content: { title: string; description: string; hashtags: string[] }) => void;
  disabled?: boolean;
}

export const AIGenerateButton = ({
  fileId,
  userId,
  onContentGenerated,
  disabled = false,
}: AIGenerateButtonProps) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<{
    title: string;
    description: string;
    hashtags: string[];
  } | null>(null);

  const handleGenerate = async () => {
    if (!fileId) {
      showError('Selecione um vídeo primeiro');
      return;
    }

    try {
      setLoading(true);
      const result = await generateVideoContent({
        fileId,
        userId,
      });

      setPreviewContent(result);
      setPreviewOpen(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao gerar conteúdo com IA');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (previewContent) {
      onContentGenerated(previewContent);
      setPreviewOpen(false);
      setPreviewContent(null);
      showSuccess('Conteúdo aplicado com sucesso!');
    }
  };

  const handleCancel = () => {
    setPreviewOpen(false);
    setPreviewContent(null);
  };

  return (
    <>
      <LoadingButton
        variant="outlined"
        startIcon={<AutoAwesomeIcon />}
        onClick={handleGenerate}
        loading={loading}
        loadingText="Gerando..."
        disabled={disabled || !fileId || loading}
        size="small"
      >
        Gerar com IA
      </LoadingButton>

      <Dialog open={previewOpen} onClose={handleCancel} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h6">Conteúdo Gerado pela IA</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Revise o conteúdo gerado antes de aplicar. Você pode editar os campos após aplicar.
            </Alert>

            {previewContent && (
              <>
                <TextField
                  label="Título"
                  value={previewContent.title}
                  fullWidth
                  multiline
                  rows={2}
                  InputProps={{ readOnly: true }}
                  helperText={`${previewContent.title.length} / 200 caracteres`}
                />

                <TextField
                  label="Descrição"
                  value={previewContent.description}
                  fullWidth
                  multiline
                  rows={6}
                  InputProps={{ readOnly: true }}
                  helperText={`${previewContent.description.length} / 1000 caracteres`}
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Hashtags ({previewContent.hashtags.length})
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    {previewContent.hashtags.map((hashtag, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        sx={{
                          px: 1,
                          py: 0.5,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        {hashtag}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancelar</Button>
          <Button variant="contained" onClick={handleApply} disabled={!previewContent}>
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};







