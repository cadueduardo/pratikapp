import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type { PropsWithChildren } from 'react';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}>;

export const AuthLayout = ({ title, subtitle, footer, children }: AuthLayoutProps) => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      py: { xs: 4, md: 6 },
      backgroundColor: (theme) => theme.palette.background.default,
    }}
  >
    <Card
      elevation={1}
      sx={{
        width: '100%',
        maxWidth: 460,
        borderRadius: 4,
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" component="h1" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
          {children}
          {footer ? (
            <Typography variant="body2" textAlign="center" color="text.secondary">
              {footer}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  </Box>
);
