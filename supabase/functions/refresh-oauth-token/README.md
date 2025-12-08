# Edge Function: refresh-oauth-token

Renova tokens OAuth expirados usando refresh tokens.

## Funcionalidade

Esta Edge Function renova tokens de acesso OAuth que expiraram, usando o refresh token armazenado. Suporta:

- YouTube
- Google Drive (reutiliza credenciais do YouTube)
- TikTok
- Instagram (Facebook Graph API)

## Uso

### Request

```typescript
POST /functions/v1/refresh-oauth-token
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "platform": "google-drive",
  "refreshToken": "refresh_token_here",
  "platformId": "platform_id_from_database"
}
```

### Response

```json
{
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token",
  "expires_in": 3600,
  "expires_at": 1234567890000,
  "token_type": "Bearer"
}
```

## Variáveis de Ambiente Necessárias

Configure no Supabase Dashboard > Edge Functions > Secrets:

- `YOUTUBE_CLIENT_ID` (usado também para Google Drive)
- `YOUTUBE_CLIENT_SECRET` (usado também para Google Drive)
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`

## Deploy

```bash
supabase functions deploy refresh-oauth-token
```










