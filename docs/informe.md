# Informe del Sistema de Gestión del Torneo Interfacultades de Fútbol 5

## 1. Introducción

## 2. Modelo de datos
El script de la base está en [`db/init/01_schema.sql`](../db/init/01_schema.sql). Las decisiones que tomamos están
explicadas una por una en [`docs/adr/`](adr/README.md), y lo que tuvimos que suponer está en [`supuestos.md`](supuestos.md).

### 2.1 Diagrama entidad-relación
El diagrama está en [`der/der.md`](der/der.md). Lo hicimos con Mermaid a partir del script.

### 2.2 Modelo relacional
Para cada tabla se indica la PK, las FK con su destino, los UNIQUE (UQ) y los CHECK (CK). Todas las columnas son
NOT NULL salvo las que dicen NULL. Todas las FK son `ON DELETE RESTRICT`; las que además son `ON UPDATE CASCADE` lo
aclaran.

- `login` (correo, contrasena, rol). PK(correo). CK de formato del correo y de formato de hash bcrypt. rol ∈ {administrador, planillero}.
- `facultad` (id_facultad, nombre). PK(id_facultad). UQ(nombre).
- `jugador` (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo). PK(ci). FK id_facultad → facultad. UQ(email). CK de CI de 7 u 8 dígitos, formato del email y fecha_nacimiento ≥ 1900. tipo ∈ {grado, posgrado, docente, funcionario}.
- `torneo` (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado). PK(id_torneo). UQ(anio, semestre) y UQ(nombre). CK semestre ∈ {1, 2}, fecha_fin > fecha_inicio y YEAR(fecha_inicio) = anio. estado ∈ {inscripción, en curso, finalizado}.
- `equipo` (id_equipo, nombre, id_torneo, id_facultad, ci_capitan NULL). PK(id_equipo). FK id_torneo → torneo, id_facultad → facultad y (id_equipo, ci_capitan) → equipo_jugador_torneo(id_equipo, ci_jugador) con ON UPDATE CASCADE. UQ(nombre, id_torneo) y UQ(id_equipo, id_torneo).
- `equipo_jugador_torneo` (id_equipo, ci_jugador, id_torneo, numero_camiseta). PK(id_equipo, ci_jugador, id_torneo). FK (id_equipo, id_torneo) → equipo y ci_jugador → jugador con ON UPDATE CASCADE. UQ(ci_jugador, id_torneo), UQ(id_equipo, numero_camiseta) y UQ(id_equipo, ci_jugador). CK de camiseta entre 1 y 99. Trigger `trg_ejt_no_cambiar_equipo`, que no deja cambiar id_equipo ni id_torneo.
- `complejo` (id_complejo, nombre, direccion, departamento). PK(id_complejo). UQ(nombre). departamento es uno de los 19 departamentos.
- `cancha` (nombre_cancha, id_complejo, superficie, techada). PK(nombre_cancha, id_complejo). FK id_complejo → complejo. superficie ∈ {sintético, parquet}.
- `turno` (id_turno, hora_inicio, hora_fin). PK(id_turno). UQ(hora_inicio). CK de hora_inicio entre 18:00 y 22:00 en hora en punto, y hora_fin = hora_inicio + 1 h.
- `partido` (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo, estado, ocupa_cancha, equipo_menor, equipo_mayor). Las tres últimas son columnas generadas. PK(id_partido, id_torneo) y UQ(id_partido). FK id_torneo → torneo, (id_equipo_local, id_torneo) → equipo, (id_equipo_visitante, id_torneo) → equipo, id_turno → turno y (nombre_cancha, id_complejo) → cancha con ON UPDATE CASCADE. UQ(nombre_cancha, id_complejo, dia, id_turno, ocupa_cancha) y UQ(id_torneo, equipo_menor, equipo_mayor). CK local ≠ visitante y numero_fecha ≥ 1. estado ∈ {programado, jugado, postergado, cancelado}.
- `planilla_partido` (id_partido, ci_jugador, id_equipo). PK(id_partido, ci_jugador). FK id_partido → partido(id_partido) y (id_equipo, ci_jugador) → equipo_jugador_torneo con ON UPDATE CASCADE.
- `gol` (id_gol, id_partido, ci_jugador, minuto, autogol). PK(id_gol). FK (id_partido, ci_jugador) → planilla_partido con ON UPDATE CASCADE. CK de minuto entre 1 y 60.
- `tarjeta` (id_tarjeta, id_partido, ci_jugador, minuto, color). PK(id_tarjeta). FK (id_partido, ci_jugador) → planilla_partido con ON UPDATE CASCADE. CK de minuto entre 1 y 60. color ∈ {amarilla, roja}.
- `sancion_jugador` (id_sancion, ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta NULL). PK(id_sancion). FK (ci_jugador, id_torneo) → equipo_jugador_torneo con ON UPDATE CASCADE, e id_tarjeta → tarjeta. UQ(id_tarjeta). CK numero_fecha_inicio ≥ 1 y cantidad_fechas ≥ 1; una disciplinaria no tiene tarjeta y una automática tiene tarjeta y dura 1 fecha. motivo ∈ {roja, acumulación de amarillas, disciplinaria}.

### 2.3 Mejoras implementadas o consideradas sobre el modelo propuesto

#### Mejoras que hicimos
1. En `equipo_jugador_torneo` dejamos el `id_torneo` aunque se repite con el de `equipo`, pero le pusimos una FK compuesta `(id_equipo, id_torneo)` contra `equipo` para que no pueda quedar distinto. Con eso pudimos poner `UNIQUE(ci_jugador, id_torneo)`, y así un jugador no puede estar en dos equipos del mismo torneo.
2. En `partido` hicimos lo mismo para los dos equipos: las FK incluyen el `id_torneo`, entonces no se puede armar un partido con un equipo de otra edición.
3. La FK del capitán apunta al plantel del equipo y no a `jugador`, para que el capitán sea sí o sí de su equipo. Puede quedar en NULL mientras se arma el plantel.
4. La planilla apunta al plantel, y los goles y las tarjetas apuntan a la planilla. Así no se puede cargar un gol o una tarjeta de alguien que no está en la planilla.
5. La sanción apunta al plantel con `(ci_jugador, id_torneo)`, así solo se sanciona a jugadores inscriptos en ese torneo. También le agregamos `id_tarjeta` para saber qué tarjeta generó cada sanción automática.
6. En `partido` agregamos tres columnas generadas (`ocupa_cancha`, `equipo_menor` y `equipo_mayor`) que quedan en NULL según el estado del partido, y les pusimos UNIQUE. Como MySQL no compara los NULL en un UNIQUE, con esto una cancha no puede tener dos partidos el mismo día y turno, y dos equipos no se pueden enfrentar dos veces, salvo que el partido anterior se haya cancelado.
7. Agregamos UNIQUE que la letra no tenía: un torneo por año y semestre, número de camiseta por equipo, email del jugador y los nombres.
8. Agregamos CHECK para validar en la base: minutos de 1 a 60, turnos de una hora entre las 18 y las 23, camiseta de 1 a 99, formato de la CI y de los correos, y que la contraseña tenga el formato de un hash bcrypt (porque guardamos el hash).
9. No guardamos el resultado del partido. Se calcula con los goles, así no puede pasar que el resultado no coincida con los goles cargados.

#### Mejoras que pensamos pero no hicimos
- La PK de `partido`. En la letra es `(id_partido, id_torneo)`, pero como `id_partido` es autoincremental ya alcanzaría solo con él, así que esa PK es una superclave y no una clave mínima. La dejamos como en la letra y agregamos `UNIQUE(id_partido)`, porque sin eso MySQL 8.4 no nos dejaba crear la FK desde `planilla_partido` (por la opción `restrict_fk_on_non_standard_key`).
- Sacar `id_torneo` del plantel porque es redundante. No lo hicimos porque la regla de un equipo por torneo tendría que ir en un trigger.
- Hacer tablas aparte para los tipos y estados en vez de ENUM. Son pocos valores y no cambian, así que nos alcanzó con ENUM.
- Que al borrar una tarjeta se borre sola su sanción (`ON DELETE CASCADE`). No lo hicimos porque con la acumulación de amarillas no funciona bien y porque en MySQL los borrados en cascada no disparan triggers.

También probamos cambiar la CI de un jugador que era capitán y tenía goles, tarjetas y una sanción, y la CI nueva quedó en todas las tablas.

Revisando el CASCADE nos dimos cuenta de que en las FK compuestas hacia el plantel también arrastra `id_equipo`. Si se
movía a un jugador de equipo con un UPDATE, sus planillas viejas pasaban al equipo nuevo sin dar error. Lo cerramos con
un trigger que no deja cambiar el equipo de una fila del plantel (ADR 0007).

## 3. Decisiones de implementación
### 3.1 Arquitectura y tecnologías
El servidor de MySQL corre con la hora de Uruguay (`TZ: America/Montevideo` en `docker-compose.yml`). Lo necesitamos
porque las reglas que dependen de la hora, como que un partido solo se marca como jugado si ya terminó su turno, usan
`NOW()` en la base.
### 3.2 Reglas de negocio: dónde se valida cada una (front / back / base de datos)
En esta tabla pusimos cada regla de la letra y cómo la controla la base. Las que se pueden hacer con constraints ya
están en el script. Las otras las vamos a hacer con triggers cuando hagamos esa parte, y ahí también agregamos lo que
valida el front y el back.

| Regla de la letra | Base de datos | Estado |
|---|---|---|
| Torneo con 3 estados; tipos de jugador; estados de partido; colores; motivos | ENUM | implementada |
| Una edición por semestre | `uq_torneo_anio_semestre` | implementada |
| Turnos de 1 h entre 18:00 y 23:00 | `chk_turno_*` | implementada |
| Capitán es jugador de su plantel | `fk_equipo_capitan` | implementada |
| Equipo con capitán al pasar a `en curso` | trigger | pendiente, ABM de equipos |
| Máx. 2 docentes/funcionarios por plantel | trigger | pendiente, ABM de equipos |
| Plantel de 5 a 10 jugadores | trigger | pendiente, ABM de equipos y de partidos |
| Jugadores de la facultad del equipo | trigger | pendiente, ABM de equipos |
| Un jugador en un solo equipo por edición | `uq_ejt_jugador_torneo` + `fk_ejt_equipo` | implementada |
| Un jugador no se cambia de equipo con un UPDATE (se saca y se inscribe de nuevo) | `trg_ejt_no_cambiar_equipo` | implementada |
| Planteles modificables solo en `inscripción` | trigger | pendiente, ABM de equipos |
| Partido: ambos equipos de la misma edición | `fk_partido_local`, `fk_partido_visitante` | implementada |
| Partido: equipos con ≥ 5 jugadores | trigger | pendiente, ABM de partidos |
| No enfrentarse a sí mismo | `chk_partido_equipos_distintos` | implementada |
| No repetir rival salvo cancelado | `uq_partido_cruce` | implementada |
| Un partido por equipo en la misma fecha | trigger | pendiente, ABM de partidos |
| Cancha: un partido por día y turno | `uq_partido_cancha_turno` | implementada |
| Planilla: jugador del plantel de su equipo | `fk_planilla_plantel` | implementada |
| Planilla: equipo es local o visitante del partido | trigger | pendiente, planillas |
| Planilla: jugador no suspendido | trigger | pendiente, planillas y sanciones |
| Goles/tarjetas solo de jugadores en la planilla | `fk_gol_planilla`, `fk_tarjeta_planilla` | implementada |
| Resultado calculado desde los goles | no se guarda; se calcula con una vista | esquema listo, vista pendiente |
| `jugado` solo si el día y turno pasaron | procedimiento `marcar_partido_jugado` (planillero) + trigger | parcial, falta el trigger para el administrador |
| Partido jugado no se elimina | RESTRICT desde la planilla + trigger | parcial, falta el trigger del ABM de partidos |
| Corrección del resultado solo en 48 h | trigger | pendiente, planillas |
| Sanción automática (roja / 3 amarillas) | trigger; `chk_sancion_origen` fija 1 fecha | parcial, falta el trigger de sanciones |
| Suspendido no figura en planilla | trigger | pendiente, planillas y sanciones |
| Roles administrador / planillero | ENUM en `login`; usuarios de BD `app_admin` y `app_planillero` | implementada |

### 3.3 Seguridad (usuarios de base de datos y roles de la aplicación)
La seguridad la pusimos en dos lugares. En la aplicación, cada cuenta de `login` tiene un rol (administrador o
planillero) y la contraseña se guarda como hash bcrypt. En la base creamos un usuario de MySQL por rol, y el backend usa
la conexión del rol de quien inició sesión. Así, aunque el back tuviera un error, la base no deja que un planillero
haga algo que no le corresponde.

- `app_admin` puede consultar, insertar, modificar y borrar datos en todas las tablas del esquema. No puede crear ni
  modificar tablas, ni dar permisos a otros usuarios.
- `app_planillero` puede consultar las tablas que necesita para cargar una planilla: facultades, jugadores, torneos,
  equipos, planteles, complejos, canchas, turnos, partidos y sanciones. Puede insertar, modificar y borrar en
  `planilla_partido`, `gol` y `tarjeta`. No puede modificar `partido` ni leer `login`.

Para marcar un partido como jugado, el planillero usa el procedimiento `marcar_partido_jugado`. Al principio le dábamos
permiso para modificar la columna `estado`, pero MySQL no deja limitar a qué valor se cambia, y así podía cancelar o
postergar partidos, que libera la cancha y el cruce. El procedimiento es `SQL SECURITY DEFINER`: corre con los permisos
de quien lo creó, y solo pasa un partido de `programado` a `jugado` si ya terminó su turno. Al planillero le damos
`EXECUTE` sobre ese procedimiento y nada más sobre `partido`.

Los permisos están en [`db/init/02_usuarios.sql`](../db/init/02_usuarios.sql). Como al planillero le damos permisos
tabla por tabla, cada vista o procedimiento nuevo que tenga que usar lleva su propio `GRANT`.

## 4. Reportes
### 4.1 Consultas pedidas
### 4.2 Consultas propuestas por el grupo

## 5. Bitácora
Ver [bitacora.md](bitacora.md).

## 6. Bibliografía
