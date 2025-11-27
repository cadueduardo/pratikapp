# Plano de Integração Google Drive

## 📋 Requisitos do Usuário

1. **Conectar Google Drive**: Botão para conectar conta Google Drive
2. **Ver pastas**: Listar pastas do Google Drive
3. **Procurar vídeo**: Buscar vídeo nas pastas para selecionar no agendamento
4. **Preview do vídeo**: Mostrar preview em baixa qualidade no formulário de agendamento

## ✅ Status Atual

### O que JÁ está implementado:
- ✅ Estrutura base do serviço `googleDrive.ts` (mock)
- ✅ Interface `GoogleDriveFile` definida
- ✅ Funções mock: `authenticateGoogleDrive()`, `listVideosFromDrive()`, `getFileMetadata()`
- ✅ Campo de URL do Google Drive no formulário de agendamento
- ✅ Validação de URL do Google Drive

### O que NÃO está implementado:
- ❌ OAuth real do Google Drive
- ❌ Listagem real de pastas do Google Drive
- ❌ Busca de vídeos no Google Drive
- ❌ Seletor de vídeo do Google Drive no formulário
- ❌ Preview de vídeo (thumbnail) no formulário de agendamento
- ❌ Armazenamento de thumbnail/preview URL no banco de dados

## 🎯 O que precisa ser implementado

### 1. OAuth do Google Drive

**Status**: YouTube OAuth já funciona, pode reutilizar as mesmas credenciais

**Passos**:
1. Adicionar `google-drive` como plataforma OAuth (reutiliza credenciais do YouTube)
2. Scopes necessários:
   - `https://www.googleapis.com/auth/drive.readonly` (para listar arquivos)
   - `https://www.googleapis.com/auth/drive.metadata.readonly` (para metadados)
3. Armazenar token do Google Drive na tabela `platforms` (nome: 'google-drive')

**Localização**: 
- `src/services/oauth.ts` - Adicionar configuração do Google Drive
- `src/utils/platforms.ts` - Adicionar 'google-drive' como plataforma

---

### 2. Listagem de Pastas do Google Drive

**Funcionalidade**: Permitir que o usuário navegue pelas pastas do Google Drive

**Implementação**:
1. Função `listFolders()` em `googleDrive.ts`
2. Função `listFilesInFolder(folderId)` em `googleDrive.ts`
3. Componente `GoogleDriveBrowser` para navegação de pastas
4. Modal/dialog para selecionar pasta e vídeo

**Google Drive API**:
- Endpoint: `GET https://www.googleapis.com/drive/v3/files`
- Query: `q=mimeType='application/vnd.google-apps.folder'` (para pastas)
- Query: `q=mimeType contains 'video/'` (para vídeos)
- Campos: `id, name, mimeType, parents, thumbnailLink, webViewLink`

**Localização**: 
- `src/services/googleDrive.ts` - Implementar funções reais
- `src/components/googleDrive/GoogleDriveBrowser.tsx` - Novo componente

---

### 3. Busca e Seleção de Vídeo

**Funcionalidade**: Buscar vídeo nas pastas e selecionar para agendamento

**Implementação**:
1. Adicionar botão "Selecionar do Google Drive" no formulário de agendamento
2. Abrir modal com navegador do Google Drive
3. Permitir busca por nome de arquivo
4. Filtrar apenas arquivos de vídeo (`mimeType contains 'video/'`)
5. Ao selecionar, preencher campo `urlDrive` e buscar thumbnail

**Localização**:
- `src/pages/schedules/SchedulesPage.tsx` - Adicionar botão e modal
- `src/components/googleDrive/GoogleDriveBrowser.tsx` - Componente de navegação

---

### 4. Preview de Vídeo (Thumbnail)

**Funcionalidade**: Mostrar preview em baixa qualidade do vídeo selecionado

**Implementação**:
1. Google Drive API retorna `thumbnailLink` nos metadados do arquivo
2. Formato: `https://lh3.googleusercontent.com/d/FILE_ID=w200-h200-p-k-nu` (w200-h200 = baixa qualidade)
3. Adicionar campo `thumbnailUrl` no tipo `Video` (opcional)
4. Mostrar `<img>` ou `<video>` com thumbnail no formulário de agendamento
5. Exibir preview também na lista de agendamentos (thumbnail pequeno)

**Google Drive Thumbnail URL**:
- Thumbnail padrão: `thumbnailLink` dos metadados
- Preview baixa qualidade: adicionar `=w200-h200-p-k-nu` ao final da URL
- Preview média qualidade: `=w400-h400-p-k-nu`
- Preview alta qualidade: `=w800-h800-p-k-nu`

**Localização**:
- `src/services/database/types.ts` - Adicionar `thumbnailUrl?: string` ao tipo `Video`
- `supabase/schema.sql` - Adicionar coluna `thumbnail_url` na tabela `videos` (opcional, pode calcular na hora)
- `src/pages/schedules/SchedulesPage.tsx` - Mostrar preview no formulário e lista

---

## 📝 Schema do Banco de Dados

### Adicionar coluna `thumbnail_url` (opcional)

```sql
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
```

**Nota**: Pode calcular o thumbnail na hora usando o `urlDrive`, mas armazenar melhora performance.

---

## 🔧 Implementação Detalhada

### Passo 1: OAuth Google Drive

1. Adicionar 'google-drive' em `src/utils/platforms.ts`:
```typescript
export type PlatformType = 'youtube' | 'instagram' | 'tiktok' | 'google-drive';
```

2. Adicionar configuração OAuth em `src/services/oauth.ts`:
```typescript
'google-drive': {
  clientId: import.meta.env.VITE_YOUTUBE_CLIENT_ID || '', // Reutiliza credenciais do YouTube
  redirectUri: `${window.location.origin}/oauth/callback/google-drive`,
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ],
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
},
```

3. Adicionar callback em `src/pages/oauth/OAuthCallbackPage.tsx`

---

### Passo 2: Serviço Google Drive Real

Implementar em `src/services/googleDrive.ts`:

```typescript
/**
 * Lista pastas do Google Drive
 */
export const listFolders = async (folderId?: string): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken(); // Obter token da plataforma 'google-drive'
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'${folderId ? ` and '${folderId}' in parents` : ''}&fields=files(id,name,mimeType,parents,thumbnailLink,webViewLink)`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  return data.files;
};

/**
 * Lista vídeos em uma pasta
 */
export const listVideosInFolder = async (folderId?: string): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken();
  const query = folderId 
    ? `'${folderId}' in parents and mimeType contains 'video/'`
    : `mimeType contains 'video/'`;
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink)`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  return data.files;
};

/**
 * Busca vídeos por nome
 */
export const searchVideos = async (query: string): Promise<GoogleDriveFile[]> => {
  const token = await getGoogleDriveToken();
  const searchQuery = `name contains '${query}' and mimeType contains 'video/'`;
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink)`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  return data.files;
};

/**
 * Obtém thumbnail de baixa qualidade
 */
export const getThumbnailUrl = (thumbnailLink: string, size: 'low' | 'medium' | 'high' = 'low'): string => {
  if (!thumbnailLink) return '';
  
  const sizes = {
    low: 'w200-h200-p-k-nu',
    medium: 'w400-h400-p-k-nu',
    high: 'w800-h800-p-k-nu',
  };
  
  // Se já tem parâmetros, adiciona; senão, adiciona = no final
  return thumbnailLink.includes('=') 
    ? `${thumbnailLink}-${sizes[size]}`
    : `${thumbnailLink}=${sizes[size]}`;
};
```

---

### Passo 3: Componente de Navegação do Google Drive

Criar `src/components/googleDrive/GoogleDriveBrowser.tsx`:

- Modal com navegação de pastas (breadcrumb)
- Lista de pastas (pastas primeiro)
- Lista de vídeos com thumbnails
- Busca por nome de vídeo
- Seleção de vídeo (retorna `GoogleDriveFile`)

---

### Passo 4: Integração no Formulário de Agendamento

Em `src/pages/schedules/SchedulesPage.tsx`:

1. Adicionar botão "Selecionar do Google Drive" ao lado do campo URL
2. Abrir modal `GoogleDriveBrowser` ao clicar
3. Ao selecionar vídeo:
   - Preencher `urlDrive` com `webViewLink`
   - Buscar `thumbnailLink` e mostrar preview
   - Opcionalmente salvar `thumbnailUrl` no banco

4. Mostrar preview do vídeo no formulário:
   - Se `thumbnailUrl` existe, mostrar imagem
   - Senão, calcular do `urlDrive` usando Google Drive API

5. Mostrar preview também na lista de agendamentos

---

## 📊 Checklist de Implementação

### Fase 1: OAuth Google Drive
- [ ] Adicionar 'google-drive' como plataforma
- [ ] Configurar OAuth (reutilizar credenciais do YouTube)
- [ ] Adicionar callback `/oauth/callback/google-drive`
- [ ] Testar conexão do Google Drive

### Fase 2: Serviço Google Drive
- [ ] Implementar `listFolders()`
- [ ] Implementar `listVideosInFolder()`
- [ ] Implementar `searchVideos()`
- [ ] Implementar `getThumbnailUrl()`
- [ ] Implementar `getFileMetadata()` (real)
- [ ] Obter token da plataforma 'google-drive'

### Fase 3: Componente de Navegação
- [ ] Criar `GoogleDriveBrowser` component
- [ ] Implementar navegação de pastas (breadcrumb)
- [ ] Implementar lista de pastas e vídeos
- [ ] Implementar busca de vídeos
- [ ] Implementar seleção de vídeo
- [ ] Mostrar thumbnails na lista

### Fase 4: Integração no Agendamento
- [ ] Adicionar botão "Selecionar do Google Drive"
- [ ] Integrar modal no formulário
- [ ] Preencher campo URL ao selecionar
- [ ] Mostrar preview no formulário
- [ ] Mostrar preview na lista de agendamentos
- [ ] Adicionar coluna `thumbnail_url` no banco (opcional)

### Fase 5: Melhorias
- [ ] Loading states durante navegação
- [ ] Tratamento de erros
- [ ] Cache de thumbnails
- [ ] Preview em diferentes tamanhos

---

## 🔗 Referências

- [Google Drive API v3](https://developers.google.com/drive/api/v3/reference)
- [Google Drive API - List Files](https://developers.google.com/drive/api/v3/search-files)
- [Google Drive API - Thumbnails](https://developers.google.com/drive/api/v3/reference/files#resource)

---

## 💡 Notas Importantes

- Google Drive OAuth pode reutilizar as mesmas credenciais do YouTube
- Scopes necessários: `drive.readonly` e `drive.metadata.readonly`
- Thumbnails podem ser obtidos via `thumbnailLink` nos metadados
- Preview em baixa qualidade: adicionar `=w200-h200-p-k-nu` ao thumbnail URL
- A navegação de pastas usa `parents` para filtrar arquivos por pasta




