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
  description?: string | null;
  url_drive: string;
  scheduled_date: string;
  status: string;
  selected_platform_ids?: string[] | null;
  platform_hashtags?: Record<string, string[]> | null;
  platform_media_types?: Record<string, string> | null;
  custom_thumbnail_url?: string | null;
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

    // Obter token do usuário se fornecido (para chamadas internas das Edge Functions)
    let userToken: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.replace('Bearer ', '');
    }

    // Buscar vídeos agendados que estão prontos para publicação
    const now = new Date().toISOString();
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, user_id, title, description, url_drive, scheduled_date, status, selected_platform_ids, platform_hashtags, platform_media_types, custom_thumbnail_url')
      .or(`status.eq.pending,and(status.eq.scheduled,scheduled_date.lte.${now})`)
      .order('scheduled_date', { ascending: true });

    if (videosError) {
      throw videosError;
    }

    if (!videos || videos.length === 0) {
      console.log(`[process-scheduled-videos] Nenhum vídeo encontrado. Query: status IN ('scheduled', 'pending'), scheduled_date <= ${now}`);
      // Verificar se há vídeos pending sem a condição de data para debug
      const { data: pendingVideos } = await supabase
        .from('videos')
        .select('id, title, status, scheduled_date')
        .in('status', ['scheduled', 'pending'])
        .limit(5);
      console.log(`[process-scheduled-videos] Vídeos pending/scheduled encontrados (sem filtro de data):`, pendingVideos);
      
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

        // Fazer upload real para cada plataforma
        let allPostsSuccessful = true;
        let hasAnyPost = false;
        
        for (const post of createdPosts || []) {
          const platform = platforms.find((p) => p.id === post.platform_id);
          if (!platform) {
            console.error(`[process-scheduled-videos] Plataforma não encontrada para post ${post.id}`);
            continue;
          }

          hasAnyPost = true;
          console.log(
            `[process-scheduled-videos] Fazendo upload para ${platform.name} (post ${post.id})`,
          );

          try {
            let uploadResult: { success: boolean; videoId?: string; platformVideoId?: string; error?: string } | null = null;

            // Obter token do usuário para autenticação nas Edge Functions
            // Preferir usar token do usuário quando disponível, senão usar service key com userId
            const authToken = userToken || supabaseServiceKey;

            // Chamar Edge Function apropriada baseado na plataforma
            switch (platform.name.toLowerCase()) {
              case 'tiktok': {
                const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/upload-to-tiktok`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                    apikey: supabaseServiceKey,
                  },
                  body: JSON.stringify({
                    videoUrl: video.url_drive,
                    title: video.title,
                    privacyLevel: 'PUBLIC_TO_EVERYONE',
                    platformId: platform.id,
                    userId: video.user_id, // Passar userId para chamadas internas
                  }),
                });

                if (uploadResponse.ok) {
                  const data = await uploadResponse.json();
                  uploadResult = {
                    success: true,
                    videoId: data.videoId,
                    platformVideoId: data.platformVideoId,
                  };
                } else {
                  const error = await uploadResponse.json();
                  uploadResult = {
                    success: false,
                    error: error.error || 'Erro ao fazer upload para TikTok',
                  };
                }
                break;
              }
              case 'youtube': {
                // Extrair hashtags do YouTube se existirem
                let tags: string[] | undefined = undefined;
                let descriptionWithHashtags = video.description || '';
                
                if (video.platform_hashtags && typeof video.platform_hashtags === 'object') {
                  const youtubeHashtags = video.platform_hashtags['youtube'] || video.platform_hashtags['YouTube'];
                  if (Array.isArray(youtubeHashtags) && youtubeHashtags.length > 0) {
                    // Remover o # das hashtags para tags (YouTube aceita tags sem #)
                    tags = youtubeHashtags.map(tag => tag.replace(/^#/, ''));
                    
                    // Adicionar hashtags no final da descrição (com #)
                    const hashtagsText = youtubeHashtags.join(' ');
                    if (descriptionWithHashtags) {
                      descriptionWithHashtags += '\n\n' + hashtagsText;
                    } else {
                      descriptionWithHashtags = hashtagsText;
                    }
                  }
                }

                // Verificar se é YouTube Shorts
                let isShorts = false;
                if (video.platform_media_types && typeof video.platform_media_types === 'object') {
                  const youtubeMediaType = video.platform_media_types['youtube'] || video.platform_media_types['YouTube'];
                  if (youtubeMediaType === 'youtube-shorts') {
                    isShorts = true;
                    // Adicionar #Shorts na descrição (YouTube identifica Shorts por isso)
                    if (descriptionWithHashtags && !descriptionWithHashtags.includes('#Shorts')) {
                      descriptionWithHashtags = '#Shorts\n\n' + descriptionWithHashtags;
                    } else if (!descriptionWithHashtags) {
                      descriptionWithHashtags = '#Shorts';
                    }
                  }
                }

                console.log(`[process-scheduled-videos] Fazendo upload para YouTube:`, {
                  isShorts,
                  tagsCount: tags?.length || 0,
                  hasCustomThumbnail: !!video.custom_thumbnail_url,
                });

                const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/upload-to-youtube`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                    apikey: supabaseServiceKey,
                  },
                  body: JSON.stringify({
                    videoUrl: video.url_drive,
                    title: video.title,
                    description: descriptionWithHashtags || undefined,
                    tags: tags,
                    privacyStatus: 'public',
                    platformId: platform.id,
                    userId: video.user_id, // Passar userId para chamadas internas
                    customThumbnailUrl: video.custom_thumbnail_url || undefined,
                    isShorts: isShorts,
                  }),
                });

                if (uploadResponse.ok) {
                  const data = await uploadResponse.json();
                  uploadResult = {
                    success: true,
                    videoId: data.videoId,
                    platformVideoId: data.platformVideoId,
                  };
                } else {
                  const error = await uploadResponse.json();
                  uploadResult = {
                    success: false,
                    error: error.error || 'Erro ao fazer upload para YouTube',
                  };
                }
                break;
              }
              case 'instagram':
              case 'google-drive': {
                // TODO: Implementar upload real para Instagram
                console.log(`[process-scheduled-videos] Upload para ${platform.name} ainda não implementado`);
                uploadResult = {
                  success: false,
                  error: `Upload para ${platform.name} ainda não implementado`,
                };
                break;
              }
              default: {
                console.log(`[process-scheduled-videos] Plataforma ${platform.name} não suportada para upload`);
                uploadResult = {
                  success: false,
                  error: `Plataforma ${platform.name} não suportada`,
                };
              }
            }

            // Atualizar post com resultado do upload
            if (uploadResult?.success) {
              const { error: updatePostError } = await supabase
                .from('posts')
                .update({
                  status: 'posted',
                  posted_at: now,
                  platform_video_id: uploadResult.platformVideoId || uploadResult.videoId || null,
                })
                .eq('id', post.id);

              if (updatePostError) {
                console.error(
                  `[process-scheduled-videos] Erro ao atualizar post ${post.id}:`,
                  updatePostError,
                );
                allPostsSuccessful = false;
              } else {
                console.log(`[process-scheduled-videos] Post ${post.id} publicado com sucesso`);
              }
            } else {
              // Marcar post como failed
              allPostsSuccessful = false;
              const { error: updatePostError } = await supabase
                .from('posts')
                .update({
                  status: 'failed',
                  error_message: uploadResult?.error || 'Erro desconhecido',
                })
                .eq('id', post.id);

              if (updatePostError) {
                console.error(
                  `[process-scheduled-videos] Erro ao atualizar post ${post.id}:`,
                  updatePostError,
                );
              } else {
                console.error(`[process-scheduled-videos] Post ${post.id} falhou: ${uploadResult?.error}`);
              }
            }
          } catch (uploadError) {
            allPostsSuccessful = false;
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Erro desconhecido';
            console.error(`[process-scheduled-videos] Erro ao fazer upload para ${platform.name}:`, errorMessage);

            // Marcar post como failed
            await supabase
              .from('posts')
              .update({
                status: 'failed',
                error_message: errorMessage,
              })
              .eq('id', post.id);
          }
        }

        // Atualizar status do vídeo baseado no resultado dos uploads
        if (hasAnyPost) {
          // Verificar se todos os posts foram publicados com sucesso
          const { data: finalPosts, error: postsCheckError } = await supabase
            .from('posts')
            .select('status')
            .eq('video_id', video.id);

          if (!postsCheckError && finalPosts) {
            const allPosted = finalPosts.every((p) => p.status === 'posted');
            const anyFailed = finalPosts.some((p) => p.status === 'failed');

            if (allPosted && finalPosts.length > 0) {
              // Todos os posts foram publicados com sucesso
              const { error: finalUpdateError } = await supabase
                .from('videos')
                .update({ status: 'posted', updated_at: now })
                .eq('id', video.id);

              if (finalUpdateError) {
                throw finalUpdateError;
              }
              processedCount++;
              console.log(`[process-scheduled-videos] Vídeo ${video.id} processado com sucesso - todos os posts publicados`);
            } else if (anyFailed) {
              // Algum post falhou
              const { error: finalUpdateError } = await supabase
                .from('videos')
                .update({ status: 'failed', updated_at: now })
                .eq('id', video.id);

              if (finalUpdateError) {
                throw finalUpdateError;
              }
              console.log(`[process-scheduled-videos] Vídeo ${video.id} falhou - alguns posts não foram publicados`);
            } else {
              // Ainda processando
              const { error: finalUpdateError } = await supabase
                .from('videos')
                .update({ status: 'processing', updated_at: now })
                .eq('id', video.id);

              if (finalUpdateError) {
                throw finalUpdateError;
              }
              console.log(`[process-scheduled-videos] Vídeo ${video.id} ainda em processamento`);
            }
          } else {
            // Se não conseguir verificar posts, manter como processing
            const { error: finalUpdateError } = await supabase
              .from('videos')
              .update({ status: 'processing', updated_at: now })
              .eq('id', video.id);

            if (finalUpdateError) {
              throw finalUpdateError;
            }
          }
        } else {
          // Nenhum post foi criado, marcar como failed
          const { error: finalUpdateError } = await supabase
            .from('videos')
            .update({ status: 'failed', updated_at: now })
            .eq('id', video.id);

          if (finalUpdateError) {
            throw finalUpdateError;
          }
        }
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








