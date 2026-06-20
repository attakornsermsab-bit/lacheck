@echo off
setlocal
set "ROOT=%~dp0"
set "NODE=C:\Users\attakser\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "URL_FILE=%ROOT%monitor-url.txt"
set "DEFAULT_URL=http://localhost:8787"

if not exist "%NODE%" (
  echo Node runtime not found:
  echo %NODE%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='%DEFAULT_URL%'; try { $r=Invoke-WebRequest ($u + '/api/portfolio') -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -eq 200){ Start-Process $u; exit 0 } } catch { exit 1 }"
if %ERRORLEVEL% EQU 0 exit /b 0

if exist "%URL_FILE%" del "%URL_FILE%" >nul 2>nul
cd /d "%ROOT%"

start "Portfolio Monitor Server" /min "%NODE%" "%ROOT%server.js"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%URL_FILE%'; for($i=0; $i -lt 24 -and -not (Test-Path $p); $i++){ Start-Sleep -Milliseconds 500 }; if(Test-Path $p){ Start-Process ((Get-Content $p -Raw).Trim()) } else { Start-Process '%DEFAULT_URL%' }"

endlocal
