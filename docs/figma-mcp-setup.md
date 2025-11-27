# Configuração do MCP do Figma no Cursor

Este guia explica como conectar o plugin "Cursor Talk To Figma MCP Plugin" ao Cursor usando o servidor WebSocket.

## 📋 Pré-requisitos

- Figma Desktop instalado e atualizado
- Bun instalado (para executar `bunx`)
- Cursor instalado e atualizado

## 🔧 Passo a Passo

### 1. Instalar o Bun (se necessário)

Se você não tiver o Bun instalado, instale primeiro:

**Windows (PowerShell):**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Ou baixe o instalador em: https://bun.sh

Após instalar, reinicie o terminal e verifique com:
```powershell
bun --version
```

### 3. Iniciar o Servidor WebSocket

O plugin do Figma precisa de um servidor WebSocket rodando localmente. Execute o seguinte comando no terminal:

```powershell
bunx cursor-talk-to-figma-socket
```

**Importante:** 
- Deixe este terminal aberto enquanto usar o plugin
- O servidor ficará escutando na porta **3055** (padrão)
- Se necessário, você pode especificar uma porta diferente adicionando um argumento

**Alternativa (se não usar Bun):**
Se preferir usar npm/npx:
```powershell
npx cursor-talk-to-figma-socket
```

### 4. Configurar o Plugin no Figma

1. No Figma Desktop, abra o arquivo de design
2. Abra o plugin "Cursor Talk To Figma MCP Plugin"
3. Na aba **Connection**, verifique se a porta está configurada como **3055** (ou a porta que você está usando)
4. Clique no botão **Connect**

### 5. Verificar a Conexão

Após clicar em "Connect", o status deve mudar de "Disconnected from server" para "Connected". Se isso não acontecer:

- Verifique se o servidor WebSocket está rodando no terminal
- Confirme que a porta no plugin corresponde à porta do servidor
- Tente reiniciar tanto o servidor quanto o plugin

## 🔄 Fluxo de Uso

1. **Iniciar servidor:** Abra um terminal e execute `bunx cursor-talk-to-figma-socket`
2. **Abrir plugin:** No Figma, abra o plugin "Cursor Talk To Figma MCP Plugin"
3. **Conectar:** Clique em "Connect" na aba Connection
4. **Usar:** Após conectar, você poderá usar o plugin para comunicar com o Cursor

## ⚠️ Troubleshooting

### Erro: "'bunx' não reconhecido como um comando" no Cursor MCP

**Causa:** O Cursor não está encontrando o `bunx` no PATH mesmo que o Bun esteja instalado.

**Soluções:**

1. **Verificar se o Bun está no PATH do usuário:**
   ```powershell
   [Environment]::GetEnvironmentVariable("Path", "User") -split ';' | Select-String -Pattern 'bun'
   ```
   Deve retornar algo como: `C:\Users\<seu-usuario>\.bun\bin`

2. **Adicionar o Bun ao PATH permanentemente (se necessário):**
   ```powershell
   $userPath = [Environment]::GetEnvironmentVariable("Path", "User");
   if ($userPath -notlike "*$env:USERPROFILE\.bun\bin*") {
     $newPath = $userPath + ";$env:USERPROFILE\.bun\bin";
     [Environment]::SetEnvironmentVariable("Path", $newPath, "User");
     Write-Host "Bun adicionado ao PATH do usuário permanentemente";
   }
   ```

3. **Reiniciar o Cursor completamente:**
   - Feche todas as janelas do Cursor
   - Certifique-se de que não há processos do Cursor rodando em segundo plano
   - Reabra o Cursor
   - O Cursor precisa ser reiniciado para reconhecer as variáveis de ambiente atualizadas

4. **Verificar se o Bun funciona no terminal:**
   ```powershell
   bun --version
   bunx --version
   ```
   Ambos devem retornar a versão do Bun.

### Erro: "Disconnected from server"

**Solução:** Execute o comando `bunx cursor-talk-to-figma-socket` no terminal antes de tentar conectar.

### Servidor não inicia

**Solução:** Verifique se a porta 3055 não está sendo usada por outro processo:

```powershell
# Verificar processos na porta 3055
Get-NetTCPConnection -LocalPort 3055 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
```

Se a porta estiver em uso, você pode:
- Encerrar o processo que está usando a porta
- Usar uma porta diferente no servidor e atualizar no plugin

### Plugin não conecta após iniciar servidor

**Soluções:**
1. Aguarde alguns segundos após iniciar o servidor antes de tentar conectar
2. Reinicie o plugin no Figma
3. Verifique se há erros no terminal onde o servidor está rodando
4. Tente fechar e reabrir o Figma

## 📚 Informações Adicionais

- O servidor WebSocket usa a porta **3055** por padrão
- O servidor deve estar rodando sempre que você quiser usar o plugin
- Para parar o servidor, pressione `Ctrl+C` no terminal

## 🎨 Como Usar o MCP do Figma no Desenvolvimento

Agora que o MCP está conectado, você pode usar o design do Figma diretamente no Cursor para acelerar o desenvolvimento. Aqui estão os principais casos de uso:

### 📐 O que o MCP do Figma Permite Fazer

O MCP do Figma conecta o Cursor ao seu design, permitindo que você:

1. **Consultar informações do design diretamente no Cursor**
   - Ver propriedades de componentes (cores, espaçamentos, tipografia)
   - Obter medidas e dimensões exatas
   - Entender a hierarquia e estrutura do design
   - Acessar tokens de design e variáveis

2. **Gerar código baseado no design**
   - Criar componentes React que correspondem ao design
   - Extrair estilos e convertê-los para Material UI
   - Gerar estruturas de componentes baseadas em frames do Figma
   - Implementar layouts responsivos baseados no design

3. **Manter consistência entre design e código**
   - Verificar se o código implementado corresponde ao design
   - Identificar discrepâncias entre design e implementação
   - Extrair paleta de cores e aplicar no tema do Material UI

### 🚀 Casos de Uso Práticos para Seu Projeto

#### 1. **Extrair Paleta de Cores do Design**

Você pode pedir ao Cursor:
- "Use o MCP do Figma para extrair as cores principais do meu design e atualizar o tema do Material UI"
- O Cursor acessará o design, identificará as cores usadas e atualizará `src/theme/AppThemeProvider.tsx`

#### 2. **Criar Componentes Baseados em Frames do Figma**

Exemplo:
- "No Figma, tenho um frame chamado 'VideoCard'. Use o MCP para ver suas propriedades e crie um componente React equivalente usando Material UI"
- O Cursor consultará o frame no Figma e gerará o componente com as dimensões, espaçamentos e estilos corretos

#### 3. **Implementar Layouts Responsivos**

- "Meu design tem breakpoints em mobile, tablet e desktop. Use o MCP para verificar as dimensões e implementar o layout responsivo usando Material UI Grid"
- O Cursor acessará as diferentes versões do design e implementará os breakpoints corretos

#### 4. **Extrair Tipografia e Espaçamentos**

- "Use o MCP para verificar a tipografia usada no design e atualizar o tema do Material UI com as fontes e tamanhos corretos"
- O Cursor consultará os estilos de texto no Figma e aplicará no tema

#### 5. **Gerar Estrutura de Componentes**

- "Tenho uma página de dashboard no Figma. Use o MCP para analisar a estrutura e gerar os componentes React necessários"
- O Cursor analisará a hierarquia de componentes no Figma e criará a estrutura de componentes correspondente

### 💡 Como Usar na Prática

#### Passo 1: Prepare o Design no Figma
- Organize seus frames e componentes com nomes descritivos
- Use variáveis do Figma para cores e espaçamentos (facilita a extração)
- Agrupe elementos logicamente (facilita a geração de componentes)

#### Passo 2: No Cursor, Faça Perguntas Específicas

**Exemplos de comandos que você pode usar:**

```
"Use o MCP do Figma para verificar o componente 'Button' no meu design 
e crie um componente React equivalente usando Material UI"
```

```
"Analise o frame 'Dashboard' no Figma usando o MCP e me diga quais 
componentes preciso criar para implementá-lo"
```

```
"Extraia a paleta de cores do meu design no Figma e atualize o tema 
do Material UI com essas cores"
```

```
"Use o MCP para verificar os espaçamentos usados no design e me 
mostre como aplicá-los no Material UI usando o sistema de spacing"
```

#### Passo 3: O Cursor Usará o MCP Automaticamente

Quando você mencionar o Figma ou pedir para usar o design, o Cursor:
1. Conectará ao Figma via MCP
2. Consultará as informações solicitadas
3. Usará essas informações para gerar ou modificar código
4. Manterá a consistência com o design

### 🎯 Exemplo Completo: Criando um Componente do Zero

**Cenário:** Você tem um card de vídeo no Figma e quer implementá-lo no projeto.

**No Cursor, você pode dizer:**

```
"Tenho um componente 'VideoCard' no Figma. Use o MCP para:
1. Verificar suas dimensões, cores e espaçamentos
2. Ver a estrutura de elementos (título, descrição, botões)
3. Criar um componente React em src/components/videos/VideoCard.tsx
4. Usar Material UI e seguir o padrão do projeto"
```

**O que o Cursor fará:**
1. Conecta ao Figma via MCP
2. Analisa o componente VideoCard
3. Extrai propriedades (largura, altura, padding, cores, etc.)
4. Gera o componente React com Material UI
5. Aplica os estilos baseados no design
6. Segue as convenções do projeto (TypeScript, estrutura de pastas, etc.)

### ⚙️ Integração com Material UI

O MCP do Figma é especialmente útil porque:
- **Material UI** tem um sistema de design próprio, mas você pode adaptá-lo ao seu design do Figma
- O MCP ajuda a extrair valores específicos (cores, espaçamentos) e aplicá-los no tema do MUI
- Você pode criar componentes customizados que seguem o design do Figma mas usam a base do Material UI

### 📝 Dicas Importantes

1. **Nomes descritivos no Figma:** Use nomes claros para frames e componentes (ex: "VideoCard", "DashboardLayout", "AuthButton")

2. **Organize o design:** Mantenha uma estrutura lógica no Figma que reflita a estrutura de componentes do projeto

3. **Use variáveis do Figma:** Se possível, use variáveis de cor e espaçamento no Figma - facilita a extração via MCP

4. **Seja específico:** Ao pedir algo ao Cursor, mencione explicitamente "use o MCP do Figma" ou "consulte o design no Figma"

5. **Iteração:** O MCP permite iterar - você pode pedir ajustes baseados no design e o Cursor consultará novamente o Figma

### 🔄 Fluxo de Trabalho Recomendado

1. **Design no Figma** → Crie e organize seu design
2. **Conectar MCP** → Certifique-se de que o servidor está rodando e o plugin conectado
3. **No Cursor** → Peça para usar o MCP do Figma para consultar ou implementar partes do design
4. **Implementação** → O Cursor gerará código baseado no design
5. **Ajustes** → Use o MCP novamente para verificar detalhes ou fazer ajustes

## 🔗 Recursos

- [Documentação do Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor MCP Documentation](https://docs.cursor.com/)
- [Figma API Documentation](https://www.figma.com/developers/api)

