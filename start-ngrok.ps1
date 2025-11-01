# PowerShell script to start ngrok and display URL
$port = $args[0]
if (-not $port) { $port = "5173" }

Write-Host "🚀 Starting ngrok tunnel on port $port..." -ForegroundColor Green

# Start ngrok in background
$job = Start-Job -ScriptBlock {
    param($p)
    Set-Location $using:PWD
    node ngrok.js $p
} -ArgumentList $port

Write-Host "⏳ Waiting for ngrok to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check for URL file
$maxWait = 30
$waited = 0
while (-not (Test-Path "ngrok-url.txt") -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
}

if (Test-Path "ngrok-url.txt") {
    $url = Get-Content "ngrok-url.txt" -Raw
    Write-Host ""
    Write-Host "✅ Ngrok tunnel established!" -ForegroundColor Green
    Write-Host "🌐 Public URL: $url" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Use this URL on your tablet/phone to test"
    Write-Host "⚠️  Keep this PowerShell window open"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop ngrok"
    Write-Host ""
} else {
    Write-Host "❌ Ngrok may still be starting. Check ngrok-url.txt file." -ForegroundColor Red
}

# Keep script running
Wait-Job $job | Out-Null
Remove-Job $job

