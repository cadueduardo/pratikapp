# Script para criar branch, commitar e fazer push
# Execute este script no PowerShell: .\criar-branch.ps1

# Encontrar e adicionar Git ao PATH se necessário
$gitPaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
    "$env:ProgramFiles\Git\cmd\git.exe",
    "$env:ProgramFiles(x86)\Git\cmd\git.exe"
)

$gitFound = $false
foreach ($gitPath in $gitPaths) {
    if (Test-Path $gitPath) {
        $gitDir = Split-Path $gitPath -Parent
        $env:PATH = "$gitDir;$env:PATH"
        $gitFound = $true
        Write-Host "Git encontrado em: $gitPath" -ForegroundColor Green
        break
    }
}

if (-not $gitFound) {
    # Tentar encontrar Git no PATH atual
    try {
        $gitVersion = git --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $gitFound = $true
        }
    } catch {
        # Git não encontrado
    }
}

if (-not $gitFound) {
    Write-Host "ERRO: Git não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale o Git ou adicione-o ao PATH do sistema." -ForegroundColor Yellow
    Write-Host "Download: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou adicione o Git ao PATH manualmente:" -ForegroundColor Yellow
    Write-Host '  $env:PATH = "C:\Program Files\Git\bin;$env:PATH"' -ForegroundColor Gray
    exit 1
}

cd c:\projects\pratikapp

Write-Host "=== Criando novo branch e fazendo commit ===" -ForegroundColor Cyan
Write-Host ""

# Verificar branch atual
Write-Host "Branch atual:" -ForegroundColor Yellow
git rev-parse --abbrev-ref HEAD
Write-Host ""

# Criar novo branch
Write-Host "Criando branch 'feature-novo-branch'..." -ForegroundColor Yellow
git checkout -b feature-novo-branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao criar branch!" -ForegroundColor Red
    exit 1
}
Write-Host "Branch criado com sucesso!" -ForegroundColor Green
Write-Host ""

# Verificar branch atual
Write-Host "Branch atual após criação:" -ForegroundColor Yellow
git rev-parse --abbrev-ref HEAD
Write-Host ""

# Adicionar todas as mudanças
Write-Host "Adicionando todas as mudanças..." -ForegroundColor Yellow
git add -A
Write-Host ""

# Mostrar status
Write-Host "Status:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Fazer commit
Write-Host "Fazendo commit..." -ForegroundColor Yellow
git commit -m "Atualizações do projeto PratikApp"
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Nada para commitar ou commit falhou" -ForegroundColor Yellow
} else {
    Write-Host "Commit realizado com sucesso!" -ForegroundColor Green
}
Write-Host ""

# Fazer push
Write-Host "Enviando para o repositório remoto..." -ForegroundColor Yellow
git push -u origin feature-novo-branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao fazer push!" -ForegroundColor Red
    Write-Host "Verifique suas credenciais do GitHub" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "Push realizado com sucesso!" -ForegroundColor Green
}
Write-Host ""

# Verificar branches
Write-Host "Branches locais:" -ForegroundColor Yellow
git branch
Write-Host ""

Write-Host "Branches remotos:" -ForegroundColor Yellow
git branch -r
Write-Host ""

Write-Host "=== Concluído! ===" -ForegroundColor Cyan
