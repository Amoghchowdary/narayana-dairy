@echo off
setlocal EnableDelayedExpansion
title Narayana Organic Dairy - Starting...
color 0A

echo.
echo  ============================================================
echo   NARAYANA ORGANIC DAIRY
echo   Buffalo Farm Management System
echo  ============================================================
echo.

:: Check if setup has been run
if not exist venv (
    echo  [!] Virtual environment not found.
    echo      Please run SETUP.bat first.
    echo.
    pause
    exit /b 1
)

:: Check static folder
if not exist static\index.html (
    echo  [!] Static files missing. Copying now...
    if not exist static mkdir static
    if exist index.html copy /Y index.html static\index.html >nul
    if exist login.html copy /Y login.html static\login.html >nul
    if exist styles.css copy /Y styles.css static\styles.css >nul
    if exist app.js copy /Y app.js static\app.js >nul
    if exist sw.js copy /Y sw.js static\sw.js >nul
    if exist manifest.json copy /Y manifest.json static\manifest.json >nul
)

:: Activate virtualenv
call venv\Scripts\activate.bat

:: Find a free port (default 8000, fallback 8001)
set PORT=8000
netstat -ano | findstr ":8000 " >nul 2>&1
if not errorlevel 1 (
    set PORT=8001
    netstat -ano | findstr ":8001 " >nul 2>&1
    if not errorlevel 1 set PORT=8002
)

echo  Starting server on port %PORT%...
echo.

:: Launch browser after 2 seconds in background
start "" /B cmd /C "timeout /T 2 >nul && start http://localhost:%PORT%"

echo  ============================================================
echo   App is running at: http://localhost:%PORT%
echo.
echo   Your browser will open automatically.
echo   To stop the server, close this window.
echo  ============================================================
echo.

:: Start FastAPI (no --reload: keeps it stable on all Python versions)
uvicorn main:app --host 0.0.0.0 --port %PORT%

echo.
echo  Server stopped.
pause
