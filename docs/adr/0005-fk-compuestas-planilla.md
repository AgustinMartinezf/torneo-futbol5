# ADR 0005 · FK compuestas en partido, planilla, gol, tarjeta y sanción

Estado: aceptada. Turno 01.

## Contexto
Hay varias reglas de la letra que, en el fondo, dicen "esta combinación tiene que existir en otra tabla". Los dos
equipos de un partido son de la edición del partido. En la planilla solo figuran jugadores del plantel de su equipo.
Solo convierten o reciben tarjetas los que están en la planilla. Y solo se sanciona a jugadores inscriptos en la edición.

## Decisión
| FK | Qué garantiza |
|---|---|
| `partido (id_equipo_local, id_torneo)` y `(id_equipo_visitante, id_torneo) → equipo (id_equipo, id_torneo)` | los dos equipos son de la edición del partido |
| `planilla_partido (id_equipo, ci_jugador) → equipo_jugador_torneo (id_equipo, ci_jugador)` | el jugador es del plantel del equipo indicado |
| `gol / tarjeta (id_partido, ci_jugador) → planilla_partido (id_partido, ci_jugador)` | solo juegan en el registro los que están en la planilla |
| `sancion_jugador (ci_jugador, id_torneo) → equipo_jugador_torneo (ci_jugador, id_torneo)` | el sancionado está inscripto en esa edición, y su equipo sale con un JOIN para el reporte de sanciones por equipo |

Estas tablas no tienen FK directa a `jugador`, y la sanción tampoco tiene una a `torneo`. Esas FK ya están implícitas
en la compuesta, y una segunda FK sobre `ci_jugador` abriría dos caminos de `ON UPDATE CASCADE` hacia la misma columna.

## Alternativa descartada
FK simples (`ci_jugador → jugador`, `id_partido → partido`) y un trigger por cada regla. Se leen más fácil, pero mandan
a procedimientos reglas que la base puede garantizar sola.

## Consecuencias
Siguen haciendo falta triggers (turnos 08 y 09) para controlar que el `id_equipo` de la planilla sea el local o el
visitante de ese partido y que el jugador no esté suspendido.
No se puede sancionar a alguien que no esté en ningún plantel de la edición (supuesto S-07).
