# Edge Function: upload-to-tiktok

Faz upload de vídeos para o TikTok usando TikTok Marketing API v2.

## Funcionalidade

Esta Edge Function:
1. Valida o token OAuth do TikTok
2. Renova o token se expirado
3. Inicializa o upload no TikTok
4. Faz download do vídeo da URL fornecida (Google Drive, etc.)
5. Faz upload do vídeo para o TikTok
6. Publica o vídeo

## Uso

### Request

```typescript
POST /functions/v1/upload-to-tiktok
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "videoUrl": "https://drive.google.com/file/d/...",
  "title": "Título do vídeo",
  "description": "Descrição do vídeo",
  "privacyLevel": "PUBLIC_TO_EVERYONE",
  "platformId": "platform_id_from_database"
}
```

### Response

```json
{
  "success": true,
  "videoId": "publish_id_123",
  "platformVideoId": "publish_id_123",
  "message": "Vídeo publicado com sucesso no TikTok"
}
```

## Variáveis de Ambiente

A função usa a Edge Function `refresh-oauth-token` para renovar tokens expirados.

## Deploy

```bash
supabase functions deploy upload-to-tiktok
```

## Notas

- O vídeo deve estar acessível via URL pública
- TikTok aceita vídeos em formato MP4
- O upload pode levar alguns minutos dependendo do tamanho do vídeo










