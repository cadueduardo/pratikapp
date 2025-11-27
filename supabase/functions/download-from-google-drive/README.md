# Edge Function: download-from-google-drive

Faz download de vídeos do Google Drive para uso em uploads para plataformas sociais.

## Funcionalidade

Esta Edge Function:
1. Valida o token OAuth do Google Drive
2. Renova o token se expirado
3. Faz download do arquivo do Google Drive
4. Retorna o arquivo ou URL de download

## Uso

### Request - Retornar URL de download

```typescript
POST /functions/v1/download-from-google-drive
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "fileId": "google_drive_file_id",
  "userId": "user_id",
  "returnUrl": true
}
```

### Response - URL de download

```json
{
  "downloadUrl": "https://www.googleapis.com/drive/v3/files/...?alt=media",
  "accessToken": "token_here"
}
```

### Request - Retornar arquivo

```typescript
POST /functions/v1/download-from-google-drive
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "fileId": "google_drive_file_id",
  "userId": "user_id",
  "returnUrl": false
}
```

### Response - Arquivo

Retorna o arquivo como blob com headers apropriados.

## Variáveis de Ambiente

A função usa a Edge Function `refresh-oauth-token` para renovar tokens expirados.

## Deploy

```bash
supabase functions deploy download-from-google-drive
```

## Notas

- O arquivo deve estar acessível com o token OAuth do usuário
- Para vídeos grandes, considere usar `returnUrl: true` e fazer o download em chunks
- Esta função é principalmente usada internamente por outras Edge Functions de upload


