@echo off
cd /d "%~dp0"
echo ================================
echo   ThumbnailForge Pro - Starting
echo ================================
echo.
echo Installing dependencies if needed...
call npm install --silent 2>nul
echo.
echo Starting development server...
echo.
echo Open http://localhost:3000 in your browser
echo.
echo Press Ctrl+C to stop the server
echo ================================
node_modules\.bin\next dev -p 3000
pause