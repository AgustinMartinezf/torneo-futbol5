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
Antes de borrar una tarjeta, `trg_tarjeta_validar_delete` borra la sanción que generó: si es roja, la borra; si es
amarilla, recalcula las sanciones por acumulación del jugador sin esa tarjeta (S-24). Como es un trigger BEFORE, todo
pasa en la misma sentencia y la FK nunca queda apuntando a una tarjeta que no existe. `trg_sancion_validar_insert`
controla que la CI, la edición, el color y la fecha de una sanción automática coincidan con su tarjeta.

Lo que no controla la base es que alguien con el usuario del administrador borre a mano una sanción automática, porque
ese usuario necesita borrar sanciones disciplinarias. El back no lo deja, y si pasara, la sanción por acumulación se
vuelve a generar la próxima vez que se cargue o se borre una amarilla del jugador.
