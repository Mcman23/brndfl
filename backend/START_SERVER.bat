@echo off
setlocal
cd /d "%~dp0"

echo ========================================================================
echo  BRANDFULL BACKEND SERVER STARTUP
echo ========================================================================
echo.

REM --- Check Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
    echo [HATA] Node.js tapilmadi. Node.js yukleyin: https://nodejs.org
    pause
    exit /b 1
)

REM --- Check .env exists ---
if not exist ".env" (
    echo [HATA] .env faylı tapilmadi. .env.example-i kopyalayib deyerleri doldurun.
    pause
    exit /b 1
)

REM --- Install dependencies if node_modules missing ---
if not exist "node_modules" (
    echo node_modules tapilmadi, install edilir...
    call npm install
    if errorlevel 1 (
        echo [HATA] npm install ugursuz oldu.
        pause
        exit /b 1
    )
)

REM --- Ensure Prisma client is generated ---
if not exist "node_modules\.prisma\client" (
    echo Prisma client generate edilir...
    call npx prisma generate
    if errorlevel 1 (
        echo [HATA] Prisma generate ugursuz oldu.
        pause
        exit /b 1
    )
)

echo.
echo Server baslayir: http://localhost:5000
echo Admin panel:      http://localhost:5000/admin
echo Dayandirmaq ucun: Ctrl+C
echo ========================================================================
echo.

REM --- Open browser after a short delay, then start server (foreground) ---
start "" cmd /c "timeout /t 3 >nul & start http://localhost:5000"
call npm run dev

pause
