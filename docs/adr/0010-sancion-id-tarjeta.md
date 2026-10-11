# ADR 0010 · `id_tarjeta` en `sancion_jugador`, con ON DELETE RESTRICT

Estado: aceptada. Turno 01.

## Contexto
Las sanciones automáticas, por roja o por acumulación de amarillas, salen de una tarjeta. Dentro de las 48 h se pueden
corregir tarjetas, y entonces hay que revisar la sanción que generaron. Si no guardamos de qué tarjeta vino cada
sanción, no hay forma de saberlo.

## Decisión
Agregamos `id_tarjeta INT NULL` con `fk_sancion_tarjeta → tarjeta(id_tarjeta)` y `ON DELETE RESTRICT`.
`uq_sancion_tarjeta UNIQUE (id_tarjeta)` hace que una tarjeta genere a lo sumo una sanción.
`chk_sancion_origen` pide que una sanción disciplinaria no tenga tarjeta, y que una automática tenga tarjeta y dure 1 fecha.
En la acumulación, la tarjeta de origen es la amarilla que completa las 3.

## Alternativa descartada
`ON DELETE CASCADE`, para que al borrar la tarjeta se borre su sanción. La descartamos por dos motivos. En la
acumulación, borrar una amarilla anterior (la primera o la segunda) también tendría que revertir la sanción, y la
cascada solo actúa sobre la tarjeta vinculada, que es la tercera. Además, en MySQL los borrados en cascada no disparan
triggers, así que la reversión quedaría afuera de la lógica de sanciones del turno 09.

## Consecuencias
Hasta que el turno 09 implemente la reversión, borrar una tarjeta que generó una sanción falla por RESTRICT. La idea es
borrar o recalcular la sanción y después la tarjeta, en la misma transacción.
Que la CI y el color de la tarjeta coincidan con los de la sanción lo controla un trigger del turno 09. Una FK compuesta
sumaría un segundo camino de cascada sobre `ci_jugador`.
