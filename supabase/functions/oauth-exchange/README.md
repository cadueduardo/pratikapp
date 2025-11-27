# Edge Function: OAuth Exchange

Esta Edge Function troca códigos de autorização OAuth por tokens de acesso de forma segura, mantendo o `client_secret` no servidor.

## Configuração

### Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no Supabase Dashboard:

- `YOUTUBE_CLIENT_ID` - Client ID do Google OAuth
- `YOUTUBE_CLIENT_SECRET` - Client Secret do Google OAuth
- `INSTAGRAM_APP_ID` - App ID do Instagram/Facebook
- `INSTAGRAM_APP_SECRET` - App Secret do Instagram/Facebook
- `TIKTOK_CLIENT_KEY` - Client Key do TikTok
- `TIKTOK_CLIENT_SECRET` - Client Secret do TikTok

### Deploy

```bash
supabase functions deploy oauth-exchange
```

## Uso

A função é chamada automaticamente pelo frontend após o usuário autorizar a aplicação na plataforma.

### Request

```json
{
  "platform": "youtube" | "instagram" | "tiktok",
  "code": "authorization_code",
  "redirectUri": "https://your-app.com/oauth/callback/youtube"
}
```

### Response

```json
{
  "access_token": "ya29.a0...",
  "refresh_token": "1//0g...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

## Segurança

- O `client_secret` nunca é exposto ao frontend
- Requer autenticação do usuário (token JWT)
- Validação de parâmetros de entrada
- Tratamento de erros robusto








