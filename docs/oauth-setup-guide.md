# Guia de Configuração OAuth - Passo a Passo

Este guia explica como configurar o OAuth 2.0 para YouTube, Instagram e TikTok, e fazer o deploy das Edge Functions.

## 📋 Pré-requisitos

- Conta no Supabase com projeto criado
- Conta Google (para YouTube)
- Conta Facebook/Instagram (para Instagram)
- Conta TikTok Developer (para TikTok)
- Supabase CLI instalado e configurado

## 🔧 Passo 1: Configurar OAuth nas Plataformas

### 1.1 YouTube (Google OAuth)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: PratikApp (ou o nome que preferir)
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (desenvolvimento)
     - `https://seu-dominio.com` (produção)
   - **Authorized redirect URIs**:
     - `http://localhost:5173/oauth/callback/youtube` (desenvolvimento)
     - `https://seu-dominio.com/oauth/callback/youtube` (produção)
6. Anote o **Client ID** e **Client Secret** gerados

### 1.2 Instagram (Facebook OAuth)

1. Acesse o [Facebook Developers](https://developers.facebook.com/)
2. Crie um novo app ou selecione um existente
3. Adicione o produto **Instagram Graph API**
4. Vá em **Settings** > **Basic**
5. Anote o **App ID** e **App Secret**
6. Configure **Valid OAuth Redirect URIs**:
   - `http://localhost:5173/oauth/callback/instagram` (desenvolvimento)
   - `https://seu-dominio.com/oauth/callback/instagram` (produção)
7. **Importante**: Para publicar vídeos, você precisa de uma conta Business do Instagram conectada a uma página do Facebook

### 1.3 TikTok

1. Acesse o [TikTok Developers Portal](https://developers.tiktok.com/)
2. Crie uma nova aplicação
3. Configure:
   - **Redirect URI**:
     - ⚠️ **IMPORTANTE**: O TikTok **NÃO permite localhost** nas Redirect URIs
     - Para desenvolvimento, você pode usar:
       - **Opção 1**: Configurar apenas a URL de produção `https://pratikapp.com.br/oauth/callback/tiktok` e testar após deploy
       - **Opção 2**: Usar um túnel público como ngrok (ver seção abaixo)
     - Para produção: `https://pratikapp.com.br/oauth/callback/tiktok`
   - **Scopes**: `video.upload`, `user.info.basic`
4. Anote o **Client Key** e **Client Secret**

#### Desenvolvimento com ngrok (Opcional)

Se você precisar testar localmente antes do deploy, use ngrok:

1. Instale o ngrok: https://ngrok.com/download
2. Inicie seu servidor local: `npm run dev` (porta 5173)
3. Em outro terminal, execute:
   ```bash
   ngrok http 5173
   ```
4. Copie a URL HTTPS fornecida pelo ngrok (ex: `https://abc123.ngrok.io`)
5. Adicione no TikTok Developer Portal:
   ```
   https://abc123.ngrok.io/oauth/callback/tiktok
   ```
6. ⚠️ **Nota**: A URL do ngrok muda a cada execução (exceto em planos pagos), então você precisará atualizar no TikTok cada vez que reiniciar o ngrok.

## 🔐 Passo 2: Configurar Variáveis de Ambiente no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá em **Project Settings** > **Edge Functions** > **Secrets**
4. Adicione as seguintes variáveis de ambiente:

```
YOUTUBE_CLIENT_ID=seu-youtube-client-id
YOUTUBE_CLIENT_SECRET=seu-youtube-client-secret
INSTAGRAM_APP_ID=seu-instagram-app-id
INSTAGRAM_APP_SECRET=seu-instagram-app-secret
TIKTOK_CLIENT_KEY=seu-tiktok-client-key
TIKTOK_CLIENT_SECRET=seu-tiktok-client-secret
```

**Alternativamente**, você pode configurar via CLI:

```bash
supabase secrets set YOUTUBE_CLIENT_ID=seu-youtube-client-id
supabase secrets set YOUTUBE_CLIENT_SECRET=seu-youtube-client-secret
supabase secrets set INSTAGRAM_APP_ID=seu-instagram-app-id
supabase secrets set INSTAGRAM_APP_SECRET=seu-instagram-app-secret
supabase secrets set TIKTOK_CLIENT_KEY=seu-tiktok-client-key
supabase secrets set TIKTOK_CLIENT_SECRET=seu-tiktok-client-secret
```

## 📦 Passo 3: Configurar Variáveis de Ambiente no Frontend

1. No arquivo `.env` do projeto (crie se não existir), adicione:

```env
VITE_YOUTUBE_CLIENT_ID=seu-youtube-client-id
VITE_INSTAGRAM_APP_ID=seu-instagram-app-id
VITE_TIKTOK_CLIENT_KEY=seu-tiktok-client-key
```

**⚠️ IMPORTANTE**: Nunca coloque os `CLIENT_SECRET` no frontend! Eles devem ficar apenas no Supabase (Edge Functions).

2. Reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## 🚀 Passo 4: Fazer Deploy das Edge Functions

### 4.1 Instalar Supabase CLI (se ainda não tiver)

```bash
# Windows (PowerShell)
irm https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip -OutFile supabase.zip
Expand-Archive supabase.zip -DestinationPath .
# Adicione ao PATH

# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/
```

### 4.2 Login no Supabase CLI

```bash
supabase login
```

### 4.3 Linkar o projeto

```bash
supabase link --project-ref seu-project-ref
```

O `project-ref` pode ser encontrado em **Project Settings** > **General** > **Reference ID**

### 4.4 Fazer deploy das Edge Functions

```bash
# Deploy da função oauth-exchange
supabase functions deploy oauth-exchange

# Deploy da função store-oauth-tokens
supabase functions deploy store-oauth-tokens
```

### 4.5 Verificar se o deploy foi bem-sucedido

No Supabase Dashboard, vá em **Edge Functions** e verifique se ambas as funções aparecem na lista.

## ✅ Passo 5: Testar o Fluxo OAuth

1. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

2. Acesse `http://localhost:5173` e faça login
3. Vá em **Configurações** > **Plataformas**
4. Clique em **Adicionar plataforma** e selecione uma plataforma (ex: YouTube)
5. Clique em **Adicionar**
6. Clique em **Conectar** na plataforma adicionada
7. Você será redirecionado para a página de autorização da plataforma
8. Autorize o acesso
9. Você será redirecionado de volta para a aplicação
10. A plataforma deve aparecer como "Conectado"

## 🐛 Troubleshooting

### Erro: "Client ID não configurado"

- Verifique se as variáveis `VITE_YOUTUBE_CLIENT_ID`, `VITE_INSTAGRAM_APP_ID`, `VITE_TIKTOK_CLIENT_KEY` estão no `.env`
- Reinicie o servidor de desenvolvimento após adicionar variáveis

### Erro: "Credenciais OAuth não configuradas"

- Verifique se as variáveis de ambiente estão configuradas no Supabase (Edge Functions > Secrets)
- Certifique-se de que fez o deploy das Edge Functions após configurar os secrets

### Erro: "redirect_uri_mismatch"

- Verifique se a URL de callback configurada na plataforma OAuth corresponde exatamente à URL da aplicação
- Para desenvolvimento: `http://localhost:5173/oauth/callback/[plataforma]`
- Para produção: `https://seu-dominio.com/oauth/callback/[plataforma]`

### Erro: "State inválido"

- Limpe o `sessionStorage` do navegador
- Tente conectar novamente

### Edge Function não encontrada

- Verifique se o deploy foi bem-sucedido: `supabase functions list`
- Verifique se o `project-ref` está correto: `supabase projects list`

## 📝 Checklist Final

- [ ] Credenciais OAuth criadas em todas as plataformas (YouTube, Instagram, TikTok)
- [ ] Redirect URIs configurados corretamente
- [ ] Variáveis de ambiente configuradas no Supabase (Edge Functions > Secrets)
- [ ] Variáveis de ambiente configuradas no frontend (`.env`)
- [ ] Supabase CLI instalado e logado
- [ ] Projeto linkado ao Supabase
- [ ] Edge Functions deployadas (`oauth-exchange` e `store-oauth-tokens`)
- [ ] Fluxo OAuth testado para pelo menos uma plataforma

## 🔒 Segurança

- ✅ `CLIENT_SECRET` nunca é exposto no frontend
- ✅ Tokens são armazenados via Edge Function (preparado para Supabase Vault)
- ✅ Validação de state para prevenir CSRF
- ✅ Validação de autenticação do usuário antes de armazenar tokens

## 📚 Próximos Passos

Após configurar o OAuth:

1. Testar upload real de vídeos para cada plataforma
2. Implementar refresh automático de tokens
3. Migrar tokens para Supabase Vault (quando disponível)
4. Adicionar logs e monitoramento

