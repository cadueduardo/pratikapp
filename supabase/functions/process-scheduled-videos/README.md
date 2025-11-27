# Edge Function: process-scheduled-videos

Esta Edge Function processa vídeos agendados que estão prontos para publicação.

## Funcionalidade

1. Busca vídeos com `scheduled_date <= now()` e `status = 'scheduled'` ou `'pending'`
2. Para cada vídeo, busca as plataformas configuradas do usuário
3. Cria registros de post para cada plataforma
4. Simula upload (por enquanto apenas log)
5. Atualiza status do vídeo e posts

## Deploy

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref <seu-project-ref>

# Deploy da função
supabase functions deploy process-scheduled-videos
```

## Configuração de Execução Periódica

### Opção 1: pg_cron (Recomendado)

Execute no SQL Editor do Supabase:

```sql
-- Criar função que chama a Edge Function
CREATE OR REPLACE FUNCTION public.process_scheduled_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response http_response;
BEGIN
  SELECT * INTO response
  FROM http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-scheduled-videos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Agendar execução a cada 5 minutos
SELECT cron.schedule(
  'process-scheduled-videos',
  '*/5 * * * *',
  $$SELECT public.process_scheduled_videos()$$
);
```

### Opção 2: Webhook Externo

Configure um serviço de cron job (ex: cron-job.org, EasyCron) para chamar:

```
POST https://<seu-projeto>.supabase.co/functions/v1/process-scheduled-videos
Headers:
  Authorization: Bearer <service-role-key>
  Content-Type: application/json
```

### Opção 3: Manual via API

```bash
curl -X POST \
  'https://<seu-projeto>.supabase.co/functions/v1/process-scheduled-videos' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json'
```

## Variáveis de Ambiente

A função precisa das seguintes variáveis de ambiente (configuradas automaticamente pelo Supabase):

- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (acesso total ao banco)

## Resposta

```json
{
  "message": "Processamento concluído",
  "total": 5,
  "processed": 4,
  "errors": ["Vídeo abc-123: Erro ao processar"]
}
```

## Próximos Passos

- [ ] Implementar upload real para YouTube
- [ ] Implementar upload real para Instagram
- [ ] Implementar upload real para TikTok
- [ ] Adicionar retry logic para falhas
- [ ] Adicionar notificações de sucesso/falha
- [ ] Melhorar logging e monitoramento










