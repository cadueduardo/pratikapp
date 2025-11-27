# Migrations do Supabase

Este diretório contém as migrations SQL do banco de dados.

## ⚠️ IMPORTANTE: Aplicar Migrations

**ERRO 400 ao criar vídeo?** As colunas abaixo ainda não foram criadas no banco de dados. Você precisa aplicar as migrations primeiro!

### 🚀 Aplicar Todas as Migrations (Recomendado)

1. **Via Supabase Dashboard:**
   - Acesse: https://supabase.com/dashboard/project/gamjwsjtefwyxauizoty/sql/new
   - Copie o conteúdo do arquivo **`apply_all_new_columns.sql`**
   - Cole no editor SQL
   - Clique em **"Run"** (Executar)
   - Aguarde a confirmação de sucesso

2. **Ou aplique individualmente:**
   - `add_selected_platform_ids.sql` - Adiciona coluna `selected_platform_ids`
   - `add_media_type.sql` - Adiciona colunas `media_type` e `platform_media_types`

### 📋 O que será criado:

1. **`selected_platform_ids`** (TEXT[]): Array de IDs das plataformas selecionadas para publicação
2. **`media_type`** (TEXT): Tipo de mídia principal (ex: instagram-reels, youtube-shorts)
3. **`platform_media_types`** (JSONB): Mapeamento de tipo de mídia por plataforma (ex: {"youtube": "youtube-shorts"})

### ⚡ Aplicar via Supabase CLI (Alternativa):

```bash
# Linkar ao projeto (se ainda não fez)
supabase link --project-ref gamjwsjtefwyxauizoty

# Aplicar migrations
supabase db push
```

### ✅ Verificar se as colunas foram criadas:

Execute no SQL Editor do Supabase:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'videos' 
  AND column_name IN ('selected_platform_ids', 'media_type', 'platform_media_types');
```

Você deve ver as 3 colunas listadas.

