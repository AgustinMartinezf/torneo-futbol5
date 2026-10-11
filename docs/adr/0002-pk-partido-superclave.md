# ADR 0002 · PK de `partido` como en la letra, más `UNIQUE(id_partido)`

Estado: aceptada. Turno 01.

## Contexto
En la letra, la PK de `partido` es `(id_partido, id_torneo)`. Pero `id_partido` es `AUTO_INCREMENT` y ya identifica
al partido sin ayuda, así que `(id_partido, id_torneo)` es una superclave no mínima.

`planilla_partido`, `gol` y `tarjeta` solo tienen `id_partido`, y su FK apunta a `partido(id_partido)`. En MySQL 8.4
la variable `restrict_fk_on_non_standard_key` viene en `ON`: una FK solo puede apuntar a una PRIMARY KEY o a un UNIQUE
completo, nunca al prefijo de una clave compuesta. Sin un índice único exacto sobre `id_partido`, la FK no se puede crear.

## Decisión
Dejamos `pk_partido PRIMARY KEY (id_partido, id_torneo)` como pide la letra y agregamos `uq_partido_id UNIQUE (id_partido)`
para que las tablas hijas tengan a qué apuntar.

## Alternativa considerada y no implementada
`PRIMARY KEY (id_partido)` con `UNIQUE (id_partido, id_torneo)`. En teoría es más correcta, porque la PK sería una
clave candidata mínima. No la usamos para respetar el modelo de la letra, pero queda anotada como mejora considerada
en el informe (sección 2.3).

## Consecuencias
Hay dos índices únicos que empiezan por `id_partido`, con un costo de espacio mínimo. El backend identifica un partido
solo con `id_partido`.
