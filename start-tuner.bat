@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo [Error] electron.exe not found under node_modules
  pause
  exit /b 1
)
start "" "%CD%\node_modules\electron\dist\electron.exe" "%CD%"
exit /b 0
