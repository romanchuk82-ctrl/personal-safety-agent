# Personal Safety Agent - 24/7 Backend Safety Engine (Windows)
Write-Host "=== ЗАПУСК PERSONAL SAFETY AGENT BACKEND (PORT 3001) ===" -ForegroundColor Cyan
Set-Location -Path (Join-Path $PSScriptRoot "..\backend")

if (-not (Test-Path "node_modules")) {
    Write-Host "Встановлення залежностей backend..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "dist\server.js")) {
    Write-Host "Компіляція TypeScript..." -ForegroundColor Yellow
    npm run build
}

Write-Host "Запуск автономного моніторингу загроз 24/7..." -ForegroundColor Green
node dist\server.js
