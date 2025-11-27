# Debug do TikTok OAuth - Erro 500

## 🔍 Verificar Logs da Edge Function

O erro 500 indica que há um problema na Edge Function `oauth-exchange`. Para ver os logs detalhados:

### Via Supabase Dashboard:
1. Acesse [Supabase Dashboard](https://app.supabase.com/)
2. Vá em **Edge Functions** > **oauth-exchange**
3. Clique na aba **Logs**
4. Procure pelos logs mais recentes da execução

### Via Supabase CLI:
```bash
supabase functions logs oauth-exchange --follow
```

## ✅ Verificar Secrets Configurados

A causa mais comum do erro 500 é a falta de secrets configurados no Supabase.

### Verificar secrets configurados:
1. No Supabase Dashboard, vá em **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique se as seguintes variáveis estão configuradas:

```
TIKTOK_CLIENT_KEY=sbaw66z8lqfrmoyg40
TIKTOK_CLIENT_SECRET=SxnqkCUR3rJyTHEZQhNyyDnySFieMxE8
```

### Configurar via CLI:
```bash
# Verificar secrets existentes
supabase secrets list

# Configurar secrets do TikTok
supabase secrets set TIKTOK_CLIENT_KEY=sbaw66z8lqfrmoyg40
supabase secrets set TIKTOK_CLIENT_SECRET=SxnqkCUR3rJyTHEZQhNyyDnySFieMxE8
```

## 🚀 Fazer Deploy da Edge Function Atualizada

Após verificar/configurar os secrets, faça o deploy da Edge Function atualizada (com logs melhorados):

```bash
supabase functions deploy oauth-exchange
```

## 📋 Checklist de Verificação

- [ ] Secrets `TIKTOK_CLIENT_KEY` e `TIKTOK_CLIENT_SECRET` configurados no Supabase
- [ ] Edge Function `oauth-exchange` deployada
- [ ] Redirect URI no TikTok Developer Portal: `https://pratikapp.com.br/oauth/callback/tiktok`
- [ ] Redirect URI no código corresponde exatamente ao configurado no TikTok
- [ ] Variável `VITE_TIKTOK_CLIENT_KEY` no `.env.local` (frontend)

## 🐛 Possíveis Causas do Erro 500

1. **Secrets não configurados**: As variáveis `TIKTOK_CLIENT_KEY` e `TIKTOK_CLIENT_SECRET` não estão no Supabase
2. **Redirect URI mismatch**: A redirect URI não corresponde exatamente entre TikTok Portal e código
3. **Código inválido/expirado**: O código OAuth pode ter expirado ou ser inválido
4. **Erro na API do TikTok**: A API do TikTok pode estar retornando um erro

## 📊 Verificar Logs após Deploy

Após fazer o deploy da Edge Function atualizada, os logs devem mostrar:

```
Credenciais OAuth: {
  platform: 'tiktok',
  clientIdEnvKey: 'TIKTOK_CLIENT_KEY',
  clientSecretEnvKey: 'TIKTOK_CLIENT_SECRET',
  clientIdPresent: true/false,
  clientSecretPresent: true/false,
  ...
}

Requisição OAuth Exchange: {
  platform: 'tiktok',
  codePresent: true/false,
  redirectUri: '...',
  ...
}
```

Se `clientIdPresent` ou `clientSecretPresent` for `false`, o problema são os secrets não configurados.

## 🔗 Links Úteis

- [TikTok Developer Portal](https://developers.tiktok.com/)
- [TikTok OAuth Documentation](https://developers.tiktok.com/doc/oauth-overview/)
- [Supabase Edge Functions Logs](https://app.supabase.com/project/_/functions)




