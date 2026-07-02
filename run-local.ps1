# Alias script for backward compatibility.
# This file exists so `./run-local.ps1` works even though the real startup script is `start-all.ps1`.

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (Test-Path "$projectRoot\start-all.ps1") {
    Write-Host "Starting local services via start-all.ps1..." -ForegroundColor Cyan
    & "$projectRoot\start-all.ps1"
} else {
    Write-Host "Error: start-all.ps1 not found in project root." -ForegroundColor Red
    exit 1
}
