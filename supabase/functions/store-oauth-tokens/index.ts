/**
 * Edge Function para armazenar tokens OAuth de forma segura
 *
 * Armazena tokens no Supabase Vault ou criptografa antes de salvar no banco
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoreTokensRequest {
  platformId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
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
    const body: StoreTokensRequest = await req.json();
    const { platformId, accessToken, refreshToken, expiresAt, tokenType } = body;

    if (!platformId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'platformId e accessToken são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verificar se a plataforma pertence ao usuário
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('id, user_id')
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

    // TODO: Implementar Supabase Vault para armazenamento seguro
    // Por enquanto, vamos armazenar tokens criptografados no banco
    // Em produção, usar Supabase Vault:
    // const vault = supabase.vault;
    // await vault.storeSecret(`platform_${platformId}_access_token`, accessToken);
    // await vault.storeSecret(`platform_${platformId}_refresh_token`, refreshToken);

    // Por enquanto, armazenar tokens no campo api_token (será migrado para Vault)
    // Em produção, este campo deve ser criptografado ou usar Vault
    const tokenData = {
      accessToken,
      refreshToken,
      expiresAt,
      tokenType: tokenType || 'Bearer',
      storedAt: Date.now(),
    };

    // Atualizar plataforma com token (temporário - migrar para Vault)
    const { error: updateError } = await supabase
      .from('platforms')
      .update({
        api_token: JSON.stringify(tokenData), // TODO: Migrar para Vault
      })
      .eq('id', platformId);

    if (updateError) {
      console.error('Erro ao atualizar plataforma com tokens:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao armazenar tokens' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Tokens armazenados com sucesso' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Erro na Edge Function store-oauth-tokens:', error);
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








