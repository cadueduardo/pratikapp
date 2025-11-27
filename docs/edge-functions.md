# Edge Functions

Este documento descreve as Edge Functions do Supabase utilizadas no projeto.

## Funções Disponíveis

### process-scheduled-videos

Processa vídeos agendados que estão prontos para publicação.

**Localização:** `supabase/functions/process-scheduled-videos/`

**Funcionalidade:**
- Busca vídeos com `scheduled_date <= now()` e status `scheduled` ou `pending`
- Cria posts para cada plataforma configurada do usuário
- Simula upload (por enquanto)
- Atualiza status dos vídeos e posts

**Como usar:**
1. Faça deploy da função (veja README na pasta da função)
2. Configure execução periódica (pg_cron ou webhook externo)
3. A função será executada automaticamente e processará os vídeos agendados

**Documentação completa:** Veja `supabase/functions/process-scheduled-videos/README.md`

## Estrutura

```
supabase/
  functions/
    process-scheduled-videos/
      index.ts          # Código da função
      README.md         # Documentação específica
```

## Desenvolvimento Local

Para testar localmente:

```bash
# Iniciar Supabase localmente
supabase start

# Executar função localmente
supabase functions serve process-scheduled-videos
```

## Deploy

```bash
# Deploy de uma função específica
supabase functions deploy process-scheduled-videos

# Deploy de todas as funções
supabase functions deploy
```

## Variáveis de Ambiente

As Edge Functions têm acesso automático às seguintes variáveis:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Para adicionar variáveis customizadas, use:

```bash
supabase secrets set MY_SECRET_KEY=my_value
```










