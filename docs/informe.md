# Informe — Sistema de Gestión del Torneo Interfacultades de Fútbol 5

## 1. Introducción

## 2. Modelo de datos
El esquema está en [`db/init/01_schema.sql`](../db/init/01_schema.sql) (MySQL 8.4, InnoDB, utf8mb4).
Cada decisión de diseño tiene su ADR en [`docs/adr/`](adr/README.md), y los supuestos están en [`supuestos.md`](supuestos.md).

### 2.1 Diagrama entidad-relación
El diagrama está en [`der/der.md`](der/der.md), en Mermaid, y sale del script.

### 2.2 Modelo relacional
Para cada tabla se indica la PK, las FK con su destino, los UNIQUE (UQ) y los CHECK (CK). Todas las columnas son
NOT NULL salvo las que dicen NULL. Todas las FK son `ON DELETE RESTRICT`; las que además son `ON UPDATE CASCADE` lo
aclaran.

- `login` (correo, contrasena, rol). PK(correo). CK de formato del correo y de largo del hash (≥ 60). rol ∈ {administrador, planillero}.
- `facultad` (id_facultad, nombre). PK(id_facultad). UQ(nombre).
- `jugador` (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo). PK(ci). FK id_facultad → facultad. UQ(email). CK de CI de 7 u 8 dígitos, formato del email y fecha_nacimiento ≥ 1900. tipo ∈ {grado, posgrado, docente, funcionario}.
- `torneo` (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado). PK(id_torneo). UQ(anio, semestre) y UQ(nombre). CK semestre ∈ {1, 2}, fecha_fin > fecha_inicio y YEAR(fecha_inicio) = anio. estado ∈ {inscripción, en curso, finalizado}.
- `equipo` (id_equipo, nombre, id_torneo, id_facultad, ci_capitan NULL). PK(id_equipo). FK id_torneo → torneo, id_facultad → facultad y (id_equipo, ci_capitan) → equipo_jugador_torneo(id_equipo, ci_jugador) con ON UPDATE CASCADE. UQ(nombre, id_torneo) y UQ(id_equipo, id_torneo).
- `equipo_jugador_torneo` (id_equipo, ci_jugador, id_torneo, numero_camiseta). PK(id_equipo, ci_jugador, id_torneo). FK (id_equipo, id_torneo) → equipo y ci_jugador → jugador con ON UPDATE CASCADE. UQ(ci_jugador, id_torneo), UQ(id_equipo, numero_camiseta) y UQ(id_equipo, ci_jugador). CK de camiseta entre 1 y 99.
- `complejo` (id_complejo, nombre, direccion, departamento). PK(id_complejo). UQ(nombre). departamento es uno de los 19 departamentos.
- `cancha` (nombre_cancha, id_complejo, superficie, techada). PK(nombre_cancha, id_complejo). FK id_complejo → complejo. superficie ∈ {sintético, parquet}.
- `turno` (id_turno, hora_inicio, hora_fin). PK(id_turno). UQ(hora_inicio). CK de hora_inicio entre 18:00 y 22:00 en hora en punto, y hora_fin = hora_inicio + 1 h.
- `partido` (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo, estado, ocupa_cancha, equipo_menor, equipo_mayor). Las tres últimas son columnas generadas. PK(id_partido, id_torneo) y UQ(id_partido). FK id_torneo → torneo, (id_equipo_local, id_torneo) → equipo, (id_equipo_visitante, id_torneo) → equipo, id_turno → turno y (nombre_cancha, id_complejo) → cancha con ON UPDATE CASCADE. UQ(nombre_cancha, id_complejo, dia, id_turno, ocupa_cancha) y UQ(id_torneo, equipo_menor, equipo_mayor). CK local ≠ visitante y numero_fecha ≥ 1. estado ∈ {programado, jugado, postergado, cancelado}.
- `planilla_partido` (id_partido, ci_jugador, id_equipo). PK(id_partido, ci_jugador). FK id_partido → partido(id_partido) y (id_equipo, ci_jugador) → equipo_jugador_torneo con ON UPDATE CASCADE.
- `gol` (id_gol, id_partido, ci_jugador, minuto, autogol). PK(id_gol). FK (id_partido, ci_jugador) → planilla_partido con ON UPDATE CASCADE. CK de minuto entre 1 y 60.
- `tarjeta` (id_tarjeta, id_partido, ci_jugador, minuto, color). PK(id_tarjeta). FK (id_partido, ci_jugador) → planilla_partido con ON UPDATE CASCADE. CK de minuto entre 1 y 60. color ∈ {amarilla, roja}.
- `sancion_jugador` (id_sancion, ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta NULL). PK(id_sancion). FK (ci_jugador, id_torneo) → equipo_jugador_torneo con ON UPDATE CASCADE, e id_tarjeta → tarjeta. UQ(id_tarjeta). CK numero_fecha_inicio ≥ 1 y cantidad_fechas ≥ 1; una disciplinaria no tiene tarjeta y una automática tiene tarjeta y dura 1 fecha. motivo ∈ {roja, acumulación de amarillas, disciplinaria}.

### 2.3 Mejoras implementadas o consideradas sobre el modelo propuesto

#### Implementadas
| Mejora | Motivo | ADR |
|---|---|---|
| FK compuesta `(id_equipo, id_torneo)` del plantel a `equipo`, más `UNIQUE(ci_jugador, id_torneo)` | La base controla la redundancia de `id_torneo`, y la regla de un jugador en un solo equipo por edición queda garantizada sin triggers. | 0003 |
| FK compuestas de `partido` a `equipo` que incluyen `id_torneo` | Los dos equipos del partido son de su edición. | 0005 |
| FK del capitán al plantel por `(id_equipo, ci_capitan)` | El capitán tiene que jugar en su propio equipo, no alcanza con que sea jugador. | 0004 |
| FK de la planilla al plantel, y de gol y tarjeta a la planilla | En la planilla solo hay jugadores del plantel, y solo convierten o reciben tarjeta los que están en la planilla. | 0005 |
| FK de la sanción al plantel por `(ci_jugador, id_torneo)` | Solo se sanciona a inscriptos, y el equipo del sancionado se obtiene con un JOIN directo. | 0005 |
| Columnas generadas con UNIQUE en `partido` | Un índice controla la cancha ocupada y el cruce repetido, teniendo en cuenta el estado del partido. | 0006 |
| Atributo `id_tarjeta` en `sancion_jugador` | Queda registrada la tarjeta que originó cada sanción automática. | 0010 |
| `UNIQUE(anio, semestre)` en `torneo` | Una edición por semestre. | |
| `UNIQUE(id_equipo, numero_camiseta)`, `UNIQUE(email)` y UNIQUE en los nombres | La letra no los prohíbe de forma explícita, pero los duplicados no tienen sentido. | |
| CHECK de dominio: minutos de 1 a 60, turnos de 1 h entre 18 y 23, camiseta de 1 a 99, CI y correos | Validación en la capa de base de datos. | 0009 |
| CHECK de largo sobre el hash de la contraseña | No se puede guardar una contraseña en texto plano. | 0008 |
| El resultado del partido no se guarda | Sale de los goles. Si se guardara, podría no coincidir con ellos. | |

#### Consideradas y no implementadas
| Mejora | Por qué no |
|---|---|
| Usar `(id_partido)` como PK de `partido` en lugar de `(id_partido, id_torneo)`. La PK de la letra es una superclave no mínima, porque `id_partido` ya es único. | Respetamos la PK de la letra y agregamos `UNIQUE(id_partido)`, que MySQL 8.4 exige por `restrict_fk_on_non_standard_key` para las FK de las tablas hijas (ADR 0002). |
| Sacar `id_torneo` de `equipo_jugador_torneo`, ya que depende de `id_equipo`. | La regla de un equipo por edición tendría que ir en un trigger. Preferimos la FK compuesta (ADR 0003). |
| Tablas catálogo para tipos y estados. | Son dominios cerrados y atados a reglas, y alcanza con ENUM (ADR 0001). |
| `ON DELETE CASCADE` de tarjeta a sanción. | No resuelve la acumulación de amarillas, y en MySQL los borrados en cascada no disparan triggers (ADR 0010). |

Probamos la cascada de CI con un jugador que es capitán y tiene plantel, planilla, goles, tarjetas y sanción. Un solo
`UPDATE jugador SET ci = ...` lleva la CI nueva a todas esas tablas.

## 3. Decisiones de implementación
### 3.1 Arquitectura y tecnologías
### 3.2 Reglas de negocio: dónde se valida cada una (front / back / base de datos)
Así quedó después del turno 01: qué garantiza el esquema y qué queda para triggers de los turnos siguientes. Cada turno completa lo que hace el front y el back.

| Regla de la letra | Base de datos | Turno |
|---|---|---|
| Torneo con 3 estados; tipos de jugador; estados de partido; colores; motivos | ENUM | 01 |
| Una edición por semestre | `uq_torneo_anio_semestre` | 01 |
| Turnos de 1 h entre 18:00 y 23:00 | `chk_turno_*` | 01 |
| Capitán es jugador de su plantel | `fk_equipo_capitan` | 01 |
| Equipo con capitán al pasar a `en curso` | trigger | 06 |
| Máx. 2 docentes/funcionarios por plantel | trigger | 06 |
| Plantel de 5 a 10 jugadores | trigger | 06/07 |
| Jugadores de la facultad del equipo | trigger | 06 |
| Un jugador en un solo equipo por edición | `uq_ejt_jugador_torneo` + `fk_ejt_equipo` | 01 |
| Planteles modificables solo en `inscripción` | trigger | 06 |
| Partido: ambos equipos de la misma edición | `fk_partido_local`, `fk_partido_visitante` | 01 |
| Partido: equipos con ≥ 5 jugadores | trigger | 07 |
| No enfrentarse a sí mismo | `chk_partido_equipos_distintos` | 01 |
| No repetir rival salvo cancelado | `uq_partido_cruce` | 01 |
| Un partido por equipo en la misma fecha | trigger | 07 |
| Cancha: un partido por día y turno | `uq_partido_cancha_turno` | 01 |
| Planilla: jugador del plantel de su equipo | `fk_planilla_plantel` | 01 |
| Planilla: equipo es local o visitante del partido | trigger | 08 |
| Planilla: jugador no suspendido | trigger | 08/09 |
| Goles/tarjetas solo de jugadores en la planilla | `fk_gol_planilla`, `fk_tarjeta_planilla` | 01 |
| Resultado calculado desde los goles | no se almacena; vista | 01/08 |
| `jugado` solo si el día y turno pasaron | trigger | 08 |
| Partido jugado no se elimina | RESTRICT desde la planilla (parcial) + trigger | 01/07 |
| Corrección del resultado solo en 48 h | trigger | 08 |
| Sanción automática (roja / 3 amarillas) | trigger; `chk_sancion_origen` fija 1 fecha | 09 |
| Suspendido no figura en planilla | trigger | 08/09 |
| Roles administrador / planillero | ENUM en `login`; usuarios de BD | 01/02 |
### 3.3 Seguridad (usuarios de base de datos y roles de la aplicación)

## 4. Reportes
### 4.1 Consultas pedidas
### 4.2 Consultas propuestas por el grupo

## 5. Bitácora
Ver [bitacora.md](bitacora.md).

## 6. Bibliografía
