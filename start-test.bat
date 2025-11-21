@echo off
echo ========================================
echo Starting Test Environment
echo ========================================
echo.
echo This will open 3 terminal windows:
echo   1. Fastify Server (port 3000)
echo   2. Telemetry Sender (simulates device)
echo   3. Frontend Dev Server (port 5173)
echo.
echo Press Ctrl+C in each window to stop
echo ========================================
echo.

REM Start the telemetry sender first
REM start "Telemetry Sender" cmd /k "node server/send-sample-telemetry.js"
timeout /t 2 /nobreak >nul

REM Start the dev server (Fastify + Vite)
start "Dev Server (Fastify + Vite)" cmd /k "npm run dev"

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Open your browser to: http://localhost:5173
echo.
echo To stop all services:
echo   - Press Ctrl+C in each terminal window
echo   - Or close the terminal windows
echo.
pause
