import type { Session, SignInWithPasswordCredentials, User } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabaseClient } from '@/services/supabaseClient';
import { formatSupabaseError } from '@/utils/form';

interface SignUpPayload {
  email: string;
  password: string;
  metadata?: Record<string, string | number | boolean | null>;
}

interface SignUpResult {
  success: boolean;
  emailConfirmationRequired: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) {
        setError(formatSupabaseError(sessionError.message));
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    void fetchSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false); // Garantir que loading seja resetado quando a sessão mudar

      // Quando o usuário faz login, garantir que existe na tabela users (não bloqueia)
      if (nextSession?.user) {
        // Fazer upsert de forma assíncrona sem bloquear
        void (async () => {
          try {
            const { error } = await supabaseClient
              .from('users')
              .upsert(
                {
                  id: nextSession.user.id,
                  email: nextSession.user.email || '',
                  name:
                    nextSession.user.user_metadata?.name ||
                    nextSession.user.email?.split('@')[0] ||
                    'User',
                },
                { onConflict: 'id' },
              );
            if (error) {
              console.error('Erro ao sincronizar usuário na tabela users:', error);
            }
          } catch (error) {
            // Log do erro mas não falha o login
            console.error('Erro ao sincronizar usuário na tabela users:', error);
          }
        })();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleError = useCallback((message: string | null) => {
    setError(message ? formatSupabaseError(message) : null);
  }, []);

  const signIn = useCallback(
    async (credentials: SignInWithPasswordCredentials) => {
      setLoading(true);
      handleError(null);
      const { error: signInError } = await supabaseClient.auth.signInWithPassword(credentials);
      if (signInError) {
        handleError(signInError.message);
      }
      setLoading(false);
    },
    [handleError],
  );

  const signUp = useCallback(
    async ({ email, password, metadata }: SignUpPayload) => {
      setLoading(true);
      handleError(null);
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: metadata
          ? {
              data: metadata,
            }
          : undefined,
      });
      if (signUpError) {
        handleError(signUpError.message);
        setLoading(false);
        return {
          success: false,
          emailConfirmationRequired: false,
        };
      }

      // Criar usuário na tabela users se o signup foi bem-sucedido
      if (data.user) {
        try {
          const userEmail = data.user.email || '';
          const metadataName = metadata?.name;
          const userName = 
            typeof metadataName === 'string' 
              ? metadataName 
              : userEmail.split('@')[0] || 'User';
          
          const userPayload: {
            id: string;
            email: string;
            name: string;
          } = {
            id: data.user.id,
            email: userEmail,
            name: userName,
          };
          
          await supabaseClient
            .from('users')
            .upsert(userPayload, { onConflict: 'id' });
        } catch (userCreateError) {
          // Log do erro mas não falha o signup
          console.error('Erro ao criar usuário na tabela users:', userCreateError);
        }
      }

      setLoading(false);
      return {
        success: true,
        emailConfirmationRequired: !data.session,
      };
    },
    [handleError],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    handleError(null);
    const { error: signOutError } = await supabaseClient.auth.signOut();
    if (signOutError) {
      handleError(signOutError.message);
    }
    setLoading(false);
  }, [handleError]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    handleError(null);
    const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (oauthError) {
      handleError(oauthError.message);
      setLoading(false);
    }
  }, [handleError]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      clearError: () => {
        setError(null);
      },
    }),
    [user, session, loading, error, signIn, signUp, signOut, signInWithGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return context;
};
