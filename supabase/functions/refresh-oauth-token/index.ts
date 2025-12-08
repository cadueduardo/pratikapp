/**
 * Edge Function para renovar tokens OAuth usando refresh token
 *
 * Suporta YouTube, Google Drive e outras plataformas que usam OAuth 2.0
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshTokenRequest {
  platform: 'youtube' | 'google-drive' | 'tiktok' | 'instagram';
  refreshToken: string;
  platformId: string;
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
    const body: RefreshTokenRequest = await req.json();
    const { platform, refreshToken, platformId } = body;

    if (!platform || !refreshToken || !platformId) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros inválidos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verificar se a plataforma pertence ao usuário
    const { data: platformData, error: platformError } = await supabase
      .from('platforms')
      .select('id, user_id, name')
      .eq('id', platformId)
      .eq('user_id', user.id)
      .single();

    if (platformError || !platformData) {
      return new Response(
        JSON.stringify({ error: 'Plataforma não encontrada ou não pertence ao usuário' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter credenciais OAuth do Vault (ou variáveis de ambiente)
    // Google Drive reutiliza credenciais do YouTube
    const clientIdEnvKey = platform === 'tiktok' 
      ? `${platform.toUpperCase()}_CLIENT_KEY`
      : platform === 'google-drive'
      ? 'YOUTUBE_CLIENT_ID' // Reutiliza credenciais do YouTube
      : `${platform.toUpperCase()}_CLIENT_ID`;
    const clientSecretEnvKey = platform === 'google-drive'
      ? 'YOUTUBE_CLIENT_SECRET' // Reutiliza credenciais do YouTube
      : platform === 'tiktok'
      ? `${platform.toUpperCase()}_CLIENT_SECRET`
      : `${platform.toUpperCase()}_CLIENT_SECRET`;
    
    const clientId = Deno.env.get(clientIdEnvKey) ?? '';
    const clientSecret = Deno.env.get(clientSecretEnvKey) ?? '';

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
      case 'youtube':
      case 'google-drive': {
        // YouTube e Google Drive usam o mesmo endpoint
        tokenUrl = 'https://oauth2.googleapis.com/token';
        tokenParams = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        });
        break;
      }
      case 'tiktok': {
        tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
        tokenParams = new URLSearchParams({
          client_key: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        });
        break;
      }
      case 'instagram': {
        // Instagram usa Facebook Graph API para refresh
        tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
        tokenParams = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'fb_exchange_token',
          fb_exchange_token: refreshToken,
        });
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: 'Plataforma não suportada para refresh' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
    }

    // Fazer requisição para renovar token
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Erro ao renovar token (${platform}):`, {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText,
      });
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      return new Response(
        JSON.stringify({
          error: 'Erro ao renovar token de acesso',
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

    // Preparar novos tokens
    const newAccessToken = tokenData.access_token || tokenData.accessToken;
    const newRefreshToken = tokenData.refresh_token || tokenData.refreshToken || refreshToken; // Manter o refresh token antigo se não vier um novo
    const expiresIn = tokenData.expires_in || tokenData.expiresIn;
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

    // Atualizar tokens no banco de dados
    const tokenDataToStore = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      tokenType: tokenData.token_type || tokenData.tokenType || 'Bearer',
      storedAt: Date.now(),
    };

    const { error: updateError } = await supabase
      .from('platforms')
      .update({
        api_token: JSON.stringify(tokenDataToStore),
      })
      .eq('id', platformId);

    if (updateError) {
      console.error('Erro ao atualizar tokens no banco:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar tokens no banco de dados' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Retornar novos tokens
    return new Response(
      JSON.stringify({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
        expires_at: expiresAt,
        token_type: tokenData.token_type || tokenData.tokenType || 'Bearer',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Erro na Edge Function refresh-oauth-token:', error);
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










