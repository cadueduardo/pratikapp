# Configuração Google Drive - Passo a Passo

Este documento descreve a configuração completa do Google Drive para o PratikApp.

## ✅ Pré-requisitos

- Conta Google
- Projeto no Google Cloud Console
- OAuth 2.0 Client ID já configurado (reutiliza as credenciais do YouTube)

## 🔧 Passo 1: Habilitar Google Drive API

**IMPORTANTE**: A Google Drive API **DEVE** estar habilitada no seu projeto**.

### 1.1 Acessar o Console do Google Cloud

1. Acesse: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=764045715484
   - Ou acesse: https://console.cloud.google.com/apis/library/drive.googleapis.com
   - Certifique-se de que o projeto `764045715484` está selecionado

2. Clique no botão **"ENABLE"** (Habilitar)

3. Aguarde 1-2 minutos para a API ser ativada

### 1.2 Verificar se está habilitada

1. Acesse: https://console.cloud.google.com/apis/dashboard?project=764045715484
2. Procure por **"Google Drive API"** na lista de APIs habilitadas
3. Deve aparecer com status **"ENABLED"** (Habilitada)

---

## 🔐 Passo 2: Configurar Redirect URI

A Redirect URI do Google Drive precisa estar configurada no OAuth 2.0 Client ID.

### 2.1 Acessar Credenciais OAuth

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Clique no OAuth 2.0 Client ID: `764045715484-o9ct89a4lk8ap4otqft3s2g0fkfr4aon.apps.googleusercontent.com`

### 2.2 Adicionar Redirect URI

1. Role até a seção **"Authorized redirect URIs"** (URIs de redirecionamento autorizados)
2. Clique em **"+ ADD URI"** (+ Adicionar URI)
3. Adicione EXATAMENTE (copie e cole):

**Desenvolvimento:**
```
http://localhost:5173/oauth/callback/google-drive
```

**Produção:**
```
https://pratikapp.com.br/oauth/callback/google-drive
```

4. ⚠️ **CRÍTICO**: Clique no botão **"SAVE"** (Salvar) no topo da página

5. Aguarde 1-2 minutos para as mudanças propagarem

---

## 📋 Checklist de Configuração

- [ ] Google Drive API habilitada no Google Cloud Console
- [ ] Redirect URI `http://localhost:5173/oauth/callback/google-drive` adicionada (desenvolvimento)
- [ ] Redirect URI `https://pratikapp.com.br/oauth/callback/google-drive` adicionada (produção)
- [ ] Redirect URIs salvas (botão SAVE clicado)
- [ ] OAuth 2.0 Client ID configurado (reutiliza credenciais do YouTube)

---

## 🚨 Erros Comuns e Soluções

### Erro 403: "Google Drive API has not been used in project before or it is disabled"

**Causa**: A Google Drive API não está habilitada no projeto.

**Solução**:
1. Acesse: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=764045715484
2. Clique em **"ENABLE"**
3. Aguarde 1-2 minutos
4. Tente novamente

### Erro 400: "redirect_uri_mismatch"

**Causa**: A Redirect URI não está configurada corretamente no Google Cloud Console.

**Solução**:
1. Verifique se adicionou a Redirect URI exatamente como: `http://localhost:5173/oauth/callback/google-drive`
2. Certifique-se de ter clicado em **"SAVE"** (Salvar)
3. Aguarde 1-2 minutos para propagar

### Erro ao listar pastas: "Google Drive não está conectado"

**Causa**: O usuário não conectou o Google Drive via OAuth.

**Solução**:
1. Vá em **Configurações** > **Plataformas**
2. Clique em **"Conectar com Google Drive"**
3. Autorize o acesso
4. Tente novamente

---

## 🔗 Links Úteis

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google Cloud Console - APIs & Services](https://console.cloud.google.com/apis/dashboard?project=764045715484)
- [OAuth 2.0 Credentials](https://console.cloud.google.com/apis/credentials)

---

## ✅ Após Configurar

Depois de habilitar a API e configurar as Redirect URIs:

1. ✅ Conecte o Google Drive em **Configurações** > **Plataformas**
2. ✅ Acesse a página de **Agendamentos**
3. ✅ Clique em **"Selecionar"** ao lado do campo URL do Google Drive
4. ✅ Navegue pelas suas pastas e selecione um vídeo
5. ✅ O preview do vídeo aparecerá automaticamente

---

## 📝 Notas Importantes

- A Google Drive API usa as **mesmas credenciais OAuth do YouTube** (reutiliza o mesmo Client ID)
- Os scopes necessários são:
  - `https://www.googleapis.com/auth/drive.readonly` (ler arquivos)
  - `https://www.googleapis.com/auth/drive.metadata.readonly` (ler metadados)
- O Google Drive permite visualizar thumbnails de vídeos automaticamente
- O preview usa thumbnails em baixa qualidade (`w200-h200`) para melhor performance



