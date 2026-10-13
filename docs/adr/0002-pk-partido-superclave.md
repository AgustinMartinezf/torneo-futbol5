# ADR 0002: PK de `partido` como en la letra, más `UNIQUE(id_partido)`

## El problema
En la letra la PK de `partido` es `(id_partido, id_torneo)`. Pero `id_partido` es autoincremental, así que ya
identifica al partido solo. Eso hace que `(id_partido, id_torneo)` sea una superclave y no una clave mínima.

Además, `planilla_partido`, `gol` y `tarjeta` solo tienen `id_partido`. Cuando quisimos crear la FK hacia
`partido(id_partido)`, MySQL 8.4 no nos dejó, porque por defecto (`restrict_fk_on_non_standard_key = ON`) una FK tiene
que apuntar a una PK o a un UNIQUE completo, no a una parte de una PK compuesta.

## Qué hicimos
Dejamos la PK `(id_partido, id_torneo)` como pide la letra y agregamos `UNIQUE(id_partido)` para que las otras tablas
puedan apuntarle.

## Qué descartamos y por qué
Poner la PK solo en `id_partido`. Sería lo más correcto en teoría, pero preferimos no cambiar la PK de la letra. Lo
dejamos anotado en el informe como mejora que pensamos y no hicimos.

## Qué implica
Quedan dos índices únicos que empiezan con `id_partido`, que no es un problema. En el back los partidos se buscan solo
por `id_partido`.
