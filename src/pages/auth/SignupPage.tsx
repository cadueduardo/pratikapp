import GoogleIcon from '@mui/icons-material/Google';
import { Divider, FormHelperText, Link, Stack } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { AuthActions, AuthLayout, AuthSnackbar, AuthTextField } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { user, loading, error, signUp, signInWithGoogle, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (!loading && user) {
      void navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const validate = useCallback(() => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    if (!name.trim()) {
      errors.name = 'Informe seu nome.';
    }
    if (!email.trim()) {
      errors.email = 'Informe seu e-mail.';
    }
    if (password.length < 6) {
      errors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, password, confirmPassword]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validate()) {
        return;
      }
      const result = await signUp({
        email,
        password,
        metadata: {
          name,
        },
      });

      if (!result.success) {
        return;
      }

      setFieldErrors({});
      setPassword('');
      setConfirmPassword('');

      if (result.emailConfirmationRequired) {
        clearError();
        setSuccessMessage(
          'Enviamos um link de confirmação para o seu e-mail. Conclua o cadastro antes de acessar o painel.',
        );
      } else {
        setSuccessMessage(null);
        clearError();
        void navigate('/dashboard', { replace: true });
      }
    },
    [clearError, email, name, navigate, password, signUp, validate],
  );

  const handleGoogleSignIn = useCallback(() => {
    void signInWithGoogle();
  }, [signInWithGoogle]);

  return (
    <>
      <AuthLayout
        title="Crie sua conta"
        subtitle="Cadastre-se para começar a agendar e automatizar publicações."
        footer={
          <>
            Já possui conta?{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              Faça login
            </Link>
          </>
        }
      >
        <Stack
          component="form"
          spacing={2.5}
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          noValidate
        >
          <Stack spacing={1}>
            <AuthTextField
              label="Nome"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              error={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? <FormHelperText error>{fieldErrors.name}</FormHelperText> : null}
          </Stack>

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
          </Stack>

          <Stack spacing={1}>
            <AuthTextField
              label="Confirmar senha"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
              }}
              error={Boolean(fieldErrors.confirmPassword)}
            />
            {fieldErrors.confirmPassword ? (
              <FormHelperText error>{fieldErrors.confirmPassword}</FormHelperText>
            ) : null}
          </Stack>

          <AuthActions
            primary={{
              type: 'submit',
              variant: 'contained',
              loading,
              children: 'Criar conta',
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
      <AuthSnackbar
        message={successMessage}
        severity="success"
        onClose={() => {
          setSuccessMessage(null);
        }}
      />
    </>
  );
};
