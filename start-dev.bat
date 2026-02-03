@echo off
setlocal

REM Default environment values for local dev (override by setting env vars before running).
if "%JWT_SECRET%"=="" set JWT_SECRET=ZGV2LXNlY3JldA==
if "%BOOTSTRAP_ADMIN_EMAIL%"=="" set BOOTSTRAP_ADMIN_EMAIL=admin@example.com
if "%BOOTSTRAP_ADMIN_PASSWORD%"=="" set BOOTSTRAP_ADMIN_PASSWORD=admin123

REM Ensure backend port is available unless the backend container is already running.
for /f "tokens=*" %%i in ('docker ps --filter "name=giftbox-backend" --format "{{.Names}}"') do set BACKEND_RUNNING=%%i
if "%BACKEND_RUNNING%"=="" (
  netstat -ano | findstr ":8080" >nul
  if %errorlevel%==0 (
    echo Port 8080 is already in use. Stop the process using it or free the port, then re-run this script.
    echo Tip: netstat -ano ^| findstr :8080
    exit /b 1
  )
)

REM Start MySQL, backend, and web containers if they are not running.
docker compose -f docker\docker-compose.dev.yml up -d --build

REM Start the frontend dev server if not already running.
netstat -ano | findstr ":5173" >nul
if %errorlevel%==0 (
  echo Frontend dev server is already running on port 5173.
) else (
  start "Giftbox Frontend" cmd /k "cd frontend && npm install && npm run dev"
)

endlocal
