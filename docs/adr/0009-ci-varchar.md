# ADR 0009: La CI como VARCHAR(8)

## El problema
La cédula uruguaya tiene 7 u 8 dígitos contando el verificador. Había que elegir si guardarla como número o como texto.

## Qué hicimos
`ci` es VARCHAR(8), sin puntos ni guion, con un CHECK que pide solo números y entre 7 y 8 dígitos
(`REGEXP_LIKE(ci, '^[0-9]{7,8}$')`). Controlamos el dígito verificador en el formulario,
en el back y en un trigger de MySQL. Para las cédulas de 7 dígitos completamos con un cero a la izquierda
antes del cálculo.

## Qué descartamos y por qué
Usar INT. Ocupa menos, pero con la CI no se hacen cuentas, y como número se pueden perder los ceros de adelante.

## Qué implica
El CHECK está solo en `jugador`. En las otras tablas la CI es parte de FK con `ON UPDATE CASCADE`, y MySQL no deja
poner un CHECK ahí. Igual no hace falta, porque esas tablas solo pueden tener CI que ya existen en `jugador`.
