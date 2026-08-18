@echo off
title Portal Diplomado - Vista local
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo No se encontro Python en este computador.
  echo Instale Python desde https://www.python.org/downloads/ y vuelva a intentarlo.
  pause
  exit /b 1
)

echo Iniciando el portal en http://127.0.0.1:8080/preview.html
start "Servidor Portal Diplomado" cmd /k "cd /d ""%~dp0"" && python -m http.server 8080 --bind 127.0.0.1"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8080/preview.html"
echo.
echo El portal se abrio en su navegador.
echo Para detenerlo, cierre la ventana llamada Servidor Portal Diplomado.
timeout /t 4 /nobreak >nul
