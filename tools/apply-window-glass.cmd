@echo off
setlocal
chcp 65001 >nul
rem Window glass for the Smooth skin: patches the installed desktop shell so the main
rem window carries the system acrylic backdrop. The running app keeps its loaded copy, so
rem the change applies the next time DeepSeek Harness starts.
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo [glass] Node.js was not found on PATH. Install Node.js, or run this script
  echo         with the runtime that ships beside DeepSeek Harness.
  pause
  exit /b 1
)
node "tools\patch-window-glass.mjs" %*
if errorlevel 1 (
  echo.
  echo [glass] Patch failed. The installed app.asar was left unchanged.
  pause
  exit /b 1
)
echo.
echo [glass] Quit DeepSeek Harness completely from the tray, then open it again.
pause
endlocal
