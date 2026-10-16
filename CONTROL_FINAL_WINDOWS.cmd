@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title SOFF - Control final version instalada
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY (
  where python >nul 2>&1 && set "PY=python"
)
if not defined PY (
  echo ERROR: Se necesita Python 3 para revisar el proyecto.
  echo Instalalo y ejecuta nuevamente este archivo.
  pause
  exit /b 1
)
echo ============================================
echo       SOFF - CONTROL FINAL LOCAL
 echo ============================================
%PY% qa\soff_final_check.py
set "RESULT=%errorlevel%"
echo.
echo Se guardo el informe dentro de .soff\qa\
echo Este control NO habilita el sitio para ventas reales.
echo.
pause
exit /b %RESULT%
