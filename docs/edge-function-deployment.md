# Deploy e Configuração da Edge Function

## ✅ Status do Deploy

A Edge Function `process-scheduled-videos` foi deployada com sucesso!

- **Nome**: `process-scheduled-videos`
- **Status**: ACTIVE
- **Versão**: 1
- **URL**: `https://gamjwsjtefwyxauizoty.supabase.co/functions/v1/process-scheduled-videos`

## 📋 Configuração de Execução Periódica

### Opção 1: pg_cron (Recomendado - Já Configurado)

A execução periódica via `pg_cron` foi configurada na migration `install_pg_cron_and_schedule_edge_function`.

**Status Atual:**
- ✅ Extensão `pg_cron` instalada
- ✅ Extensão `pg_net` instalada
- ✅ Função `process_scheduled_videos()` criada
- ✅ Cron job agendado para executar a cada 5 minutos

**Verificar Status:**
```sql
-- Ver jobs agendados
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-videos';

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-videos')
ORDER BY start_time DESC 
LIMIT 10;
```

**Importante:** 
- O `pg_cron` precisa estar habilitado no Supabase Dashboard
- Vá em **Database > Extensions** e certifique-se de que `pg_cron` está ativo
- A função usa `pg_net` para fazer chamadas HTTP assíncronas

### Opção 2: Configurar Service Role Key (Recomendado para Produção)

Para produção, é recomendado configurar a `service_role_key` como secret do Supabase:

1. No Supabase Dashboard, vá em **Project Settings > Edge Functions > Secrets**
2. Adicione um secret chamado `SUPABASE_SERVICE_ROLE_KEY` com sua service role key
3. Atualize a função para usar o secret:

```sql
CREATE OR REPLACE FUNCTION public.process_scheduled_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url text := 'https://gamjwsjtefwyxauizoty.supabase.co';
  function_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Obter service_role_key do vault (se configurado)
  -- service_role_key := vault.get_secret('SUPABASE_SERVICE_ROLE_KEY');
  
  function_url := project_url || '/functions/v1/process-scheduled-videos';
  
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := '{}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'Chamada à Edge Function enviada. Request ID: %', request_id;
END;
$$;
```

### Opção 3: Webhook Externo

Se `pg_cron` não estiver disponível, você pode usar um serviço externo:

**Serviços Recomendados:**
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [GitHub Actions](https://github.com/features/actions)

**Configuração:**
```
URL: https://gamjwsjtefwyxauizoty.supabase.co/functions/v1/process-scheduled-videos
Método: POST
Headers:
  Authorization: Bearer <service-role-key>
  Content-Type: application/json
Body: {}
Frequência: A cada 5 minutos (*/5 * * * *)
```

## 🧪 Testar a Edge Function

### Via SQL
```sql
-- Executar manualmente
SELECT public.process_scheduled_videos();
```

### Via cURL
```bash
curl -X POST \
  'https://gamjwsjtefwyxauizoty.supabase.co/functions/v1/process-scheduled-videos' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Via JavaScript/TypeScript
```typescript
const response = await fetch(
  'https://gamjwsjtefwyxauizoty.supabase.co/functions/v1/process-scheduled-videos',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }
);

const result = await response.json();
console.log(result);
```

## 📊 Monitoramento

### Ver Logs da Edge Function
1. No Supabase Dashboard, vá em **Edge Functions > process-scheduled-videos**
2. Clique em **Logs** para ver as execuções

### Ver Status das Requisições HTTP (pg_net)
```sql
-- Ver requisições HTTP pendentes/completas
SELECT * FROM net.http_request_queue 
ORDER BY created_at DESC 
LIMIT 20;

-- Ver histórico de requisições
SELECT * FROM net.http_response 
ORDER BY created_at DESC 
LIMIT 20;
```

### Ver Histórico do Cron
```sql
-- Ver últimas execuções do cron job
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-videos')
ORDER BY start_time DESC
LIMIT 10;
```

## 🔧 Gerenciar o Cron Job

### Parar o Cron Job
```sql
SELECT cron.unschedule('process-scheduled-videos');
```

### Alterar Frequência
```sql
-- Remover job antigo
SELECT cron.unschedule('process-scheduled-videos');

-- Criar novo job com frequência diferente (ex: a cada 10 minutos)
SELECT cron.schedule(
  'process-scheduled-videos',
  '*/10 * * * *', -- A cada 10 minutos
  $$SELECT public.process_scheduled_videos()$$
);
```

### Frequências Comuns
- A cada 5 minutos: `*/5 * * * *`
- A cada 10 minutos: `*/10 * * * *`
- A cada hora: `0 * * * *`
- A cada 6 horas: `0 */6 * * *`
- Diariamente às 00:00: `0 0 * * *`

## ⚠️ Troubleshooting

### Cron Job não está executando
1. Verifique se `pg_cron` está habilitado no Dashboard
2. Verifique se o job existe: `SELECT * FROM cron.job WHERE jobname = 'process-scheduled-videos';`
3. Verifique os logs do cron: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Edge Function retorna erro
1. Verifique os logs da Edge Function no Dashboard
2. Verifique se as variáveis de ambiente estão configuradas
3. Teste a função manualmente via cURL ou SQL

### Requisições HTTP falhando
1. Verifique se `pg_net` está instalado: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
2. Verifique o status das requisições: `SELECT * FROM net.http_request_queue;`
3. Verifique se a URL da Edge Function está correta

## 📝 Próximos Passos

- [ ] Configurar `service_role_key` como secret do Supabase
- [ ] Adicionar monitoramento e alertas
- [ ] Implementar retry logic para falhas
- [ ] Adicionar notificações de sucesso/falha
- [ ] Implementar upload real para plataformas sociais








