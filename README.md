# Torneo Interfacultades de Fútbol 5 (UCU)

Trabajo obligatorio de **Base de Datos 1** (UCU, 2.º semestre 2026).
Sistema para gestionar equipos, planteles, fixture, planillas de juego, sanciones y reportes del torneo.

| Capa | Tecnología |
|---|---|
| Base de datos | MySQL 8.4 (scripts en `db/init/`) |
| Backend | Python 3.12 + FastAPI, SQL directo con `mysql-connector-python` (sin ORM) |
| Frontend | React 18 + Vite |
| Infraestructura | Docker Compose (`db`, `api`, `web`) |

## Cómo correrlo (Docker)

Necesitamos Docker Desktop instalado y abierto, y los puertos 3307, 8000 y 5173 libres.
Si ya está corriendo el proyecto desde otra carpeta, lo detenemos allí con
`docker compose down` antes de levantar esta copia.

```bash
cp .env.example .env        # en desarrollo no cambiar las claves de MySQL (ver Usuarios de prueba)
```

Antes de levantar los contenedores, generamos una clave aleatoria con
`python -c "import secrets; print(secrets.token_urlsafe(32))"` y la ponemos en
`JWT_SECRET` dentro de `.env`. La API exige al menos 32 bytes y no inicia con
el valor vacío del ejemplo.

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8000 (documentación interactiva en `/docs`)
- MySQL: `localhost:3307` (publicamos el 3307 para no chocar con un MySQL instalado en la PC; dentro de Docker la API usa el 3306)

Los scripts de `db/init/` se ejecutan **solo la primera vez** que se crea el volumen.
Para recrear la base desde cero:

```bash
docker compose down -v && docker compose up --build
```

## Estructura

```
db/init/         01_schema.sql · 02_usuarios.sql · 03_datos_maestros.sql
backend/app/     API FastAPI: routers/ (endpoints), schemas/ (validación), repos/ (SQL),
                 auth.py (login y roles), errores.py (errores de MySQL a HTTP)
frontend/src/    Aplicación React: pages/, components/, auth/ (sesión), api.js
docs/            Informe, bitácora y diagrama entidad-relación
```

## Usuarios de prueba

Las cuentas de la aplicación ya están cargadas en la tabla `login`. Para entrar,
abrimos http://localhost:5173 e ingresamos con alguna de estas cuentas. El
administrador ve todas las secciones del menú; el planillero solo ve Planillas.

| Correo | Contraseña de prueba | Rol |
|---|---|---|
| admin@torneo.example | AdminPrueba2026! | administrador |
| planillero@torneo.example | PlanilleroPrueba2026! | planillero |

Guardamos las contraseñas como hashes bcrypt con costo 12. El backend las
verifica en `POST /auth/login` y devuelve un token JWT con el correo y el rol.
Para probar la API desde `/docs`, hacemos login, copiamos el `token` y lo
pegamos en el botón Authorize.

Las cuentas de MySQL son distintas de las de la aplicación:

- `app_admin`: usamos `DB_ADMIN_PASSWORD` de `.env.example`. Puede consultar,
  insertar, modificar y borrar los datos que administra. Las altas y bajas de
  sanciones disciplinarias pasan por procedimientos; no puede crear ni borrar
  sanciones automáticas directamente. No puede cambiar tablas ni dar permisos.
- `app_planillero`: usamos `DB_PLANILLERO_PASSWORD` de `.env.example`. Puede
  consultar los datos necesarios para cargar planillas, escribir en
  `planilla_partido`, `gol` y `tarjeta`, y marcar un partido como jugado con el
  procedimiento `marcar_partido_jugado`. No puede modificar la tabla `partido`
  directamente, leer `login` ni modificar jugadores, equipos o sanciones.

Dejamos las contraseñas de desarrollo en `db/init/02_usuarios.sql`, iguales a
`.env.example`. Elegimos un SQL fijo para que lo ejecute directamente el init
de MySQL sin cambiar Docker Compose. Copiar o editar `.env` no cambia las
contraseñas del script ni las cuentas ya creadas.

Para un entorno de producción cambiamos las contraseñas de prueba. Si la base
ya existe, cambiamos las claves con `ALTER USER` desde una conexión de root y
actualizamos `.env` con los mismos valores. Para una instalación nueva,
ajustamos las claves del script de usuarios antes de inicializar la base.
Las claves reales no se suben al repositorio.

Los datos de prueba incluyen cinco facultades, cinco turnos de una hora entre las 18 y las 23,
tres complejos, seis equipos en la edición 2 y 53 jugadores ficticios. En esa edición hay
tres fechas jugadas, partidos programados, uno postergado y uno cancelado, y sanciones
por roja, tres amarillas y motivo disciplinario. La dejamos en curso para cargar planillas
de las fechas 4 y 5 durante la defensa (S-31).

Para comprobar los permisos, entramos a MySQL como `app_planillero` y usamos
`SHOW GRANTS;`. Un intento de insertar en `jugador` tiene que fallar por permisos.
Para insertar un gol necesitamos un jugador en la planilla del partido. Los partidos
10 a 13 están programados y sirven para probarlo.

## Integrantes

| Nombre | Usuario GitHub |
|---|---|
| | |
| | |
| | |
| | |
