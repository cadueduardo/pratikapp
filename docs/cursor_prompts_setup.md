# 📦 cursor_prompts_setup.md

## 🔧 1. Setup inicial do projeto

Crie um projeto React moderno com TypeScript, configurado como Progressive Web App (PWA) mobile-first.  
Use Vite como bundler e configure ESLint + Prettier.  
Adicione Material UI (MUI v6) e React Router.  
Estruture o projeto com as pastas:
/src/components
/src/pages
/src/services
/src/hooks
/src/utils
/src/assets
Configure o manifest.json e o service worker básico.
Aplique um layout responsivo padrão com tema claro/escuro do MUI.

---

## 🌐 2. Integração com Supabase

Instale e configure o SDK do Supabase.  
Crie o arquivo /src/services/supabaseClient.ts exportando a instância configurada com variáveis de ambiente.  
Garanta que o projeto lê as chaves via .env.  
Adicione README com explicação da conexão.

---

## 🧱 3. Modelagem e Banco de Dados

Crie as tabelas no Supabase:

users (id, name, email, avatar_url, created_at)
videos (id, user_id, title, description, url_drive, scheduled_date, status)
platforms (id, name, api_token, user_id)
posts (id, video_id, platform_id, status, posted_at, error_message)

Documente relacionamentos e gere script SQL inicial.
Implemente funções no SDK para manipular essas tabelas.

---

## 🔐 4. Autenticação

Implemente autenticação com Supabase Auth (email + senha e OAuth Google).  
Crie páginas /login e /signup com Material UI.  
Após login, redirecione para /dashboard.  
Armazene usuário logado em AuthContext e crie hook useAuth.  
Adicione feedback visual com MUI Snackbar e LoadingButton.

---

## 📱 5. Layout e Navegação

Crie layout mobile-first:

- Header fixo com menu hamburger;
- Drawer lateral com links: Dashboard, Agendamentos, Configurações.
  Use Material UI AppBar, Drawer e Typography.
  Configure React Router com rotas /login, /signup, /dashboard, /settings.

---

## ☁️ 6. Integração Google Drive (pré-etapa)

Crie módulo /src/services/googleDrive.ts com funções:

- Autenticar via OAuth;
- Listar vídeos em uma pasta específica;
- Retornar metadados (nome, tamanho, data).
  Por enquanto use placeholders (mock).
  Documente fluxo OAuth e dependências.

---

## 📤 7. Estrutura para redes sociais

Crie /src/services/socials.ts com assinaturas para:

- uploadToYouTube(videoUrl)
- uploadToInstagram(videoUrl)
- uploadToTikTok(videoUrl)
  Apenas registre logs (console.log).  
  Documente onde as chaves de API serão configuradas futuramente.

---

## ⏰ 8. Agendamento e publicação simulada

Crie função Edge no Supabase que roda periodicamente:

- Verifica vídeos com scheduled_date <= now() e status = 'pending'
- Simula upload (log)
- Atualiza status para 'posted'
  Descreva o fluxo e mostre como conectar o painel React (status de postagens).

---

## 📋 9. Regras do Projeto (.cursor/rules)

Gere arquivo .cursor/rules/project.md com:

- Linguagem: TypeScript + React + Supabase
- UI: Material UI, mobile-first
- Convenções: ESLint + Prettier, Hooks, funções puras
- Evitar duplicações (reutilizar hooks e serviços existentes)
- Padrão de importação absoluta @/
- Regras de commits (mensagens curtas e descritivas)
- Nenhum arquivo > 300 linhas
- Sempre documentar novas funcionalidades

---

## 📘 10. PRD e plano de desenvolvimento

Gere /docs/PRD.md com:

- Visão geral
- Funcionalidades principais
- Stack e integrações
- Requisitos não funcionais
- Marcos de desenvolvimento (fases)
- Fluxos principais (upload, agendamento, publicação)
  Formato Markdown, bem organizado.
