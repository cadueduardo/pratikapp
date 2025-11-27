# Próximos Passos - pratikapp

## ✅ Status Atual

### OAuth Configurado
- ✅ **YouTube (Google OAuth)**: Configurado e funcionando
- ✅ **TikTok OAuth**: Configurado e funcionando
- ⏳ **Instagram OAuth**: Pendente (estrutura pronta, falta configurar)

### Infraestrutura
- ✅ Edge Functions deployadas (`oauth-exchange`, `store-oauth-tokens`)
- ✅ Sistema de armazenamento de tokens implementado
- ✅ Páginas de callback OAuth funcionando
- ✅ Build de produção configurado (`.htaccess` incluído)
- ✅ Deploy para pratikapp.com.br pronto

## 🎯 Próximos Passos Prioritários

### 1. Configurar Instagram OAuth (Pendente)

**Status**: Estrutura pronta, falta configurar credenciais

**Passos**:
1. Acesse o [Facebook Developers](https://developers.facebook.com/)
2. Crie um novo app ou selecione um existente
3. Adicione o produto **Instagram Graph API**
4. Vá em **Settings** > **Basic**
5. Anote o **App ID** e **App Secret**
6. Configure **Valid OAuth Redirect URIs**:
   - `https://pratikapp.com.br/oauth/callback/instagram`
7. Configure no Supabase:
   - Adicione `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` como secrets
   - Adicione `VITE_INSTAGRAM_APP_ID` no `.env.local` (frontend)

**⚠️ Importante**: Para publicar vídeos, você precisa de uma conta Business do Instagram conectada a uma página do Facebook.

**Documentação**: Veja `docs/oauth-setup-guide.md` seção 1.2

---

### 2. Implementar Upload Real de Vídeos

Após configurar OAuth para todas as plataformas, implementar upload real:

#### 2.1 YouTube (YouTube Data API v3)
- [ ] Implementar upload de vídeo usando tokens OAuth armazenados
- [ ] Adicionar metadados (título, descrição, tags, privacidade)
- [ ] Tratar erros e retry logic
- [ ] Atualizar status do post após upload bem-sucedido

#### 2.2 TikTok (TikTok Marketing API)
- [ ] Implementar upload de vídeo usando tokens OAuth armazenados
- [ ] Adicionar metadados (título, descrição, hashtags)
- [ ] Tratar erros e retry logic
- [ ] Atualizar status do post após upload bem-sucedido

#### 2.3 Instagram (Instagram Graph API)
- [ ] Implementar upload de vídeo usando tokens OAuth armazenados
- [ ] Adicionar metadados (legenda, hashtags)
- [ ] Tratar erros e retry logic
- [ ] Atualizar status do post após upload bem-sucedido

**Localização**: `src/services/socials.ts` e `supabase/functions/process-scheduled-videos/index.ts`

---

### 3. Integração com Google Drive ⭐ **PRIORITÁRIO**

**Status**: Mock implementado, falta implementação completa

**Requisitos do Usuário**:
1. ⏳ Conectar Google Drive (OAuth) - Estrutura pronta, falta implementar
2. ⏳ Ver pastas do Google Drive - Não implementado
3. ⏳ Procurar vídeo nas pastas - Não implementado
4. ⏳ Selecionar vídeo do Google Drive no agendamento - Não implementado
5. ⏳ Preview do vídeo (thumbnail em baixa qualidade) no formulário de agendamento - Não implementado

**O que precisa ser implementado**:
- [ ] Configurar Google Drive OAuth (pode reutilizar credenciais do YouTube)
- [ ] Implementar listagem de pastas do Google Drive
- [ ] Implementar busca de vídeos nas pastas
- [ ] Criar componente `GoogleDriveBrowser` para navegação
- [ ] Integrar seletor de vídeo no formulário de agendamento
- [ ] Implementar preview de vídeo (thumbnail) no formulário
- [ ] Mostrar preview também na lista de agendamentos
- [ ] Adicionar coluna `thumbnail_url` no banco (opcional)

**Localização**: 
- `src/services/googleDrive.ts` - Implementar funções reais
- `src/components/googleDrive/GoogleDriveBrowser.tsx` - Novo componente
- `src/pages/schedules/SchedulesPage.tsx` - Integrar seletor e preview

**Documentação completa**: Veja `docs/google-drive-integration-plan.md`

---

### 4. Atualizar Edge Function de Processamento

**Status**: Simula upload, precisa usar tokens reais

**Passos**:
- [ ] Atualizar `process-scheduled-videos` para usar tokens OAuth armazenados
- [ ] Implementar download do vídeo do Google Drive
- [ ] Chamar APIs reais de upload para cada plataforma
- [ ] Tratar erros e atualizar status adequadamente
- [ ] Adicionar logs detalhados

**Localização**: `supabase/functions/process-scheduled-videos/index.ts`

---

### 5. Refresh Automático de Tokens

**Status**: Não implementado

**Passos**:
- [ ] Implementar verificação de expiração de tokens
- [ ] Criar Edge Function para refresh de tokens
- [ ] Atualizar tokens automaticamente antes de expirar
- [ ] Tratar erros de refresh (reautenticação necessária)

---

### 6. Melhorias de UX/UI

#### 6.1 Feedback Visual
- [ ] Adicionar progress bar durante uploads
- [ ] Mostrar status em tempo real dos uploads
- [ ] Adicionar notificações push para eventos importantes
- [ ] Melhorar mensagens de erro para o usuário

#### 6.2 Preview de Vídeo
- [ ] Adicionar preview de vídeo antes do agendamento
- [ ] Validar formato e tamanho antes de agendar
- [ ] Mostrar thumbnail do vídeo

#### 6.3 Dashboard
- [ ] Adicionar gráficos de performance
- [ ] Mostrar estatísticas de engajamento (quando disponível)
- [ ] Adicionar filtros avançados

---

### 7. Segurança e Performance

#### 7.1 Segurança
- [ ] Migrar tokens para Supabase Vault (quando disponível)
- [ ] Implementar rate limiting
- [ ] Adicionar validação de entrada mais robusta
- [ ] Implementar CORS adequado

#### 7.2 Performance
- [ ] Implementar cache para queries frequentes
- [ ] Otimizar queries do banco de dados
- [ ] Adicionar paginação onde necessário
- [ ] Implementar lazy loading de componentes

---

### 8. Testes e Qualidade

- [ ] Adicionar testes unitários para componentes críticos
- [ ] Adicionar testes de integração para fluxos OAuth
- [ ] Adicionar testes E2E para fluxos principais
- [ ] Configurar CI/CD

---

### 9. Documentação

- [ ] Criar documentação PRD completa
- [ ] Documentar APIs e endpoints
- [ ] Criar guia de contribuição
- [ ] Adicionar exemplos de uso

---

## 📋 Checklist Rápido

### OAuth
- [x] YouTube configurado
- [x] TikTok configurado
- [ ] Instagram configurado

### Upload Real
- [ ] YouTube upload implementado
- [ ] TikTok upload implementado
- [ ] Instagram upload implementado

### Integrações
- [ ] Google Drive OAuth implementado
- [ ] Download de vídeos do Drive funcionando

### Edge Functions
- [ ] `process-scheduled-videos` usando tokens reais
- [ ] Upload real implementado
- [ ] Refresh de tokens automático

### UX/UI
- [ ] Progress bars durante uploads
- [ ] Preview de vídeos
- [ ] Notificações em tempo real

### Segurança
- [ ] Tokens no Supabase Vault
- [ ] Rate limiting
- [ ] Validações robustas

---

## 🚀 Ordem Sugerida de Implementação

1. **Configurar Instagram OAuth** (rápido, estrutura já pronta)
2. **Implementar upload real para TikTok** (já tem OAuth funcionando)
3. **Implementar upload real para YouTube** (já tem OAuth funcionando)
4. **Atualizar Edge Function** para usar uploads reais
5. **Implementar Google Drive OAuth** e download
6. **Implementar upload real para Instagram**
7. **Refresh automático de tokens**
8. **Melhorias de UX/UI**
9. **Testes e documentação**

---

## 📚 Documentação de Referência

- `docs/oauth-setup-guide.md` - Guia completo de OAuth
- `docs/deployment-guide.md` - Guia de deploy
- `docs/tiktok-oauth-debug.md` - Troubleshooting TikTok OAuth
- `README.md` - Visão geral do projeto

---

## 💡 Notas Importantes

- O Instagram requer conta Business e página do Facebook conectada
- TikTok não permite localhost nas Redirect URIs (use produção ou ngrok)
- Google Drive pode reutilizar as mesmas credenciais do YouTube OAuth
- Todos os `CLIENT_SECRET` devem ficar apenas no Supabase (Edge Functions)
- Tokens são armazenados na tabela `platforms` (preparado para migrar para Vault)

