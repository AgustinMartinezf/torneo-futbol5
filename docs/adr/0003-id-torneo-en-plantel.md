# ADR 0003 · Mantener `id_torneo` en `equipo_jugador_torneo` con FK compuesta

Estado: aceptada. Turno 01.

## Contexto
En `equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta)` vale la dependencia funcional
`id_equipo → id_torneo`, porque cada equipo es de un solo torneo. El atributo es redundante y podría quedar mal:
una fila del equipo 1, que juega 2026-S2, guardada con el `id_torneo` de 2026-S1.

Al mismo tiempo, la regla "un jugador no puede integrar más de un equipo en una misma edición" necesita saber de qué
torneo es cada fila del plantel.

## Decisión
Mantenemos `id_torneo` y la PK de la letra `(id_equipo, ci_jugador, id_torneo)`.

`equipo` tiene `UNIQUE (id_equipo, id_torneo)` y el plantel tiene una FK compuesta
`(id_equipo, id_torneo) → equipo(id_equipo, id_torneo)`. Con eso no se puede guardar un torneo distinto del del equipo:
la redundancia sigue ahí, pero la controla la base.

Sobre esa base, `uq_ejt_jugador_torneo UNIQUE (ci_jugador, id_torneo)` garantiza la regla de un equipo por edición sin
necesidad de triggers. Agregamos también `uq_ejt_camiseta UNIQUE (id_equipo, numero_camiseta)` y
`uq_ejt_equipo_jugador UNIQUE (id_equipo, ci_jugador)`, que es el destino de las FK del capitán y de la planilla
(ADR 0004 y 0005).

## Alternativa descartada
Sacar `id_torneo` del plantel. La tabla quedaría normalizada, pero la regla de un equipo por edición pasaría a un
trigger con JOIN a `equipo`, y nos alejaríamos del modelo de la letra.

## Consecuencias
Al inscribir a un jugador, el backend manda el `id_torneo` del equipo. Si manda otro, la FK lo rechaza.
La misma idea, una FK compuesta que incluye `id_torneo`, se usa en `partido` (ADR 0005).
