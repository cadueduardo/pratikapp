# Script para executar npm run dev com Node.js v24.11.1
$nodePortable = "$env:USERPROFILE\nodejs-portable"

# Adiciona o Node.js portátil no início do PATH
$env:Path = "$nodePortable;" + $env:Path

# Executa o comando
npm run dev







