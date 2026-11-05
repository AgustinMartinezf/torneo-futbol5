# Informe del Sistema de Gestión del Torneo Interfacultades de Fútbol 5

## 1. Introducción
Este informe acompaña el trabajo obligatorio de Base de Datos 1. La letra pide un sistema para gestionar el Torneo
Interfacultades de Fútbol 5 de la UCU, que controle sus reglas: entre otras, que una cancha no tenga dos partidos en el
mismo día y turno, que un equipo no juegue dos partidos en la misma fecha y que un jugador suspendido no figure en la
planilla de un partido. El sistema que hicimos gestiona las ediciones del torneo, los equipos y sus planteles, el
fixture, las planillas de juego, las sanciones y los reportes.

La base es MySQL 8.4 y las reglas de la letra están garantizadas en ella con constraints, triggers y procedimientos,
para que no dependan solo del back o del front. La API está hecha en Python con FastAPI y SQL escrito a mano con
`mysql-connector-python`, sin ORM, y el front en React. Hay dos roles: el administrador gestiona todo y el planillero
solo carga planillas, goles y tarjetas. Cada rol usa su propio usuario de MySQL con permisos distintos.

En la sección 2 está el modelo de datos y lo que le cambiamos al de la letra. En la 3, las decisiones de
implementación: dónde validamos cada regla y cómo armamos la seguridad. En la 4 están las consultas de los reportes, en
la 5 la bitácora y en la 6 la bibliografía. Cómo instalarlo y correrlo está en el [README](../README.md).

## 2. Modelo de datos
El script de la base está en [`db/init/01_schema.sql`](../db/init/01_schema.sql). Las decisiones que tomamos están
explicadas una por una en [`docs/adr/`](adr/README.md), y lo que tuvimos que suponer está en [`supuestos.md`](supuestos.md).

### 2.1 Diagrama entidad-relación
El diagrama está en [`der/der.md`](der/der.md). Lo hicimos con Mermaid a partir del script.
El resultado de un partido no se guarda: lo calcula la vista `v_resultado_partido` a partir de los goles.

### 2.2 Modelo relacional
Para cada tabla se indica la PK, las FK con su destino, los UNIQUE (UQ) y los CHECK (CK). Todas las columnas son
NOT NULL salvo las que dicen NULL. Todas las FK son `ON DELETE RESTRICT`; las que además son `ON UPDATE CASCADE` lo
aclaran.

- `login` (correo, contrasena, rol). PK(correo). CK de formato del correo y de formato de hash bcrypt. rol ∈ {administrador, planillero}.
- `facultad` (id_facultad, nombre). PK(id_facultad). UQ(nombre).
- `jugador` (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo). PK(ci). FK id_facultad → facultad. UQ(email). CK de CI de 7 u 8 dígitos, formato del email y fecha_nacimiento ≥ 1900. Triggers de alta y edición para el dígito verificador de la CI y la edad entre 16 y 120 años. tipo ∈ {grado, posgrado, docente, funcionario}.
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
10. Validamos el dígito verificador de la CI y una edad de 16 a 120 años en los triggers de `jugador`. El formulario y el back aplican las mismas reglas.

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
`NOW()` en la base. Sin Docker, la hora se configura en el servidor con `SET GLOBAL time_zone = '-03:00'` (ver el README).

El backend está separado en tres partes: `routers/` recibe los pedidos HTTP, `schemas/` tiene los modelos de Pydantic
que validan los datos de entrada y `repos/` tiene las consultas SQL, escritas a mano y siempre con parámetros (`%s`).

Cuando la base rechaza algo, el error llega con el nombre de la constraint (por ejemplo `uq_partido_cruce`) o, si viene
de un trigger o procedimiento, con un `SIGNAL SQLSTATE '45000'` que ya trae el mensaje en español. En `app/errores.py`
tenemos un manejo común que transforma esos errores en respuestas con un `detail` que entiende el usuario: 400 para datos
inválidos, 409 para duplicados o datos que están en uso y 403 si el usuario de MySQL no tiene permiso. Los errores de
validación de Pydantic también los pasamos a un mensaje en español. El front muestra ese `detail` tal cual.

### 3.2 Reglas de negocio: dónde se valida cada una (front / back / base de datos)
En cada regla indicamos qué evita el formulario, qué comprueba la API y qué garantiza MySQL.
Cuando un valor depende de otras filas, el backend lo comprueba antes de escribir y la base vuelve a controlarlo.

| Regla de la letra | Front | Back | Base de datos |
|---|---|---|---|
| Torneo con 3 estados; tipos de jugador; estados de partido; colores; motivos | Selectores de los formularios | Schemas con valores permitidos | ENUM |
| Una edición por semestre | validarTorneo | Router de torneos y traducción de duplicados | `uq_torneo_anio_semestre` |
| Turnos de 1 h entre 18:00 y 23:00 | Turnos de consulta, sin formulario de cambio | GET /turnos; no hay escritura | `chk_turno_*`; `app_admin` solo puede consultar `turno` (S-14) |
| Complejo en uno de los 19 departamentos | validarComplejo | ComplejoIn | ENUM `departamento` |
| Superficie de la cancha `sintético` o `parquet`; techada sí o no | validarCancha | CanchaIn | ENUM `superficie`, `chk_cancha_techada` |
| Nombre de cancha único dentro del complejo | Formulario muestra el conflicto | Traducción del duplicado en errores.py | `pk_cancha` |
| Una cancha no cambia de complejo | El complejo no se ofrece como campo editable de cancha | Router de canchas | `trg_cancha_no_cambiar_complejo` (S-15) |
| No borrar un complejo con canchas ni una cancha con partidos | Confirmación muestra el error | Traducción de FK en errores.py | `fk_cancha_complejo`, `fk_partido_cancha` (RESTRICT) |
| Capitán es jugador de su plantel | Selector de capitanes del plantel | actualizar_equipo comprueba pertenencia | `fk_equipo_capitan` |
| Equipo con capitán al pasar a `en curso` | validarTorneo | Router de torneos comprueba plantel y capitán | `trg_torneo_validar_update` |
| Máx. 2 docentes/funcionarios por plantel | Cupo visible y candidatos restringidos | inscribir_jugador comprueba el cupo | triggers del plantel y `trg_jugador_validar_update` |
| Máx. 10 jugadores; mínimo 5 al iniciar la edición | Cupo visible; validarTorneo al iniciar | inscribir_jugador y router de torneos | `trg_ejt_validar_insert`, `trg_torneo_validar_update` |
| Jugadores de la facultad del equipo | Lista jugadores de la facultad | inscribir_jugador comprueba facultad | triggers del plantel, de jugador y de equipo |
| Un jugador en un solo equipo por edición | Lista jugadores disponibles | inscribir_jugador comprueba inscripción | `uq_ejt_jugador_torneo` + `fk_ejt_equipo` |
| Un jugador no se cambia de equipo con un UPDATE (se saca y se inscribe de nuevo) | Solo se permite sacar e inscribir | No hay endpoint para cambiar equipo | `trg_ejt_no_cambiar_equipo` |
| Planteles modificables solo en `inscripción` | Plantel de solo lectura fuera de inscripción | validar_inscripcion | `trg_ejt_validar_insert`, `trg_ejt_no_cambiar_equipo`, `trg_ejt_validar_delete` |
| Estados de la edición avanzan en orden | validarTorneo | Router de torneos comprueba transición | `trg_torneo_validar_insert`, `trg_torneo_validar_update` (S-16) |
| Partido: ambos equipos de la misma edición | validarPartido | validar_datos_partido | `fk_partido_local`, `fk_partido_visitante` |
| Partido: equipos con ≥ 5 jugadores | validarPartido | validar_datos_partido | `trg_partido_validar_insert` / `_update` |
| Partido: solo en una edición en curso, se crea como programado | Selector solo de ediciones en curso | crear_partido y validar_datos_partido | `trg_partido_validar_insert` / `_update` (S-19) |
| No enfrentarse a sí mismo | validarPartido | PartidoIn y validar_datos_partido | `chk_partido_equipos_distintos` |
| No repetir rival salvo cancelado | validarPartido | validar_datos_partido | `uq_partido_cruce` |
| Un partido por equipo en la misma fecha | validarPartido | validar_datos_partido | `trg_partido_validar_insert` / `_update` (S-20) |
| Partido: día dentro de las fechas de la edición | validarPartido | validar_datos_partido | `trg_partido_validar_insert` / `_update` (S-02) |
| Cambios de estado del partido; jugado y cancelado no cambian | TRANSICIONES_PARTIDO y campos bloqueados | actualizar_partido comprueba transición | `trg_partido_validar_update` (S-01, S-19) |
| Cancha: un partido por día y turno | validarPartido | validar_datos_partido | `uq_partido_cancha_turno` |
| Planilla: jugador del plantel de su equipo | Solo muestra jugadores del plantel | agregar_jugador comprueba pertenencia | `fk_planilla_plantel` |
| Planilla: equipo es local o visitante del partido | Planilla del partido elegido | agregar_jugador comprueba equipos | `trg_planilla_validar_insert` / `_update` |
| Planilla: solo una vez disputado el partido (no antes de su hora de inicio) | Botones bloqueados antes del inicio | agregar_jugador comprueba turno_empezado | `trg_planilla_validar_insert` / `_update` (S-22) |
| Planilla: jugador no suspendido | Agregar deshabilitado para suspendidos | agregar_jugador consulta suspensión | `trg_planilla_validar_insert` / `_update` con la función `jugador_suspendido` |
| Goles/tarjetas solo de jugadores en la planilla | Selectores de jugadores presentes | agregar_gol y agregar_tarjeta comprueban planilla | `fk_gol_planilla`, `fk_tarjeta_planilla` |
| Resultado calculado desde los goles | Resultado visible en PlanillasPage | Repo consulta la vista | no se guarda; lo calcula la vista `v_resultado_partido` (el autogol suma al rival) |
| `jugado` solo si el día y turno pasaron | Botón habilitado al terminar el turno | marcar_partido_jugado comprueba hora | procedimiento `marcar_partido_jugado` (planillero) + `trg_partido_validar_update` |
| Partido jugado no se elimina | No se ofrece borrar un jugado | eliminar_partido lo rechaza | RESTRICT desde la planilla + `trg_partido_validar_delete` |
| Corrección del resultado solo en 48 h | Planilla de solo lectura al vencer | Routers de planillas comprueban puede_editar | `trg_planilla_validar_*`, `trg_gol_validar_*`, `trg_tarjeta_validar_*` (S-22) |
| Sanción automática por roja, 1 fecha desde la fecha siguiente | Se muestra sanción automática, sin formulario | No hay endpoint de alta automática | `trg_tarjeta_generar_sancion`; `chk_sancion_origen` fija 1 fecha |
| Sanción automática por cada 3 amarillas en la edición | Se muestra sanción automática, sin formulario | No hay endpoint de alta automática | `trg_tarjeta_generar_sancion` y procedimiento `recalcular_sanciones_amarillas` (S-23) |
| Al borrar una tarjeta se revierte su sanción | Botón Quitar tarjeta | Endpoint de baja de tarjeta | `trg_tarjeta_validar_delete` (S-24); las tarjetas no se modifican (`trg_tarjeta_validar_update`, S-25) |
| Una sanción automática coincide con su tarjeta y no se edita a mano | Automáticas sin Editar/Borrar | Router de sanciones rechaza cambios automáticos | `trg_sancion_validar_insert` / `_update`, `uq_sancion_tarjeta`; `app_admin` no tiene INSERT ni DELETE directos |
| Sanciones disciplinarias de varias fechas, en ediciones en curso | validarSancion | validar_disciplinaria | `trg_sancion_validar_insert` / `_update` (S-27) |
| Suspendido no se agrega a una planilla de las fechas de su sanción; una disciplinaria no se carga sobre una planilla existente, una automática sí y esa planilla no cambia | Suspendidos no tienen botón Agregar; sanciones muestra el error | agregar_jugador comprueba suspensión; errores.py traduce SIGNAL | Triggers de `planilla_partido` y `sancion_jugador` (S-26) |
| Roles administrador / planillero | Menú y rutas por rol | requiere_rol y conexión por rol | ENUM en `login`; usuarios de BD `app_admin` y `app_planillero` |

Los reportes no guardan resultados: consultan las tablas y la vista de goles. En el front, `ReportesPage` elige la edición
y muestra las tablas; en el back, cada ruta de `/reportes` exige administrador y valida la edición cuando corresponde.

| Reporte de la letra | Front | Back | Consulta en la base |
|---|---|---|---|
| Posiciones: PJ, PG, PE, PP, GF, GC, DG, Pts; orden por puntos, diferencia y goles | Tabla de posiciones | `/reportes/posiciones` | `partido`, `equipo`, `v_resultado_partido`; victoria 3, empate 1 |
| Diez goleadores sin autogoles | Goleadores | `/reportes/goleadores` | `gol` con `autogol = 0` y límite 10 |
| Fair play: amarilla 1 y roja 3, gana menor puntaje | Fair play | `/reportes/fair-play` | `tarjeta`, `planilla_partido`, `equipo` |
| Promedio de goles por fecha y edición | Promedios | `/reportes/promedios` | `v_resultado_partido` y partidos jugados |
| Canchas más utilizadas | Canchas | `/reportes/canchas` | `cancha` y partidos jugados o programados (S-28) |
| Turnos más utilizados | Turnos | `/reportes/turnos` | `turno` y partidos jugados o programados (S-28) |
| Jugadores por facultad y tipo | Jugadores por facultad | `/reportes/jugadores-por-facultad` | `facultad`, `jugador` y los cuatro tipos |
| Inscriptos que nunca figuran en una planilla | Sin planilla | `/reportes/sin-planilla` | `equipo_jugador_torneo`, `planilla_partido`, `partido` |
| Sanciones por equipo y motivo | Sanciones | `/reportes/sanciones` | `sancion_jugador` y plantel de la edición |
| Porcentaje de partidos por estado | Partidos por estado | `/reportes/estados` | `partido`; total incluye programados (S-29) |
| Valla menos vencida, propuesta del grupo | Valla menos vencida | `/reportes/valla-menos-vencida` | `v_resultado_partido` y partidos jugados |
| Goles por tipo de jugador, propuesta del grupo | Goles por tipo | `/reportes/goles-por-tipo` | `gol`, `jugador`; autogoles separados |
| Rendimiento local y visitante, propuesta del grupo | Local y visitante | `/reportes/local-visitante` | `v_resultado_partido` y partidos jugados |

### 3.3 Seguridad (usuarios de base de datos y roles de la aplicación)
La seguridad la pusimos en dos lugares. En la aplicación, cada cuenta de `login` tiene un rol (administrador o
planillero) y la contraseña se guarda como hash bcrypt. En la base creamos un usuario de MySQL por rol, y el backend usa
la conexión del rol de quien inició sesión. Así, aunque el back tuviera un error, la base no deja que un planillero
haga algo que no le corresponde.

- `app_admin` puede gestionar los datos del esquema. Solo consulta `turno`, porque los turnos son fijos (S-14).
  En `sancion_jugador` puede consultar y modificar; las altas y bajas disciplinarias pasan por
  `crear_sancion_disciplinaria` y `borrar_sancion_disciplinaria`. No puede crear ni modificar tablas, ni dar permisos.
- `app_planillero` puede consultar las tablas que necesita para cargar una planilla: facultades, jugadores, torneos,
  equipos, planteles, complejos, canchas, turnos, partidos y sanciones. Puede insertar, modificar y borrar en
  `planilla_partido`, `gol` y `tarjeta`. No puede modificar `partido` ni leer `login`.

Para marcar un partido como jugado, el planillero usa el procedimiento `marcar_partido_jugado`. Al principio le dábamos
permiso para modificar la columna `estado`, pero MySQL no deja limitar a qué valor se cambia, y así podía cancelar o
postergar partidos, que libera la cancha y el cruce. El procedimiento es `SQL SECURITY DEFINER`: corre con los permisos
de quien lo creó, y solo pasa un partido de `programado` a `jugado` si ya terminó su turno. Al planillero le damos
`EXECUTE` sobre ese procedimiento y nada más sobre `partido`.

Con las sanciones pasa algo parecido. El planillero no tiene permiso para escribir en `sancion_jugador`, pero cuando
carga o borra una tarjeta los triggers de `tarjeta` crean o borran la sanción que corresponde. Los triggers también
corren con los permisos de quien los creó, así que no hace falta darle más permisos. Para saber si un jugador está
suspendido, el back del planillero usa la función `jugador_suspendido`, y por eso tiene `EXECUTE` sobre ella.

El administrador tampoco tiene INSERT ni DELETE directos en `sancion_jugador`: el back crea y borra sanciones
disciplinarias mediante dos procedimientos con permisos de definidor. Así no puede alterar una sanción automática
mediante una conexión directa con el usuario de la aplicación. El trigger impide modificar una automática.

Los permisos están en [`db/init/02_usuarios.sql`](../db/init/02_usuarios.sql). A los dos usuarios les damos permisos
tabla por tabla, también al administrador. Al principio `app_admin` tenía permisos sobre toda la base, pero así MySQL
responde a un error de clave foránea con un mensaje que no trae el nombre de la constraint (errores 1216 y 1217), y el
back no puede decirle al usuario qué dato está en uso. Con permisos por tabla devuelve los errores 1451 y 1452, que sí
lo traen. Por eso cada tabla o vista nueva lleva su `GRANT` para los dos usuarios. Los procedimientos los puede ejecutar
`app_admin` con un `GRANT EXECUTE` sobre todo el esquema; el planillero solo los que le damos uno por uno.

Para iniciar sesión, el front manda correo y contraseña a `POST /auth/login`. El back busca la cuenta en `login` con la
conexión de `app_admin`, porque todavía no sabe el rol y `app_planillero` no puede leer esa tabla. Compara la contraseña
con el hash usando bcrypt y, si coincide, devuelve un token JWT firmado con el correo y el rol, que vence a las dos horas
(`JWT_EXPIRES_MINUTES`). Si el correo no existe o la contraseña está mal respondemos lo mismo, "Correo o contraseña
incorrectos", para no dar pistas de qué cuentas existen.

En `.env.example` dejamos una clave de desarrollo para firmar los tokens, así la aplicación levanta copiando el
ejemplo, igual que con las claves de MySQL. En producción se cambia por una clave aleatoria, que va en `.env` y no se
sube al repositorio. La API no inicia si la clave tiene menos de 32 bytes.

En cada pedido el back valida el token y abre la conexión de MySQL del rol que viene en él. Los endpoints del
administrador además piden ese rol, y si entra un planillero responden 403. Sin token, o con uno vencido o adulterado,
responden 401, y el front borra la sesión y vuelve a la pantalla de ingreso. El menú del front solo muestra las secciones
del rol, pero eso es comodidad: quien controla los permisos es el back, y por debajo la base.

## 4. Reportes
### 4.1 Consultas pedidas

Usamos consultas parametrizadas en `backend/app/repos/reportes.py`. Cada `%s` recibe el identificador de la edición seleccionada. Usamos los permisos existentes de las tablas y de `v_resultado_partido`, sin crear vistas nuevas. Los endpoints `/reportes/...` y la pantalla Reportes son solo para el administrador. Todos reciben la edición salvo el de jugadores por facultad y tipo, que es de todas.

#### Tabla de posiciones

Sumamos los resultados como local y visitante con UNION ALL y agrupamos por equipo. Solo contamos partidos jugados; ordenamos por puntos, diferencia de gol y goles a favor. Los equipos sin partidos aparecen con ceros.

```sql
SELECT e.id_equipo, e.nombre AS equipo, COUNT(r.id_equipo) AS pj,
       COALESCE(SUM(r.gf > r.gc), 0) AS pg,
       COALESCE(SUM(r.gf = r.gc), 0) AS pe,
       COALESCE(SUM(r.gf < r.gc), 0) AS pp,
       COALESCE(SUM(r.gf), 0) AS gf, COALESCE(SUM(r.gc), 0) AS gc,
       COALESCE(SUM(r.gf - r.gc), 0) AS dg,
       COALESCE(SUM(CASE WHEN r.gf > r.gc THEN 3
                         WHEN r.gf = r.gc THEN 1 ELSE 0 END), 0) AS pts
FROM equipo e
LEFT JOIN (
    SELECT p.id_equipo_local AS id_equipo, v.goles_local AS gf, v.goles_visitante AS gc
    FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
    WHERE p.id_torneo = %s AND p.estado = 'jugado'
    UNION ALL
    SELECT p.id_equipo_visitante, v.goles_visitante, v.goles_local
    FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
    WHERE p.id_torneo = %s AND p.estado = 'jugado'
) r ON r.id_equipo = e.id_equipo
WHERE e.id_torneo = %s
GROUP BY e.id_equipo, e.nombre
ORDER BY pts DESC, dg DESC, gf DESC, e.nombre, e.id_equipo
```

#### Goleadores

Contamos los goles de cada jugador en partidos jugados, sin autogoles. Mostramos hasta diez; decidimos desempatar por CI ascendente, incluso en el puesto diez, para mantener el límite sin funciones de ventana.

```sql
SELECT j.ci AS ci_jugador, j.nombre, j.apellido, e.id_equipo, e.nombre AS equipo,
       COUNT(*) AS goles
FROM gol g
JOIN partido p ON p.id_partido = g.id_partido
JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
JOIN equipo e ON e.id_equipo = pp.id_equipo
JOIN jugador j ON j.ci = g.ci_jugador
WHERE p.id_torneo = %s AND p.estado = 'jugado' AND g.autogol = 0
GROUP BY j.ci, j.nombre, j.apellido, e.id_equipo, e.nombre
ORDER BY goles DESC, j.ci ASC
LIMIT 10
```

#### Fair play

Partimos de equipo con LEFT JOIN para incluir todos los equipos de la edición. Contamos amarillas con un punto y rojas con tres, solo en partidos jugados; el menor puntaje es el mejor.

```sql
SELECT e.id_equipo, e.nombre AS equipo,
       COALESCE(SUM(t.color = 'amarilla'), 0) AS amarillas,
       COALESCE(SUM(t.color = 'roja'), 0) AS rojas,
       COALESCE(SUM(CASE WHEN t.color = 'amarilla' THEN 1
                         WHEN t.color = 'roja' THEN 3 ELSE 0 END), 0) AS puntos
FROM equipo e
LEFT JOIN (
    SELECT pp.id_equipo, ta.color
    FROM tarjeta ta
    JOIN partido p ON p.id_partido = ta.id_partido
    JOIN planilla_partido pp ON pp.id_partido = ta.id_partido AND pp.ci_jugador = ta.ci_jugador
    WHERE p.id_torneo = %s AND p.estado = 'jugado'
) t ON t.id_equipo = e.id_equipo
WHERE e.id_torneo = %s
GROUP BY e.id_equipo, e.nombre
ORDER BY puntos ASC, e.nombre, e.id_equipo
```

#### Promedio de goles

Calculamos el promedio por fecha y el de toda la edición con los resultados de los partidos jugados. El total es goles dividido entre partidos, no el promedio de los promedios de las fechas. Sin partidos devolvemos total de cero partidos y promedio NULL.

```sql
SELECT p.numero_fecha, COUNT(*) AS partidos,
       SUM(v.goles_local + v.goles_visitante) AS goles,
       ROUND(AVG(v.goles_local + v.goles_visitante), 2) AS promedio
FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
WHERE p.id_torneo = %s AND p.estado = 'jugado'
GROUP BY p.numero_fecha
UNION ALL
SELECT NULL AS numero_fecha, COUNT(*) AS partidos,
       COALESCE(SUM(v.goles_local + v.goles_visitante), 0) AS goles,
       ROUND(AVG(v.goles_local + v.goles_visitante), 2) AS promedio
FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
WHERE p.id_torneo = %s AND p.estado = 'jugado'
ORDER BY numero_fecha
```

#### Chequeo a mano de la edición 2

Tomamos los partidos 1 a 9: 2-1, 3-0, 2-2, 0-1, 1-3, 1-4, 1-1, 2-1 y 2-0. El autogol del partido 1 suma al rival para posiciones y promedios, pero no para goleadores.

| Equipo | PJ | PG | PE | PP | GF | GC | DG | Pts |
|---|---|---|---|---|---|---|---|---|
| Derecho Verde | 3 | 2 | 0 | 1 | 3 | 4 | -1 | 6 |
| Empresariales Azul | 3 | 1 | 2 | 0 | 6 | 4 | 2 | 5 |
| Empresariales Verde | 3 | 1 | 1 | 1 | 7 | 5 | 2 | 4 |
| Ingeniería Verde | 3 | 1 | 1 | 1 | 3 | 3 | 0 | 4 |
| Salud Verde | 3 | 1 | 0 | 2 | 4 | 5 | -1 | 3 |
| Ingeniería Azul | 3 | 1 | 0 | 2 | 4 | 6 | -2 | 3 |

El goleador es 50000135 con 4. Al contar el seed encontramos cinco jugadores con 2: 50000050, 50000066, 50000185, 50000191 y 50000408. Conservamos esos datos.

En fair play, Ingeniería Verde tiene tres amarillas (3 puntos), Ingeniería Azul una roja (3) y Salud Verde una amarilla (1). Los otros tres equipos tienen cero y aparecen primero.

Por fecha hay 10/3 = 3,33; 10/3 = 3,33; 7/3 = 2,33 goles por partido. En toda la edición son 27/9 = 3,00. Los seis partidos sin jugar no entran en el cálculo.

#### Canchas y turnos más utilizados

Son dos consultas. Contamos los partidos jugados y los programados de la edición; los postergados y cancelados no, porque liberan la cancha (S-28). Partimos de `cancha` y de `turno` con LEFT JOIN para que las canchas y turnos sin partidos aparezcan con 0. Ordenamos de más a menos usado.

```sql
SELECT c.id_complejo, co.nombre AS complejo, c.nombre_cancha, COUNT(p.id_partido) AS partidos
FROM cancha c
JOIN complejo co ON co.id_complejo = c.id_complejo
LEFT JOIN partido p ON p.id_complejo = c.id_complejo AND p.nombre_cancha = c.nombre_cancha
     AND p.id_torneo = %s AND p.estado IN ('jugado', 'programado')
GROUP BY c.id_complejo, co.nombre, c.nombre_cancha
ORDER BY partidos DESC, co.nombre, c.nombre_cancha
```

```sql
SELECT t.id_turno, LEFT(t.hora_inicio, 5) AS hora_inicio, LEFT(t.hora_fin, 5) AS hora_fin,
       COUNT(p.id_partido) AS partidos
FROM turno t
LEFT JOIN partido p ON p.id_turno = t.id_turno
     AND p.id_torneo = %s AND p.estado IN ('jugado', 'programado')
GROUP BY t.id_turno, t.hora_inicio, t.hora_fin
ORDER BY partidos DESC, t.hora_inicio
```

Las condiciones de la edición y del estado van en el ON y no en el WHERE: si estuvieran en el WHERE, las canchas sin partidos quedarían afuera.

#### Jugadores por facultad y tipo

Contamos todos los jugadores registrados, porque el jugador no pertenece a una edición (S-30). Los tipos son un ENUM y no una tabla, así que armamos los cuatro con UNION ALL y los cruzamos con todas las facultades. El LEFT JOIN a `jugador` deja en 0 las combinaciones sin jugadores, como la facultad de Comunicación.

```sql
SELECT f.id_facultad, f.nombre AS facultad, t.tipo, COUNT(j.ci) AS jugadores
FROM facultad f
CROSS JOIN (SELECT 1 AS orden, 'grado' AS tipo UNION ALL SELECT 2, 'posgrado'
            UNION ALL SELECT 3, 'docente' UNION ALL SELECT 4, 'funcionario') t
LEFT JOIN jugador j ON j.id_facultad = f.id_facultad AND j.tipo = t.tipo
GROUP BY f.id_facultad, f.nombre, t.orden, t.tipo
ORDER BY f.nombre, t.orden
```

#### Jugadores que nunca figuraron en una planilla

Tomamos los jugadores del plantel de la edición y nos quedamos con los que no tienen ninguna fila en `planilla_partido` para partidos de esa misma edición (S-30).

```sql
SELECT j.ci AS ci_jugador, j.nombre, j.apellido, e.id_equipo, e.nombre AS equipo,
       ejt.numero_camiseta
FROM equipo_jugador_torneo ejt
JOIN equipo e ON e.id_equipo = ejt.id_equipo
JOIN jugador j ON j.ci = ejt.ci_jugador
WHERE ejt.id_torneo = %s
  AND NOT EXISTS (
      SELECT 1
      FROM planilla_partido pp
      JOIN partido p ON p.id_partido = pp.id_partido
      WHERE pp.ci_jugador = ejt.ci_jugador AND p.id_torneo = ejt.id_torneo
  )
ORDER BY e.nombre, ejt.numero_camiseta
```

#### Sanciones por equipo y motivo

`sancion_jugador` no guarda el equipo: lo sacamos del plantel del sancionado en esa edición (ADR 0005). Mostramos una fila por equipo con una columna por motivo y el total, igual que en fair play. Con LEFT JOIN desde `equipo` aparecen también los equipos sin sanciones.

```sql
SELECT e.id_equipo, e.nombre AS equipo,
       COALESCE(SUM(s.motivo = 'roja'), 0) AS roja,
       COALESCE(SUM(s.motivo = 'acumulación de amarillas'), 0) AS acumulacion,
       COALESCE(SUM(s.motivo = 'disciplinaria'), 0) AS disciplinaria,
       COUNT(s.id_sancion) AS total
FROM equipo e
LEFT JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo
LEFT JOIN sancion_jugador s ON s.ci_jugador = ejt.ci_jugador AND s.id_torneo = ejt.id_torneo
WHERE e.id_torneo = %s
GROUP BY e.id_equipo, e.nombre
ORDER BY total DESC, e.nombre, e.id_equipo
```

#### Partidos por estado

Mostramos los cuatro estados con su cantidad y su porcentaje. El total son todos los partidos de la edición, también los programados, así los porcentajes suman 100 (S-29). Los estados salen de un UNION ALL para que aparezcan aunque tengan 0. Con NULLIF evitamos dividir entre cero en una edición sin partidos; en ese caso el porcentaje queda NULL.

```sql
SELECT s.estado, COUNT(p.id_partido) AS partidos,
       ROUND(100 * COUNT(p.id_partido)
             / NULLIF((SELECT COUNT(*) FROM partido WHERE id_torneo = %s), 0), 1) AS porcentaje
FROM (SELECT 1 AS orden, 'jugado' AS estado UNION ALL SELECT 2, 'programado'
      UNION ALL SELECT 3, 'postergado' UNION ALL SELECT 4, 'cancelado') s
LEFT JOIN partido p ON p.estado = s.estado AND p.id_torneo = %s
GROUP BY s.orden, s.estado
ORDER BY s.orden
```

#### Chequeo a mano de los reportes 5 a 9

Contamos en el seed de la edición 2:

- Canchas, con jugados y programados: Cancha 1 del Complejo del Parque 6 partidos, Cancha 2 del Parque 3, Cancha 1 y Cancha 2 del Complejo del Lago 2 cada una. La Cancha 3 del Parque, 0.
- Turnos: 18 a 19 y 19 a 20 con 5, 20 a 21 con 2, 21 a 22 con 1 y 22 a 23 con 0.
- Jugadores por facultad: 8 de grado, 3 de posgrado, 1 docente y 1 funcionario en cada facultad, salvo Ingeniería y Tecnologías, que tiene 9 de grado. Comunicación tiene 0 en los cuatro tipos.
- Sin planilla: 6 jugadores, los de camiseta 6 y 7, que nunca entraron en la planilla. Ingeniería Verde no tiene ninguno porque su plantel es de cinco y jugaron todos.
- Sanciones: Ingeniería Verde 1 por acumulación, Ingeniería Azul 1 por roja y Salud Verde 1 disciplinaria. Los otros tres equipos, 0.
- Estados sobre 15 partidos: 9 jugados (60,0 %), 4 programados (26,7 %), 1 postergado (6,7 %) y 1 cancelado (6,7 %).

En la edición del segundo semestre, que no tiene partidos, los reportes devuelven las canchas, turnos, estados y equipos con 0, y los doce jugadores de sus planteles en el de sin planilla.

### 4.2 Consultas propuestas por el grupo

Elegimos tres consultas que salen con lo que ya guarda el modelo. Siguen las mismas reglas que las pedidas: parámetro de la edición, solo partidos jugados y endpoints solo para el administrador (`/reportes/valla-menos-vencida`, `/reportes/goles-por-tipo` y `/reportes/local-visitante`).

#### Valla menos vencida

Qué muestra: qué equipo recibe menos goles, algo que la tabla de posiciones no deja ver, y el promedio de goles en contra por partido de cada equipo.

Usamos el mismo UNION ALL de local y visitante que en posiciones, pero solo con los goles en contra. Ordenamos por goles en contra de menor a mayor y, si empatan, va primero el que jugó más partidos. Los equipos que todavía no jugaron van al final (`pj = 0` vale 1 para ellos), para que no queden primeros con 0 goles en contra.

```sql
SELECT e.id_equipo, e.nombre AS equipo, COUNT(r.id_equipo) AS pj,
       COALESCE(SUM(r.gc), 0) AS gc, ROUND(AVG(r.gc), 2) AS promedio
FROM equipo e
LEFT JOIN (
    SELECT p.id_equipo_local AS id_equipo, v.goles_visitante AS gc
    FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
    WHERE p.id_torneo = %s AND p.estado = 'jugado'
    UNION ALL
    SELECT p.id_equipo_visitante, v.goles_local
    FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
    WHERE p.id_torneo = %s AND p.estado = 'jugado'
) r ON r.id_equipo = e.id_equipo
WHERE e.id_torneo = %s
GROUP BY e.id_equipo, e.nombre
ORDER BY pj = 0, gc, pj DESC, e.nombre, e.id_equipo
```

#### Goles por tipo de jugador

Qué muestra: cuántos goles hace cada tipo de jugador (grado, posgrado, docente y funcionario) y cuántos jugadores de cada tipo hicieron goles. La elegimos porque la letra distingue esos tipos y limita a dos los docentes o funcionarios por plantel.

Contamos los goles sin autogoles y cuántos jugadores distintos convirtieron, por tipo. Igual que en el reporte de facultades, los cuatro tipos salen de un UNION ALL para que aparezcan aunque no tengan goles.

```sql
SELECT t.tipo, COUNT(g.id_gol) AS goles, COUNT(DISTINCT g.ci_jugador) AS goleadores
FROM (SELECT 1 AS orden, 'grado' AS tipo UNION ALL SELECT 2, 'posgrado'
      UNION ALL SELECT 3, 'docente' UNION ALL SELECT 4, 'funcionario') t
LEFT JOIN (
    SELECT j.tipo, go.id_gol, go.ci_jugador
    FROM gol go
    JOIN partido p ON p.id_partido = go.id_partido
    JOIN jugador j ON j.ci = go.ci_jugador
    WHERE p.id_torneo = %s AND p.estado = 'jugado' AND go.autogol = 0
) g ON g.tipo = t.tipo
GROUP BY t.orden, t.tipo
ORDER BY t.orden
```

#### Rendimiento de local y visitante

Qué muestra: cuántos partidos ganó el equipo que figura como local, cuántos el visitante y cuántos terminaron empatados, y los goles de cada lado. La elegimos porque el modelo distingue local y visitante en cada partido.

Es una sola fila con los partidos ganados por el local, los empates, los ganados por el visitante y los goles de cada lado. Sin partidos jugados devolvemos todo en 0.

```sql
SELECT COUNT(*) AS partidos,
       COALESCE(SUM(v.goles_local > v.goles_visitante), 0) AS gana_local,
       COALESCE(SUM(v.goles_local = v.goles_visitante), 0) AS empates,
       COALESCE(SUM(v.goles_local < v.goles_visitante), 0) AS gana_visitante,
       COALESCE(SUM(v.goles_local), 0) AS goles_local,
       COALESCE(SUM(v.goles_visitante), 0) AS goles_visitante
FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
WHERE p.id_torneo = %s AND p.estado = 'jugado'
```

#### Chequeo a mano de las consultas propias

Con los resultados de la edición 2 (2-1, 3-0, 2-2, 0-1, 1-3, 1-4, 1-1, 2-1 y 2-0):

- Valla menos vencida: Ingeniería Verde 3 goles en contra (1,00 por partido), Derecho Verde y Empresariales Azul 4 (1,33), Empresariales Verde y Salud Verde 5 (1,67) e Ingeniería Azul 6 (2,00). Coincide con la columna GC de la tabla de posiciones.
- Goles por tipo: de los 27 goles, uno es autogol. Quedan 26: 25 de jugadores de grado (17 jugadores distintos) y 1 de un docente. Posgrado y funcionarios no tienen goles.
- Local y visitante: el local ganó 4 partidos (1, 2, 8 y 9), hubo 2 empates (3 y 7) y el visitante ganó 3 (4, 5 y 6). Goles del local 14 y del visitante 13, que suman los 27.

Descartamos una consulta de racha de partidos sin perder: para hacerla bien hacía falta recorrer los partidos en orden con funciones de ventana o un cursor, y eso no lo vimos en el curso.

## 5. Bitácora
Ver [bitacora.md](bitacora.md).

## 6. Bibliografía

Material del curso:

- Base de Datos 1, Universidad Católica del Uruguay. Material del curso (teórico y prácticos), 2026.

MySQL 8.4 Reference Manual:

- CREATE TRIGGER Statement. https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html
- Using Stored Routines. https://dev.mysql.com/doc/refman/8.4/en/stored-routines.html
- Stored Object Access Control (DEFINER y SQL SECURITY). https://dev.mysql.com/doc/refman/8.4/en/stored-objects-security.html
- CREATE VIEW Statement. https://dev.mysql.com/doc/refman/8.4/en/create-view.html
- CREATE TABLE and Generated Columns. https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html
- FOREIGN KEY Constraints. https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
- Variable `restrict_fk_on_non_standard_key`. https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_restrict_fk_on_non_standard_key
- GRANT Statement. https://dev.mysql.com/doc/refman/8.4/en/grant.html
- MySQL Server Time Zone Support. https://dev.mysql.com/doc/refman/8.4/en/time-zone-support.html

Backend:

- FastAPI. https://fastapi.tiangolo.com/
- Pydantic 2.10. https://docs.pydantic.dev/2.10/
- MySQL Connector/Python Developer Guide. https://dev.mysql.com/doc/connector-python/en/
- PyJWT. https://pyjwt.readthedocs.io/en/stable/
- bcrypt (pyca). https://github.com/pyca/bcrypt

Frontend e infraestructura:

- React 18. https://18.react.dev/
- React Router 6.28. https://reactrouter.com/6.28.0
- Vite 5. https://v5.vite.dev/
- Docker Compose. https://docs.docker.com/compose/
