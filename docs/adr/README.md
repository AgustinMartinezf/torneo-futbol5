# Registro de decisiones de arquitectura (ADR)

Cada ADR documenta una decisión de diseño, el contexto, la alternativa descartada y sus consecuencias.

| N° | Decisión | Turno |
|---|---|---|
| [0001](0001-enum-para-dominios.md) | ENUM para los dominios cerrados de la letra | 01 |
| [0002](0002-pk-partido-superclave.md) | PK de `partido` como en la letra + `UNIQUE(id_partido)` | 01 |
| [0003](0003-id-torneo-en-plantel.md) | Mantener `id_torneo` en el plantel con FK compuesta | 01 |
| [0004](0004-capitan-fk-circular.md) | Capitán con FK circular NULL-able hacia el plantel | 01 |
| [0005](0005-fk-compuestas-planilla.md) | FK compuestas en planilla, gol, tarjeta y sanción | 01 |
| [0006](0006-columnas-generadas-partido.md) | Columnas generadas + UNIQUE para cancha y cruce | 01 |
| [0007](0007-politica-on-delete-update.md) | Política ON DELETE / ON UPDATE | 01 |
| [0008](0008-login-independiente.md) | `login` independiente de `jugador`, contraseña con hash | 01 |
| [0009](0009-ci-varchar.md) | `ci` como VARCHAR(8) | 01 |
| [0010](0010-sancion-id-tarjeta.md) | `id_tarjeta` en la sanción, con ON DELETE RESTRICT | 01 |
