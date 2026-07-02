# Probix AI - Start All Services
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROBIX AI - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Function to start a service in a new window
function Start-Service {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command,
        [int]$Port
    )

    Write-Host "Starting $Name on port $Port..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command"
}

# Start Mistral Server
Start-Service -Name "Mistral Server" -Path "$projectRoot\ai_models\mistral-server" -Command "py main.py" -Port 8001
Start-Sleep -Seconds 2

# Start Gemma Server
Start-Service -Name "Gemma Server" -Path "$projectRoot\ai_models\gemma-server" -Command "py main.py" -Port 8002
Start-Sleep -Seconds 2

# Start Math Service
Start-Service -Name "Math Service" -Path "$projectRoot\nllb-translator\math-service" -Command "py main.py" -Port 8003
Start-Sleep -Seconds 2

# Start Main Backend
Write-Host "Starting Main Backend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "- Mistral Server: http://localhost:8001" -ForegroundColor Gray
Write-Host "- Gemma Server: http://localhost:8002" -ForegroundColor Gray
Write-Host "- Math Service: http://localhost:8003" -ForegroundColor Gray
Write-Host "- Main Backend: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
