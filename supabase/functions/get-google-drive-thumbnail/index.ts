/**
 * Edge Function: get-google-drive-thumbnail
 *
 * Esta função faz proxy de thumbnails do Google Drive para evitar problemas de CORS
 * e permitir acesso a thumbnails de arquivos privados.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Aceitar apenas GET
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Use GET.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
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

    // Verificar autenticação do usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter parâmetros da query string
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    const sizeParam = url.searchParams.get('size') || '400';
    const size = parseInt(sizeParam, 10) || 400;

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'fileId é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Buscar token do Google Drive do usuário
    const { data: platforms, error: platformsError } = await supabase
      .from('platforms')
      .select('api_token')
      .eq('user_id', user.id)
      .eq('name', 'google-drive')
      .single();

    if (platformsError || !platforms?.api_token) {
      return new Response(
        JSON.stringify({ error: 'Google Drive não está conectado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse do token armazenado
    let accessToken: string;
    try {
      const tokenData = JSON.parse(platforms.api_token);
      accessToken = tokenData.accessToken || tokenData.access_token;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Token do Google Drive inválido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Buscar thumbnail do Google Drive usando a API
    const thumbnailResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/thumbnail?sz=${size}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!thumbnailResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar thumbnail do Google Drive' }),
        {
          status: thumbnailResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter a imagem como blob
    const imageBlob = await thumbnailResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();

    // Retornar a imagem com headers apropriados
    return new Response(imageArrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': imageBlob.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

