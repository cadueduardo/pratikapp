import { Button, Stack } from '@mui/material';
import type { ButtonProps, StackProps } from '@mui/material';

import { LoadingButton } from '@/components/common';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

type AuthActionsProps = StackProps & {
  primary: LoadingButtonProps & { children?: React.ReactNode };
  secondary?: ButtonProps;
};

export const AuthActions = ({ primary, secondary, ...stackProps }: AuthActionsProps) => (
  <Stack spacing={2} {...stackProps}>
    <LoadingButton {...primary} fullWidth size="large" sx={{ py: 1.1 }}>
      {primary.children}
    </LoadingButton>
    {secondary ? (
      <Button {...secondary} fullWidth size="large">
        {secondary.children}
      </Button>
    ) : null}
  </Stack>
);
