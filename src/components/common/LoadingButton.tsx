import { Button, CircularProgress } from '@mui/material';
import type { ButtonProps } from '@mui/material';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Botão com estado de loading integrado
 * Substitui o texto do botão por um spinner quando loading=true
 */
export const LoadingButton = ({
  loading = false,
  loadingText,
  children,
  disabled,
  startIcon,
  ...props
}: LoadingButtonProps) => {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} /> : startIcon}
    >
      {loading ? loadingText || 'Carregando...' : children}
    </Button>
  );
};








