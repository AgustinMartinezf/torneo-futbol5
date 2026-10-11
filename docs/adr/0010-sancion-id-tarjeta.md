# ADR 0010: `id_tarjeta` en la sanción

## El problema
Las sanciones automáticas salen de una tarjeta (una roja o la tercera amarilla). Como las tarjetas se pueden corregir
dentro de las 48 horas, a veces hay que revisar la sanción que generaron, y para eso hay que saber de qué tarjeta vino.

## Qué hicimos
Agregamos `id_tarjeta` en `sancion_jugador`. Puede ser NULL y es una FK a `tarjeta` con `ON DELETE RESTRICT`.
- Tiene UNIQUE, así una tarjeta no puede generar dos sanciones.
- Un CHECK pide que las sanciones disciplinarias no tengan tarjeta, y que las automáticas tengan tarjeta y sean de 1 fecha.
- En la acumulación, la tarjeta que se guarda es la tercera amarilla.

## Qué descartamos y por qué
Poner `ON DELETE CASCADE` para que al borrar la tarjeta se borre la sanción. No lo hicimos por dos cosas: si se borra
la primera o la segunda amarilla la sanción también tendría que irse, y la cascada solo funciona con la tercera; y en
MySQL los borrados en cascada no disparan triggers.

## Qué implica
Por ahora, si se quiere borrar una tarjeta que generó una sanción, da error. Cuando hagamos las sanciones, vamos a
borrar o recalcular la sanción y después la tarjeta, en la misma transacción. Que la CI y el color de la tarjeta
coincidan con la sanción también lo vamos a controlar ahí, con un trigger.
