/**
 * Edge Function para trocar código OAuth por tokens
 *
 * Esta função mantém o client_secret seguro no servidor
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthExchangeRequest {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'google-drive';
  code: string;
  redirectUri: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar token do usuário
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse do body
    const body: OAuthExchangeRequest = await req.json();
    const { platform, code, redirectUri } = body;

    console.log('Requisição OAuth Exchange:', {
      platform,
      codePresent: !!code,
      redirectUri,
      codePrefix: code ? code.substring(0, 20) + '...' : 'empty',
    });

    if (!platform || !code || !redirectUri) {
      return new Response(
        JSON.stringify({ 
          error: 'Parâmetros inválidos',
          details: {
            platform: platform || 'missing',
            code: code ? 'present' : 'missing',
            redirectUri: redirectUri || 'missing',
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter credenciais OAuth do Vault (ou variáveis de ambiente)
    // TODO: Implementar Supabase Vault para armazenar client_secret
    // TikTok usa CLIENT_KEY, outras plataformas usam CLIENT_ID
    // Google Drive reutiliza credenciais do YouTube
    const clientIdEnvKey = platform === 'tiktok' 
      ? `${platform.toUpperCase()}_CLIENT_KEY`
      : platform === 'google-drive'
      ? 'YOUTUBE_CLIENT_ID' // Reutiliza credenciais do YouTube
      : `${platform.toUpperCase()}_CLIENT_ID`;
    const clientSecretEnvKey = platform === 'google-drive'
      ? 'YOUTUBE_CLIENT_SECRET' // Reutiliza credenciais do YouTube
      : `${platform.toUpperCase()}_CLIENT_SECRET`;
    
    const clientId = Deno.env.get(clientIdEnvKey) ?? '';
    const clientSecret = Deno.env.get(clientSecretEnvKey) ?? '';

    // Log para debug (sem valores completos por segurança)
    console.log('Credenciais OAuth:', {
      platform,
      clientIdEnvKey,
      clientSecretEnvKey,
      clientIdPresent: !!clientId,
      clientSecretPresent: !!clientSecret,
      clientIdPrefix: clientId ? clientId.substring(0, 10) + '...' : 'empty',
    });

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ 
          error: `Credenciais OAuth não configuradas para ${platform}`,
          details: `Verifique se as seguintes variáveis de ambiente estão configuradas no Supabase: ${clientIdEnvKey} e ${clientSecretEnvKey}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Configurar URLs e parâmetros baseado na plataforma
    let tokenUrl: string;
    let tokenParams: URLSearchParams;

    switch (platform) {
      case 'youtube': {
        tokenUrl = 'https://oauth2.googleapis.com/token';
        tokenParams = new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });
        break;
      }
      case 'instagram': {
        tokenUrl = 'https://api.instagram.com/oauth/access_token';
        tokenParams = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        });
        break;
      }
      case 'tiktok': {
        // TikTok OAuth v2 token endpoint
        // Nota: A ordem dos parâmetros pode importar para o TikTok
        tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
        tokenParams = new URLSearchParams({
          client_key: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        });
        break;
      }
      case 'google-drive': {
        // Google Drive usa o mesmo endpoint do YouTube
        tokenUrl = 'https://oauth2.googleapis.com/token';
        tokenParams = new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: 'Plataforma não suportada' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
    }

    // Fazer requisição para trocar código por tokens
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Erro ao trocar código por tokens (${platform}):`, {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText,
        tokenUrl,
        requestParams: {
          // Não logar secrets completos
          hasClientKey: !!clientId,
          hasClientSecret: !!clientSecret,
          grantType: tokenParams.get('grant_type'),
          redirectUri: tokenParams.get('redirect_uri'),
          hasCode: !!tokenParams.get('code'),
        },
      });
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      return new Response(
        JSON.stringify({
          error: 'Erro ao obter tokens de acesso',
          details: errorDetails,
          platform,
        }),
        {
          status: tokenResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const tokenData = await tokenResponse.json();

    // Retornar tokens (formato padronizado)
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token || tokenData.accessToken,
        refresh_token: tokenData.refresh_token || tokenData.refreshToken,
        expires_in: tokenData.expires_in || tokenData.expiresIn,
        token_type: tokenData.token_type || tokenData.tokenType || 'Bearer',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Erro na Edge Function oauth-exchange:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});





