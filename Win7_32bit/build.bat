@echo off
echo ==============================================
echo Instalando dependencias do Wtech Converter...
echo ==============================================

:: Instala as bibliotecas necessarias
pip install eel pdf2docx PyMuPDF pdfplumber pandas openpyxl python-pptx ebooklib pytesseract pdf2image pyinstaller Pillow

echo.
echo ==============================================
echo Compilando Executavel (Versao Instalavel)...
echo ==============================================
:: Compila a versão em diretório (mais rápida para iniciar)
pyinstaller --name "Wtech_Converter" --windowed --add-data "web;web" --icon "logo.png" main.py

echo.
echo ==============================================
echo Compilando Versao Portatil...
echo ==============================================
:: Compila a versão em arquivo único (portátil)
pyinstaller --name "Wtech_Converter_Portatil" --windowed --onefile --add-data "web;web" --icon "logo.png" main.py

echo.
echo ==============================================
echo Build Concluido!
echo Os executaveis estao na pasta "dist".
echo ==============================================
pause
