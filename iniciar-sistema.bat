@echo off
:: Altera a codificação do prompt para aceitar acentos em português
chcp 65001 > nul

title Servidor da Portaria Escolar
echo ==================================================
echo      INICIALIZANDO O SISTEMA DA PORTARIA
echo ==================================================
echo.
echo [INFO] Iniciando o servidor Node.js...
echo [INFO] Nao feche esta janela enquanto estiver usando o sistema.
echo.

:: Executa o servidor na pasta atual
node server.js

echo.
echo [AVISO] O servidor foi interrompido.
pause