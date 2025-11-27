import type { NewPost, Post, RepositoryResult, UpdatePost } from './types';
import { SupabaseRepositoryError } from './types';
import { assertData, ensureNoError } from './utils';

import { supabaseClient } from '@/services/supabaseClient';
import type { Database } from '@/types/supabase';

type PostRow = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdateRow = Database['public']['Tables']['posts']['Update'];

const mapPost = (row: PostRow): Post => ({
  id: row.id,
  videoId: row.video_id,
  platformId: row.platform_id,
  status: row.status as Post['status'],
  postedAt: row.posted_at,
  errorMessage: row.error_message,
  createdAt: row.created_at,
});

export const postsRepository = {
  async listByVideo(videoId: string): RepositoryResult<Post[]> {
    const response = await supabaseClient
      .from('posts')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });

    ensureNoError(response.error, 'Não foi possível listar as postagens do vídeo.');
    const rows = (response.data ?? []) as PostRow[];
    return rows.map(mapPost);
  },

  async listPending(): RepositoryResult<Post[]> {
    const response = await supabaseClient
      .from('posts')
      .select('*')
      .in('status', ['pending', 'uploading']);

    ensureNoError(response.error, 'Não foi possível listar postagens pendentes.');
    const rows = (response.data ?? []) as PostRow[];
    return rows.map(mapPost);
  },

  async create(payload: NewPost): RepositoryResult<Post> {
    const insertPayload: PostInsert = {
      video_id: payload.videoId,
      platform_id: payload.platformId,
      status: payload.status ?? 'pending',
      posted_at: payload.postedAt ?? null,
      error_message: payload.errorMessage ?? null,
    };

    const response = await supabaseClient.from('posts').insert(insertPayload).select('*').single();

    const result = assertData(
      response.data as PostRow | null,
      response.error,
      'Não foi possível criar a postagem.',
    );
    return mapPost(result);
  },

  async update(id: string, payload: UpdatePost): RepositoryResult<Post> {
    const updates: PostUpdateRow = {};
    if (payload.status !== undefined) {
      updates.status = payload.status;
    }
    if (payload.postedAt !== undefined) {
      updates.posted_at = payload.postedAt ?? null;
    }
    if (payload.errorMessage !== undefined) {
      updates.error_message = payload.errorMessage ?? null;
    }

    if (Object.keys(updates).length === 0) {
      throw new SupabaseRepositoryError('Nenhum campo informado para atualização de postagem.');
    }

    const response = await supabaseClient
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    const result = assertData(
      response.data as PostRow | null,
      response.error,
      'Não foi possível atualizar a postagem.',
    );
    return mapPost(result);
  },

  async remove(id: string): RepositoryResult<void> {
    const { error } = await supabaseClient.from('posts').delete().eq('id', id);
    ensureNoError(error, 'Não foi possível remover a postagem.');
  },
};
