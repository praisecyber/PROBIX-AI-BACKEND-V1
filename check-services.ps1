# Check Health of AI Servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROBIX AI - Service Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Test-Health {
    param(
        [string]$Name,
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri "$Url/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $content = $response.Content | ConvertFrom-Json
            Write-Host "$Name : " -NoNewline
            Write-Host "✅ OK ($($content.mode))" -ForegroundColor Green
            if ($content.model) {
                Write-Host "  Model: $($content.model)" -ForegroundColor Gray
            }
        } else {
            Write-Host "$Name : ❌ Unhealthy (Status $($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "$Name : ❌ Down" -ForegroundColor Red
    }
}

Test-Health -Name "Mistral Server" -Url "http://localhost:8001"
Test-Health -Name "Gemma Server" -Url "http://localhost:8002"
Write-Host ""
