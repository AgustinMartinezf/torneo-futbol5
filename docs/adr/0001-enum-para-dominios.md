# ADR 0001 · ENUM para los dominios cerrados de la letra

Estado: aceptada. Turno 01.

## Contexto
La letra da listas cerradas de valores para `rol`, `jugador.tipo`, `torneo.estado`, `cancha.superficie`,
`partido.estado`, `tarjeta.color` y `sancion_jugador.motivo`. Además decidimos acotar `complejo.departamento`.

## Decisión
Usamos `ENUM` con los valores tal cual los escribe la letra, con tildes (`'inscripción'`, `'en curso'`,
`'acumulación de amarillas'`, `'sintético'`). `departamento` es un ENUM con los 19 departamentos de Uruguay.
`techada` y `autogol` son `BOOLEAN` con `CHECK (x IN (0,1))`, porque `BOOLEAN` en MySQL es `TINYINT(1)` y aceptaría un 5.

MySQL 8.4 trabaja en modo estricto (`STRICT_TRANS_TABLES`). Si llega un valor que no está en el ENUM, da error en vez
de guardar una cadena vacía.

## Alternativa descartada
Tablas catálogo (`tipo_jugador`, `estado_partido`, etc.) con FK. Sirven cuando los valores cambian seguido o tienen
atributos propios. Acá cada valor está atado a una regla: `cancelado`, por ejemplo, libera la cancha. Agregar un valor
igual obliga a tocar código, y las tablas catálogo nos sumaban 8 tablas y varios JOIN sin ganar nada.

## Consecuencias
Para agregar un valor hay que hacer `ALTER TABLE`. Lo aceptamos, porque eso implica cambiar reglas de todos modos.
El back y el front tienen que mandar los valores con tilde y en UTF-8.
