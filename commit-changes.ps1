# Script para fazer commit das alterações de thumbnails
# Execute este script no Git Bash ou adicione o Git ao PATH do PowerShell

$commitMessage = @"
feat: melhorias no sistema de thumbnails e suporte a imagens

- Adicionada detecção automática de dimensões para ajuste dinâmico de aspect ratio
- Vídeos verticais agora usam objectFit 'contain' para não cortar conteúdo
- Implementada geração de thumbnails para arquivos locais (imagens e vídeos)
- Adicionado suporte para selecionar imagens do Google Drive além de vídeos
- Corrigido problema de CORS usando URL do Google Drive que funciona no frontend
- Melhorado tratamento de thumbnails com fallback automático

Arquivos modificados:
- src/components/schedules/MediaUploadArea.tsx
- src/services/googleDrive.ts
- src/components/googleDrive/GoogleDriveBrowser.tsx
- src/pages/schedules/NewSchedulePage.tsx
- src/pages/schedules/SchedulesPage.tsx
"@

Write-Host "Preparando commit..." -ForegroundColor Cyan
Write-Host "`nMensagem do commit:" -ForegroundColor Yellow
Write-Host $commitMessage -ForegroundColor White
Write-Host "`nPara fazer o commit, execute no Git Bash:" -ForegroundColor Green
Write-Host "git add ." -ForegroundColor Cyan
Write-Host "git commit -m `"$($commitMessage -replace '"', '\"')`"" -ForegroundColor Cyan







