# ADR 0007 · Política de ON DELETE y ON UPDATE

Estado: aceptada. Turno 01.

## Contexto
Cada FK necesita una acción para el borrado y otra para la actualización. Un borrado en cascada puede llevarse
historial (goles, tarjetas, sanciones) sin que nadie se entere. Además, en MySQL los borrados en cascada no disparan
triggers, así que podrían saltearse controles de los turnos que vienen.

## Decisión
Todas las FK son `ON DELETE RESTRICT`. Para borrar algo, el backend primero borra lo que depende de eso, a mano y
dentro de una transacción.

`ON UPDATE CASCADE` se usa solo hacia claves naturales, que son las que alguien puede necesitar corregir: `jugador.ci`
(que se propaga al plantel, y de ahí al capitán, la planilla, los goles, las tarjetas y la sanción) y la clave de
`cancha (nombre_cancha, id_complejo)` hacia `partido`. Hacia las claves surrogate (`AUTO_INCREMENT`), que nunca cambian,
usamos `ON UPDATE RESTRICT`.

| FK | ON DELETE | ON UPDATE |
|---|---|---|
| `jugador → facultad`, `equipo → facultad/torneo`, `cancha → complejo` | RESTRICT | RESTRICT |
| `equipo_jugador_torneo → equipo (id_equipo, id_torneo)` | RESTRICT | RESTRICT |
| `equipo_jugador_torneo → jugador` | RESTRICT | CASCADE |
| `equipo → equipo_jugador_torneo` (capitán) | RESTRICT | CASCADE |
| `partido → torneo / equipo (x2) / turno` | RESTRICT | RESTRICT |
| `partido → cancha` | RESTRICT | CASCADE |
| `planilla_partido → partido` | RESTRICT | RESTRICT |
| `planilla_partido → equipo_jugador_torneo` | RESTRICT | CASCADE |
| `gol / tarjeta → planilla_partido` | RESTRICT | CASCADE |
| `sancion_jugador → equipo_jugador_torneo` | RESTRICT | CASCADE |
| `sancion_jugador → tarjeta` | RESTRICT | RESTRICT |

La regla "un partido jugado no puede eliminarse" no se resuelve con una FK, porque la FK no ve el `estado`. La
prohibición completa va con un trigger `BEFORE DELETE` en el turno 07. Mientras tanto, el `RESTRICT` desde la planilla
ya impide borrar un partido que tenga planilla cargada.

## Alternativa descartada
`ON DELETE CASCADE` en las tablas que dependen de otras, de modo que borrar un partido borre su planilla, sus goles y
sus tarjetas. Es cómodo para el ABM, pero destruye historial y se saltea los triggers.

## Consecuencias
Cuando un borrado falla por RESTRICT (error 1451), los ABM tienen que mostrar un mensaje claro.
MySQL no deja usar en un CHECK una columna que está en una FK con CASCADE. Por eso el CHECK de formato de la CI está
solo en `jugador`.
En el turno 01 probamos que `UPDATE jugador SET ci = ...` llega a todas las tablas (informe, sección 2.3).
