@echo off
setlocal

REM Default environment values for local dev (override by setting env vars before running).
if "%JWT_SECRET%"=="" set JWT_SECRET=base64:ZGV2LWp3dC1zZWNyZXQtMzItYnl0ZXMtbG9uZyEhISE=
if "%BOOTSTRAP_ADMIN_EMAIL%"=="" set BOOTSTRAP_ADMIN_EMAIL=admin@example.com
if "%BOOTSTRAP_ADMIN_PASSWORD%"=="" set BOOTSTRAP_ADMIN_PASSWORD=admin123

REM Start MySQL, backend, and web (frontend) containers via docker-compose.
REM Backend will be exposed on http://localhost:8081.
docker compose -f docker\docker-compose.dev.yml up --build

endlocal
