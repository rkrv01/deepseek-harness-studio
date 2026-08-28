@echo off
setlocal

title Uninstall Starlight Harness Demo
echo Uninstalling Starlight Harness...
echo.

echo [1/5] Stopping Starlight Harness processes...
taskkill /IM "Starlight Harness.exe" /T /F >nul 2>&1

echo [2/5] Locating the installed application...
set "INSTALL_DIR="
for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\793ea7d7-493b-56f6-89d2-a7626c6179ca" /v InstallLocation 2^>nul') do if /I "%%A"=="REG_SZ" set "INSTALL_DIR=%%B"
if not defined INSTALL_DIR set "INSTALL_DIR=%LOCALAPPDATA%\Programs\Starlight Harness"

echo [3/5] Running the Starlight uninstall program...
if exist "%INSTALL_DIR%\Uninstall Starlight Harness.exe" start "" /wait "%INSTALL_DIR%\Uninstall Starlight Harness.exe" /S

echo [4/5] Removing remaining Starlight user data...
if exist "%INSTALL_DIR%" rmdir /S /Q "%INSTALL_DIR%"
if exist "%APPDATA%\Starlight Harness" rmdir /S /Q "%APPDATA%\Starlight Harness"
if exist "%LOCALAPPDATA%\Starlight Harness" rmdir /S /Q "%LOCALAPPDATA%\Starlight Harness"
if exist "%USERPROFILE%\.dsh\profiles\web" rmdir /S /Q "%USERPROFILE%\.dsh\profiles\web"

echo [5/5] Removing Starlight shortcuts and uninstall records...
if exist "%USERPROFILE%\Desktop\Starlight Harness.lnk" del /F /Q "%USERPROFILE%\Desktop\Starlight Harness.lnk"
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness" rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness"
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness.lnk" del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness.lnk"
reg delete "HKCU\Software\793ea7d7-493b-56f6-89d2-a7626c6179ca" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\793ea7d7-493b-56f6-89d2-a7626c6179ca" /f >nul 2>&1

echo.
echo Uninstall complete. DeepSeek Harness files and registry records were not targeted.
echo You can now install Starlight Harness again for a first-install test.
pause
endlocal
