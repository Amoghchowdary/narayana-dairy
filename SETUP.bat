@echo off
setlocal EnableDelayedExpansion
title Narayana Organic Dairy - First Time Setup
color 0A

echo.
echo  ============================================================
echo   NARAYANA ORGANIC DAIRY - SETUP
echo   Buffalo Farm Management System
echo  ============================================================
echo.
echo  This setup requires internet ONCE to download libraries.
echo  After setup, the app runs completely OFFLINE forever.
echo.

:: ── Check Python ─────────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found!
    echo.
    echo  Please install Python 3.10 or newer from:
    echo    https://www.python.org/downloads/
    echo  IMPORTANT: During install, check "Add Python to PATH"
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo  [OK] Python %PY_VER% detected
echo.

:: ── Create virtual environment ────────────────────────────────────────────────
echo  [1/5] Creating virtual environment...
if exist venv (
    echo       Already exists, skipping.
) else (
    python -m venv venv
    if errorlevel 1 ( echo  [ERROR] venv failed. & pause & exit /b 1 )
    echo       Done.
)
echo.
call venv\Scripts\activate.bat

:: ── Upgrade pip ───────────────────────────────────────────────────────────────
echo  [2/5] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo       Done.
echo.

:: ── Install Python dependencies ───────────────────────────────────────────────
echo  [3/5] Installing Python dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo  [ERROR] Pip install failed. Check internet connection.
    pause & exit /b 1
)
echo       Done.
echo.

:: ── Prepare static folder ────────────────────────────────────────────────────
echo  [4/5] Preparing static files...
if not exist static mkdir static
if not exist static\vendor mkdir static\vendor
if not exist static\vendor\webfonts mkdir static\vendor\webfonts
if not exist static\vendor\fonts mkdir static\vendor\fonts
if exist index.html    copy /Y index.html    static\index.html    >nul
if exist login.html    copy /Y login.html    static\login.html    >nul
if exist styles.css    copy /Y styles.css    static\styles.css    >nul
if exist app.js        copy /Y app.js        static\app.js        >nul
if exist sw.js         copy /Y sw.js         static\sw.js         >nul
if exist manifest.json copy /Y manifest.json static\manifest.json >nul
echo       Done.
echo.

:: ── Download vendor libraries ─────────────────────────────────────────────────
echo  [5/5] Downloading offline libraries (one-time internet required)...
echo.
python scripts\download_vendor.py
if errorlevel 1 (
    echo  [WARNING] Some downloads may have failed. Check output above.
)
echo.

echo  ============================================================
echo   SETUP COMPLETE!
echo.
echo   The app is now fully OFFLINE.
echo   Double-click START.bat to launch anytime.
echo  ============================================================
echo.
pause
