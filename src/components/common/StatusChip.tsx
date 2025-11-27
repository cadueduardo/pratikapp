import { Typography } from '@mui/material';

import type { PostStatus, VideoStatus } from '@/services/database/types';

interface StatusChipProps {
  status: VideoStatus | PostStatus;
}

const statusConfig: Record<
  VideoStatus | PostStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: 'Rascunho', color: 'info' },
  scheduled: { label: 'Agendado', color: 'info' },
  pending: { label: 'Pendente', color: 'warning' },
  processing: { label: 'Processando', color: 'warning' },
  posted: { label: 'Publicado', color: 'success' },
  failed: { label: 'Falhou', color: 'error' },
  uploading: { label: 'Enviando', color: 'warning' },
};

export const StatusChip = ({ status }: StatusChipProps) => {
  const config = statusConfig[status] || { label: status, color: 'info' };

  return (
    <Typography
      variant="caption"
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 1,
        backgroundColor: (theme) => theme.palette[config.color].light,
        color: (theme) => theme.palette[config.color].main,
        fontWeight: 600,
      }}
    >
      {config.label}
    </Typography>
  );
};








