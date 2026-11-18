@echo off
title BusCFTLA - Servidor Local
echo Iniciando BusCFTLA - CFT Lota Arauco...
start http://127.0.0.1:8080/
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
