import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';

export const AuthTextField = (props: TextFieldProps) => (
  <TextField
    fullWidth
    variant="outlined"
    slotProps={{
      inputLabel: { shrink: true },
    }}
    {...props}
  />
);
