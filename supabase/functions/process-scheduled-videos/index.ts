/**
 * Edge Function: process-scheduled-videos
 *
 * Esta função processa vídeos agendados que estão prontos para publicação.
 * Deve ser executada periodicamente via cron job ou webhook.
 *
 * Fluxo:
 * 1. Busca vídeos com scheduled_date <= now() e status = 'scheduled' ou 'pending'
 * 2. Para cada vídeo, busca as plataformas configuradas do usuário
 * 3. Cria registros de post para cada plataforma
 * 4. Simula upload (por enquanto apenas log)
 * 5. Atualiza status do vídeo e posts
 *
 * Para configurar execução periódica:
 * - Use pg_cron no Supabase para executar a cada X minutos
 * - Ou configure um webhook externo (ex: cron-job.org) que chama esta função
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Video {
  id: string;
  user_id: string;
  title: string;
  url_drive: string;
  scheduled_date: string;
  status: string;
  selected_platform_ids?: string[] | null;
}

interface Platform {
  id: string;
  user_id: string;
  name: string;
  api_token: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role key (tem acesso total)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar vídeos agendados que estão prontos para publicação
    const now = new Date().toISOString();
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .in('status', ['scheduled', 'pending'])
      .lte('scheduled_date', now)
      .order('scheduled_date', { ascending: true });

    if (videosError) {
      throw videosError;
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum vídeo agendado encontrado', processed: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    console.log(`[process-scheduled-videos] Encontrados ${videos.length} vídeos para processar`);

    let processedCount = 0;
    const errors: string[] = [];

    // Processar cada vídeo
    for (const video of videos as Video[]) {
      try {
        console.log(`[process-scheduled-videos] Processando vídeo: ${video.id} - ${video.title}`);

        // Atualizar status do vídeo para 'processing'
        const { error: updateVideoError } = await supabase
          .from('videos')
          .update({ status: 'processing', updated_at: now })
          .eq('id', video.id);

        if (updateVideoError) {
          throw updateVideoError;
        }

        // Buscar plataformas configuradas do usuário
        let platformsQuery = supabase
          .from('platforms')
          .select('*')
          .eq('user_id', video.user_id);

        // Se o vídeo tem plataformas selecionadas, filtrar apenas essas
        if (video.selected_platform_ids && video.selected_platform_ids.length > 0) {
          platformsQuery = platformsQuery.in('id', video.selected_platform_ids);
        }

        const { data: platforms, error: platformsError } = await platformsQuery;

        if (platformsError) {
          throw platformsError;
        }

        if (!platforms || platforms.length === 0) {
          console.log(
            `[process-scheduled-videos] Usuário ${video.user_id} não tem plataformas configuradas ou selecionadas`,
          );
          // Marcar vídeo como failed se não houver plataformas
          await supabase
            .from('videos')
            .update({ status: 'failed', updated_at: now })
            .eq('id', video.id);
          continue;
        }

        // Criar posts apenas para as plataformas selecionadas (ou todas se não houver seleção)
        const postsToCreate = (platforms as Platform[]).map((platform) => ({
          video_id: video.id,
          platform_id: platform.id,
          status: 'pending',
        }));

        const { data: createdPosts, error: postsError } = await supabase
          .from('posts')
          .insert(postsToCreate)
          .select();

        if (postsError) {
          throw postsError;
        }

        console.log(
          `[process-scheduled-videos] Criados ${createdPosts?.length || 0} posts para o vídeo ${video.id}`,
        );

        // Simular upload para cada plataforma
        // TODO: Implementar upload real usando as APIs das redes sociais
        for (const post of createdPosts || []) {
          const platform = platforms.find((p) => p.id === post.platform_id);
          console.log(
            `[process-scheduled-videos] Simulando upload para ${platform?.name || 'plataforma desconhecida'}`,
          );

          // Simular delay de upload
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Atualizar post como publicado (simulado)
          const { error: updatePostError } = await supabase
            .from('posts')
            .update({
              status: 'posted',
              posted_at: now,
            })
            .eq('id', post.id);

          if (updatePostError) {
            console.error(
              `[process-scheduled-videos] Erro ao atualizar post ${post.id}:`,
              updatePostError,
            );
          }
        }

        // Atualizar status do vídeo para 'posted'
        const { error: finalUpdateError } = await supabase
          .from('videos')
          .update({ status: 'posted', updated_at: now })
          .eq('id', video.id);

        if (finalUpdateError) {
          throw finalUpdateError;
        }

        processedCount++;
        console.log(`[process-scheduled-videos] Vídeo ${video.id} processado com sucesso`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[process-scheduled-videos] Erro ao processar vídeo ${video.id}:`, errorMessage);

        // Marcar vídeo como failed
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            updated_at: now,
          })
          .eq('id', video.id);

        errors.push(`Vídeo ${video.id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Processamento concluído',
        total: videos.length,
        processed: processedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('[process-scheduled-videos] Erro geral:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});








