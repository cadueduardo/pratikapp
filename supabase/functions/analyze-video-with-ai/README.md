# Edge Function: analyze-video-with-ai

Analisa vídeos usando Google Gemini 1.5 Pro para gerar automaticamente título, descrição e hashtags baseado no contexto do perfil do usuário.

## Funcionalidade

Esta Edge Function:
1. Recebe `fileId` do Google Drive e `userId`
2. Obtém contexto do perfil do usuário (`ai_context`) do banco de dados
3. Baixa vídeo do Google Drive usando token OAuth do usuário
4. Envia vídeo para Gemini API para análise multimodal (áudio + frames)
5. Retorna título, descrição e hashtags gerados pela IA

## Uso

### Request

```typescript
POST /functions/v1/analyze-video-with-ai
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "fileId": "google_drive_file_id",
  "userId": "user_id",
  "context": "opcional - contexto do perfil (será buscado do banco se não fornecido)"
}
```

### Response

```json
{
  "title": "Título gerado pela IA",
  "description": "Descrição gerada pela IA",
  "hashtags": ["#hashtag1", "#hashtag2", ...]
}
```

## Variáveis de Ambiente

- `GEMINI_API_KEY` (obrigatório) - API Key do Google Gemini
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key do Supabase

## Configuração

1. Adicionar `GEMINI_API_KEY` como secret no Supabase:
   ```bash
   supabase secrets set GEMINI_API_KEY=your_api_key_here
   ```

2. Deploy da função:
   ```bash
   supabase functions deploy analyze-video-with-ai
   ```

## Notas

- O vídeo é enviado diretamente para o Gemini (não precisa extrair frames manualmente)
- Gemini 1.5 Pro suporta vídeos de até 2 horas
- A função usa análise multimodal (transcrição de áudio + análise visual)
- O contexto do perfil é usado para personalizar a geração de conteúdo
- Se o contexto não estiver configurado, a IA ainda funciona mas com menos personalização

## Limitações

- Vídeos muito grandes podem exceder limites de tamanho
- A API do Gemini tem rate limits
- Processamento pode levar alguns segundos dependendo do tamanho do vídeo







