# ADR 0004 · Capitán con FK circular hacia el plantel, admitiendo NULL

Estado: aceptada. Turno 01.

## Contexto
La letra dice que cada equipo tiene un capitán "que debe ser uno de sus jugadores". Una FK `ci_capitan → jugador(ci)`
solo asegura que el capitán exista como jugador. No asegura que esté en el plantel de ese equipo.

## Decisión
Creamos `fk_equipo_capitan FOREIGN KEY (id_equipo, ci_capitan) REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador)`:
el par equipo y capitán tiene que existir en el plantel.

La relación es circular, porque el plantel apunta al equipo y el equipo al plantel. Por eso la FK se agrega con
`ALTER TABLE` después de crear las dos tablas.

`ci_capitan` admite NULL porque el equipo se crea antes que su plantel. Cuando vale NULL, MySQL no controla la FK.

Las acciones son `ON DELETE RESTRICT` (para sacar al capitán del plantel primero hay que nombrar a otro) y
`ON UPDATE CASCADE` (si se corrige la CI del jugador, el capitán se actualiza solo; lo probamos en el turno 01).

## Alternativa descartada
Una FK simple `ci_capitan → jugador(ci)` y un trigger que controle que el capitán esté en el plantel. Funciona, pero
pone en código procedural una regla que se puede declarar.

## Consecuencias
Exigir que el equipo tenga capitán cuando el torneo pasa a `en curso` queda para un trigger del turno 06.
`SET NULL` no sirve como acción: pondría en NULL también `id_equipo`, que es la PK.
