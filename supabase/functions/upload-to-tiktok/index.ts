/**
 * Edge Function para fazer upload de vídeos para o TikTok
 *
 * Usa TikTok Marketing API v2 para upload de vídeos
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadTikTokRequest {
  videoUrl: string; // URL do vídeo (Google Drive ou outro)
  title?: string;
  description?: string;
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIEND' | 'SELF_ONLY';
  platformId: string; // ID da plataforma TikTok no banco
  userId?: string; // userId para chamadas internas
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
    const body: UploadTikTokRequest = await req.json();
    const { videoUrl, title, description, privacyLevel, platformId, userId } = body;
    
    // Se for service key e tiver userId no body, é chamada interna
    if (token === supabaseServiceKey && userId) {
      // Chamada interna com service key - usar userId do body
      user = { id: userId };
    } else if (token === supabaseServiceKey && !userId) {
      // Service key sem userId - tentar obter do token de usuário se possível
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

    if (!videoUrl || !platformId) {
      return new Response(
        JSON.stringify({ error: 'videoUrl e platformId são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verificar se a plataforma pertence ao usuário e obter token
    const targetUserId = user?.id;
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('id, user_id, api_token, name')
      .eq('id', platformId)
      .eq('user_id', targetUserId)
      .eq('name', 'tiktok')
      .single();

    if (platformError || !platform) {
      return new Response(
        JSON.stringify({ error: 'Plataforma TikTok não encontrada ou não pertence ao usuário' }),
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
      
      // Verificar se o token expirou e renovar se necessário
      if (tokenData.expiresAt && Date.now() >= tokenData.expiresAt) {
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
              platform: 'tiktok',
              refreshToken: tokenData.refreshToken,
              platformId: platform.id,
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;
          } else {
            return new Response(
              JSON.stringify({ error: 'Token expirado e não foi possível renovar. Reconecte sua conta TikTok.' }),
              {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: 'Token expirado. Reconecte sua conta TikTok.' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Token inválido. Reconecte sua conta TikTok.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // TikTok Marketing API v2 - Upload de vídeo
    // Passo 1: Inicializar upload
    const initUploadResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: title || 'Vídeo do PratikApp',
          privacy_level: privacyLevel || 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'FILE_UPLOAD',
        },
      }),
    });

    if (!initUploadResponse.ok) {
      const error = await initUploadResponse.text();
      console.error('Erro ao inicializar upload TikTok:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro ao inicializar upload no TikTok',
          details: error,
        }),
        {
          status: initUploadResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const initData = await initUploadResponse.json();
    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;

    if (!uploadUrl || !publishId) {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do TikTok ao inicializar upload' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Passo 2: Download do vídeo da URL fornecida (Google Drive ou outro)
    let videoArrayBuffer: ArrayBuffer | null = null;
    let googleDriveFileId: string | null = null;
    let googleDriveDownloadUrl: string | null = null;
    let googleDriveToken: string | null = null;
    
    // Verificar se é uma URL do Google Drive e extrair fileId
    
    if (videoUrl.includes('drive.google.com')) {
      // Tentar diferentes formatos de URL do Google Drive
      const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,  // https://drive.google.com/file/d/FILE_ID/view
        /id=([a-zA-Z0-9_-]+)/,          // https://drive.google.com/open?id=FILE_ID
        /\/d\/([a-zA-Z0-9_-]+)/,        // https://drive.google.com/d/FILE_ID
      ];
      
      for (const pattern of patterns) {
        const match = videoUrl.match(pattern);
        if (match && match[1]) {
          googleDriveFileId = match[1];
          break;
        }
      }
      
      // Se não encontrou com regex, tentar com URL
      if (!googleDriveFileId) {
        try {
          const url = new URL(videoUrl);
          googleDriveFileId = url.searchParams.get('id');
        } catch {
          // URL inválida, continuar sem fileId
        }
      }
    }
    
    if (googleDriveFileId) {
      console.log(`[upload-to-tiktok] FileId extraído do Google Drive: ${googleDriveFileId}`);
      
      // Obter token do Google Drive para fazer streaming direto
      const { data: googleDrivePlatform, error: gdError } = await supabase
        .from('platforms')
        .select('api_token')
        .eq('user_id', targetUserId)
        .eq('name', 'google-drive')
        .single();

      if (gdError || !googleDrivePlatform) {
        return new Response(
          JSON.stringify({ error: 'Google Drive não está conectado. Conecte sua conta primeiro.' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      try {
        const gdTokenData = JSON.parse(googleDrivePlatform.api_token || '{}');
        googleDriveToken = gdTokenData.accessToken;
        
        if (!googleDriveToken) {
          return new Response(
            JSON.stringify({ error: 'Token do Google Drive não encontrado. Reconecte sua conta.' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Token do Google Drive inválido. Reconecte sua conta.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // URL de download do Google Drive para streaming
      googleDriveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${googleDriveFileId}?alt=media`;
    } else {
      // URL de outro serviço, fazer download direto
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Erro ao baixar vídeo da URL fornecida' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const videoBlob = await videoResponse.blob();
      videoArrayBuffer = await videoBlob.arrayBuffer();
    }

    // Passo 3: Upload do vídeo para o TikTok (streaming se for Google Drive)
    let uploadResponse: Response;
    
    if (googleDriveFileId && googleDriveDownloadUrl && googleDriveToken) {
      // Streaming direto do Google Drive para TikTok (sem carregar tudo na memória)
      console.log('[upload-to-tiktok] Fazendo streaming do Google Drive para TikTok');
      const googleDriveStream = await fetch(googleDriveDownloadUrl, {
        headers: {
          Authorization: `Bearer ${googleDriveToken}`,
        },
      });

      if (!googleDriveStream.ok) {
        const error = await googleDriveStream.text();
        return new Response(
          JSON.stringify({ error: 'Erro ao fazer streaming do Google Drive', details: error }),
          {
            status: googleDriveStream.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Obter tamanho do arquivo do header
      const contentLength = googleDriveStream.headers.get('Content-Length') || '0';
      
      // Fazer upload em streaming (sem carregar tudo na memória)
      uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': contentLength,
        },
        body: googleDriveStream.body, // Streaming direto - não carrega tudo na memória
      });
    } else if (videoArrayBuffer) {
      // Upload normal do arrayBuffer (para URLs que não são Google Drive)
      uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoArrayBuffer.byteLength.toString(),
        },
        body: videoArrayBuffer,
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'Não foi possível obter o conteúdo do vídeo para upload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('Erro ao fazer upload do vídeo para TikTok:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro ao fazer upload do vídeo para o TikTok',
          details: error,
        }),
        {
          status: uploadResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Passo 4: Publicar o vídeo
    const publishResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publish_id: publishId,
      }),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      console.error('Erro ao publicar vídeo no TikTok:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro ao publicar vídeo no TikTok',
          details: error,
        }),
        {
          status: publishResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const publishData = await publishResponse.json();
    const videoId = publishData.data?.publish_id;

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoId || publishId,
        platformVideoId: videoId || publishId,
        message: 'Vídeo publicado com sucesso no TikTok',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Erro na Edge Function upload-to-tiktok:', error);
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

