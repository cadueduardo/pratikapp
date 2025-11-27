# Edge Function: Store OAuth Tokens

Esta Edge Function armazena tokens OAuth de forma segura, preparada para migração ao Supabase Vault.

## Uso

### Request

```json
{
  "platformId": "uuid-da-plataforma",
  "accessToken": "ya29.a0...",
  "refreshToken": "1//0g...",
  "expiresAt": 1234567890000,
  "tokenType": "Bearer"
}
```

### Response

```json
{
  "success": true,
  "message": "Tokens armazenados com sucesso"
}
```

## Segurança

- Valida que a plataforma pertence ao usuário autenticado
- Requer token JWT válido
- Preparado para migração ao Supabase Vault

## Migração Futura

Esta função está preparada para usar Supabase Vault:

```typescript
const vault = supabase.vault;
await vault.storeSecret(`platform_${platformId}_access_token`, accessToken);
await vault.storeSecret(`platform_${platformId}_refresh_token`, refreshToken);
```

Por enquanto, os tokens são armazenados como JSON no campo `api_token` da tabela `platforms`.








