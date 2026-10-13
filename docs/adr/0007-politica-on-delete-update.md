# ADR 0007: Qué pasa al borrar o modificar (ON DELETE / ON UPDATE)

## El problema
Para cada FK hay que decidir qué pasa si se borra o se modifica la fila a la que apunta. Si usábamos CASCADE para
borrar, por ejemplo, borrar un partido se llevaría los goles y las tarjetas sin avisar. Además, en MySQL los borrados en
cascada no disparan triggers.

## Qué hicimos
Todas las FK son `ON DELETE RESTRICT`: no se puede borrar algo que tiene cosas que dependen de él. Si hay que borrar,
el back borra primero lo que depende, dentro de una transacción.

`ON UPDATE CASCADE` lo usamos solo para la CI del jugador y para la clave de `cancha`, que son datos que alguien puede
tener que corregir. Si se cambia una CI, el cambio pasa al plantel, al capitán, la planilla, los goles, las tarjetas y
las sanciones. Lo probamos y anduvo. Los id autoincrementales nunca cambian, así que esas FK son `ON UPDATE RESTRICT`.

Hay un detalle con las FK compuestas. Las del capitán y de la planilla apuntan a `(id_equipo, ci_jugador)` del plantel,
y el CASCADE se aplica a las dos columnas, no solo a la CI. Si alguien hacía
`UPDATE equipo_jugador_torneo SET id_equipo = ...` para mover a un jugador, las planillas viejas pasaban a decir que
jugó para el equipo nuevo, y el resultado de esos partidos cambiaba sin ningún error. Si el jugador era capitán, la
cascada intentaba cambiar la PK de `equipo` y daba un error que no se entendía.

Para que no pase, agregamos el trigger `trg_ejt_no_cambiar_equipo` (BEFORE UPDATE en `equipo_jugador_torneo`), que no
deja cambiar `id_equipo` ni `id_torneo`. Para mover a un jugador de equipo hay que sacarlo del plantel e inscribirlo de
nuevo. Como en MySQL las acciones en cascada no disparan triggers, el cambio de CI sigue llegando a todas las tablas.

| FK | ON DELETE | ON UPDATE |
|---|---|---|
| `jugador → facultad`, `equipo → facultad/torneo`, `cancha → complejo` | RESTRICT | RESTRICT |
| `equipo_jugador_torneo → equipo` | RESTRICT | RESTRICT |
| `equipo_jugador_torneo → jugador` | RESTRICT | CASCADE |
| `equipo → equipo_jugador_torneo` (capitán) | RESTRICT | CASCADE |
| `partido → torneo / equipo / turno` | RESTRICT | RESTRICT |
| `partido → cancha` | RESTRICT | CASCADE |
| `planilla_partido → partido` | RESTRICT | RESTRICT |
| `planilla_partido → equipo_jugador_torneo` | RESTRICT | CASCADE |
| `gol / tarjeta → planilla_partido` | RESTRICT | CASCADE |
| `sancion_jugador → equipo_jugador_torneo` | RESTRICT | CASCADE |
| `sancion_jugador → tarjeta` | RESTRICT | RESTRICT |

Lo de que "un partido jugado no se puede borrar" no se puede hacer con una FK, porque depende del estado. Va con un
trigger en el ABM de partidos. Por ahora, con el RESTRICT ya no se puede borrar un partido que tenga planilla.

## Qué descartamos y por qué
Usar `ON DELETE CASCADE` en todo. Era más cómodo para borrar, pero se pierde historial y no corren los triggers.

## Qué implica
Cuando un borrado da error por RESTRICT (error 1451), el back tiene que mostrar un mensaje claro. En el ABM de
planteles, cambiar a un jugador de equipo se hace con un DELETE y un INSERT, nunca con un UPDATE. Además, MySQL no deja
poner un CHECK en una columna que tiene una FK con CASCADE, por eso el CHECK del formato de la CI está solo en `jugador`.
