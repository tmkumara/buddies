# Buddies OMS Monorepo

Production-ready monorepo with a Spring Boot 3 (Java 17) backend, React (Vite + TypeScript) frontend, and MySQL, all runnable with a single Docker Compose command.

## Project Structure
```
/
  backend/
    pom.xml
    oms-api/
    oms-application/
    oms-domain/
    oms-infrastructure/
  frontend/
  docker/
    docker-compose.dev.yml
    Dockerfile.backend
    Dockerfile.frontend
    nginx.conf
  .env
  README.md
```

## Quick Start (Local)
```bash
docker compose -f docker/docker-compose.dev.yml up --build
```

If you see an orphan container warning (e.g. `giftbox-web`), clean it up with:
```bash
docker compose -f docker/docker-compose.dev.yml up --build --remove-orphans
```
or
```bash
docker compose -f docker/docker-compose.dev.yml down --remove-orphans
```

### Services
- Backend: http://localhost:8080
- Frontend: http://localhost:5173
- Swagger UI: http://localhost:8080/swagger-ui.html

### Default Credentials
- Admin: `admin@local` / `Admin@1234`
- User: `user@local` / `User@1234`

## Backend Overview
- Spring Boot 3.x (Java 17)
- Security: JWT access + refresh tokens (refresh in HttpOnly cookie)
- RBAC with roles + permissions
- Flyway migrations for schema
- Testcontainers integration test for auth flows
- Global exception handler with structured responses

## Frontend Overview
- React + Vite + TypeScript
- Redux Toolkit for auth state
- React Router
- MUI components
- Protected routes and permission-based navigation
- Login, profile, and admin management screens

## Environment Variables
See `.env` for defaults. You can update any values before running Docker Compose.

Key values:
- `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `JWT_SECRET`, `JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS`
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`

JWT secret guidance:
- Prefer a Base64-encoded secret (at least 32 bytes after decoding).
- Plain text is supported for local/dev only and must be at least 32 characters.

## Smoke Test Steps
1. `docker compose -f docker/docker-compose.dev.yml up --build`
2. Visit `http://localhost:5173` and sign in using the admin credentials.
3. Navigate to **Users**, **Roles**, and **Permissions** in the sidebar.
4. Open Swagger UI at `http://localhost:8080/swagger-ui.html`.
