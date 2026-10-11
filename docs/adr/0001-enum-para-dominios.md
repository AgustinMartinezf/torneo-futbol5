# ADR 0001: ENUM para los valores fijos de la letra

## El problema
La letra da listas de valores fijos para `rol`, `jugador.tipo`, `torneo.estado`, `cancha.superficie`, `partido.estado`,
`tarjeta.color` y `sancion_jugador.motivo`. Además quisimos limitar `complejo.departamento`.

## Qué hicimos
Usamos ENUM con los valores tal cual están en la letra, con tildes (`'inscripción'`, `'acumulación de amarillas'`, etc.).
`departamento` es un ENUM con los 19 departamentos. MySQL 8.4 trabaja en modo estricto, así que si llega un valor que
no está en la lista da error.

`techada` y `autogol` son BOOLEAN, pero les pusimos un CHECK para que solo acepten 0 o 1, porque en MySQL un BOOLEAN es
un TINYINT y aceptaría un 5.

## Qué descartamos y por qué
Hacer una tabla para cada lista (`tipo_jugador`, `estado_partido`...) con FK. Eran 8 tablas más y varios JOIN, y como
cada valor tiene una regla atada (por ejemplo, `cancelado` libera la cancha), agregar uno nuevo igual implica cambiar
código.

## Qué implica
Para agregar un valor hay que hacer `ALTER TABLE`. El back y el front tienen que mandar los valores con las tildes.
