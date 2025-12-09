/**
 * Edge Function para atualizar vídeos agendados no YouTube
 *
 * Permite atualizar título, descrição, data/hora de publicação e thumbnail
 * de vídeos que já foram enviados para o YouTube mas ainda não foram publicados
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateYouTubeVideoRequest {
  platformVideoId: string; // ID do vídeo no YouTube
  platformId: string; // ID da plataforma YouTube no banco
  title?: string;
  description?: string;
  tags?: string[];
  publishAt?: string; // Nova data/hora ISO 8601 para agendamento
  customThumbnailUrl?: string; // Nova thumbnail (opcional)
  isShorts?: boolean; // Se é um YouTube Shorts
  userId?: string; // Para chamadas internas
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
    
    // Parse do body
    const body: UpdateYouTubeVideoRequest = await req.json();
    const { platformVideoId, platformId, title, description, tags, publishAt, customThumbnailUrl, isShorts, userId } = body;
    
    // Se for service key e tiver userId no body, é chamada interna
    if (token === supabaseServiceKey && userId) {
      user = { id: userId };
    } else if (token === supabaseServiceKey && !userId) {
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

    if (!platformVideoId || !platformId) {
      return new Response(
        JSON.stringify({ error: 'platformVideoId e platformId são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Buscar token de acesso do YouTube
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('*')
      .eq('id', platformId)
      .eq('user_id', user.id)
      .single();

    if (platformError || !platform) {
      return new Response(
        JSON.stringify({ error: 'Plataforma não encontrada ou não pertence ao usuário' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Buscar token de acesso do YouTube
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform_type', 'youtube')
      .single();

    if (tokenError || !tokenData || !tokenData.access_token) {
      return new Response(
        JSON.stringify({ error: 'YouTube não está conectado. Conecte sua conta primeiro.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const accessToken = tokenData.access_token;

    // Preparar atualizações
    const updates: any = {};

    // Atualizar snippet (título, descrição, tags)
    if (title !== undefined || description !== undefined || tags !== undefined) {
      const snippet: any = {};
      
      if (title !== undefined) snippet.title = title;
      if (description !== undefined) snippet.description = description || '';
      if (tags !== undefined) snippet.tags = tags || [];
      
      // Se é Shorts, atualizar categoryId
      if (isShorts) {
        snippet.categoryId = '26'; // Shorts
      }
      
      updates.snippet = snippet;
    }

    // Atualizar status (data de publicação)
    if (publishAt !== undefined) {
      const publishDate = new Date(publishAt);
      const now = new Date();
      const minPublishTime = new Date(now.getTime() + 10 * 60 * 1000); // Mínimo 10 minutos no futuro
      
      if (publishDate < minPublishTime) {
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
      
      updates.status = {
        privacyStatus: 'private', // Vídeos agendados devem ser private
        publishAt: publishAt,
      };
    }

    // Fazer update no YouTube
    if (Object.keys(updates).length > 0) {
      const updateResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${platformVideoId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: platformVideoId,
            ...updates,
          }),
        },
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        console.error('[update-youtube-video] Erro ao atualizar vídeo:', error);
        return new Response(
          JSON.stringify({
            error: 'Erro ao atualizar vídeo no YouTube',
            details: error,
          }),
          {
            status: updateResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const updateData = await updateResponse.json();
      console.log('[update-youtube-video] Vídeo atualizado com sucesso:', updateData.items?.[0]?.id);
    }

    // Atualizar thumbnail se fornecida
    if (customThumbnailUrl) {
      try {
        console.log('[update-youtube-video] Fazendo upload da nova thumbnail...');
        
        // Baixar a thumbnail da URL
        const thumbnailResponse = await fetch(customThumbnailUrl);
        if (!thumbnailResponse.ok) {
          throw new Error(`Erro ao baixar thumbnail: ${thumbnailResponse.statusText}`);
        }

        const thumbnailBlob = await thumbnailResponse.blob();
        const thumbnailArrayBuffer = await thumbnailBlob.arrayBuffer();

        // Fazer upload da thumbnail usando FormData
        const formData = new FormData();
        formData.append('videoId', platformVideoId);
        formData.append('media', new Blob([thumbnailArrayBuffer], { type: thumbnailBlob.type }));

        const thumbnailUploadResponse = await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${platformVideoId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
          },
        );

        if (thumbnailUploadResponse.ok) {
          console.log('[update-youtube-video] Thumbnail atualizada com sucesso!');
        } else {
          const errorText = await thumbnailUploadResponse.text();
          console.warn('[update-youtube-video] Erro ao atualizar thumbnail:', errorText);
          // Não falhar o update por causa da thumbnail
        }
      } catch (thumbnailError) {
        console.error('[update-youtube-video] Erro ao processar thumbnail:', thumbnailError);
        // Não falhar o update por causa da thumbnail
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vídeo atualizado com sucesso',
        platformVideoId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[update-youtube-video] Erro inesperado:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro inesperado ao atualizar vídeo',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

