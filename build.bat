@echo off
REM Checking for dependencies
call setup.bat

REM Project compiling
call npm run build

REM Binaries compiling in dist
call pkg . --out-path dist

REM Removing old binaries if they exist
if exist dist\smac-linux del /q dist\smac-linux
if exist dist\smac-macos del /q dist\smac-macos
if exist dist\smac-win.exe del /q dist\smac-win.exe

echo Successful build!
