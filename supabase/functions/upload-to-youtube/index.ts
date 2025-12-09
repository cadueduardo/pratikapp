/**
 * Edge Function para fazer upload de vídeos para o YouTube
 *
 * Usa YouTube Data API v3 para upload de vídeos
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface UploadYouTubeRequest {
  videoUrl: string; // URL do vídeo (Google Drive ou outro)
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus?: 'private' | 'unlisted' | 'public';
  categoryId?: string; // YouTube category ID (default: 22 - People & Blogs)
  platformId: string; // ID da plataforma YouTube no banco
  customThumbnailUrl?: string; // URL da thumbnail personalizada
  isShorts?: boolean; // Se é um YouTube Shorts
  publishAt?: string; // Data/hora ISO 8601 para agendamento nativo do YouTube (deve ser no futuro, mínimo 10 minutos)
}

serve(async (req) => {
  console.log('[upload-to-youtube] ===== INÍCIO DA REQUISIÇÃO =====');
  console.log('[upload-to-youtube] Método:', req.method);
  console.log('[upload-to-youtube] URL:', req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[upload-to-youtube] CORS preflight, retornando ok');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    console.log('[upload-to-youtube] Variáveis de ambiente:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });

    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    console.log('[upload-to-youtube] Auth header presente:', !!authHeader);
    
    if (!authHeader) {
      console.error('[upload-to-youtube] ERRO: Token de autenticação não fornecido');
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
    const body: UploadYouTubeRequest & { userId?: string } = await req.json();
    
    // Log IMEDIATO do body completo para debug
    console.log('[upload-to-youtube] ===== BODY COMPLETO RECEBIDO =====');
    console.log('[upload-to-youtube] Body JSON:', JSON.stringify(body, null, 2));
    console.log('[upload-to-youtube] ===== FIM DO BODY =====');
    
    const { videoUrl, title, description, tags, privacyStatus, categoryId, platformId, userId, customThumbnailUrl, isShorts, publishAt } = body;
    
    console.log('[upload-to-youtube] Body recebido (destructured):', {
      hasVideoUrl: !!videoUrl,
      hasTitle: !!title,
      hasPlatformId: !!platformId,
      hasUserId: !!userId,
      hasPublishAt: !!publishAt,
      publishAtValue: publishAt, // Log do valor exato
      publishAtType: typeof publishAt,
      isShorts: isShorts,
      hasCustomThumbnail: !!customThumbnailUrl,
      videoUrlLength: videoUrl?.length || 0,
      titleLength: title?.length || 0,
    });
    
    // Log detalhado do publishAt se existir
    if (publishAt) {
      console.log('[upload-to-youtube] ✅ publishAt recebido no body:', {
        raw: publishAt,
        parsed: new Date(publishAt).toISOString(),
        local: new Date(publishAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        isValid: !isNaN(new Date(publishAt).getTime()),
      });
    } else {
      console.warn('[upload-to-youtube] ⚠️⚠️⚠️ publishAt NÃO foi recebido no body! ⚠️⚠️⚠️');
      console.warn('[upload-to-youtube] Body keys:', Object.keys(body));
      console.warn('[upload-to-youtube] Body completo:', body);
    }
    
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

    if (!videoUrl || !title || !platformId) {
      console.error('[upload-to-youtube] ERRO: Parâmetros obrigatórios faltando:', {
        hasVideoUrl: !!videoUrl,
        hasTitle: !!title,
        hasPlatformId: !!platformId,
      });
      return new Response(
        JSON.stringify({ error: 'videoUrl, title e platformId são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    
    console.log('[upload-to-youtube] Parâmetros validados, continuando...');

    // Se for chamada interna (service key), usar userId do body
    const targetUserId = user?.id || userId;
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório para chamadas internas' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verificar se a plataforma pertence ao usuário e obter token
    console.log('[upload-to-youtube] Buscando plataforma no banco:', {
      platformId,
      targetUserId,
    });
    
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('id, user_id, api_token, name')
      .eq('id', platformId)
      .eq('user_id', targetUserId)
      .eq('name', 'youtube')
      .single();

    if (platformError || !platform) {
      console.error('[upload-to-youtube] ERRO ao buscar plataforma:', {
        platformError: platformError?.message,
        hasPlatform: !!platform,
      });
      return new Response(
        JSON.stringify({ error: 'Plataforma YouTube não encontrada ou não pertence ao usuário' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    
    console.log('[upload-to-youtube] Plataforma encontrada:', {
      platformId: platform.id,
      hasApiToken: !!platform.api_token,
    });

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
              platform: 'youtube',
              refreshToken: tokenData.refreshToken,
              platformId: platform.id,
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;
          } else {
            return new Response(
              JSON.stringify({ error: 'Token expirado e não foi possível renovar. Reconecte sua conta YouTube.' }),
              {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: 'Token expirado. Reconecte sua conta YouTube.' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Token inválido. Reconecte sua conta YouTube.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // YouTube Data API v3 - Upload de vídeo usando resumable upload
    // Passo 1: Download do vídeo da URL fornecida (Google Drive ou outro)
    let videoArrayBuffer: ArrayBuffer | null = null;
    let googleDriveFileId: string | null = null;
    let googleDriveDownloadUrl: string | null = null;
    let googleDriveToken: string | null = null;
    let fileSize: number | null = null;
    
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
      console.log(`[upload-to-youtube] FileId extraído do Google Drive: ${googleDriveFileId}`);
      
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

      // Fazer streaming direto do Google Drive para o YouTube
      // Primeiro, obter o tamanho do arquivo
      const fileInfoResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${googleDriveFileId}?fields=size`,
        {
          headers: {
            Authorization: `Bearer ${googleDriveToken}`,
          },
        },
      );

      if (!fileInfoResponse.ok) {
        const error = await fileInfoResponse.text();
        return new Response(
          JSON.stringify({ error: 'Erro ao obter informações do arquivo do Google Drive', details: error }),
          {
            status: fileInfoResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const fileInfo = await fileInfoResponse.json();
      fileSize = parseInt(fileInfo.size || '0', 10);
      
      console.log(`[upload-to-youtube] Tamanho do arquivo: ${fileSize} bytes`);
      
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

    // Passo 2: Inicializar resumable upload
    // Para YouTube Shorts, usar categoria 26 (Shorts)
    const finalCategoryId = isShorts ? '26' : (categoryId || '22'); // 26 = Shorts, 22 = People & Blogs
    
    // Preparar status do vídeo
    const status: any = {
      privacyStatus: privacyStatus || 'public',
      selfDeclaredMadeForKids: false,
    };
    
    // Se publishAt foi fornecido, usar agendamento nativo do YouTube
    // O vídeo deve estar como 'private' para agendamento funcionar
    console.log('[upload-to-youtube] Verificando publishAt antes do processamento:', {
      hasPublishAt: !!publishAt,
      publishAtValue: publishAt,
      publishAtType: typeof publishAt,
      publishAtLength: publishAt?.length,
    });
    
    if (publishAt) {
      console.log('[upload-to-youtube] ✅ publishAt encontrado, processando agendamento...');
      const scheduledPublishDate = new Date(publishAt);
      const now = new Date();
      const minPublishTime = new Date(now.getTime() + 10 * 60 * 1000); // Mínimo 10 minutos no futuro
      
      console.log('[upload-to-youtube] Processando publishAt:', {
        publishAt,
        publishDateISO: scheduledPublishDate.toISOString(),
        publishDateLocal: scheduledPublishDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        nowISO: now.toISOString(),
        minPublishTimeISO: minPublishTime.toISOString(),
        isValidDate: !isNaN(scheduledPublishDate.getTime()),
      });
      
      if (scheduledPublishDate < minPublishTime) {
        return new Response(
          JSON.stringify({ 
            error: 'A data de publicação deve ser pelo menos 10 minutos no futuro',
            details: `Data fornecida: ${publishAt}, Mínimo permitido: ${minPublishTime.toISOString()}`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      
      // YouTube requer que vídeos agendados sejam 'private'
      status.privacyStatus = 'private';
      
      // Formatar publishAt para ISO 8601 UTC (formato esperado pelo YouTube)
      // IMPORTANTE: O YouTube espera o publishAt em UTC no formato YYYY-MM-DDThh:mm:ssZ (sem milissegundos)
      // scheduledPublishDate já foi criado acima, reutilizar
      
      // Formatar para ISO 8601 sem milissegundos: YYYY-MM-DDThh:mm:ssZ
      // Usar toISOString() e remover milissegundos
      const isoString = scheduledPublishDate.toISOString();
      // Remover milissegundos: 2025-12-09T14:45:00.000Z -> 2025-12-09T14:45:00Z
      const formattedPublishAt = isoString.replace(/\.\d{3}Z$/, 'Z');
      
      status.publishAt = formattedPublishAt;
      
      const logInfo = {
        publishAtOriginal: publishAt,
        publishAtFormatted: formattedPublishAt,
        statusPublishAt: status.publishAt,
        privacyStatus: status.privacyStatus,
        publishDateISO: scheduledPublishDate.toISOString(),
        publishDateLocal: scheduledPublishDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        publishDateUTC: scheduledPublishDate.toUTCString(),
        isFuture: scheduledPublishDate > new Date(),
        minutesFromNow: Math.round((scheduledPublishDate.getTime() - new Date().getTime()) / 60000),
      };
      
      console.log('[upload-to-youtube] Agendando vídeo para:', logInfo);
    }
    
    const metadata = {
      snippet: {
        title: title,
        description: description || '',
        tags: tags || [],
        categoryId: finalCategoryId,
      },
      status: status,
    };
    
    console.log('[upload-to-youtube] Metadados do vídeo:', {
      title,
      descriptionLength: description?.length || 0,
      tagsCount: tags?.length || 0,
      categoryId: finalCategoryId,
      isShorts,
      hasCustomThumbnail: !!customThumbnailUrl,
      statusObject: JSON.stringify(status),
    });
    
    console.log('[upload-to-youtube] Status completo que será enviado ao YouTube:', {
      privacyStatus: status.privacyStatus,
      publishAt: status.publishAt,
      publishAtType: typeof status.publishAt,
      publishAtLength: status.publishAt?.length,
    });

    // Determinar tamanho do arquivo
    let contentLength: string;
    if (googleDriveFileId && fileSize !== null) {
      contentLength = fileSize.toString();
    } else if (videoArrayBuffer) {
      contentLength = videoArrayBuffer.byteLength.toString();
    } else {
      return new Response(
        JSON.stringify({ error: 'Não foi possível determinar o tamanho do arquivo' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Iniciar resumable upload session
    const initUploadResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*',
          'X-Upload-Content-Length': contentLength,
        },
        body: JSON.stringify(metadata),
      },
    );

    if (!initUploadResponse.ok) {
      const error = await initUploadResponse.text();
      console.error('[upload-to-youtube] Erro ao inicializar upload YouTube:', error);
      console.error('[upload-to-youtube] Metadados que foram enviados:', JSON.stringify(metadata, null, 2));
      
      // Tentar parsear o erro para ver se há informações úteis
      let errorDetails = error;
      try {
        const errorJson = JSON.parse(error);
        errorDetails = errorJson;
        
        // Se for erro de limite de upload, dar mensagem mais clara
        if (errorJson.error?.reason === 'uploadLimitExceeded') {
          return new Response(
            JSON.stringify({
              error: 'Limite de upload excedido',
              message: 'Você excedeu o número máximo de vídeos que pode fazer upload hoje. Tente novamente em 24 horas ou verifique o limite da sua conta do YouTube.',
              details: errorJson,
            }),
            {
              status: 429, // Too Many Requests
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      } catch {
        // Manter erro original se não for JSON
      }
      
      return new Response(
        JSON.stringify({
          error: 'Erro ao inicializar upload no YouTube',
          details: errorDetails,
        }),
        {
          status: initUploadResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const uploadUrl = initUploadResponse.headers.get('Location');
    if (!uploadUrl) {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do YouTube ao inicializar upload' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Passo 3: Fazer upload do vídeo (streaming se for Google Drive)
    let uploadResponse: Response;
    
    if (googleDriveFileId && googleDriveDownloadUrl && googleDriveToken) {
      // Streaming direto do Google Drive para YouTube
      console.log('[upload-to-youtube] Fazendo streaming do Google Drive para YouTube');
      console.log(`[upload-to-youtube] FileId: ${googleDriveFileId}, Tamanho: ${fileSize} bytes`);
      
      const googleDriveStream = await fetch(googleDriveDownloadUrl, {
        headers: {
          Authorization: `Bearer ${googleDriveToken}`,
        },
      });

      if (!googleDriveStream.ok) {
        const error = await googleDriveStream.text();
        console.error('[upload-to-youtube] Erro ao fazer streaming do Google Drive:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao fazer streaming do Google Drive', details: error }),
          {
            status: googleDriveStream.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      console.log('[upload-to-youtube] Streaming do Google Drive iniciado, fazendo upload para YouTube...');

      // Fazer upload em streaming (sem carregar tudo na memória)
      // IMPORTANTE: O YouTube requer que o Content-Length seja exato
      uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/*',
          'Content-Length': contentLength,
        },
        body: googleDriveStream.body, // Streaming direto - não carrega tudo na memória
      });
      
      console.log(`[upload-to-youtube] Resposta do upload: ${uploadResponse.status} ${uploadResponse.statusText}`);
    } else if (videoArrayBuffer) {
      // Upload normal do arrayBuffer (para URLs que não são Google Drive)
      uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/*',
          'Content-Length': contentLength,
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
      console.error('Erro ao fazer upload do vídeo para YouTube:', error);
      return new Response(
        JSON.stringify({
          error: 'Erro ao fazer upload do vídeo para o YouTube',
          details: error,
        }),
        {
          status: uploadResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const uploadData = await uploadResponse.json();
    const videoId = uploadData.id;

    if (!videoId) {
      console.error('[upload-to-youtube] Resposta do YouTube não contém videoId:', uploadData);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do YouTube após upload' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`[upload-to-youtube] Vídeo publicado com sucesso! ID: ${videoId}`);
    
    // Verificar o status retornado pelo YouTube para confirmar o publishAt
    if (uploadData.status) {
      console.log('[upload-to-youtube] Status retornado pelo YouTube:', {
        privacyStatus: uploadData.status.privacyStatus,
        publishAt: uploadData.status.publishAt,
        uploadStatus: uploadData.status.uploadStatus,
        failureReason: uploadData.status.failureReason,
      });
    }
    
    // Se tiver publishAt, buscar detalhes do vídeo para confirmar
    if (status.publishAt) {
      try {
        const videoDetailsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=status,snippet`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          },
        );
        
        if (videoDetailsResponse.ok) {
          const videoDetails = await videoDetailsResponse.json();
          if (videoDetails.items && videoDetails.items.length > 0) {
            const video = videoDetails.items[0];
            console.log('[upload-to-youtube] Detalhes do vídeo após upload:', {
              videoId: video.id,
              statusPrivacyStatus: video.status?.privacyStatus,
              statusPublishAt: video.status?.publishAt,
              statusPublishAtParsed: video.status?.publishAt ? new Date(video.status.publishAt).toLocaleString('pt-BR') : null,
            });
          }
        }
      } catch (err) {
        console.warn('[upload-to-youtube] Erro ao buscar detalhes do vídeo:', err);
      }
    }

    // Passo 4: Fazer upload da thumbnail customizada se fornecida
    if (customThumbnailUrl) {
      try {
        console.log('[upload-to-youtube] Fazendo upload da thumbnail customizada...');
        
        // Baixar a thumbnail da URL
        const thumbnailResponse = await fetch(customThumbnailUrl);
        if (!thumbnailResponse.ok) {
          console.warn('[upload-to-youtube] Erro ao baixar thumbnail:', thumbnailResponse.status);
        } else {
          const thumbnailBlob = await thumbnailResponse.blob();
          const thumbnailArrayBuffer = await thumbnailBlob.arrayBuffer();
          
          // Fazer upload da thumbnail usando YouTube Thumbnails API
          // A API requer que o body seja o ArrayBuffer diretamente, não FormData
          // O Content-Type deve ser o tipo da imagem
          const thumbnailUploadResponse = await fetch(
            `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': thumbnailBlob.type || 'image/jpeg',
              },
              body: thumbnailArrayBuffer,
            },
          );

          if (thumbnailUploadResponse.ok) {
            console.log('[upload-to-youtube] Thumbnail customizada enviada com sucesso!');
          } else {
            const errorText = await thumbnailUploadResponse.text();
            let errorMessage = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error?.code === 403 && errorJson.error?.message?.includes('permissions')) {
                errorMessage = 'Permissão negada: É necessário reconectar a conta do YouTube com permissões para upload de thumbnails. Acesse as configurações da plataforma e reconecte sua conta.';
              }
            } catch {
              // Manter mensagem original se não for JSON
            }
            console.warn('[upload-to-youtube] Erro ao fazer upload da thumbnail:', errorMessage);
            // Não falhar o upload do vídeo por causa da thumbnail
          }
        }
      } catch (thumbnailError) {
        console.error('[upload-to-youtube] Erro ao processar thumbnail customizada:', thumbnailError);
        // Não falhar o upload do vídeo por causa da thumbnail
      }
    }

    // Preparar resposta com informações de debug
    const responseData: any = {
      success: true,
      videoId: videoId,
      platformVideoId: videoId,
      message: 'Vídeo publicado com sucesso no YouTube',
    };
    
    // Adicionar informações de agendamento se houver
    if (status.publishAt) {
      responseData.scheduledInfo = {
        publishAt: status.publishAt,
        publishAtFormatted: new Date(status.publishAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        publishAtUTC: new Date(status.publishAt).toUTCString(),
      };
    }
    
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Erro na Edge Function upload-to-youtube:', error);
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

