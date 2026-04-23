@echo off
set VBS=%~dp0run_fintrack.vbs

schtasks /create /tn "FinTrack" /tr "wscript.exe \"%VBS%\"" /sc onlogon /rl highest /f

echo Tarefa criada. Iniciando agora...
wscript.exe "%VBS%"
echo.
echo Pronto! Server e bot rodando em segundo plano.
echo Toda vez que o PC ligar, sobem automaticamente.
pause