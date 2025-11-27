import type { NewPlatform, Platform, RepositoryResult, UpdatePlatform } from './types';
import { SupabaseRepositoryError } from './types';
import { assertData, ensureNoError } from './utils';

import { supabaseClient } from '@/services/supabaseClient';
import type { Database } from '@/types/supabase';

type PlatformRow = Database['public']['Tables']['platforms']['Row'];
type PlatformInsert = Database['public']['Tables']['platforms']['Insert'];
type PlatformUpdateRow = Database['public']['Tables']['platforms']['Update'];

const mapPlatform = (row: PlatformRow): Platform => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  apiToken: row.api_token, // Pode ser JSON string ou token simples (legado)
  createdAt: row.created_at,
});

export const platformsRepository = {
  async listByUser(userId: string): RepositoryResult<Platform[]> {
    const response = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    ensureNoError(response.error, 'Não foi possível listar as plataformas.');
    const rows = (response.data ?? []) as PlatformRow[];
    return rows.map(mapPlatform);
  },

  async getById(id: string): RepositoryResult<Platform | null> {
    const response = await supabaseClient.from('platforms').select('*').eq('id', id).maybeSingle();

    ensureNoError(response.error, 'Não foi possível recuperar a plataforma.');
    const row = response.data as PlatformRow | null;
    return row ? mapPlatform(row) : null;
  },

  async create(payload: NewPlatform): RepositoryResult<Platform> {
    // Garantir que o usuário existe na tabela users antes de criar a plataforma
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

    const insertPayload: PlatformInsert = {
      user_id: payload.userId,
      name: payload.name,
      api_token: payload.apiToken ?? null,
    };

    const response = await supabaseClient
      .from('platforms')
      .insert(insertPayload)
      .select('*')
      .single();

    const result = assertData(
      response.data as PlatformRow | null,
      response.error,
      'Não foi possível criar a plataforma.',
    );
    return mapPlatform(result);
  },

  async update(id: string, payload: UpdatePlatform): RepositoryResult<Platform> {
    const updates: PlatformUpdateRow = {};
    if (payload.name !== undefined) {
      updates.name = payload.name;
    }
    if (payload.apiToken !== undefined) {
      updates.api_token = payload.apiToken ?? null;
    }

    if (Object.keys(updates).length === 0) {
      throw new SupabaseRepositoryError('Nenhum campo informado para atualização de plataforma.');
    }

    const response = await supabaseClient
      .from('platforms')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    const result = assertData(
      response.data as PlatformRow | null,
      response.error,
      'Não foi possível atualizar a plataforma.',
    );
    return mapPlatform(result);
  },

  async remove(id: string): RepositoryResult<void> {
    const { error } = await supabaseClient.from('platforms').delete().eq('id', id);

    ensureNoError(error, 'Não foi possível remover a plataforma.');
  },
};
