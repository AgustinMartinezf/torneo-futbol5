# Supuestos y datos del dominio

Acá anotamos las cosas que la letra no dice y cómo las resolvimos. Si la letra dice otra cosa, vale la letra. Al final
están las preguntas que tenemos para el docente.

## Datos confirmados
| Id | Dato | Dónde impacta |
|---|---|---|
| D-01 | El partido se juega en un único tiempo de 60 minutos. | `chk_gol_minuto` y `chk_tarjeta_minuto`: `minuto BETWEEN 1 AND 60` |

## Supuestos
| Id | Supuesto | Dónde impacta |
|---|---|---|
| S-01 | Un partido `postergado` se queda con el día, el turno y la cancha que tenía. Cuando se reprograma se cambian esos datos y vuelve a `programado`. Mientras está postergado la cancha queda libre, pero el cruce entre esos dos equipos sigue contando, porque la letra solo habla de los cancelados. | columnas generadas de `partido` (ADR 0006) |
| S-02 | El `dia` de un partido cae entre `fecha_inicio` y `fecha_fin` de su torneo. | trigger del ABM de partidos |
| S-03 | Una facultad puede tener más de un equipo en el mismo torneo. La letra dice que cada equipo representa a una facultad, pero no dice que sea uno solo. | no hay `UNIQUE(id_facultad, id_torneo)` |
| S-04 | Hay una sola edición por semestre (`UNIQUE(anio, semestre)`) y empieza en el año que indica (`YEAR(fecha_inicio) = anio`). | `torneo` |
| S-05 | La CI se guarda sin puntos ni guion, con 7 u 8 dígitos contando el verificador. | `chk_jugador_ci` |
| S-06 | Los usuarios de `login` son los administradores y planilleros, no los jugadores, así que `login` no tiene relación con `jugador`. | ADR 0008 |
| S-07 | Solo se sanciona a jugadores inscriptos en algún plantel de la edición de la sanción. | `fk_sancion_plantel` |
| S-08 | Los complejos están en Uruguay y `departamento` es uno de los 19 departamentos. | ENUM en `complejo` |
| S-09 | El número de camiseta es obligatorio, va de 1 a 99 y no se repite dentro del equipo. | `equipo_jugador_torneo` |
| S-10 | En la sanción por acumulación, la tarjeta de origen (`id_tarjeta`) es la amarilla que completa las 3. | ADR 0010, sanciones automáticas |
| S-11 | Mientras dura la inscripción, un equipo puede no tener capitán (`ci_capitan` en NULL). Lo exigimos cuando el torneo pasa a `en curso`. | ADR 0004, trigger del ABM de equipos |
| S-12 | Las columnas `contraseña` y `dirección` de la letra las llamamos `contrasena` y `direccion`, sin ñ ni tilde, para no tener problemas en el SQL. Las demás se llaman igual que en la letra. | `login`, `complejo` |
| S-13 | Tomamos entre 16 y 120 años como edad razonable para un jugador. | Formulario de jugadores, Pydantic y triggers de `jugador` |
| S-14 | Los turnos son los cinco de la letra (18 a 23) y no cambian, así que no tienen ABM: solo se listan. | `GET /turnos`, `app_admin` solo con SELECT en `turno` |
| S-15 | Una cancha no se cambia de complejo. Si se la pudiera mover, por el ON UPDATE CASCADE también cambiaría el lugar de los partidos que ya se jugaron. Sí se le puede cambiar el nombre. | `trg_cancha_no_cambiar_complejo`, ABM de canchas |
| S-16 | Creamos las ediciones en inscripción y las pasamos a en curso y luego a finalizado, sin saltos ni retrocesos. Exigimos entre 5 y 10 jugadores y capitán por equipo al iniciar. | Triggers de `torneo`, back y formulario |
| S-17 | Inscribimos y borramos equipos solo en inscripción. También limitamos a esa etapa los cambios de facultad, edición y capitán. El nombre puede corregirse después. | Triggers de `equipo`, back y formularios |
| S-18 | No se puede cambiar la facultad de un jugador que estuvo en algún plantel, aunque la edición esté finalizada. Así no quedan planteles viejos con jugadores de otra facultad. | `trg_jugador_validar_update`, back y formulario de jugadores |
| S-19 | Un partido se crea siempre como `programado`. Después puede pasar a `jugado` (si ya terminó su turno), `postergado` o `cancelado`. Uno postergado vuelve a `programado` cuando se reprograma o se cancela. Un partido jugado o cancelado ya no se modifica. | `trg_partido_validar_insert`, `trg_partido_validar_update`, back y formulario de partidos |
| S-20 | Para la regla de un partido por equipo y fecha no cuentan los partidos cancelados, igual que para el cruce repetido. Así un partido cancelado se puede volver a jugar en la misma fecha. | Triggers de `partido`, back y formulario |
| S-21 | Los equipos de un partido no se cambian si ya tiene planilla, porque los jugadores de la planilla quedarían con un equipo que no juega ese partido. | `trg_partido_validar_update`, back y formulario |

Los planteles pueden tener menos de cinco jugadores mientras los cargamos durante la inscripción. Exigimos entre
cinco y diez, con capitán, al pasar la edición a en curso. El máximo de diez y el cupo de docentes y funcionarios
se controlan en cada alta o cambio.

## Preguntas para el docente
1. (S-03) ¿Una facultad puede inscribir más de un equipo en la misma edición? Hoy el modelo lo permite.
2. (S-01) Un partido postergado, ¿tiene que seguir bloqueando el cruce entre esos dos equipos para que se juegue más adelante, o se toma como no programado?
3. (S-02) ¿Los partidos tienen que jugarse entre la `fecha_inicio` y la `fecha_fin` del torneo?
4. (S-12) ¿Está bien llamar a las columnas `contrasena` y `direccion`, sin ñ ni tilde?
