# Edge Function: generate-content-from-prompt

Gera título, descrição e hashtags usando Gemini e/ou OpenAI baseado em um prompt do usuário. Sempre usa o contexto do perfil (ai_context) e aprende com escolhas anteriores.

## Funcionalidade

Esta Edge Function:
1. Recebe `prompt` (texto do usuário) e `userId`
2. Obtém `ai_context` do usuário (obrigatório)
3. Obtém `gemini_api_key` e `openai_api_key` do usuário
4. Busca histórico de escolhas anteriores (few-shot learning)
5. Constrói prompt enriquecido
6. Chama apenas as IAs que o usuário tem configuradas
7. Salva histórico
8. Retorna resultados para comparação

## Uso

### Request

```typescript
POST /functions/v1/generate-content-from-prompt
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "prompt": "Vídeo sobre dicas de programação em React",
  "userId": "user_id"
}
```

### Response

```json
{
  "gemini": {
    "title": "Título gerado pelo Gemini",
    "description": "Descrição gerada pelo Gemini",
    "hashtags": ["#tag1", "#tag2"]
  },
  "openai": {
    "title": "Título gerado pelo OpenAI",
    "description": "Descrição gerada pelo OpenAI",
    "hashtags": ["#tag1", "#tag2"]
  }
}
```

## Variáveis de Ambiente

- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key do Supabase

**Nota:** As API keys do Gemini e OpenAI são obtidas do banco de dados (tabela `users`), não de variáveis de ambiente.

## Configuração

1. Deploy da função:
   ```bash
   supabase functions deploy generate-content-from-prompt
   ```

## Notas

- A função usa apenas as IAs que o usuário tem configuradas
- O contexto do perfil (`ai_context`) é sempre incluído (obrigatório)
- O histórico de escolhas anteriores é usado para few-shot learning
- As API keys são armazenadas por usuário na tabela `users`
- A função valida que o `userId` corresponde ao usuário autenticado




