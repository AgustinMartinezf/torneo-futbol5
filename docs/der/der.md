# Diagrama entidad-relación

Sale de `db/init/01_schema.sql`. GitHub muestra el bloque Mermaid como diagrama.

`PK` es clave primaria, `FK` clave foránea y `UK` indica que la columna está en un UNIQUE.
En `partido`, `ocupa_cancha`, `equipo_menor` y `equipo_mayor` son columnas generadas (ADR 0006).

```mermaid
erDiagram
    login {
        varchar correo PK
        varchar contrasena "hash bcrypt"
        enum rol "administrador | planillero"
    }

    facultad {
        int id_facultad PK
        varchar nombre UK
    }

    jugador {
        varchar ci PK "7-8 dígitos"
        varchar nombre
        varchar apellido
        varchar email UK
        date fecha_nacimiento
        int id_facultad FK
        enum tipo "grado | posgrado | docente | funcionario"
    }

    torneo {
        int id_torneo PK
        varchar nombre UK
        smallint anio UK "UNIQUE(anio, semestre)"
        tinyint semestre UK "1 | 2"
        date fecha_inicio
        date fecha_fin
        enum estado "inscripción | en curso | finalizado"
    }

    equipo {
        int id_equipo PK
        varchar nombre UK "UNIQUE(nombre, id_torneo)"
        int id_torneo FK
        int id_facultad FK
        varchar ci_capitan FK "NULL; FK (id_equipo, ci_capitan) al plantel"
    }

    equipo_jugador_torneo {
        int id_equipo PK, FK "FK (id_equipo, id_torneo) a equipo"
        varchar ci_jugador PK, FK
        int id_torneo PK, FK "UNIQUE(ci_jugador, id_torneo)"
        tinyint numero_camiseta UK "1-99; UNIQUE(id_equipo, numero_camiseta)"
    }

    complejo {
        int id_complejo PK
        varchar nombre UK
        varchar direccion
        enum departamento "19 departamentos"
    }

    cancha {
        varchar nombre_cancha PK
        int id_complejo PK, FK
        enum superficie "sintético | parquet"
        boolean techada
    }

    turno {
        tinyint id_turno PK
        time hora_inicio UK "18:00 a 22:00"
        time hora_fin "hora_inicio + 1 h"
    }

    partido {
        int id_partido PK, UK "UNIQUE(id_partido) para las FK hijas"
        int id_torneo PK, FK
        tinyint numero_fecha
        int id_equipo_local FK "FK (id_equipo_local, id_torneo)"
        int id_equipo_visitante FK "FK (id_equipo_visitante, id_torneo)"
        date dia
        tinyint id_turno FK
        varchar nombre_cancha FK "FK (nombre_cancha, id_complejo)"
        int id_complejo FK
        enum estado "programado | jugado | postergado | cancelado"
        tinyint ocupa_cancha UK "generada"
        int equipo_menor UK "generada"
        int equipo_mayor UK "generada"
    }

    planilla_partido {
        int id_partido PK, FK
        varchar ci_jugador PK, FK "FK (id_equipo, ci_jugador) al plantel"
        int id_equipo FK
    }

    gol {
        int id_gol PK
        int id_partido FK "FK (id_partido, ci_jugador) a planilla"
        varchar ci_jugador FK
        tinyint minuto "1-60"
        boolean autogol
    }

    tarjeta {
        int id_tarjeta PK
        int id_partido FK "FK (id_partido, ci_jugador) a planilla"
        varchar ci_jugador FK
        tinyint minuto "1-60"
        enum color "amarilla | roja"
    }

    sancion_jugador {
        int id_sancion PK
        varchar ci_jugador FK "FK (ci_jugador, id_torneo) al plantel"
        int id_torneo FK
        enum motivo "roja | acumulación de amarillas | disciplinaria"
        tinyint numero_fecha_inicio
        tinyint cantidad_fechas
        int id_tarjeta FK, UK "NULL si disciplinaria"
    }

    facultad ||--o{ jugador : "pertenece"
    facultad ||--o{ equipo : "representa"
    torneo ||--o{ equipo : "inscribe"
    equipo ||--o{ equipo_jugador_torneo : "plantel"
    jugador ||--o{ equipo_jugador_torneo : "integra"
    equipo_jugador_torneo |o--o| equipo : "capitán"
    complejo ||--o{ cancha : "tiene"
    torneo ||--o{ partido : "fixture"
    equipo ||--o{ partido : "local"
    equipo ||--o{ partido : "visitante"
    turno ||--o{ partido : "se juega en"
    cancha ||--o{ partido : "se juega en"
    partido ||--o{ planilla_partido : "planilla"
    equipo_jugador_torneo ||--o{ planilla_partido : "figura"
    planilla_partido ||--o{ gol : "convierte"
    planilla_partido ||--o{ tarjeta : "recibe"
    equipo_jugador_torneo ||--o{ sancion_jugador : "sancionado"
    tarjeta |o--o| sancion_jugador : "origina"
```

## Relaciones que conviene mirar dos veces
El plantel apunta a `equipo` por `(id_equipo, id_torneo)`, así que su `id_torneo` no puede ser distinto del del equipo.
El equipo, a su vez, apunta al plantel por `(id_equipo, ci_capitan)`: es una relación circular, y garantiza que el
capitán juegue en su propio equipo.

El partido apunta a `equipo` con `(id_equipo_local, id_torneo)` y `(id_equipo_visitante, id_torneo)`, por lo que los
dos equipos son de la edición del partido.

La planilla apunta al plantel por `(id_equipo, ci_jugador)`, y gol y tarjeta apuntan a la planilla por
`(id_partido, ci_jugador)`. La sanción apunta al plantel por `(ci_jugador, id_torneo)`, así que solo se sanciona a
inscriptos de esa edición.

`login` no se relaciona con ninguna tabla (ADR 0008).
