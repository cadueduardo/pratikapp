import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export const NotFoundPage = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '60vh',
    }}
  >
    <Stack spacing={2} textAlign="center">
      <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
        404
      </Typography>
      <Typography variant="h6" component="h2">
        Página não encontrada
      </Typography>
      <Typography variant="body2" color="text.secondary">
        O conteúdo que você procura não está disponível. Verifique a URL ou retorne para o painel
        principal.
      </Typography>
      <Button variant="contained" component={RouterLink} to="/" size="large">
        Voltar para o início
      </Button>
    </Stack>
  </Box>
);









