# Torneo Interfacultades de Fútbol 5 — UCU

Trabajo obligatorio de **Base de Datos 1** (UCU, 2.º semestre 2026).
Sistema para gestionar equipos, planteles, fixture, planillas de juego, sanciones y reportes del torneo.

| Capa | Tecnología |
|---|---|
| Base de datos | MySQL 8.4 (scripts en `db/init/`) |
| Backend | Python 3.12 + FastAPI, SQL directo con `mysql-connector-python` (sin ORM) |
| Frontend | React 18 + Vite |
| Infraestructura | Docker Compose (`db`, `api`, `web`) |

## Cómo correrlo (Docker)

```bash
cp .env.example .env        # completar contraseñas
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8000 (documentación interactiva en `/docs`)
- MySQL: `localhost:3306`

Los scripts de `db/init/` se ejecutan **solo la primera vez** que se crea el volumen.
Para recrear la base desde cero:

```bash
docker compose down -v && docker compose up --build
```

## Cómo correrlo sin Docker

> Se completa en el turno de documentación final (ver `docs/informe.md`).

## Estructura

```
db/init/         01_schema.sql · 02_usuarios.sql · 03_datos_maestros.sql
backend/app/     API FastAPI (routers, validaciones, acceso a datos)
frontend/src/    Aplicación React
docs/            Informe, bitácora y diagrama entidad-relación
```

## Usuarios de prueba

> Se completa cuando exista el login (turno 03).

## Integrantes

| Nombre | Usuario GitHub |
|---|---|
| | |
| | |
| | |
| | |
