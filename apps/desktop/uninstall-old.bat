@echo off
setlocal

title Remove Legacy Starlight Harness
echo This removes the legacy Starlight Harness application only.
echo The current Starlight AI Assistant installation and data will not be touched.
echo.

set "LEGACY_DIR=%LOCALAPPDATA%\Programs\Starlight Harness"
if not "%~1"=="" set "LEGACY_DIR=%~1"
if not exist "%LEGACY_DIR%" if "%~1"=="" (
  echo Default legacy installation directory was not found.
  set /p "LEGACY_DIR=Enter the old Starlight Harness installation directory, or press Enter to skip: "
)

echo [1/4] Stopping the legacy application...
taskkill /IM "Starlight Harness.exe" /T /F >nul 2>&1

echo [2/4] Running the legacy uninstaller when available...
if exist "%LEGACY_DIR%\Uninstall Starlight Harness.exe" start "" /wait "%LEGACY_DIR%\Uninstall Starlight Harness.exe" /S

echo [3/4] Removing the legacy application directory...
if defined LEGACY_DIR if exist "%LEGACY_DIR%" rmdir /S /Q "%LEGACY_DIR%"

echo [4/4] Removing legacy shortcuts...
if exist "%USERPROFILE%\Desktop\Starlight Harness.lnk" del /F /Q "%USERPROFILE%\Desktop\Starlight Harness.lnk"
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness" rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness"
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness.lnk" del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Starlight Harness.lnk"

echo.
echo Legacy Starlight Harness removal complete.
echo Current Starlight AI Assistant files were not touched.
pause
endlocal
