# pratikapp

Aplicativo PWA para gerenciamento de uploads e agendamentos de vídeos em múltiplas plataformas sociais, construído com React, TypeScript, Vite, Material UI e Supabase.

## 🚀 Tecnologias principais

- React 19 + TypeScript
- Vite 7 com plugin PWA (`vite-plugin-pwa`)
- Material UI v6
- React Router 7
- Supabase (Auth, Database, Edge Functions)
- ESLint + Prettier

## 📦 Setup do projeto

```bash
npm install
npm run dev
```

### Variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha com as chaves do projeto Supabase:

```
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave-anon>
```

> **Importante:** As variáveis começam com `VITE_` para que o Vite as exponha em tempo de build.

## 🔗 Conexão com Supabase

O cliente Supabase é inicializado em `src/services/supabaseClient.ts`:

- Lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` via `import.meta.env`
- Valida a presença das variáveis e lança erro em modo de desenvolvimento caso estejam ausentes
- Exporta a instância `supabaseClient` pronta para ser reutilizada em hooks, services e páginas

## 🧱 Estrutura de pastas

```
src/
  components/
  hooks/
  layouts/
  pages/
  routes/
  services/
  theme/
  utils/
```

## 🧪 Scripts disponíveis

| Script            | Descrição                                     |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Inicia o ambiente de desenvolvimento          |
| `npm run lint`    | Executa o ESLint com as regras do projeto     |
| `npm run build`   | Gera build de produção com suporte PWA        |
| `npm run preview` | Servidor local para inspecionar o build final |

## 🔐 Autenticação disponível

- `AuthProvider` (`src/hooks/useAuth.tsx`) gerencia sessão do Supabase (login, cadastro, logout, Google OAuth).
- Páginas públicas:
  - `/login`: formulário com validação, feedback visual e botão “Continuar com Google”.
  - `/signup`: cadastro com metadados (nome) e mensagens de confirmação de e-mail quando necessário.
- Rotas protegidas via `ProtectedRoute` impedem acesso ao `/dashboard` sem sessão válida.
- Componentes reutilizáveis em `src/components/auth` (layout, campos, botões e snackbar) facilitam novos fluxos de autenticação.

> **Google OAuth**: é preciso configurar o provedor no painel do Supabase (client ID/secret e redirect URL). Sem isso o botão renderiza, mas o fluxo não se completa.

## ✅ Funcionalidades Implementadas

### 🔐 Autenticação
- ✅ Login e cadastro com email/senha
- ✅ Autenticação via Google OAuth
- ✅ Proteção de rotas com `ProtectedRoute`
- ✅ Gerenciamento de sessão com `AuthProvider`
- ✅ Componentes reutilizáveis de autenticação

### 📱 Layout e Navegação
- ✅ Layout responsivo mobile-first com Material UI
- ✅ AppBar fixo com menu hamburger
- ✅ Drawer lateral com navegação
- ✅ Suporte a tema claro/escuro
- ✅ Rotas protegidas: `/dashboard`, `/schedules`, `/settings`

### 📊 Dashboard
- ✅ Visão geral com estatísticas:
  - Total de vídeos
  - Vídeos agendados
  - Postagens pendentes
  - Postagens publicadas
- ✅ Próximos agendamentos (próximos 3 vídeos futuros)
- ✅ Distribuição de status dos vídeos
- ✅ Lista de vídeos recentes (últimos 5) - clicável para detalhes
- ✅ Lista de postagens pendentes (últimos 5)
- ✅ Status chips com cores do tema
- ✅ Cards interativos com navegação para detalhes
- ✅ Loading states e tratamento de erros

### ⚙️ Configurações (`/settings`)
- ✅ Gerenciamento de perfil (editar nome)
- ✅ Gerenciamento de plataformas:
  - Listar plataformas configuradas
  - Adicionar nova plataforma
  - Editar plataforma existente
  - Remover plataforma com confirmação elegante
  - Configurar tokens de API
- ✅ Interface com abas (Perfil / Plataformas)
- ✅ Validação de formulários
- ✅ Notificações globais para feedback de ações

### 📅 Agendamentos (`/schedules`)
- ✅ Lista de vídeos agendados e rascunhos
- ✅ **Busca em tempo real** por título ou descrição
- ✅ **Filtros por status** com chips interativos
- ✅ **Ordenação** por data, título, status ou data de criação (ascendente/descendente)
- ✅ Criar novo agendamento:
  - Título, descrição, URL do Google Drive
  - Data e hora de agendamento (opcional)
  - Status automático (scheduled/draft)
- ✅ Editar agendamento existente
- ✅ Remover agendamento com confirmação elegante
- ✅ Botão "Ver detalhes" em cada vídeo
- ✅ Organização por status (Agendados / Rascunhos / Outros)
- ✅ Formatação de datas em português
- ✅ Contador de resultados encontrados

### 🗄️ Banco de Dados
- ✅ Schema completo implementado:
  - Tabelas: `users`, `videos`, `platforms`, `posts`
  - Enums: `video_status`, `post_status`
  - Relacionamentos e índices
  - View agregada `video_post_status`
- ✅ Repositórios TypeScript para todas as tabelas
- ✅ Tipos TypeScript gerados automaticamente

### ☁️ Serviços
- ✅ `googleDrive.ts` - Integração Google Drive (mock)
  - Funções: autenticação, listagem, metadados
  - Documentação sobre OAuth e próximos passos
- ✅ `socials.ts` - Integração redes sociais (placeholders)
  - Funções: `uploadToYouTube()`, `uploadToInstagram()`, `uploadToTikTok()`
  - Documentação sobre configuração de APIs

### ⚡ Edge Functions
- ✅ `process-scheduled-videos` - Processamento automático
  - Busca vídeos agendados prontos para publicação
  - Cria posts para cada plataforma configurada
  - Simula upload (preparado para implementação real)
  - Atualiza status dos vídeos e posts
  - Documentação completa com opções de execução periódica

### 🎨 Componentes Reutilizáveis
- ✅ `NotificationProvider` - Sistema de notificações global
- ✅ `StatusChip` - Componente de status reutilizável
- ✅ `ConfirmDialog` - Dialog de confirmação reutilizável
- ✅ Componentes de autenticação (`AuthLayout`, `AuthTextField`, `AuthActions`, `AuthSnackbar`)

### 📄 Páginas Adicionais
- ✅ `/forgot-password` - Recuperação de senha
- ✅ `/videos/:id` - Visualização detalhada de vídeo com histórico de postagens

### 📚 Documentação
- ✅ `docs/database.md` - Modelagem de dados
- ✅ `docs/edge-functions.md` - Documentação das Edge Functions
- ✅ `docs/oauth-setup-guide.md` - **Guia passo a passo para configurar OAuth**
- ✅ `supabase/functions/process-scheduled-videos/README.md` - Guia da função
- ✅ `.cursor/rules/agent_guidelines.md` - Diretrizes do projeto

## 📘 Próximas etapas sugeridas

### 🔴 Prioridade Alta - Correções e Melhorias Imediatas
- [x] Corrigir warnings do Material UI Grid (remover props deprecadas `item`, `xs`, `sm`, `md`)
- [x] Corrigir warning do Tooltip com botão desabilitado (envolver em `<span>`)
- [x] Testar e validar formato brasileiro de data/hora (DD/MM/YYYY HH:mm)
- [x] Corrigir loading infinito nas seções de perfil e plataformas

### 🟡 Prioridade Média - Funcionalidades Principais
- [x] **Refatorar tela de plataformas:**
  - [x] Adicionar seletor de plataforma (YouTube, Instagram, TikTok)
  - [x] Remover campo de token manual
  - [x] Implementar botão "Conectar com [Plataforma]" (UI pronta)
  - [x] Mostrar status de conexão (conectado/não conectado)
  - [x] Implementar opção de desconectar (UI pronta)
  - [x] **Adicionar fluxo OAuth 2.0 para cada plataforma** (estrutura base implementada)
    - [x] Serviço OAuth criado (`src/services/oauth.ts`)
    - [x] Página de callback OAuth (`src/pages/oauth/OAuthCallbackPage.tsx`)
    - [x] Edge Function para trocar código por tokens (`supabase/functions/oauth-exchange`)
    - [x] Integração com `handleConnectPlatform`
    - [x] YouTube OAuth configurado e funcionando
    - [x] TikTok OAuth configurado e funcionando
    - [ ] Instagram OAuth (estrutura pronta, falta configurar credenciais)
  - [x] **Armazenar tokens de forma segura** (estrutura implementada)
    - [x] Edge Function `store-oauth-tokens` criada
    - [x] Callback OAuth atualizado para usar Edge Function
    - [x] Utilitários de token storage criados (`src/services/database/tokenStorage.ts`)
    - [ ] Migrar para Supabase Vault (preparado, aguardando configuração)
- [ ] Implementar autenticação real do Google Drive (OAuth 2.0)
- [ ] Implementar upload real para YouTube (YouTube Data API v3)
- [ ] Implementar upload real para Instagram (Instagram Graph API)
- [ ] Implementar upload real para TikTok (TikTok Marketing API)
- [ ] Atualizar Edge Function para usar tokens OAuth armazenados

### 🟢 Prioridade Baixa - Melhorias e Otimizações
- [ ] Adicionar paginação ou lazy loading se necessário
- [ ] Adicionar atalhos de teclado (keyboard shortcuts)
- [ ] Melhorar feedback visual durante uploads
- [ ] Adicionar preview de vídeo antes do agendamento
- [ ] Criar documentação PRD completa
- [ ] Adicionar testes unitários para componentes críticos
- [ ] Otimizar queries do banco de dados
- [ ] Implementar cache quando necessário
