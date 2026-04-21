Set-Location $PSScriptRoot
Write-Host "Starting Permabright app..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File ".\server.ps1"
Write-Host ""
Write-Host "Press Enter to close this window..."
Read-Host
