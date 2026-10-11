# ADR 0009 · `ci` como VARCHAR(8)

Estado: aceptada. Turno 01.

## Contexto
La cédula uruguaya tiene 7 u 8 dígitos, contando el verificador. Es un identificador.

## Decisión
`ci VARCHAR(8)` con `chk_jugador_ci CHECK (REGEXP_LIKE(ci, '^[0-9]{7,8}$'))`, sin puntos ni guion.
El dígito verificador lo controlan el back y el front. Se podría hacer con un trigger, pero es una validación de
formato, no una regla del torneo.

## Alternativa descartada
`INT`. Ocupa menos, pero con una CI no se hacen cuentas, y un tipo numérico invita a formatearla o a perder ceros a la
izquierda. Además obligaría a que todas las columnas de CI de las otras tablas fueran INT, por las FK.

## Consecuencias
El CHECK de formato está solo en `jugador`. En las tablas hijas, la columna forma parte de FK con `ON UPDATE CASCADE`,
y MySQL no permite combinar eso con un CHECK. Igual están cubiertas: solo pueden tener CI que ya existen en `jugador`.
