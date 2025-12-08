/**
 * Edge Function: generate-content-from-prompt
 *
 * Esta função gera título, descrição e hashtags usando Gemini e/ou OpenAI
 * baseado em um prompt do usuário. Sempre usa o contexto do perfil (ai_context)
 * e aprende com escolhas anteriores do usuário.
 *
 * Fluxo:
 * 1. Recebe prompt e userId
 * 2. Obtém ai_context do usuário (obrigatório)
 * 3. Obtém gemini_api_key e openai_api_key do usuário
 * 4. Busca histórico de escolhas anteriores (few-shot learning)
 * 5. Constrói prompt enriquecido
 * 6. Chama apenas as IAs que o usuário tem configuradas
 * 7. Salva histórico
 * 8. Retorna resultados
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface GenerateRequest {
  prompt: string; // Prompt do usuário descrevendo o vídeo
  userId: string; // ID do usuário
}

interface AIResult {
  title: string;
  description: string;
  hashtags: string[];
}

interface GenerateResponse {
  gemini?: AIResult;
  openai?: AIResult;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
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

    // Parse do body
    const body: GenerateRequest = await req.json();
    const { prompt, userId } = body;

    if (!prompt || !userId) {
      return new Response(
        JSON.stringify({ error: 'prompt e userId são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verificar que o userId corresponde ao usuário autenticado
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter dados do usuário (ai_context e API keys)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('ai_context, gemini_api_key, openai_api_key')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const aiContext = userData.ai_context;
    const geminiApiKey = userData.gemini_api_key;
    const openaiApiKey = userData.openai_api_key;

    // Verificar se pelo menos uma IA está configurada
    if (!geminiApiKey && !openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Configure pelo menos uma API Key nas Configurações' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Buscar histórico de escolhas anteriores (últimas 5-10)
    const { data: historyData } = await supabase
      .from('ai_generation_history')
      .select('prompt, chosen_provider, chosen_result')
      .eq('user_id', userId)
      .not('chosen_provider', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Construir prompt enriquecido
    let enrichedPrompt = '';
    
    if (aiContext) {
      enrichedPrompt += `Contexto do perfil:\n${aiContext}\n\n`;
    }

    // Adicionar exemplos de escolhas anteriores (few-shot learning)
    if (historyData && historyData.length > 0) {
      enrichedPrompt += 'Exemplos de escolhas anteriores:\n';
      historyData.slice(0, 5).forEach((item) => {
        if (item.chosen_result) {
          const result = item.chosen_result as AIResult;
          enrichedPrompt += `- Prompt: "${item.prompt}"\n`;
          enrichedPrompt += `  Título: "${result.title}"\n`;
          enrichedPrompt += `  Descrição: "${result.description}"\n`;
          enrichedPrompt += `  Hashtags: ${result.hashtags.join(', ')}\n\n`;
        }
      });
    }

    enrichedPrompt += `Prompt atual: ${prompt}\n\n`;
    enrichedPrompt += `Gere um título, descrição e hashtags relevantes para este vídeo. Retorne um JSON com a estrutura: {"title": "...", "description": "...", "hashtags": ["#tag1", "#tag2"]}`;

    const response: GenerateResponse = {};

    // Chamar Gemini se configurado
    if (geminiApiKey) {
      try {
        const geminiResult = await callGeminiAPI(geminiApiKey, enrichedPrompt);
        response.gemini = geminiResult;
      } catch (error) {
        console.error('Erro ao chamar Gemini:', error);
        response.error = `Erro ao chamar Gemini: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      }
    }

    // Chamar OpenAI se configurado
    if (openaiApiKey) {
      try {
        const openaiResult = await callOpenAIAPI(openaiApiKey, enrichedPrompt);
        response.openai = openaiResult;
      } catch (error) {
        console.error('Erro ao chamar OpenAI:', error);
        if (response.error) {
          response.error += `; Erro ao chamar OpenAI: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        } else {
          response.error = `Erro ao chamar OpenAI: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        }
      }
    }

    // Salvar histórico antes de retornar
    try {
      await supabase.from('ai_generation_history').insert({
        user_id: userId,
        prompt: prompt,
        gemini_result: response.gemini || null,
        openai_result: response.openai || null,
      });
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
      // Não falhar a requisição se o histórico não for salvo
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function callGeminiAPI(apiKey: string, prompt: string): Promise<AIResult> {
  // Tentar diferentes modelos do Gemini
  const models = ['gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-pro'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Gemini API error (${model}): ${response.status} - ${errorText}`);
        // Se for 404, tentar próximo modelo
        if (response.status === 404) {
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Resposta vazia do Gemini');
      }

      // Tentar extrair JSON da resposta
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Tentar encontrar JSON em blocos de código
        jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1];
        }
      }

      if (!jsonMatch) {
        throw new Error('Resposta do Gemini não contém JSON válido');
      }

      let result;
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // Tentar limpar o JSON se houver problemas
        const cleaned = jsonMatch[0].replace(/[^\x20-\x7E\n\r]/g, '');
        result = JSON.parse(cleaned);
      }

      return {
        title: result.title || '',
        description: result.description || '',
        hashtags: Array.isArray(result.hashtags) ? result.hashtags : [],
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      console.error(`Erro ao tentar modelo ${model}:`, error);
      // Se não for 404, parar de tentar outros modelos
      if (error instanceof Error && !error.message.includes('404') && !error.message.includes('NOT_FOUND')) {
        throw error;
      }
      // Continuar para próximo modelo se for 404 ou NOT_FOUND
    }
  }

  // Se chegou aqui, todos os modelos falharam
  throw lastError || new Error('Nenhum modelo do Gemini disponível');
}

async function callOpenAIAPI(apiKey: string, prompt: string): Promise<AIResult> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em criar títulos, descrições e hashtags para vídeos de redes sociais. Sempre retorne um JSON válido com a estrutura: {"title": "...", "description": "...", "hashtags": ["#tag1", "#tag2"]}',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Resposta vazia do OpenAI');
  }

  // Tentar extrair JSON da resposta
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Resposta do OpenAI não contém JSON válido');
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    title: result.title || '',
    description: result.description || '',
    hashtags: result.hashtags || [],
  };
}

