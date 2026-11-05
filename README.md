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
cp .env.example .env
```

`.env.example` ya trae las claves de desarrollo de MySQL y una clave de desarrollo para firmar los tokens
(`JWT_SECRET`), así que alcanza con copiarlo. En desarrollo no cambiamos las claves de MySQL (ver Usuarios de
prueba). En producción se cambian todas, y `JWT_SECRET` se reemplaza por una clave aleatoria de al menos 32 bytes,
por ejemplo la que da `python -c "import secrets; print(secrets.token_urlsafe(32))"`.

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

## Cómo correrlo sin Docker

Lo probamos en Windows con PowerShell. Necesitamos:

- Un servidor MySQL 8.4 instalado y corriendo, con el cliente `mysql` en el PATH.
- Python 3.13.
- Node 24.

Todos los comandos se corren desde la carpeta del repositorio. En los comandos de `mysql` usamos el puerto 3308,
que es donde lo probamos; si el servidor usa otro (el habitual es 3306), hay que cambiar `-P` y `DB_PORT`.

### Base de datos

Corremos los tres scripts como root y en orden. El primero borra y crea la base `torneo_futbol5`. Cada comando pide
la contraseña de root.

```powershell
mysql -h 127.0.0.1 -P 3308 -u root -p --default-character-set=utf8mb4 --commands -e "source db/init/01_schema.sql"
mysql -h 127.0.0.1 -P 3308 -u root -p --default-character-set=utf8mb4 --commands -e "source db/init/02_usuarios.sql"
mysql -h 127.0.0.1 -P 3308 -u root -p --default-character-set=utf8mb4 --commands -e "source db/init/03_datos_maestros.sql"
```

`--commands` habilita `source`, que en las versiones nuevas del cliente viene apagado.

Después ponemos el servidor en la hora de Uruguay. Las reglas de partido jugado y de las 48 horas usan `NOW()`, y en
Docker esto lo resuelve la variable `TZ` del servicio `db`.

```powershell
mysql -h 127.0.0.1 -P 3308 -u root -p -e "SET GLOBAL time_zone = '-03:00';"
```

El cambio vale para las conexiones nuevas y se pierde si se reinicia el servidor; en ese caso hay que repetirlo.

### Backend

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
Copy-Item .env.example .env.local
```

El back no lee `.env` solo: las variables se las pasamos a `uvicorn` con `--env-file`. En `.env.local` (ya está en
`.gitignore`) cambiamos `DB_HOST=db` por `DB_HOST=127.0.0.1` y `DB_PORT=3306` por el puerto del MySQL local, en
nuestro caso `DB_PORT=3308`. Las claves de los usuarios de MySQL quedan como en el ejemplo, porque son las que crea
`02_usuarios.sql`.

```powershell
cd backend
uvicorn app.main:app --port 8000 --env-file ../.env.local
```

La API queda en http://localhost:8000 (documentación en `/docs`).

### Frontend

En otra terminal, desde la carpeta del repositorio:

```powershell
cd frontend
npm install
npm run dev
```

El front queda en http://localhost:5173 y usa la API de http://localhost:8000. Hay que abrirlo como `localhost` y no
como `127.0.0.1`, porque la API solo acepta pedidos de ese origen (CORS).

## Estructura

```
db/init/         01_schema.sql · 02_usuarios.sql · 03_datos_maestros.sql
db/tests/        pruebas de reglas y de permisos (ver Pruebas de la base)
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
por roja, tres amarillas y motivo disciplinario. La dejamos en curso, con las fechas 4 y 5
programadas, para poder probar el registro de planillas (S-31).

Para comprobar los permisos, entramos a MySQL como `app_planillero` y usamos
`SHOW GRANTS;`. Un intento de insertar en `jugador` tiene que fallar por permisos.
Para insertar un gol necesitamos un jugador en la planilla del partido. Los partidos
10 a 13 están programados y sirven para probarlo.

## Pruebas de la base

En `db/tests/` hay tres scripts que intentan cosas que la base tiene que rechazar. Cada intento lleva arriba un
comentario con el error esperado, y los que cambian datos van dentro de una transacción que se deshace al final, así
que la base queda igual. Los corremos con `--force` para que el cliente siga después de cada error. PowerShell no
tiene el `<` para pasarle un archivo a un programa, por eso usamos `cmd /c`. Los comandos son para la base de Docker
(puerto 3307); sin Docker se cambia el puerto.

`pruebas_negativas.sql` prueba las reglas de la letra (plantel, partidos, planillas, sanciones y constraints). Se
corre como root, con `MYSQL_ROOT_PASSWORD` de `.env`, y tiene que mostrar 50 errores:

```powershell
cmd /c "mysql -h 127.0.0.1 -P 3307 -u root -p --default-character-set=utf8mb4 --force < db\tests\pruebas_negativas.sql"
```

`pruebas_permisos.sql` se corre como `app_planillero` (clave `DB_PLANILLERO_PASSWORD`). Puede cargar planilla, gol y
tarjeta, y recibe 1142 al modificar `partido`, crear un jugador, borrar una sanción o leer `login`:

```powershell
cmd /c "mysql -h 127.0.0.1 -P 3307 -u app_planillero -p --default-character-set=utf8mb4 --force < db\tests\pruebas_permisos.sql"
```

`pruebas_permisos_admin.sql` se corre como `app_admin` (clave `DB_ADMIN_PASSWORD`). Recibe 1142 al insertar o borrar
directo en `sancion_jugador`, puede crear y borrar una disciplinaria con los procedimientos, y recibe 1644 si intenta
borrar una automática:

```powershell
cmd /c "mysql -h 127.0.0.1 -P 3307 -u app_admin -p --default-character-set=utf8mb4 --force < db\tests\pruebas_permisos_admin.sql"
```

## Integrantes

| Nombre | Usuario GitHub |
|---|---|
| Agustín Martínez | [AgustinMartinezf](https://github.com/AgustinMartinezf) |
| Facundo Aramburu | [faacuaramburu](https://github.com/faacuaramburu) |
| Gerónimo Sosa | [geronimososa](https://github.com/geronimososa) |
| Juan Medina | [JuanMedina7](https://github.com/JuanMedina7) |
