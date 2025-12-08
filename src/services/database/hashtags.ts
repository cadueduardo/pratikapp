import type {
  NewUserHashtag,
  RepositoryResult,
  UpdateUserHashtag,
  UserHashtag,
} from './types';
import { SupabaseRepositoryError } from './types';
import { assertData, ensureNoError } from './utils';

import { supabaseClient } from '@/services/supabaseClient';

interface UserHashtagRow {
  id: string;
  user_id: string;
  hashtag: string;
  use_count: number;
  created_at: string;
  updated_at: string;
}

const mapUserHashtag = (row: UserHashtagRow): UserHashtag => ({
  id: row.id,
  userId: row.user_id,
  hashtag: row.hashtag,
  useCount: row.use_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const hashtagsRepository = {
  async listByUser(userId: string, limit?: number): RepositoryResult<UserHashtag[]> {
    let query = supabaseClient
      .from('user_hashtags')
      .select('*')
      .eq('user_id', userId)
      .order('use_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const response = await query;

    ensureNoError(response.error, 'Não foi possível listar as hashtags.');
    const rows = (response.data ?? []) as UserHashtagRow[];
    return rows.map(mapUserHashtag);
  },

  async getById(id: string): RepositoryResult<UserHashtag | null> {
    const response = await supabaseClient
      .from('user_hashtags')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    ensureNoError(response.error, 'Não foi possível recuperar a hashtag.');
    const row = response.data as UserHashtagRow | null;
    return row ? mapUserHashtag(row) : null;
  },

  async getByHashtag(userId: string, hashtag: string): RepositoryResult<UserHashtag | null> {
    const response = await supabaseClient
      .from('user_hashtags')
      .select('*')
      .eq('user_id', userId)
      .eq('hashtag', hashtag)
      .maybeSingle();

    ensureNoError(response.error, 'Não foi possível recuperar a hashtag.');
    const row = response.data as UserHashtagRow | null;
    return row ? mapUserHashtag(row) : null;
  },

  async createOrIncrement(payload: NewUserHashtag): RepositoryResult<UserHashtag> {
    // Verificar se já existe
    const existing = await this.getByHashtag(payload.userId, payload.hashtag);

    if (existing) {
      // Incrementar contador
      return this.update(existing.id, { useCount: existing.useCount + 1 });
    }

    // Criar nova hashtag
    const insertPayload = {
      user_id: payload.userId,
      hashtag: payload.hashtag,
      use_count: 1,
    };

    const response = await supabaseClient
      .from('user_hashtags')
      .insert(insertPayload)
      .select('*')
      .single();

    const result = assertData(
      response.data as UserHashtagRow | null,
      response.error,
      'Não foi possível criar a hashtag.',
    );
    return mapUserHashtag(result);
  },

  async update(id: string, payload: UpdateUserHashtag): RepositoryResult<UserHashtag> {
    const updates: Partial<UserHashtagRow> = {};
    if (payload.hashtag !== undefined) {
      updates.hashtag = payload.hashtag;
    }
    if (payload.useCount !== undefined) {
      updates.use_count = payload.useCount;
    }

    if (Object.keys(updates).length === 0) {
      throw new SupabaseRepositoryError('Nenhum campo informado para atualização de hashtag.');
    }

    updates.updated_at = new Date().toISOString();

    const response = await supabaseClient
      .from('user_hashtags')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    const result = assertData(
      response.data as UserHashtagRow | null,
      response.error,
      'Não foi possível atualizar a hashtag.',
    );
    return mapUserHashtag(result);
  },

  async remove(id: string): RepositoryResult<void> {
    const { error } = await supabaseClient.from('user_hashtags').delete().eq('id', id);
    ensureNoError(error, 'Não foi possível remover a hashtag.');
  },
};




