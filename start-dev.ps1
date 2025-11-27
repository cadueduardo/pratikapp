# Script para iniciar o servidor de desenvolvimento com a versao correta do Node.js
# Priorizar Node.js do Scoop no PATH

$scoopNodePath = Join-Path $env:USERPROFILE "scoop\apps\nodejs-lts\current"
$scoopShimsPath = Join-Path $env:USERPROFILE "scoop\shims"

# Verificar se o Node.js do Scoop existe
if (Test-Path (Join-Path $scoopNodePath "node.exe")) {
    # Remover Node.js do PATH atual e adicionar o do Scoop no inicio
    $currentPath = $env:PATH -split ';' | Where-Object { 
        $_ -notlike "*nodejs*" -and 
        $_ -notlike "*Node.js*" -and
        $_ -notlike "*npm*"
    }
    $env:PATH = "$scoopNodePath;$scoopShimsPath;" + ($currentPath -join ';')
    
    Write-Host "[OK] Usando Node.js do Scoop" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Node.js do Scoop nao encontrado em: $scoopNodePath" -ForegroundColor Yellow
    Write-Host "  Tentando continuar com a versao atual..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verificando versao do Node.js..."
$nodeVersion = node --version
Write-Host "Node.js: $nodeVersion" -ForegroundColor Cyan

# Verificar se a versao e compativel
$versionMatch = $nodeVersion -match 'v(\d+)\.(\d+)\..*'
if ($versionMatch) {
    $versionNumber = [int]$matches[1]
    $minorVersion = [int]$matches[2]
    
    if (($versionNumber -eq 20 -and $minorVersion -lt 19) -or ($versionNumber -lt 20 -and $versionNumber -ne 22)) {
        Write-Host ""
        Write-Host "[AVISO] Esta versao do Node.js pode nao ser compativel com Vite!" -ForegroundColor Yellow
        Write-Host "  Vite requer Node.js 20.19+ ou 22.12+" -ForegroundColor Yellow
        Write-Host "  Versao atual: $nodeVersion" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Pressione qualquer tecla para continuar ou Ctrl+C para cancelar..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

Write-Host ""
Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Green
npm run dev
