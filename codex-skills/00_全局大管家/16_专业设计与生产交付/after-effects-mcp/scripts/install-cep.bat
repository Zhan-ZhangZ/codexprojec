@echo off
REM AE-MCP CEP Extension Installer for Windows
setlocal enabledelayedexpansion

set EXTENSION_NAME=com.aemcp.panel
set SCRIPT_DIR=%~dp0
set EXTENSION_DIR=%SCRIPT_DIR%..\cep-extension
set INSTALL_DIR=%APPDATA%\Adobe\CEP\extensions\%EXTENSION_NAME%

echo AE-MCP CEP Extension Installer
echo ===============================
echo.

REM Check if extension directory exists
if not exist "%EXTENSION_DIR%" (
    echo Error: Extension directory not found: %EXTENSION_DIR%
    exit /b 1
)

REM Enable unsigned extensions (required for development)
echo Enabling unsigned extensions for debugging...
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

REM Create CEP extensions directory if it doesn't exist
if not exist "%APPDATA%\Adobe\CEP\extensions" (
    mkdir "%APPDATA%\Adobe\CEP\extensions"
)

REM Remove existing installation
if exist "%INSTALL_DIR%" (
    echo Removing existing installation...
    rmdir /s /q "%INSTALL_DIR%"
)

REM Create symbolic link (requires admin or developer mode)
echo Creating symbolic link...
mklink /D "%INSTALL_DIR%" "%EXTENSION_DIR%"

if %errorlevel% neq 0 (
    echo.
    echo Warning: Could not create symbolic link.
    echo Copying files instead...
    xcopy /E /I /Y "%EXTENSION_DIR%" "%INSTALL_DIR%"
)

echo.
echo Installation complete!
echo.
echo The extension has been installed to:
echo   %INSTALL_DIR%
echo.
echo To use the extension:
echo 1. Start After Effects 2024 or later
echo 2. Go to Window ^> Extensions ^> AE-MCP
echo 3. The panel will auto-start and begin listening for commands
echo.
echo Note: If After Effects is running, you may need to restart it.
echo.

pause
