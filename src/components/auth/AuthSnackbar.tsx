import type { AlertColor } from '@mui/material';
import { Alert, Snackbar } from '@mui/material';

interface AuthSnackbarProps {
  message: string | null;
  severity?: AlertColor;
  onClose: () => void;
}

export const AuthSnackbar = ({ message, severity = 'error', onClose }: AuthSnackbarProps) => (
  <Snackbar
    open={Boolean(message)}
    autoHideDuration={6000}
    onClose={onClose}
    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
  >
    <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
      {message}
    </Alert>
  </Snackbar>
);
