@echo off
REM ==========================================================================
REM Brandfull Backend Development Server Startup Script
REM ==========================================================================
REM This script starts the Express.js development server with hot-reload
REM The server will be accessible at http://localhost:5000
REM ==========================================================================

cd /d "%~dp0"

echo.
echo ========================================================================
echo  BRANDFULL BACKEND SERVER STARTUP
echo ========================================================================
echo.
echo Starting Express.js development server...
echo Server will run on: http://localhost:5000
echo Frontend: http://localhost:5000
echo Admin Panel: http://localhost:5000/admin
echo.
echo Press Ctrl+C to stop the server
echo ========================================================================
echo.

npm run dev

pause
