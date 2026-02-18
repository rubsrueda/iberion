@echo off
REM backup-copilot.bat
REM Script para guardar un punto seguro antes de cambios automáticos

git add .
git commit -m "Punto seguro: juego funcional antes de cambios Copilot"
echo Commit de respaldo realizado. Puedes continuar con cambios seguros.