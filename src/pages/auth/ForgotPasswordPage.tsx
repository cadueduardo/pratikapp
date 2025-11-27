import { Button, FormHelperText, Link, Stack } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { AuthActions, AuthLayout, AuthTextField } from '@/components/auth';
import { useNotification } from '@/components/common';
import { supabaseClient } from '@/services/supabaseClient';

export const ForgotPasswordPage = () => {
  const { showSuccess, showError } = useNotification();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

  const validate = useCallback(() => {
    const errors: { email?: string } = {};
    if (!email.trim()) {
      errors.email = 'Informe seu e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Informe um e-mail válido.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validate()) {
        return;
      }

      try {
        setLoading(true);
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          showError(error.message);
          return;
        }

        setEmailSent(true);
        showSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Erro ao enviar e-mail de recuperação.');
      } finally {
        setLoading(false);
      }
    },
    [email, validate, showSuccess, showError],
  );

  if (emailSent) {
    return (
      <AuthLayout
        title="E-mail enviado"
        subtitle="Verifique sua caixa de entrada e siga as instruções para redefinir sua senha."
        footer={
          <>
            Lembrou sua senha?{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              Fazer login
            </Link>
          </>
        }
      >
        <Stack spacing={2}>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.1 }}
          >
            Voltar ao login
          </Button>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail e enviaremos um link para redefinir sua senha."
      footer={
        <>
          Lembrou sua senha?{' '}
          <Link component={RouterLink} to="/login" underline="hover">
            Fazer login
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
            autoFocus
          />
          {fieldErrors.email ? <FormHelperText error>{fieldErrors.email}</FormHelperText> : null}
        </Stack>

        <AuthActions
          primary={{
            type: 'submit',
            variant: 'contained',
            loading,
            children: 'Enviar link de recuperação',
          }}
        />
      </Stack>
    </AuthLayout>
  );
};





