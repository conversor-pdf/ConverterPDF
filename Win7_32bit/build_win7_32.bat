@echo off
echo Iniciando Build para Windows 7 32-bit...
py -3.8-32 -m PyInstaller --name "Wtech_Converter_Win7_32bit" --windowed --add-data "web;web" --icon "logo.png" main.py
echo Build concluído! O executável está na pasta dist.
pause
