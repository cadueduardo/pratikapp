/**
 * Página de callback OAuth
 *
 * Processa o retorno do fluxo OAuth das plataformas sociais
 */

import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useNotification } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { platformsRepository } from '@/services/database';
import { exchangeCodeForTokens, getOAuthStateData, validateOAuthState } from '@/services/oauth';
import type { PlatformType } from '@/utils/platforms';
import { getPlatformInfo } from '@/utils/platforms';

export const OAuthCallbackPage = () => {
  const { platform } = useParams<{ platform: PlatformType }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    const processCallback = async () => {
      // Aguardar o auth carregar antes de processar
      if (authLoading) {
        return;
      }

      if (!platform) {
        showError('Plataforma não especificada');
        navigate('/settings?tab=1');
        return;
      }

      if (!user?.id) {
        showError('Usuário não autenticado. Faça login novamente.');
        navigate('/login');
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Obter informações do state (returnUrl, isPopup)
      const stateData = state ? getOAuthStateData(platform) : null;
      const isPopup = stateData?.isPopup ?? false;
      const returnUrl = stateData?.returnUrl || '/settings?tab=1';

      // Verificar se houve erro na autorização
      if (error) {
        const errorMsg = errorDescription || `Erro ao autorizar ${platform}`;
        showError(errorMsg);
        
        if (isPopup) {
          // Em popup, notificar o parent e fechar
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
            window.close();
          } else {
            navigate(returnUrl);
          }
        } else {
          navigate(returnUrl);
        }
        return;
      }

      // Validar state (prevenção CSRF)
      if (!state || !validateOAuthState(platform, state)) {
        const errorMsg = 'State inválido. Tente novamente.';
        showError(errorMsg);
        
        if (isPopup) {
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
            window.close();
          } else {
            navigate(returnUrl);
          }
        } else {
          navigate(returnUrl);
        }
        return;
      }

      // Validar código
      if (!code) {
        const errorMsg = 'Código de autorização não recebido';
        showError(errorMsg);
        
        if (isPopup) {
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
            window.close();
          } else {
            navigate(returnUrl);
          }
        } else {
          navigate(returnUrl);
        }
        return;
      }

      try {
        // Trocar código por tokens
        const result = await exchangeCodeForTokens(platform, code);

        if (!result.success || !result.tokens) {
          const errorMsg = result.error || 'Erro ao obter tokens de acesso';
          showError(errorMsg);
          
          if (isPopup) {
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
              window.close();
            } else {
              navigate(returnUrl);
            }
          } else {
            navigate(returnUrl);
          }
          return;
        }

        // Buscar plataforma do usuário
        const userPlatforms = await platformsRepository.listByUser(user.id);
        const platformInfo = getPlatformInfo(platform);
        
        if (!platformInfo) {
          const errorMsg = `Plataforma ${platform} não suportada.`;
          showError(errorMsg);
          
          if (isPopup) {
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
              window.close();
            } else {
              navigate(returnUrl);
            }
          } else {
            navigate(returnUrl);
          }
          return;
        }
        
        let existingPlatform = userPlatforms.find(
          (p) => p.name.toLowerCase() === platformInfo.name.toLowerCase(),
        );

        // Se não existe, criar automaticamente (especialmente para Google Drive)
        if (!existingPlatform) {
          try {
            existingPlatform = await platformsRepository.create({
              userId: user.id,
              name: platformInfo.name,
              apiToken: null, // Será preenchido abaixo
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao criar plataforma';
            const errorMsg = `Erro ao criar plataforma: ${errorMessage}`;
            showError(errorMsg);
            
            if (isPopup) {
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
                window.close();
              } else {
                navigate(returnUrl);
              }
            } else {
              navigate(returnUrl);
            }
            return;
          }
        }

        // Armazenar tokens de forma segura via Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          const errorMsg = 'Configuração do Supabase não encontrada';
          showError(errorMsg);
          
          if (isPopup) {
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
              window.close();
            } else {
              navigate(returnUrl);
            }
          } else {
            navigate(returnUrl);
          }
          return;
        }

        // Obter sessão atual
        const { supabaseClient } = await import('@/services/supabaseClient');
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (!session) {
          const errorMsg = 'Sessão expirada. Faça login novamente.';
          showError(errorMsg);
          
          if (isPopup) {
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
              window.close();
            } else {
              navigate('/login');
            }
          } else {
            navigate('/login');
          }
          return;
        }

        // Chamar Edge Function para armazenar tokens
        const storeResponse = await fetch(`${supabaseUrl}/functions/v1/store-oauth-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            platformId: existingPlatform.id,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresAt: result.tokens.expiresAt,
            tokenType: result.tokens.tokenType,
          }),
        });

        if (!storeResponse.ok) {
          const error = await storeResponse.json();
          const errorMsg = error.error || 'Erro ao armazenar tokens';
          showError(errorMsg);
          
          if (isPopup) {
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
              window.close();
            } else {
              navigate(returnUrl);
            }
          } else {
            navigate(returnUrl);
          }
          return;
        }

        const platformDisplayName = platformInfo?.displayName || platform;
        showSuccess(`${platformDisplayName} conectado com sucesso!`);
        
        // Marcar sucesso no sessionStorage para popup
        if (isPopup) {
          sessionStorage.setItem(`oauth_success_${platform}`, 'true');
          
          // Notificar o parent window
          if (window.opener) {
            window.opener.postMessage(
              { type: 'oauth_success', platform, returnUrl },
              window.location.origin,
            );
          }
          
          // Fechar popup
          window.close();
        } else {
          // Navegar para returnUrl ou settings
          navigate(returnUrl, { replace: true });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao processar callback OAuth';
        showError(errorMsg);
        
        if (isPopup) {
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_error', error: errorMsg }, window.location.origin);
            window.close();
          } else {
            navigate(returnUrl);
          }
        } else {
          navigate(returnUrl);
        }
      }
    };

    void processCallback();
  }, [platform, user?.id, authLoading, searchParams, navigate, showSuccess, showError]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        Processando autorização...
      </Typography>
    </Box>
  );
};

