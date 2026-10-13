# ADR 0005: FK compuestas en partido, planilla, gol, tarjeta y sanción

## El problema
Varias reglas de la letra se pueden pensar como "esta combinación tiene que existir en otra tabla". Por ejemplo, los
dos equipos de un partido tienen que ser del mismo torneo, en la planilla solo puede haber jugadores del plantel y solo
pueden hacer goles los que están en la planilla.

## Qué hicimos
Usamos FK compuestas:

| FK | Para qué |
|---|---|
| `partido (id_equipo_local, id_torneo)` y `(id_equipo_visitante, id_torneo)` hacia `equipo` | los dos equipos son del torneo del partido |
| `planilla_partido (id_equipo, ci_jugador)` hacia el plantel | el jugador es del plantel de ese equipo |
| `gol` y `tarjeta (id_partido, ci_jugador)` hacia `planilla_partido` | solo hacen goles o reciben tarjetas los que están en la planilla |
| `sancion_jugador (ci_jugador, id_torneo)` hacia el plantel | solo se sanciona a inscriptos de ese torneo, y con un JOIN sale su equipo para el reporte de sanciones por equipo |

Estas tablas no tienen otra FK directa a `jugador`. No hace falta, porque el plantel ya apunta a `jugador`, y si la
pusiéramos habría dos caminos de `ON UPDATE CASCADE` sobre la misma columna.

## Qué descartamos y por qué
FK simples (`ci_jugador` a `jugador`, `id_partido` a `partido`) y un trigger para cada regla. Era más fácil de leer,
pero con las FK compuestas la base lo controla sola.

## Qué implica
Igual hacen falta triggers para controlar que el equipo de la planilla sea el local o el visitante de ese partido y que
el jugador no esté suspendido. Esos van con las planillas y las sanciones. Tampoco se puede sancionar a alguien que no
esté en ningún plantel del torneo (supuesto S-07).
