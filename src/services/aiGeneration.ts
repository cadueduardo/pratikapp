/**
 * Serviço para geração de conteúdo usando IA
 *
 * Integra com a Edge Function generate-content-from-prompt para gerar
 * título, descrição e hashtags baseado em um prompt do usuário.
 */

import { supabaseClient } from './supabaseClient';
import { aiHistoryRepository } from './database';

export interface AIGeneratedContent {
  title: string;
  description: string;
  hashtags: string[];
}

export interface GenerateContentOptions {
  fileId: string; // ID do arquivo no Google Drive
  userId: string; // ID do usuário
  context?: string; // Contexto opcional (será buscado do banco se não fornecido)
}

export interface GenerateFromPromptOptions {
  prompt: string; // Prompt do usuário descrevendo o vídeo
  userId: string; // ID do usuário
}

export interface GenerateFromPromptResult {
  gemini?: AIGeneratedContent;
  openai?: AIGeneratedContent;
  generationId?: string; // ID do registro no histórico
}

/**
 * Gera conteúdo (título, descrição, hashtags) para um vídeo do Google Drive
 */
export async function generateVideoContent(
  options: GenerateContentOptions,
): Promise<AIGeneratedContent> {
  const { fileId, userId, context } = options;

  if (!fileId || !userId) {
    throw new Error('fileId e userId são obrigatórios');
  }

  // Obter URL da Edge Function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL não configurada');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/analyze-video-with-ai`;

  // Obter token de autenticação
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Usuário não autenticado');
  }

  // Chamar Edge Function
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      fileId,
      userId,
      context,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errorData.error || `Erro ao gerar conteúdo: ${response.statusText}`);
  }

  const result: AIGeneratedContent = await response.json();

  // Validar resultado
  if (!result.title || !result.description || !Array.isArray(result.hashtags)) {
    throw new Error('Resposta inválida da IA');
  }

  return result;
}

/**
 * Gera conteúdo (título, descrição, hashtags) a partir de um prompt do usuário
 * Usa Gemini e/ou OpenAI conforme configurado pelo usuário
 */
export async function generateContentFromPrompt(
  options: GenerateFromPromptOptions,
): Promise<GenerateFromPromptResult> {
  const { prompt, userId } = options;

  if (!prompt || !userId) {
    throw new Error('prompt e userId são obrigatórios');
  }

  // Obter URL da Edge Function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL não configurada');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/generate-content-from-prompt`;

  // Obter token de autenticação
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Usuário não autenticado');
  }

  // Chamar Edge Function
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      prompt,
      userId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errorData.error || `Erro ao gerar conteúdo: ${response.statusText}`);
  }

  const result = await response.json();

  // Buscar o ID da geração salva no histórico (última inserção)
  let generationId: string | undefined;
  try {
    const history = await aiHistoryRepository.listByUser(userId, 1);
    if (history.length > 0 && history[0].prompt === prompt) {
      generationId = history[0].id;
    }
  } catch (error) {
    console.warn('Erro ao buscar ID da geração:', error);
  }

  return {
    gemini: result.gemini,
    openai: result.openai,
    generationId,
  };
}

/**
 * Registra a escolha do usuário no histórico
 */
export async function recordUserChoice(
  generationId: string,
  provider: 'gemini' | 'openai',
  chosenResult: AIGeneratedContent,
): Promise<void> {
  await aiHistoryRepository.update(generationId, {
    chosenProvider: provider,
    chosenResult,
  });
}

/**
 * Gera conteúdo para um arquivo local (upload temporário necessário)
 * Por enquanto, retorna erro - implementação futura
 */
export async function generateFromLocalFile(
  file: File,
  userId: string,
  context?: string,
): Promise<AIGeneratedContent> {
  // TODO: Implementar upload temporário e análise
  throw new Error('Geração a partir de arquivo local ainda não implementada');
}




