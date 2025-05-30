@echo off
echo 🃏 Starting Italian Card Game Server...
echo.

REM Try port 3000 first, then 3001, 3002, etc.
set PORT=3000

:tryport
echo Trying port %PORT%...
netstat -an | find ":%PORT%" >nul
if %errorlevel% == 0 (
    echo Port %PORT% is in use, trying next port...
    set /a PORT+=1
    if %PORT% GTR 3010 (
        echo No available ports found between 3000-3010
        pause
        exit /b 1
    )
    goto tryport
)

echo Starting server on port %PORT%...
echo Open your browser to: http://localhost:%PORT%
echo.
echo Press Ctrl+C to stop the server
echo.

set PORT=%PORT%
npm start
