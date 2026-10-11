# ADR 0004: FK del capitán hacia el plantel

## El problema
La letra dice que el capitán "debe ser uno de sus jugadores". Si `ci_capitan` apunta a `jugador`, solo se controla que
el jugador exista, pero podría ser capitán alguien de otro equipo.

## Qué hicimos
La FK del capitán es `(id_equipo, ci_capitan)` hacia el plantel (`equipo_jugador_torneo`). Así el capitán tiene que
estar en el plantel de su propio equipo.

Como el plantel apunta a `equipo` y `equipo` apunta al plantel, la relación es circular. Por eso esta FK se agrega al
final con `ALTER TABLE`, cuando ya existen las dos tablas.

`ci_capitan` puede ser NULL, porque primero se crea el equipo y después se cargan los jugadores. Cuando es NULL,
MySQL no controla la FK.

Si se quiere sacar al capitán del plantel, da error (`ON DELETE RESTRICT`): primero hay que elegir otro capitán. Si se
cambia la CI del jugador, el capitán se actualiza solo (`ON UPDATE CASCADE`). Esto último lo probamos.

## Qué descartamos y por qué
Apuntar a `jugador` y controlar con un trigger que el capitán esté en el plantel. Funciona, pero preferimos hacerlo con
una FK si se podía.

## Qué implica
Que el equipo tenga capitán cuando el torneo pasa a `en curso` lo vamos a controlar con un trigger en el ABM de equipos.
