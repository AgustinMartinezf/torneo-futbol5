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

## Preguntas para el docente
1. (S-03) ¿Una facultad puede inscribir más de un equipo en la misma edición? Hoy el modelo lo permite.
2. (S-01) Un partido postergado, ¿tiene que seguir bloqueando el cruce entre esos dos equipos para que se juegue más adelante, o se toma como no programado?
3. (S-02) ¿Los partidos tienen que jugarse entre la `fecha_inicio` y la `fecha_fin` del torneo?
4. (S-12) ¿Está bien llamar a las columnas `contrasena` y `direccion`, sin ñ ni tilde?
