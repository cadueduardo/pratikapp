# Edge Function: upload-to-youtube

Faz upload de vídeos para o YouTube usando YouTube Data API v3.

## Funcionalidade

Esta Edge Function:
1. Valida o token OAuth do YouTube
2. Renova o token se expirado
3. Faz download do vídeo da URL fornecida
4. Inicializa resumable upload no YouTube
5. Faz upload do vídeo usando resumable upload
6. Retorna o ID do vídeo publicado

## Uso

### Request

```typescript
POST /functions/v1/upload-to-youtube
Authorization: Bearer <user_access_token>
Content-Type: application/json

{
  "videoUrl": "https://drive.google.com/file/d/...",
  "title": "Título do vídeo",
  "description": "Descrição do vídeo",
  "tags": ["tag1", "tag2"],
  "privacyStatus": "public",
  "categoryId": "22",
  "platformId": "platform_id_from_database"
}
```

### Response

```json
{
  "success": true,
  "videoId": "youtube_video_id",
  "platformVideoId": "youtube_video_id",
  "message": "Vídeo publicado com sucesso no YouTube"
}
```

## Parâmetros

- `videoUrl` (obrigatório): URL do vídeo (Google Drive ou outro)
- `title` (obrigatório): Título do vídeo
- `description` (opcional): Descrição do vídeo
- `tags` (opcional): Array de tags
- `privacyStatus` (opcional): 'private' | 'unlisted' | 'public' (padrão: 'public')
- `categoryId` (opcional): ID da categoria do YouTube (padrão: '22' - People & Blogs)
- `platformId` (obrigatório): ID da plataforma YouTube no banco de dados

## Variáveis de Ambiente

A função usa a Edge Function `refresh-oauth-token` para renovar tokens expirados.

## Deploy

```bash
supabase functions deploy upload-to-youtube
```

## Notas

- O vídeo deve estar acessível via URL pública
- YouTube aceita vários formatos de vídeo (MP4, MOV, AVI, etc.)
- O upload pode levar vários minutos dependendo do tamanho do vídeo
- YouTube usa resumable upload para vídeos grandes










