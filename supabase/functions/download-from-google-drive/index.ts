/**
 * Edge Function para fazer download de vídeos do Google Drive
 *
 * Esta função é usada pelas Edge Functions de upload para baixar vídeos
 * do Google Drive antes de fazer upload para as plataformas sociais.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DownloadRequest {
  fileId: string; // ID do arquivo no Google Drive
  userId: string; // ID do usuário
  returnUrl?: boolean; // Se true, retorna URL de download; se false, retorna o arquivo
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

    // Verificar token do usuário ou service key
    const token = authHeader.replace('Bearer ', '');
    let user: { id: string } | null = null;
    
    // Parse do body primeiro para verificar se tem userId (chamada interna)
    const body: DownloadRequest = await req.json();
    const { fileId, userId, returnUrl } = body;
    
    // Se for service key e tiver userId no body, é chamada interna
    if (token === supabaseServiceKey && userId) {
      // Chamada interna com service key - usar userId do body
      user = { id: userId };
    } else if (token === supabaseServiceKey && !userId) {
      // Service key sem userId - retornar erro
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório para chamadas internas com service key' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    } else {
      // Tentar validar como token de usuário
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser(token);

      if (userError || !authUser) {
        return new Response(
          JSON.stringify({ error: 'Usuário não autenticado' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      
      user = authUser;
    }

    if (!fileId || !userId) {
      return new Response(
        JSON.stringify({ error: 'fileId e userId são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verificar se o userId corresponde ao usuário autenticado (apenas para chamadas diretas)
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Se for chamada direta (não service key), verificar se o userId corresponde
    if (token !== supabaseServiceKey && user && user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Buscar plataforma Google Drive do usuário
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('id, user_id, api_token, name')
      .eq('user_id', targetUserId)
      .eq('name', 'google-drive')
      .single();

    if (platformError || !platform) {
      return new Response(
        JSON.stringify({ error: 'Google Drive não está conectado. Conecte sua conta primeiro.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse do token armazenado
    let accessToken: string;
    try {
      const tokenData = JSON.parse(platform.api_token || '{}');
      accessToken = tokenData.accessToken;
      
      if (!accessToken) {
        console.error('[download-from-google-drive] Token de acesso não encontrado');
        return new Response(
          JSON.stringify({ error: 'Token de acesso do Google Drive não encontrado. Reconecte sua conta.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      
      // Verificar se o token expirou e renovar se necessário
      if (tokenData.expiresAt && Date.now() >= tokenData.expiresAt) {
        console.log('[download-from-google-drive] Token expirado, tentando renovar...');
        if (tokenData.refreshToken) {
          // Renovar token usando a Edge Function de refresh
          const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/refresh-oauth-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              apikey: supabaseServiceKey,
            },
            body: JSON.stringify({
              platform: 'google-drive',
              refreshToken: tokenData.refreshToken,
              platformId: platform.id,
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;
            console.log('[download-from-google-drive] Token renovado com sucesso');
          } else {
            const refreshError = await refreshResponse.text();
            console.error('[download-from-google-drive] Erro ao renovar token:', refreshError);
            return new Response(
              JSON.stringify({ error: 'Token expirado e não foi possível renovar. Reconecte sua conta Google Drive.' }),
              {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }
        } else {
          console.error('[download-from-google-drive] Token expirado e sem refresh token');
          return new Response(
            JSON.stringify({ error: 'Token expirado. Reconecte sua conta Google Drive.' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
    } catch (parseError) {
      console.error('[download-from-google-drive] Erro ao parsear token:', parseError);
      return new Response(
        JSON.stringify({ error: 'Token inválido. Reconecte sua conta Google Drive.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Se returnUrl for true, retornar apenas a URL de download
    if (returnUrl) {
      return new Response(
        JSON.stringify({
          downloadUrl: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          accessToken: accessToken, // Token para usar na requisição
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Caso contrário, fazer download e retornar o arquivo
    console.log(`[download-from-google-drive] Fazendo download do arquivo: ${fileId}`);
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      console.error('[download-from-google-drive] Erro ao baixar arquivo:', {
        status: downloadResponse.status,
        statusText: downloadResponse.statusText,
        error: errorDetails,
        fileId,
      });
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao baixar arquivo do Google Drive';
      if (downloadResponse.status === 404) {
        errorMessage = 'Arquivo não encontrado no Google Drive. Verifique se o arquivo existe e está acessível.';
      } else if (downloadResponse.status === 403) {
        errorMessage = 'Acesso negado ao arquivo. Verifique as permissões do arquivo no Google Drive.';
      } else if (downloadResponse.status === 401) {
        errorMessage = 'Token de acesso inválido. Reconecte sua conta Google Drive.';
      }
      
      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: errorDetails,
          status: downloadResponse.status,
        }),
        {
          status: downloadResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    
    console.log('[download-from-google-drive] Download bem-sucedido');

    // Retornar o arquivo como blob
    const fileBlob = await downloadResponse.blob();
    const contentType = downloadResponse.headers.get('Content-Type') || 'application/octet-stream';

    return new Response(fileBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="video.mp4"`,
      },
    });
  } catch (error) {
    console.error('Erro na Edge Function download-from-google-drive:', error);
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


