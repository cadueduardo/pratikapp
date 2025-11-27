# Guia de Deploy - pratikapp.com.br

Este guia explica como fazer o build e deploy do pratikapp para o domínio pratikapp.com.br.

## 📋 Pré-requisitos

- Domínio configurado: pratikapp.com.br apontando para seu servidor
- Servidor web (Nginx, Apache, ou serviço de hospedagem)
- Acesso SSH ao servidor (se deploy manual)
- Variáveis de ambiente configuradas

## 🏗️ Passo 1: Build do Projeto

### 1.1 Verificar Variáveis de Ambiente

Certifique-se de que o arquivo `.env.local` (ou `.env.production`) está configurado com as variáveis de produção:

```env
VITE_SUPABASE_URL=https://gamjwsjtefwyxauizoty.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_YOUTUBE_CLIENT_ID=764045715484-o9ct89a4lk8ap4otqft3s2g0fkfr4aon.apps.googleusercontent.com
VITE_INSTAGRAM_APP_ID=seu-instagram-app-id (quando configurado)
VITE_TIKTOK_CLIENT_KEY=seu-tiktok-client-key (quando configurado)
```

### 1.2 Executar Build

```bash
npm run build
```

Isso gerará uma pasta `dist/` com os arquivos estáticos prontos para deploy.

### 1.3 Verificar Build

Para testar localmente o build de produção:

```bash
npm run preview
```

Isso iniciará um servidor local para você verificar se tudo está funcionando antes do deploy.

## 📤 Passo 2: Deploy

### Opção A: Deploy Manual (Servidor Próprio)

1. **Copiar arquivos para o servidor:**

```bash
# Usando SCP (Linux/Mac) ou WinSCP (Windows)
scp -r dist/* usuario@pratikapp.com.br:/var/www/pratikapp/
```

> **✅ IMPORTANTE**: O arquivo `.htaccess` já está incluído na pasta `public/` e será copiado automaticamente para `dist/` durante o build. Ele configura:
> - Redirecionamento de rotas para `index.html` (SPA mode)
> - Cache para arquivos estáticos
> - Compressão GZIP
> - Headers de segurança
> 
> Certifique-se de que o arquivo `.htaccess` esteja na raiz do diretório de deploy (junto com `index.html`).

2. **Configurar servidor web:**

#### Apache (com .htaccess)
O arquivo `.htaccess` já está configurado! Basta garantir que:
- O módulo `mod_rewrite` está habilitado
- O módulo `mod_expires` está habilitado (para cache)
- O módulo `mod_deflate` está habilitado (para compressão GZIP)
- O módulo `mod_headers` está habilitado (para headers de segurança)

#### Nginx (exemplo alternativo):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name pratikapp.com.br www.pratikapp.com.br;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pratikapp.com.br www.pratikapp.com.br;

    root /var/www/pratikapp;
    index index.html;

    # Certificado SSL (Let's Encrypt recomendado)
    ssl_certificate /etc/letsencrypt/live/pratikapp.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pratikapp.com.br/privkey.pem;

    # Configuração para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Páginas estáticas (termos e privacidade)
    location ~* \.(html)$ {
        expires 1h;
        add_header Cache-Control "public";
    }
}
```

> **Nota**: Para Apache, o arquivo `.htaccess` já está configurado e será copiado automaticamente para `dist/` durante o build. Você não precisa fazer nada além de garantir que os módulos necessários estão habilitados no Apache.

### Opção B: Deploy em Serviços de Hospedagem

#### Vercel (Recomendado - Gratuito)

1. Instale a CLI da Vercel:
```bash
npm i -g vercel
```

2. Faça login:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Configure domínio customizado no painel da Vercel.

#### Netlify

1. Instale a CLI do Netlify:
```bash
npm i -g netlify-cli
```

2. Deploy:
```bash
netlify deploy --prod --dir=dist
```

3. Configure domínio customizado no painel do Netlify.

#### GitHub Pages / Cloudflare Pages

Para projetos estáticos, estes serviços também funcionam bem.

## 🔒 Passo 3: Configurar HTTPS (Obrigatório para OAuth)

### Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d pratikapp.com.br -d www.pratikapp.com.br

# Renovação automática
sudo certbot renew --dry-run
```

## ✅ Passo 4: Verificar Deploy

Após o deploy, verifique:

1. **Site carregando:** https://pratikapp.com.br
2. **Páginas estáticas:**
   - https://pratikapp.com.br/termos-de-servico.html
   - https://pratikapp.com.br/privacidade.html
3. **Rotas funcionando:**
   - https://pratikapp.com.br/login
   - https://pratikapp.com.br/dashboard (após login)
4. **OAuth callbacks:**
   - https://pratikapp.com.br/oauth/callback/youtube
   - https://pratikapp.com.br/oauth/callback/tiktok

## 🔄 Passo 5: Atualizar Redirect URIs

Após o deploy, certifique-se de que todas as Redirect URIs estão configuradas:

### Google OAuth (YouTube)
- `https://pratikapp.com.br/oauth/callback/youtube`

### Instagram OAuth
- `https://pratikapp.com.br/oauth/callback/instagram`

### TikTok OAuth
- `https://pratikapp.com.br/oauth/callback/tiktok` ✅ Já configurado

## 📝 Checklist Final

- [ ] Build executado com sucesso (`npm run build`)
- [ ] Arquivos da pasta `dist/` copiados para o servidor
- [ ] Servidor web configurado (Nginx/Apache)
- [ ] HTTPS configurado (certificado SSL)
- [ ] Domínio apontando corretamente (DNS)
- [ ] Variáveis de ambiente configuradas no servidor (se necessário)
- [ ] Redirect URIs atualizadas nas plataformas OAuth
- [ ] Site acessível em https://pratikapp.com.br
- [ ] Páginas de Termos e Privacidade acessíveis
- [ ] OAuth callbacks funcionando

## 🐛 Troubleshooting

### Erro: "Página não encontrada" ao navegar entre rotas
- **Solução:** Configure o servidor web para redirecionar todas as rotas para `/index.html` (SPA mode)

### Erro: "Variáveis de ambiente não encontradas"
- **Solução:** As variáveis `VITE_*` são embutidas no build. Refaça o build após alterar variáveis.

### Erro: OAuth callback não funciona
- **Solução:** Verifique se a Redirect URI no TikTok/Google está exatamente como configurada (https://pratikapp.com.br/oauth/callback/[plataforma])

### Erro: Certificado SSL inválido
- **Solução:** Aguarde alguns minutos após configurar o certificado para propagação DNS completa.

## 📚 Próximos Passos

Após o deploy bem-sucedido:

1. Testar fluxo OAuth completo com TikTok
2. Configurar monitoramento e logs
3. Configurar CDN (opcional, para melhor performance)
4. Configurar backup automático
5. Configurar CI/CD para deploys automáticos

