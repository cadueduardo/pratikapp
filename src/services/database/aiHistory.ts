import type {
  AIGenerationHistory,
  NewAIGenerationHistory,
  RepositoryResult,
  UpdateAIGenerationHistory,
} from './types';
import { SupabaseRepositoryError } from './types';
import { assertData, ensureNoError } from './utils';

import { supabaseClient } from '@/services/supabaseClient';

interface AIGenerationHistoryRow {
  id: string;
  user_id: string;
  prompt: string;
  gemini_result: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
  openai_result: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
  chosen_provider: 'gemini' | 'openai' | null;
  chosen_result: {
    title: string;
    description: string;
    hashtags: string[];
  } | null;
  created_at: string;
}

const mapAIGenerationHistory = (row: AIGenerationHistoryRow): AIGenerationHistory => ({
  id: row.id,
  userId: row.user_id,
  prompt: row.prompt,
  geminiResult: row.gemini_result,
  openaiResult: row.openai_result,
  chosenProvider: row.chosen_provider,
  chosenResult: row.chosen_result,
  createdAt: row.created_at,
});

export const aiHistoryRepository = {
  async listByUser(userId: string, limit: number = 10): RepositoryResult<AIGenerationHistory[]> {
    const response = await supabaseClient
      .from('ai_generation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    ensureNoError(response.error, 'Não foi possível listar o histórico de IA.');
    const rows = (response.data ?? []) as AIGenerationHistoryRow[];
    return rows.map(mapAIGenerationHistory);
  },

  async getById(id: string): RepositoryResult<AIGenerationHistory | null> {
    const response = await supabaseClient
      .from('ai_generation_history')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    ensureNoError(response.error, 'Não foi possível recuperar o histórico de IA.');
    const row = response.data as AIGenerationHistoryRow | null;
    return row ? mapAIGenerationHistory(row) : null;
  },

  async create(payload: NewAIGenerationHistory): RepositoryResult<AIGenerationHistory> {
    const insertPayload = {
      user_id: payload.userId,
      prompt: payload.prompt,
      gemini_result: payload.geminiResult ?? null,
      openai_result: payload.openaiResult ?? null,
    };

    const response = await supabaseClient
      .from('ai_generation_history')
      .insert(insertPayload)
      .select('*')
      .single();

    const result = assertData(
      response.data as AIGenerationHistoryRow | null,
      response.error,
      'Não foi possível criar o histórico de IA.',
    );
    return mapAIGenerationHistory(result);
  },

  async update(
    id: string,
    payload: UpdateAIGenerationHistory,
  ): RepositoryResult<AIGenerationHistory> {
    const updates: Partial<AIGenerationHistoryRow> = {};
    if (payload.chosenProvider !== undefined) {
      updates.chosen_provider = payload.chosenProvider;
    }
    if (payload.chosenResult !== undefined) {
      updates.chosen_result = payload.chosenResult;
    }

    if (Object.keys(updates).length === 0) {
      throw new SupabaseRepositoryError('Nenhum campo informado para atualização de histórico.');
    }

    const response = await supabaseClient
      .from('ai_generation_history')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    const result = assertData(
      response.data as AIGenerationHistoryRow | null,
      response.error,
      'Não foi possível atualizar o histórico de IA.',
    );
    return mapAIGenerationHistory(result);
  },

  async remove(id: string): RepositoryResult<void> {
    const { error } = await supabaseClient
      .from('ai_generation_history')
      .delete()
      .eq('id', id);
    ensureNoError(error, 'Não foi possível remover o histórico de IA.');
  },
};




