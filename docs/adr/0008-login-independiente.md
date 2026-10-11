# ADR 0008 · `login` independiente de `jugador`, con la contraseña hasheada

Estado: aceptada. Turno 01.

## Contexto
La letra define `login (correo, contraseña, rol [administrador, planillero])` sin relacionarlo con otra tabla.
Los usuarios del sistema son administradores y planilleros de la organización, no jugadores.

## Decisión
`login` no tiene FK. `correo` es la PK, `contrasena` es `VARCHAR(255)` y `rol` es `ENUM('administrador','planillero')`.

La contraseña se guarda como hash bcrypt, que mide 60 caracteres. `chk_login_contrasena_hash` exige
`CHAR_LENGTH(contrasena) >= 60`, así que una contraseña en texto plano guardada por error no entra. Los 255 caracteres
dejan lugar para otros algoritmos, como argon2. `chk_login_correo` controla el formato básico del correo.

La columna se llama `contrasena`, sin ñ, para no tener identificadores con caracteres no ASCII (supuesto S-12).

## Alternativa descartada
Vincular `login` con `jugador` por correo o CI. Mezcla al usuario del sistema con el participante del torneo, y la
letra no lo pide.

## Consecuencias
Los jugadores no entran al sistema. Si algún día hiciera falta, se agrega una FK opcional.
Cada rol de la aplicación se corresponde con un usuario de base de datos con sus propios permisos (turno 02).
