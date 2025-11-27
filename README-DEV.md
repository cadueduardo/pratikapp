# Guia de Desenvolvimento

## Requisitos

- Node.js 20.19+ ou 22.12+ (recomendado: 24.11.1)
- npm ou yarn

## Problema com Versão do Node.js

Se você encontrar o erro:
```
You are using Node.js 20.11.1. Vite requires Node.js version 20.19+ or 22.12+.
```

### Solução no Windows

**Opção 1: Usar o script PowerShell (Recomendado)**
```powershell
.\start-dev.ps1
```

Ou via npm:
```bash
npm run dev:win
```

**Opção 2: Ajustar PATH manualmente**
```powershell
$env:PATH = "$env:USERPROFILE\scoop\apps\nodejs-lts\current;$env:USERPROFILE\scoop\shims;$env:PATH"
npm run dev
```

**Opção 3: Usar nvm-windows (Gerenciador de Versões)**
1. Instale o [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
2. Instale a versão correta:
   ```bash
   nvm install 24.11.1
   nvm use 24.11.1
   ```
3. Execute:
   ```bash
   npm run dev
   ```

## Verificar Versão do Node.js

```bash
node --version
```

Deve mostrar: `v20.19.0` ou superior (ou `v22.12.0` ou superior, ou `v24.11.1`).

