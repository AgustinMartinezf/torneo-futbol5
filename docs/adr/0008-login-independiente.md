# ADR 0008: `login` separado de `jugador` y contraseña con hash

## El problema
La letra pone `login (correo, contraseña, rol)` sin relacionarlo con ninguna tabla. Los que usan el sistema son los
administradores y los planilleros, no los jugadores.

## Qué hicimos
`login` no tiene FK. La PK es `correo`, `contrasena` es VARCHAR(255) y `rol` es un ENUM con `administrador` y
`planillero`.

En `contrasena` guardamos el hash (bcrypt), no la contraseña. Un hash de bcrypt tiene 60 caracteres, así que pusimos un
CHECK de que tenga por lo menos 60. Si alguien guarda una contraseña en texto plano por error, la base no la acepta.
También hay un CHECK para el formato del correo.

La columna se llama `contrasena` sin ñ para no tener problemas con caracteres raros en el SQL.

## Qué descartamos y por qué
Unir `login` con `jugador`. No tenía sentido porque los jugadores no entran al sistema, y la letra no lo pide.

## Qué implica
Si en algún momento los jugadores tuvieran que entrar, habría que agregar una FK. Los permisos de cada rol en la base
se explican en la sección 3.3 del informe.
