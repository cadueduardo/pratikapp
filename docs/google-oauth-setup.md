# Configuração do Google OAuth

Este documento descreve a configuração do Google OAuth para o pratikapp.

## ✅ Credenciais Configuradas

As seguintes credenciais do Google OAuth foram configuradas:

- **Client ID**: `SEU_CLIENT_ID_AQUI.apps.googleusercontent.com`
- **Client Secret**: `SEU_CLIENT_SECRET_AQUI`

> ⚠️ **IMPORTANTE**: Substitua os valores acima pelas suas credenciais reais do Google Cloud Console.

## 📝 Configuração no Frontend

As credenciais do Google OAuth já foram adicionadas ao arquivo `.env.local`:

```env
VITE_YOUTUBE_CLIENT_ID=SEU_CLIENT_ID_AQUI.apps.googleusercontent.com
```

⚠️ **IMPORTANTE**: O arquivo `.env.local` está no `.gitignore` e não será commitado. Isso é correto para segurança.

## 🔐 Configuração no Supabase (Edge Functions)

Você precisa configurar as credenciais no Supabase para que as Edge Functions possam usar o Client Secret de forma segura.

### Opção 1: Via Dashboard do Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá em **Project Settings** > **Edge Functions** > **Secrets**
4. Adicione as seguintes variáveis:

```
YOUTUBE_CLIENT_ID=SEU_CLIENT_ID_AQUI.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI
```

### Opção 2: Via Supabase CLI

```bash
# Certifique-se de estar logado e com o projeto linkado
supabase login
supabase link --project-ref seu-project-ref

# Configurar os secrets
supabase secrets set YOUTUBE_CLIENT_ID=SEU_CLIENT_ID_AQUI.apps.googleusercontent.com
supabase secrets set YOUTUBE_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI
```

## 🚀 Habilitar Google Drive API (OBRIGATÓRIO para Google Drive)

**IMPORTANTE**: Para usar o Google Drive, você precisa habilitar a Google Drive API no seu projeto do Google Cloud Console.

### Passos:

1. Acesse: https://console.cloud.google.com/apis/library/drive.googleapis.com
   - Selecione o projeto correto do seu Google Cloud Console

2. Clique no botão **"ENABLE"** (Habilitar)

3. Aguarde 1-2 minutos para a API ser ativada

4. Verifique que a API está habilitada:
   - Vá em **APIs & Services** > **Enabled APIs**
   - Procure por **"Google Drive API"**
   - Deve estar listada como **Enabled**

### APIs Necessárias para o PratikApp:

- ✅ **YouTube Data API v3** (para YouTube)
- ✅ **Google Drive API** (para Google Drive) ⭐ **NOVO - HABILITE AGORA**

---

## 🎯 Redirect URIs Configuradas

Certifique-se de que as seguintes Redirect URIs estão configuradas no Google Cloud Console:

### Desenvolvimento:
- `http://localhost:5173/oauth/callback/youtube`
- `http://localhost:5173/oauth/callback/google-drive` ⭐ **NOVO**

### Produção (quando aplicável):
- `https://pratikapp.com.br/oauth/callback/youtube`
- `https://pratikapp.com.br/oauth/callback/google-drive` ⭐ **NOVO**

## 📋 Checklist

- [x] Client ID e Client Secret obtidos do Google Cloud Console
- [x] Client ID configurado no `.env.local` do frontend
- [x] Client ID e Client Secret configurados no Supabase (Edge Functions > Secrets)
- [x] Redirect URIs configuradas no Google Cloud Console
- [x] Usuários de teste adicionados no Google Cloud Console
- [x] Edge Function `oauth-exchange` deployada
- [x] Edge Function `store-oauth-tokens` deployada
- [ ] Fluxo OAuth testado completamente

## 🔄 Próximos Passos

1. ✅ Configure as credenciais no Supabase (Edge Functions > Secrets) - **CONCLUÍDO**
2. ✅ Faça o deploy da Edge Function `oauth-exchange` - **CONCLUÍDO**
3. ⚠️ Configure as Redirect URIs no Google Cloud Console:
   - Acesse o [Google Cloud Console](https://console.cloud.google.com/)
   - Vá em **APIs & Services** > **Credentials**
   - Clique no seu OAuth 2.0 Client ID
   - Em **Authorized redirect URIs**, adicione:
     - `http://localhost:5173/oauth/callback/youtube` (desenvolvimento)
     - `https://seu-dominio.com/oauth/callback/youtube` (produção)
4. Teste o fluxo OAuth:
   - Reinicie o servidor de desenvolvimento: `npm run dev`
   - Acesse Configurações > Plataformas
   - Adicione uma plataforma YouTube
   - Clique em "Conectar"
   - Você será redirecionado para autorizar com Google

## 🐛 Troubleshooting

### Erro: "Client ID não configurado"
- Verifique se `VITE_YOUTUBE_CLIENT_ID` está no `.env.local`
- Reinicie o servidor de desenvolvimento após adicionar

### Erro: "Credenciais OAuth não configuradas"
- Verifique se `YOUTUBE_CLIENT_ID` e `YOUTUBE_CLIENT_SECRET` estão configurados no Supabase
- Certifique-se de que fez o deploy da Edge Function após configurar os secrets

### Erro CORS: "blocked by CORS policy" na Edge Function
- **A Edge Function `store-oauth-tokens` não estava deployada**
- ✅ **SOLUÇÃO**: A função foi deployada via MCP do Supabase
- Se ainda tiver problemas:
  1. Verifique se a função está ativa no Supabase Dashboard
  2. Verifique os logs da Edge Function no Supabase Dashboard > Edge Functions > store-oauth-tokens > Logs
  3. Certifique-se de que a requisição está usando o token de autenticação correto

### Erro 403: "access_denied" - App não concluiu verificação do Google
- **O app está em modo "Testing"** no Google Cloud Console
- Para resolver, você precisa adicionar sua conta como testador:
  1. Acesse: https://console.cloud.google.com/apis/credentials/consent
  2. Vá para a seção **"Test users"** (Usuários de teste)
  3. Clique em **"+ ADD USERS"** (+ Adicionar usuários)
  4. Adicione seu email Google: `carlass@gmail.com` (o email que você usa para fazer login)
  5. Clique em **"ADD"** (Adicionar)
  6. Clique em **"SAVE"** (Salvar) no topo da página
  7. Aguarde alguns segundos
  8. Tente conectar novamente
- **Alternativa** (para produção): Se quiser permitir qualquer usuário:
  1. Acesse: https://console.cloud.google.com/apis/credentials/consent
  2. Em **"Publishing status"** (Status de publicação), clique em **"PUBLISH APP"** (Publicar app)
  3. ⚠️ **Atenção**: Alguns escopos sensíveis (como `youtube.upload`) requerem verificação do Google, que pode levar dias ou semanas

### Erro 400: "redirect_uri_mismatch" ou "bad request"
- **Este é o erro mais comum!** A redirect URI não está autorizada no Google Cloud Console
- Siga estes passos EXATAMENTE:
  1. Acesse: https://console.cloud.google.com/apis/credentials
  2. Clique no seu OAuth 2.0 Client ID (o que você criou no Google Cloud Console)
  3. Role até a seção **"Authorized redirect URIs"** (URIs de redirecionamento autorizados)
  4. Clique em **"+ ADD URI"** (+ Adicionar URI)
  5. Adicione EXATAMENTE (copie e cole para evitar erros): 
     ```
     http://localhost:5173/oauth/callback/youtube
     ```
  6. **IMPORTANTE**: 
     - Use `http://` (não `https://`) para desenvolvimento
     - Use `localhost` (não `127.0.0.1`)
     - A porta deve ser `5173` (padrão do Vite)
     - O caminho deve ser `/oauth/callback/youtube` (com a barra inicial)
  7. ⚠️ **CRÍTICO**: Clique no botão **"SAVE"** (Salvar) no topo da página - as mudanças NÃO são salvas automaticamente!
  8. Aguarde 1-2 minutos para as mudanças propagarem (pode levar até 5 minutos)
  9. Feche e reabra o navegador (ou limpe o cache: Ctrl+Shift+Delete)
  10. Tente conectar novamente
- Se ainda não funcionar após salvar:
  - Abra o Console do navegador (F12) e veja os logs de debug que foram adicionados
  - Verifique se a URL gerada está correta
  - Verifique se você está rodando o servidor na porta correta:
    ```bash
    npm run dev
    ```
    A URL no navegador deve ser `http://localhost:5173`
  - Certifique-se de que a redirect URI no Google Cloud Console corresponde EXATAMENTE à URL no console do navegador

