import type { NewUser, RepositoryResult, UpdateUser, User } from './types';
import { SupabaseRepositoryError } from './types';
import { assertData, ensureNoError } from './utils';

import { supabaseClient } from '@/services/supabaseClient';
import type { Database } from '@/types/supabase';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdateRow = Database['public']['Tables']['users']['Update'];

const mapUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  avatarUrl: row.avatar_url,
  aiContext: row.ai_context ?? null,
  aiAutoGenerate: row.ai_auto_generate ?? false,
  geminiApiKey: (row as any).gemini_api_key ?? null,
  openaiApiKey: (row as any).openai_api_key ?? null,
  createdAt: row.created_at,
});

export const usersRepository = {
  async list(): RepositoryResult<User[]> {
    const response = await supabaseClient
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    ensureNoError(response.error, 'Não foi possível listar os usuários.');
    const rows = (response.data ?? []) as UserRow[];
    return rows.map(mapUser);
  },

  async getById(id: string): RepositoryResult<User | null> {
    const response = await supabaseClient.from('users').select('*').eq('id', id).maybeSingle();

    ensureNoError(response.error, 'Não foi possível recuperar o usuário.');
    const row = response.data as UserRow | null;
    return row ? mapUser(row) : null;
  },

  async getByEmail(email: string): RepositoryResult<User | null> {
    const response = await supabaseClient
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    ensureNoError(response.error, 'Não foi possível recuperar o usuário pelo e-mail.');
    const row = response.data as UserRow | null;
    return row ? mapUser(row) : null;
  },

  async create(payload: NewUser): RepositoryResult<User> {
    const insertPayload: UserInsert = {
      name: payload.name,
      email: payload.email,
      avatar_url: payload.avatarUrl ?? null,
    };

    const response = await supabaseClient.from('users').insert(insertPayload).select('*').single();

    const result = assertData(
      response.data as UserRow | null,
      response.error,
      'Não foi possível criar o usuário.',
    );
    return mapUser(result);
  },

  async update(id: string, payload: UpdateUser): RepositoryResult<User> {
    const updates: UserUpdateRow & { gemini_api_key?: string | null; openai_api_key?: string | null } = {};
    if (payload.name !== undefined) {
      updates.name = payload.name;
    }
    if (payload.email !== undefined) {
      updates.email = payload.email;
    }
    if (payload.avatarUrl !== undefined) {
      updates.avatar_url = payload.avatarUrl ?? null;
    }
    if (payload.aiContext !== undefined) {
      updates.ai_context = payload.aiContext ?? null;
    }
    if (payload.aiAutoGenerate !== undefined) {
      updates.ai_auto_generate = payload.aiAutoGenerate;
    }
    if (payload.geminiApiKey !== undefined) {
      updates.gemini_api_key = payload.geminiApiKey ?? null;
    }
    if (payload.openaiApiKey !== undefined) {
      updates.openai_api_key = payload.openaiApiKey ?? null;
    }

    if (Object.keys(updates).length === 0) {
      throw new SupabaseRepositoryError('Nenhum campo informado para atualização de usuário.');
    }

    const response = await supabaseClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    const result = assertData(
      response.data as UserRow | null,
      response.error,
      'Não foi possível atualizar o usuário.',
    );
    return mapUser(result);
  },

  async remove(id: string): RepositoryResult<void> {
    const { error } = await supabaseClient.from('users').delete().eq('id', id);
    ensureNoError(error, 'Não foi possível remover o usuário.');
  },
};
