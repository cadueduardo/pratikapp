import GoogleIcon from '@mui/icons-material/Google';
import { Divider, FormHelperText, Link, Stack } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { AuthActions, AuthLayout, AuthSnackbar, AuthTextField } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading, error, signIn, signInWithGoogle, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (!loading && user) {
      void navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const validate = useCallback(() => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Informe seu e-mail.';
    }
    if (!password) {
      errors.password = 'Informe sua senha.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    void signIn({
      email,
      password,
    });
  };

  const handleGoogleSignIn = () => {
    void signInWithGoogle();
  };

  return (
    <>
      <AuthLayout
        title="Acesse sua conta"
        subtitle="Entre com suas credenciais para gerenciar agendamentos e integrações."
        footer={
          <>
            Ainda não possui conta?{' '}
            <Link component={RouterLink} to="/signup" underline="hover">
              Cadastre-se
            </Link>
          </>
        }
      >
        <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
          <Stack spacing={1}>
            <AuthTextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              error={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? <FormHelperText error>{fieldErrors.email}</FormHelperText> : null}
          </Stack>

          <Stack spacing={1}>
            <AuthTextField
              label="Senha"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              error={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <FormHelperText error>{fieldErrors.password}</FormHelperText>
            ) : null}
            <Link
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              sx={{ alignSelf: 'flex-end', mt: -1 }}
            >
              Esqueceu sua senha?
            </Link>
          </Stack>

          <AuthActions
            primary={{
              type: 'submit',
              variant: 'contained',
              loading,
              children: 'Entrar',
            }}
          />

          <Divider flexItem>ou</Divider>

          <AuthActions
            primary={{
              onClick: handleGoogleSignIn,
              variant: 'outlined',
              loading,
              startIcon: <GoogleIcon />,
              children: 'Continuar com Google',
            }}
          />
        </Stack>
      </AuthLayout>
      <AuthSnackbar message={error} onClose={clearError} />
    </>
  );
};
