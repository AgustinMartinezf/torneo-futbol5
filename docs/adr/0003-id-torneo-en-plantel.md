# ADR 0003: Dejar `id_torneo` en el plantel con una FK compuesta

## El problema
En `equipo_jugador_torneo`, el `id_torneo` se repite: cada equipo es de un solo torneo, así que con el `id_equipo` ya
se sabe el torneo (`id_equipo → id_torneo`). Si nadie lo controla, podría quedar una fila del equipo 1 (torneo 2026-S2)
con el `id_torneo` de 2026-S1.

Por otro lado, para la regla "un jugador no puede estar en más de un equipo en la misma edición" necesitamos saber el
torneo de cada fila del plantel.

## Qué hicimos
Dejamos el `id_torneo` y la PK de la letra, pero la FK hacia `equipo` es compuesta: `(id_equipo, id_torneo)`. Para
eso `equipo` tiene `UNIQUE(id_equipo, id_torneo)`. Así no se puede guardar un torneo distinto al del equipo.

Con eso pudimos poner `UNIQUE(ci_jugador, id_torneo)`, que cumple la regla de un equipo por edición sin trigger.
También pusimos `UNIQUE(id_equipo, numero_camiseta)` y `UNIQUE(id_equipo, ci_jugador)`, que es al que apuntan las FK
del capitán y de la planilla.

## Qué descartamos y por qué
Sacar `id_torneo` del plantel. Quedaba más normalizado, pero la regla de un equipo por edición tendría que ir en un
trigger, y además nos alejábamos de la letra.

## Qué implica
Cuando el back inscribe a un jugador tiene que mandar el `id_torneo` del equipo. Si manda otro, la FK lo rechaza.
