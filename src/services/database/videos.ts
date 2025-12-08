import type { NewVideo, RepositoryResult, UpdateVideo, Video } from './types';
import { SupabaseRepositoryError } from './types';
import { assertData, ensureNoError } from './utils';

import { supabaseClient } from '@/services/supabaseClient';
import type { Database } from '@/types/supabase';

type VideoRow = Database['public']['Tables']['videos']['Row'];
type VideoInsert = Database['public']['Tables']['videos']['Insert'];
type VideoUpdateRow = Database['public']['Tables']['videos']['Update'];

const mapVideo = (row: VideoRow): Video => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  urlDrive: row.url_drive,
  scheduledDate: row.scheduled_date,
  status: row.status as Video['status'],
  selectedPlatformIds: (row.selected_platform_ids as string[] | null) || null,
  mediaType: (row.media_type as string | null) || null,
  platformMediaTypes: (row.platform_media_types as Record<string, string> | null) || null,
  platformHashtags: ((row as any).platform_hashtags as Record<string, string[]> | null) || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const videosRepository = {
  async listByUser(userId: string): RepositoryResult<Video[]> {
    const response = await supabaseClient
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_date', {
        ascending: true,
        nullsFirst: true,
      });

    ensureNoError(response.error, 'Não foi possível listar os vídeos.');
    const rows = (response.data ?? []) as VideoRow[];
    return rows.map(mapVideo);
  },

  async getById(id: string): RepositoryResult<Video | null> {
    const response = await supabaseClient.from('videos').select('*').eq('id', id).maybeSingle();

    ensureNoError(response.error, 'Não foi possível recuperar o vídeo.');
    const row = response.data as VideoRow | null;
    return row ? mapVideo(row) : null;
  },

  async create(payload: NewVideo): RepositoryResult<Video> {
    // Garantir que o usuário existe na tabela users antes de criar o vídeo
    // Isso resolve o problema de foreign key constraint
    const { data: currentUser } = await supabaseClient.auth.getUser();
    if (currentUser?.user) {
      // Tentar criar o usuário na tabela users se não existir
      await supabaseClient
        .from('users')
        .upsert(
          {
            id: currentUser.user.id,
            email: currentUser.user.email || '',
            name: currentUser.user.user_metadata?.name || currentUser.user.email?.split('@')[0] || 'User',
          },
          { onConflict: 'id' },
        )
        .select()
        .single();
    }

    const insertPayload: VideoInsert & { platform_hashtags?: Record<string, string[]> | null } = {
      user_id: payload.userId,
      title: payload.title,
      description: payload.description ?? null,
      url_drive: payload.urlDrive,
      scheduled_date: payload.scheduledDate ?? null,
      status: payload.status ?? 'draft',
      selected_platform_ids: payload.selectedPlatformIds ?? null,
      media_type: payload.mediaType ?? null,
      platform_media_types: payload.platformMediaTypes ?? null,
      platform_hashtags: payload.platformHashtags ?? null,
    };

    const response = await supabaseClient.from('videos').insert(insertPayload).select('*').single();

    const result = assertData(
      response.data as VideoRow | null,
      response.error,
      'Não foi possível criar o vídeo.',
    );
    return mapVideo(result);
  },

  async update(id: string, payload: UpdateVideo): RepositoryResult<Video> {
    const updates: VideoUpdateRow & { platform_hashtags?: Record<string, string[]> | null } = {};
    if (payload.title !== undefined) {
      updates.title = payload.title;
    }
    if (payload.description !== undefined) {
      updates.description = payload.description ?? null;
    }
    if (payload.urlDrive !== undefined) {
      updates.url_drive = payload.urlDrive;
    }
    if (payload.scheduledDate !== undefined) {
      updates.scheduled_date = payload.scheduledDate ?? null;
    }
    if (payload.status !== undefined) {
      updates.status = payload.status;
    }
    if (payload.selectedPlatformIds !== undefined) {
      updates.selected_platform_ids = payload.selectedPlatformIds ?? null;
    }
    if (payload.mediaType !== undefined) {
      updates.media_type = payload.mediaType ?? null;
    }
    if (payload.platformMediaTypes !== undefined) {
      updates.platform_media_types = payload.platformMediaTypes ?? null;
    }
    if (payload.platformHashtags !== undefined) {
      updates.platform_hashtags = payload.platformHashtags ?? null;
    }

    if (Object.keys(updates).length === 0) {
      throw new SupabaseRepositoryError('Nenhum campo informado para atualização de vídeo.');
    }

    updates.updated_at = new Date().toISOString();

    const response = await supabaseClient
      .from('videos')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    const result = assertData(
      response.data as VideoRow | null,
      response.error,
      'Não foi possível atualizar o vídeo.',
    );
    return mapVideo(result);
  },

  async remove(id: string): RepositoryResult<void> {
    const { error } = await supabaseClient.from('videos').delete().eq('id', id);
    ensureNoError(error, 'Não foi possível remover o vídeo.');
  },
};
