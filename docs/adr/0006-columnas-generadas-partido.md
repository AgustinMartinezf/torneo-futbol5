# ADR 0006 · Columnas generadas y UNIQUE en `partido`

Estado: aceptada. Turno 01.

## Contexto
Dos reglas de programación dependen del estado del partido.

La primera: una cancha no puede tener más de un partido el mismo día y turno. Un partido cancelado o postergado no
debería seguir ocupando la cancha.

La segunda: un equipo no puede enfrentar a un rival con el que ya tiene partido en la edición, salvo que ese partido se
haya cancelado. Además, el cruce A-B es el mismo que B-A.

Un `UNIQUE` común no puede mirar el estado, y MySQL no tiene índices parciales (con `WHERE`).

## Decisión
Usamos columnas generadas `STORED` que valen `NULL` cuando la fila no tiene que competir. En un índice UNIQUE de MySQL
los NULL no chocan entre sí.

`ocupa_cancha = IF(estado IN ('programado','jugado'), 1, NULL)` entra en
`UNIQUE (nombre_cancha, id_complejo, dia, id_turno, ocupa_cancha)`.

`equipo_menor = IF(estado <> 'cancelado', LEAST(local, visitante), NULL)` y `equipo_mayor`, igual pero con `GREATEST`,
entran en `UNIQUE (id_torneo, equipo_menor, equipo_mayor)`. LEAST y GREATEST hacen que A-B y B-A den el mismo par.

Un partido `postergado` libera la cancha pero sigue contando para el cruce, porque la letra solo exceptúa a los cancelados.

## Alternativa descartada
Triggers `BEFORE INSERT/UPDATE` que consulten la tabla. Funcionan, pero hay que escribirlos dos veces (para INSERT y
para UPDATE) y pueden fallar con dos transacciones concurrentes. El índice UNIQUE es atómico.

## Consecuencias
Las columnas generadas no se insertan: el backend tiene que nombrar las columnas en el INSERT.
Las FK sobre las columnas base de una columna generada no pueden usar CASCADE. Las de equipos son RESTRICT, así que no hay problema.
La regla "un equipo no juega más de un partido en la misma fecha" no se puede declarar así, porque el equipo puede
aparecer como local en un partido y como visitante en otro. Va con un trigger en el turno 07.
