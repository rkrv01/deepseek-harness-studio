@echo off
setlocal

title Uninstall Starlight AI Assistant Demo
echo Uninstalling Starlight AI Assistant...
echo.

taskkill.exe /F /T /IM "starlight-ai.exe" >nul 2>&1

powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0uninstall-starlight-harness.ps1" -Target "%~1"
if errorlevel 1 (
  echo.
  echo Uninstall failed. The target may still be locked by another process or security software.
  pause
  exit /b 1
)

echo.
echo Uninstall complete. You can now install Starlight AI Assistant again.
pause
endlocal
