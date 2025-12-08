/**
 * Edge Function: analyze-video-with-ai
 *
 * Esta função analisa vídeos usando Google Gemini 1.5 Pro para gerar
 * automaticamente título, descrição e hashtags baseado no contexto do perfil.
 *
 * Fluxo:
 * 1. Recebe fileId do Google Drive e userId
 * 2. Obtém contexto do perfil do usuário (ai_context)
 * 3. Baixa vídeo do Google Drive
 * 4. Envia vídeo para Gemini API para análise multimodal
 * 5. Retorna título, descrição e hashtags gerados
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  fileId: string; // ID do arquivo no Google Drive
  userId: string; // ID do usuário
  context?: string; // Contexto do perfil (opcional, será buscado se não fornecido)
}

interface GeminiResponse {
  title: string;
  description: string;
  hashtags: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    // Usar modelo liberado pelo projeto (ListModels mostra quais). Default: gemini-2.5-pro (liberado no seu projeto).
    // Permitimos configurar via env e tentamos fallback em caso de 404 de disponibilidade.
    const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-pro';

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY não configurada' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

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
    const body: AnalyzeRequest = await req.json();
    const { fileId, userId, context: providedContext } = body;

    if (!fileId || !userId) {
      return new Response(
        JSON.stringify({ error: 'fileId e userId são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter contexto do perfil do usuário se não fornecido
    let userContext = providedContext;
    if (!userContext) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('ai_context')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        userContext = userData.ai_context;
      }
    }

    // Baixar vídeo do Google Drive
    // Primeiro, obter token do Google Drive do usuário
    const { data: platforms, error: platformError } = await supabase
      .from('platforms')
      .select('api_token')
      .eq('user_id', userId)
      .eq('name', 'google-drive')
      .single();

    if (platformError || !platforms?.api_token) {
      return new Response(
        JSON.stringify({ error: 'Google Drive não está conectado para este usuário' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse do token (formato: JSON com accessToken e refreshToken, ou string simples)
    let googleDriveToken: string | null = null;
    try {
      const tokenData = JSON.parse(platforms.api_token);
      googleDriveToken = tokenData.accessToken || tokenData.access_token || null;
    } catch {
      // Se não for JSON, tratar como token simples (legado)
      googleDriveToken = platforms.api_token;
    }

    if (!googleDriveToken) {
      return new Response(
        JSON.stringify({ error: 'Token do Google Drive não encontrado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter metadados do arquivo primeiro para verificar tamanho e tipo (sem baixar o vídeo)
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=size,mimeType,name`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        Authorization: `Bearer ${googleDriveToken}`,
      },
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text().catch(() => 'Erro desconhecido');
      console.error('Erro ao buscar metadados do vídeo:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar informações do vídeo', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const metadata = await metadataResponse.json();
    const videoSize = metadata.size ? parseInt(metadata.size, 10) : 0;
    const contentType = metadata.mimeType || 'video/mp4';
    
    // Limitar tamanho do vídeo (500MB para evitar problemas de memória)
    // Mesmo com streaming, Edge Functions têm limite de memória
    const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
    if (videoSize > MAX_VIDEO_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: 'Vídeo muito grande',
          message: `O vídeo excede o limite de ${MAX_VIDEO_SIZE / (1024 * 1024)}MB. Por favor, use um vídeo menor ou comprima antes.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Fazer streaming direto do Google Drive para Gemini File API
    // Isso evita carregar o vídeo inteiro na memória
    console.log(`Fazendo streaming de vídeo (${(videoSize / (1024 * 1024)).toFixed(2)}MB) para Gemini File API...`);
    
    // Passo 1: Iniciar upload resumível para Gemini File API
    // Usar v1beta que é a versão estável e suporta upload de arquivos
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}&uploadType=resumable`;
    
    // Criar metadados do arquivo (formato correto para v1)
    const fileMetadata = {
      file: {
        display_name: metadata.name || 'video_analysis',
      },
    };
    
    // Iniciar upload resumível (retorna uma URL de upload)
    // Para v1beta, usar headers específicos do protocolo resumável
    const initUploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Type': contentType,
        'X-Goog-Upload-Header-Content-Length': videoSize.toString(),
      },
      body: JSON.stringify(fileMetadata),
    });

    if (!initUploadResponse.ok) {
      const errorText = await initUploadResponse.text();
      console.error('Erro ao iniciar upload resumível:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao iniciar upload do vídeo',
          message: 'Não foi possível iniciar o upload do vídeo para análise.',
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Obter URL de upload resumível
    // A API v1beta retorna a URL no header X-Goog-Upload-URL
    const uploadSessionUrl = initUploadResponse.headers.get('X-Goog-Upload-URL') ||
                            initUploadResponse.headers.get('x-goog-upload-url') ||
                            initUploadResponse.headers.get('Location');
    
    if (!uploadSessionUrl) {
      const errorText = await initUploadResponse.text().catch(() => 'Erro desconhecido');
      console.error('Headers recebidos:', Object.fromEntries(initUploadResponse.headers.entries()));
      console.error('Resposta do init upload:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao obter URL de upload',
          message: 'Não foi possível obter a URL de upload do vídeo.',
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Passo 2: Fazer streaming do vídeo do Google Drive para Gemini
    // Usar o corpo da resposta diretamente (streaming) sem carregar na memória
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const videoResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${googleDriveToken}`,
      },
    });

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text().catch(() => 'Erro desconhecido');
      console.error('Erro ao baixar vídeo do Google Drive:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao baixar vídeo do Google Drive', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Fazer upload do vídeo em streaming (sem carregar tudo na memória)
    // Usar o corpo da resposta diretamente
    // Para API v1beta, usar headers do protocolo resumável
    const uploadResponse = await fetch(uploadSessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': videoSize.toString(),
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
      },
      body: videoResponse.body, // Streaming direto - não carrega tudo na memória
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Erro ao fazer upload do vídeo para Gemini:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao fazer upload do vídeo',
          message: 'Não foi possível fazer upload do vídeo para análise. Tente novamente.',
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const uploadData = await uploadResponse.json();
    const fileUri = uploadData.file?.uri || uploadData.name;
    
    if (!fileUri) {
      console.error('Resposta do upload não contém file URI:', uploadData);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar upload',
          message: 'Upload realizado mas não foi possível obter o URI do arquivo.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Normalizar fileUri - pode vir como 'files/xxxxx' ou URL completa
    let normalizedFileUri = fileUri;
    if (fileUri.startsWith('https://')) {
      // Se for URL completa, extrair apenas o path
      const url = new URL(fileUri);
      normalizedFileUri = url.pathname;
    } else if (!fileUri.startsWith('files/')) {
      // Se não começar com 'files/', adicionar
      normalizedFileUri = `files/${fileUri}`;
    }

    console.log('Upload concluído. File URI:', normalizedFileUri);
    
    // Estratégia otimizada: tentar usar o arquivo imediatamente
    // O Gemini pode processar o vídeo durante a análise, não precisamos esperar
    // Vamos tentar usar o arquivo diretamente e só verificar status se falhar
    
    let fileProcessed = false;
    let canUseFile = false;
    
    // Primeira tentativa: usar o arquivo imediatamente (pode funcionar mesmo em processamento)
    console.log('Tentando usar arquivo imediatamente (sem aguardar processamento completo)...');
    
    // Tentar algumas vezes com espera curta antes de desistir
    for (let quickAttempt = 0; quickAttempt < 5; quickAttempt++) {
      if (quickAttempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 segundos entre tentativas rápidas
      }
      
      try {
        // Tentar verificar se o arquivo está acessível
        const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${normalizedFileUri}?key=${geminiApiKey}`;
        const fileStatusResponse = await fetch(statusUrl, {
          method: 'GET',
        });
        
        if (fileStatusResponse.ok) {
          const fileStatus = await fileStatusResponse.json();
          const state = fileStatus.state || fileStatus.file?.state;
          
          if (state === 'ACTIVE') {
            fileProcessed = true;
            canUseFile = true;
            console.log('Arquivo está ACTIVE e pronto para uso');
            break;
          } else if (state === 'PROCESSING') {
            // Arquivo está processando, mas podemos tentar usar mesmo assim
            console.log('Arquivo está PROCESSING, mas vamos tentar usar mesmo assim...');
            canUseFile = true;
            break;
          } else if (state === 'FAILED') {
            return new Response(
              JSON.stringify({ 
                error: 'Falha no processamento',
                message: 'O vídeo falhou ao ser processado pelo Gemini. Verifique se o arquivo é um vídeo válido.',
              }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }
        } else if (fileStatusResponse.status === 404 && quickAttempt < 4) {
          // 404 pode significar que ainda não está disponível, continuar tentando
          console.log(`Arquivo ainda não disponível (404) - tentativa rápida ${quickAttempt + 1}/5`);
          continue;
        }
      } catch (statusError) {
        console.warn('Erro ao verificar status (tentativa rápida):', statusError);
      }
    }
    
    // Se não conseguimos verificar, assumir que podemos tentar usar (pode funcionar)
    if (!canUseFile) {
      console.log('Não foi possível verificar status, mas vamos tentar usar o arquivo mesmo assim...');
      canUseFile = true; // Tentar usar mesmo sem confirmação
    }

    // Preparar prompt para Gemini
    // Nota: O Gemini processa o vídeo internamente na velocidade que conseguir
    // Não temos controle sobre a velocidade de processamento, mas podemos otimizar o prompt
    const contextPrompt = userContext
      ? `CONTEXTO DO PERFIL:
${userContext}

`
      : '';

    const prompt = `${contextPrompt}Você é um especialista em criação de conteúdo para redes sociais.

ANÁLISE DO VÍDEO:
Analise o vídeo fornecido de forma eficiente. Foque nos momentos mais importantes:
- Início do vídeo (primeiros 30 segundos são cruciais)
- Transcrição de áudio (palavras-chave principais)
- Elementos visuais marcantes (cenas, pessoas, objetos principais)
- Conclusão ou call-to-action

TAREFA:
Gere um título atrativo (máximo 200 caracteres), descrição envolvente (máximo 1000 caracteres) e hashtags relevantes (5-10 hashtags) baseado no conteúdo do vídeo${userContext ? ' e no contexto do perfil fornecido' : ''}.

IMPORTANTE:
- O título deve ser chamativo e otimizado para redes sociais
- A descrição deve ser envolvente e incluir call-to-action quando apropriado
- As hashtags devem ser relevantes ao conteúdo e ao nicho do perfil
- Use hashtags em português se o contexto indicar conteúdo brasileiro
- Foque nos elementos mais importantes do vídeo para análise mais rápida

FORMATO DE RESPOSTA (JSON válido, sem markdown):
{
  "title": "...",
  "description": "...",
  "hashtags": ["#hashtag1", "#hashtag2", ...]
}`;

    // Montar payload no formato exato esperado:
    // - v1: camelCase, role: 'user', ordem parts: fileData depois text (conforme docs multimodal)
    // - v1beta: snake_case, sem role obrigatório
    const buildPayload = (apiVersion: 'v1' | 'v1beta') => {
      if (apiVersion === 'v1') {
        return {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: normalizedFileUri,
                    mimeType: contentType,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        };
      }
      return {
        contents: [
          {
            parts: [
              {
                file_data: {
                  file_uri: normalizedFileUri,
                  mime_type: contentType,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      };
    };

    // Tentar com o modelo configurado; se 404, testar fallbacks mais antigos
    const tryCallModel = async (modelName: string, apiVersion: 'v1' | 'v1beta') => {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${geminiApiKey}`;
      const payload = buildPayload(apiVersion);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return { resp, url, modelName, apiVersion };
    };

    const modelCandidates = [
      geminiModel,
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-pro-exp',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
    ];
    // Priorizar v1 (modelo estável), fallback v1beta
    const apiVersions: Array<'v1beta' | 'v1'> = ['v1', 'v1beta'];

    let geminiResponse;
    let usedUrl = '';
    let usedModel = '';
    let usedVersion: 'v1' | 'v1beta' | '' = '';
    const errors: Array<{ model: string; status: number; body: string; apiVersion: string }> = [];

    for (const candidate of modelCandidates) {
      for (const apiVersion of apiVersions) {
        const { resp, url, modelName, apiVersion: v } = await tryCallModel(candidate, apiVersion);
        usedUrl = url;
        usedModel = modelName;
        usedVersion = v;
        if (resp.ok) {
          geminiResponse = resp;
          break;
        }
        const body = await resp.text().catch(() => 'Erro sem corpo');
        errors.push({ model: `${modelName}@${v}`, status: resp.status, body, apiVersion: v });
        if (resp.status === 404) {
          // tentar próximo modelo/versão
          continue;
        } else {
          // status diferente de 404, parar para não mascarar outros erros
          geminiResponse = resp;
          break;
        }
      }
      if (geminiResponse?.ok) break;
    }

    if (!geminiResponse?.ok) {
      const statusCode = geminiResponse?.status ?? 0;
      const errorText = geminiResponse
        ? await geminiResponse.text().catch(() => `Erro sem corpo (status ${statusCode})`)
        : 'Nenhuma resposta do Gemini';
      console.error('Erro na API do Gemini:', { statusCode, usedModel, usedVersion, usedUrl, attempts: errors, body: errorText });
      return new Response(
        JSON.stringify({
          error: 'Erro ao analisar vídeo com IA',
          model: usedModel,
          apiVersion: usedVersion,
          url: usedUrl,
          status: statusCode,
          attempts: errors,
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const geminiData = await geminiResponse.json();

    // Extrair texto da resposta do Gemini
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse do JSON da resposta
    let result: GeminiResponse;
    try {
      // Remover markdown code blocks se existirem
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Erro ao parsear resposta do Gemini:', parseError);
      console.error('Resposta recebida:', responseText);
      
      // Fallback: tentar extrair informações do texto
      const lines = responseText.split('\n');
      result = {
        title: lines.find((l) => l.includes('title') || l.includes('Título'))?.replace(/.*[:=]\s*/, '').replace(/["']/g, '').trim() || 'Título gerado pela IA',
        description: lines.find((l) => l.includes('description') || l.includes('Descrição'))?.replace(/.*[:=]\s*/, '').replace(/["']/g, '').trim() || 'Descrição gerada pela IA',
        hashtags: responseText.match(/#\w+/g) || [],
      };
    }

    // Validar e limpar resultado
    if (!result.title || result.title.length > 200) {
      result.title = result.title?.substring(0, 200) || 'Título gerado pela IA';
    }
    if (!result.description || result.description.length > 1000) {
      result.description = result.description?.substring(0, 1000) || 'Descrição gerada pela IA';
    }
    if (!Array.isArray(result.hashtags)) {
      result.hashtags = [];
    }
    // Limitar hashtags a 10
    result.hashtags = result.hashtags.slice(0, 10);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro na Edge Function analyze-video-with-ai:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

