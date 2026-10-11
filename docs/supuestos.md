# Supuestos y datos del dominio

La letra del obligatorio manda sobre este documento. Acá anotamos lo que la letra no define, cómo lo resolvimos y las
preguntas que quedan para el docente.

## Datos confirmados por el grupo
| Id | Dato | Dónde impacta |
|---|---|---|
| D-01 | El partido se juega en un único tiempo de 60 minutos. | `chk_gol_minuto` y `chk_tarjeta_minuto`: `minuto BETWEEN 1 AND 60` |

## Supuestos
| Id | Supuesto | Dónde impacta | Turno |
|---|---|---|---|
| S-01 | Un partido `postergado` conserva el día, el turno y la cancha que tenía. Al reprogramarlo se cambian esos datos y vuelve a `programado`. Mientras está postergado libera la cancha, pero sigue contando como cruce entre los dos equipos, porque la letra solo exceptúa a los cancelados. | columnas generadas de `partido` (ADR 0006) | 01 |
| S-02 | El `dia` de un partido cae entre `fecha_inicio` y `fecha_fin` de su torneo. | trigger | 07 |
| S-03 | Una facultad puede tener más de un equipo en la misma edición. La letra dice que cada equipo representa a una facultad, no que esa representación sea exclusiva. | no hay `UNIQUE(id_facultad, id_torneo)` | 01 |
| S-04 | Hay una sola edición por semestre (`UNIQUE(anio, semestre)`) y empieza en el año que indica (`YEAR(fecha_inicio) = anio`). | `torneo` | 01 |
| S-05 | La CI se guarda sin puntos ni guion, con 7 u 8 dígitos contando el verificador. | `chk_jugador_ci` | 01 |
| S-06 | Los usuarios de `login` son administradores y planilleros de la organización, no jugadores, así que `login` no se relaciona con `jugador`. | ADR 0008 | 01 |
| S-07 | Solo se sanciona a jugadores inscriptos en algún plantel de la edición de la sanción. | `fk_sancion_plantel` | 01 |
| S-08 | Los complejos están en Uruguay y `departamento` es uno de los 19 departamentos. | ENUM en `complejo` | 01 |
| S-09 | El número de camiseta es obligatorio, va de 1 a 99 y no se repite dentro del equipo. | `equipo_jugador_torneo` | 01 |
| S-10 | En la sanción por acumulación, la tarjeta de origen (`id_tarjeta`) es la amarilla que completa las 3. | ADR 0010 | 01/09 |
| S-11 | Mientras dura la inscripción, un equipo puede no tener capitán (`ci_capitan` en NULL). Se exige cuando el torneo pasa a `en curso`. | ADR 0004, trigger | 01/06 |
| S-12 | Las columnas `contraseña` y `dirección` de la letra se llaman `contrasena` y `direccion`, para no tener identificadores con ñ o tilde, que complican el SQL y los drivers. Las demás columnas se llaman como en la letra. | `login`, `complejo` | 01 |

## Preguntas para el docente
1. (S-03) ¿Una facultad puede inscribir más de un equipo en la misma edición? Hoy el modelo lo permite.
2. (S-01) Un partido postergado, ¿tiene que seguir bloqueando el cruce entre esos dos equipos para que se juegue más adelante, o se toma como no programado?
3. (S-02) ¿Los partidos tienen que jugarse entre la `fecha_inicio` y la `fecha_fin` del torneo?
4. (S-12) ¿Está bien llamar a las columnas `contrasena` y `direccion`, sin ñ ni tilde?
