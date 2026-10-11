# ADR 0006: Columnas generadas en `partido` para la cancha y los cruces

## El problema
Hay dos reglas de la letra que dependen del estado del partido:
1. Una cancha no puede tener dos partidos el mismo día y turno. Pero si un partido se canceló o se postergó, la cancha
   tendría que quedar libre.
2. Dos equipos no se pueden enfrentar dos veces en el torneo, salvo que el partido anterior se haya cancelado. Y A
   contra B es lo mismo que B contra A.

Un UNIQUE normal no puede tener en cuenta el estado, y MySQL no tiene UNIQUE con WHERE.

## Qué hicimos
Agregamos columnas generadas que quedan en NULL cuando el partido no tiene que contar. En un UNIQUE de MySQL los NULL no
se comparan entre sí, así que esas filas no chocan con nada.
- `ocupa_cancha` vale 1 si el partido está `programado` o `jugado`, y NULL si no. Va en
  `UNIQUE(nombre_cancha, id_complejo, dia, id_turno, ocupa_cancha)`.
- `equipo_menor` y `equipo_mayor` guardan el id más chico y el más grande de los dos equipos (con LEAST y GREATEST),
  así A-B y B-A quedan iguales. Si el partido está `cancelado` valen NULL. Van en
  `UNIQUE(id_torneo, equipo_menor, equipo_mayor)`.

Un partido `postergado` libera la cancha, pero el cruce sigue contando, porque la letra solo habla de cancelados.

## Qué descartamos y por qué
Hacerlo con triggers que busquen en la tabla antes de insertar. Había que hacer uno para INSERT y otro para UPDATE, y
con el UNIQUE la base ya lo controla sola.

## Qué implica
Las columnas generadas no se pueden insertar, así que en el back hay que poner los nombres de las columnas en el
INSERT. La regla de que un equipo no juegue dos partidos en la misma fecha no sale con esto (el equipo puede ser local
en uno y visitante en otro), así que va con un trigger en el ABM de partidos.
