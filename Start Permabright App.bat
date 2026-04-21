@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\server.ps1"
echo.
echo Press any key to close this window...
pause >nul
