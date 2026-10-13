# Decisiones de diseño (ADR)

En cada archivo explicamos una decisión que tomamos en el modelo: cuál era el problema, qué hicimos, qué otra opción
pensamos y por qué no la usamos.

| N° | Decisión |
|---|---|
| [0001](0001-enum-para-dominios.md) | ENUM para los valores fijos de la letra |
| [0002](0002-pk-partido-superclave.md) | PK de `partido` como en la letra, más `UNIQUE(id_partido)` |
| [0003](0003-id-torneo-en-plantel.md) | Dejar `id_torneo` en el plantel con una FK compuesta |
| [0004](0004-capitan-fk-circular.md) | FK del capitán hacia el plantel |
| [0005](0005-fk-compuestas-planilla.md) | FK compuestas en partido, planilla, gol, tarjeta y sanción |
| [0006](0006-columnas-generadas-partido.md) | Columnas generadas en `partido` para la cancha y los cruces |
| [0007](0007-politica-on-delete-update.md) | Qué pasa al borrar o modificar (ON DELETE / ON UPDATE) |
| [0008](0008-login-independiente.md) | `login` separado de `jugador` y contraseña con hash |
| [0009](0009-ci-varchar.md) | La CI como VARCHAR(8) |
| [0010](0010-sancion-id-tarjeta.md) | `id_tarjeta` en la sanción |
