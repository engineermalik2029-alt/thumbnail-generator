@echo off
cd /d "%~dp0"
echo ================================
echo   ThumbnailForge - Starting...
echo ================================
echo.
echo Installing dependencies if needed...
call npm install
echo.
echo Starting development server...
echo Open http://localhost:3000 in your browser
echo.
node_modules\.bin\next dev -p 3000
pause