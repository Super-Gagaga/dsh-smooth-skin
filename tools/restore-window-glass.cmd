@echo off
setlocal
chcp 65001 >nul
rem Undo the Smooth window-glass patch: writes the saved original lib/main.js back.
rem It applies the next time DeepSeek Harness starts.
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo [glass] Node.js was not found on PATH.
  pause
  exit /b 1
)
node "tools\patch-window-glass.mjs" --restore %*
if errorlevel 1 (
  echo.
  echo [glass] Restore failed. The installed app.asar was left unchanged.
  pause
  exit /b 1
)
echo.
echo [glass] Quit DeepSeek Harness completely from the tray, then open it again.
pause
endlocal
