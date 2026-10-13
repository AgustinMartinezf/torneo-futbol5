-- Esquema de la base del Torneo Interfacultades de Fútbol 5.
-- MySQL 8.4, InnoDB, utf8mb4.
--
-- Tablas y columnas se llaman como en la letra, salvo contrasena y direccion,
-- que van sin ñ ni tilde (supuesto S-12).
-- Cada constraint tiene nombre (pk_, fk_, uq_, chk_) para que el backend
-- reciba errores que se puedan leer.
-- Todas las FK son ON DELETE RESTRICT. ON UPDATE CASCADE solo se usa hacia
-- claves naturales: jugador.ci y la clave de cancha (ADR 0007).
-- Las reglas que necesitan triggers van en scripts aparte, junto con la
-- funcionalidad que las usa (ver docs/informe.md, sección 3.2).
--
-- MySQL no deja usar en un CHECK una columna que está en una FK con CASCADE,
-- ni basar una columna generada en ella. Por eso el CHECK de formato de la
-- CI está solo en jugador.
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS torneo_futbol5;
CREATE DATABASE torneo_futbol5
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE torneo_futbol5;


-- Usuarios de la aplicación. No se relaciona con jugador porque los usuarios
-- son de la organización (ADR 0008).
CREATE TABLE login (
    correo      VARCHAR(100) NOT NULL,
    contrasena  VARCHAR(255) NOT NULL,   -- hash bcrypt, nunca texto plano
    rol         ENUM('administrador', 'planillero') NOT NULL,
    CONSTRAINT pk_login PRIMARY KEY (correo),
    CONSTRAINT chk_login_correo
        CHECK (REGEXP_LIKE(correo, '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')),
    -- Un hash bcrypt tiene 60 caracteres. Si llega algo más corto, es una contraseña en claro.
    CONSTRAINT chk_login_contrasena_hash CHECK (CHAR_LENGTH(contrasena) >= 60)
) ENGINE = InnoDB;


CREATE TABLE facultad (
    id_facultad INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(100) NOT NULL,
    CONSTRAINT pk_facultad PRIMARY KEY (id_facultad),
    CONSTRAINT uq_facultad_nombre UNIQUE (nombre),
    CONSTRAINT chk_facultad_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)
) ENGINE = InnoDB;


-- La CI es VARCHAR porque es un identificador y no se hacen cuentas con ella.
-- El dígito verificador lo validan el back y el front (ADR 0009).
CREATE TABLE jugador (
    ci               VARCHAR(8)   NOT NULL,
    nombre           VARCHAR(60)  NOT NULL,
    apellido         VARCHAR(60)  NOT NULL,
    email            VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE         NOT NULL,
    id_facultad      INT          NOT NULL,
    tipo             ENUM('grado', 'posgrado', 'docente', 'funcionario') NOT NULL,
    CONSTRAINT pk_jugador PRIMARY KEY (ci),
    CONSTRAINT uq_jugador_email UNIQUE (email),
    CONSTRAINT fk_jugador_facultad FOREIGN KEY (id_facultad)
        REFERENCES facultad (id_facultad) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_jugador_ci CHECK (REGEXP_LIKE(ci, '^[0-9]{7,8}$')),
    CONSTRAINT chk_jugador_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_jugador_apellido CHECK (CHAR_LENGTH(TRIM(apellido)) > 0),
    CONSTRAINT chk_jugador_email
        CHECK (REGEXP_LIKE(email, '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')),
    -- CURDATE() no está permitido en un CHECK, así que la edad mínima la controla el back.
    CONSTRAINT chk_jugador_fecha_nacimiento CHECK (fecha_nacimiento >= '1900-01-01')
) ENGINE = InnoDB;


-- Cada edición es un semestre, de ahí el UNIQUE(anio, semestre).
CREATE TABLE torneo (
    id_torneo    INT          NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    anio         SMALLINT     NOT NULL,
    semestre     TINYINT      NOT NULL,
    fecha_inicio DATE         NOT NULL,
    fecha_fin    DATE         NOT NULL,
    estado       ENUM('inscripción', 'en curso', 'finalizado') NOT NULL DEFAULT 'inscripción',
    CONSTRAINT pk_torneo PRIMARY KEY (id_torneo),
    CONSTRAINT uq_torneo_anio_semestre UNIQUE (anio, semestre),
    CONSTRAINT uq_torneo_nombre UNIQUE (nombre),
    CONSTRAINT chk_torneo_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_torneo_anio CHECK (anio BETWEEN 2000 AND 2100),
    CONSTRAINT chk_torneo_semestre CHECK (semestre IN (1, 2)),
    CONSTRAINT chk_torneo_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT chk_torneo_anio_inicio CHECK (YEAR(fecha_inicio) = anio)
) ENGINE = InnoDB;


-- ci_capitan admite NULL porque el equipo se crea antes que su plantel.
-- La FK del capitán al plantel es circular y se agrega más abajo con ALTER TABLE (ADR 0004).
-- Una facultad puede tener más de un equipo por edición (supuesto S-03).
CREATE TABLE equipo (
    id_equipo   INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(60)  NOT NULL,
    id_torneo   INT          NOT NULL,
    id_facultad INT          NOT NULL,
    ci_capitan  VARCHAR(8)   NULL,
    CONSTRAINT pk_equipo PRIMARY KEY (id_equipo),
    CONSTRAINT uq_equipo_nombre_torneo UNIQUE (nombre, id_torneo),
    -- Es el destino de las FK compuestas (id_equipo, id_torneo) del plantel y del partido (ADR 0003).
    CONSTRAINT uq_equipo_id_torneo UNIQUE (id_equipo, id_torneo),
    CONSTRAINT fk_equipo_torneo FOREIGN KEY (id_torneo)
        REFERENCES torneo (id_torneo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_equipo_facultad FOREIGN KEY (id_facultad)
        REFERENCES facultad (id_facultad) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_equipo_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)
) ENGINE = InnoDB;


-- Plantel, con la PK de la letra. id_torneo es redundante porque depende de
-- id_equipo, pero la FK compuesta a equipo(id_equipo, id_torneo) no deja que
-- quede inconsistente. Gracias a eso, UNIQUE(ci_jugador, id_torneo) garantiza
-- que un jugador esté en un solo equipo por edición (ADR 0003).
CREATE TABLE equipo_jugador_torneo (
    id_equipo       INT              NOT NULL,
    ci_jugador      VARCHAR(8)       NOT NULL,
    id_torneo       INT              NOT NULL,
    numero_camiseta TINYINT UNSIGNED NOT NULL,
    CONSTRAINT pk_equipo_jugador_torneo PRIMARY KEY (id_equipo, ci_jugador, id_torneo),
    CONSTRAINT uq_ejt_jugador_torneo UNIQUE (ci_jugador, id_torneo),
    CONSTRAINT uq_ejt_camiseta UNIQUE (id_equipo, numero_camiseta),
    -- Destino de las FK del capitán y de la planilla.
    CONSTRAINT uq_ejt_equipo_jugador UNIQUE (id_equipo, ci_jugador),
    CONSTRAINT fk_ejt_equipo FOREIGN KEY (id_equipo, id_torneo)
        REFERENCES equipo (id_equipo, id_torneo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ejt_jugador FOREIGN KEY (ci_jugador)
        REFERENCES jugador (ci) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_ejt_camiseta CHECK (numero_camiseta BETWEEN 1 AND 99)
) ENGINE = InnoDB;

-- El capitán tiene que ser jugador del plantel de su propio equipo.
-- Mientras ci_capitan sea NULL, la FK no se controla.
ALTER TABLE equipo
    ADD CONSTRAINT fk_equipo_capitan FOREIGN KEY (id_equipo, ci_capitan)
        REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador)
        ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TABLE complejo (
    id_complejo  INT          NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    direccion    VARCHAR(150) NOT NULL,
    departamento ENUM('Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno',
                      'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Montevideo',
                      'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto',
                      'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres') NOT NULL,
    CONSTRAINT pk_complejo PRIMARY KEY (id_complejo),
    CONSTRAINT uq_complejo_nombre UNIQUE (nombre),
    CONSTRAINT chk_complejo_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_complejo_direccion CHECK (CHAR_LENGTH(TRIM(direccion)) > 0)
) ENGINE = InnoDB;


-- PK compuesta de la letra: el nombre de la cancha es único dentro de su complejo.
CREATE TABLE cancha (
    nombre_cancha VARCHAR(50) NOT NULL,
    id_complejo   INT         NOT NULL,
    superficie    ENUM('sintético', 'parquet') NOT NULL,
    techada       BOOLEAN     NOT NULL,
    CONSTRAINT pk_cancha PRIMARY KEY (nombre_cancha, id_complejo),
    CONSTRAINT fk_cancha_complejo FOREIGN KEY (id_complejo)
        REFERENCES complejo (id_complejo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_cancha_nombre CHECK (CHAR_LENGTH(TRIM(nombre_cancha)) > 0),
    CONSTRAINT chk_cancha_techada CHECK (techada IN (0, 1))  -- BOOLEAN es TINYINT(1) y aceptaría un 5
) ENGINE = InnoDB;


-- Turnos de una hora entre las 18:00 y las 23:00. El último es de 22:00 a 23:00.
CREATE TABLE turno (
    id_turno    TINYINT UNSIGNED NOT NULL,
    hora_inicio TIME             NOT NULL,
    hora_fin    TIME             NOT NULL,
    CONSTRAINT pk_turno PRIMARY KEY (id_turno),
    CONSTRAINT uq_turno_hora_inicio UNIQUE (hora_inicio),
    CONSTRAINT chk_turno_rango CHECK (hora_inicio BETWEEN '18:00:00' AND '22:00:00'),
    CONSTRAINT chk_turno_en_punto CHECK (MINUTE(hora_inicio) = 0 AND SECOND(hora_inicio) = 0),
    CONSTRAINT chk_turno_duracion CHECK (hora_fin = ADDTIME(hora_inicio, '01:00:00'))
) ENGINE = InnoDB;


-- La PK (id_partido, id_torneo) es la de la letra. Como id_partido es
-- AUTO_INCREMENT y ya es único, esa PK es una superclave no mínima. Se agrega
-- UNIQUE(id_partido) porque MySQL 8.4 (restrict_fk_on_non_standard_key=ON)
-- pide una clave única exacta para las FK de planilla_partido (ADR 0002).
--
-- Las columnas generadas convierten en UNIQUE dos reglas que dependen del
-- estado. Un índice UNIQUE no compara los NULL entre sí (ADR 0006):
--   ocupa_cancha vale NULL si el partido está cancelado o postergado, y así libera la cancha.
--   equipo_menor y equipo_mayor guardan el par ordenado de equipos, y valen NULL
--   si el partido se canceló, para que el cruce se pueda volver a programar.
CREATE TABLE partido (
    id_partido          INT              NOT NULL AUTO_INCREMENT,
    id_torneo           INT              NOT NULL,
    numero_fecha        TINYINT UNSIGNED NOT NULL,
    id_equipo_local     INT              NOT NULL,
    id_equipo_visitante INT              NOT NULL,
    dia                 DATE             NOT NULL,
    id_turno            TINYINT UNSIGNED NOT NULL,
    nombre_cancha       VARCHAR(50)      NOT NULL,
    id_complejo         INT              NOT NULL,
    estado              ENUM('programado', 'jugado', 'postergado', 'cancelado')
                        NOT NULL DEFAULT 'programado',
    ocupa_cancha  TINYINT AS (IF(estado IN ('programado', 'jugado'), 1, NULL)) STORED,
    equipo_menor  INT AS (IF(estado <> 'cancelado',
                             LEAST(id_equipo_local, id_equipo_visitante), NULL)) STORED,
    equipo_mayor  INT AS (IF(estado <> 'cancelado',
                             GREATEST(id_equipo_local, id_equipo_visitante), NULL)) STORED,
    CONSTRAINT pk_partido PRIMARY KEY (id_partido, id_torneo),
    CONSTRAINT uq_partido_id UNIQUE (id_partido),
    -- Una cancha no puede tener dos partidos activos el mismo día y turno.
    CONSTRAINT uq_partido_cancha_turno
        UNIQUE (nombre_cancha, id_complejo, dia, id_turno, ocupa_cancha),
    -- Liga a una rueda: cada cruce una vez por edición, salvo que el anterior se haya cancelado.
    CONSTRAINT uq_partido_cruce UNIQUE (id_torneo, equipo_menor, equipo_mayor),
    CONSTRAINT fk_partido_torneo FOREIGN KEY (id_torneo)
        REFERENCES torneo (id_torneo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    -- Con las FK compuestas, los dos equipos tienen que ser de la edición del partido.
    CONSTRAINT fk_partido_local FOREIGN KEY (id_equipo_local, id_torneo)
        REFERENCES equipo (id_equipo, id_torneo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_partido_visitante FOREIGN KEY (id_equipo_visitante, id_torneo)
        REFERENCES equipo (id_equipo, id_torneo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_partido_turno FOREIGN KEY (id_turno)
        REFERENCES turno (id_turno) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_partido_cancha FOREIGN KEY (nombre_cancha, id_complejo)
        REFERENCES cancha (nombre_cancha, id_complejo) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_partido_equipos_distintos CHECK (id_equipo_local <> id_equipo_visitante),
    CONSTRAINT chk_partido_numero_fecha CHECK (numero_fecha >= 1)
) ENGINE = InnoDB;


-- La FK compuesta al plantel asegura que el jugador sea del plantel del equipo
-- que se indica. No hay FK directa a jugador: ya está implícita y además
-- abriría un segundo camino de cascada (ADR 0005).
CREATE TABLE planilla_partido (
    id_partido INT        NOT NULL,
    ci_jugador VARCHAR(8) NOT NULL,
    id_equipo  INT        NOT NULL,
    CONSTRAINT pk_planilla_partido PRIMARY KEY (id_partido, ci_jugador),
    CONSTRAINT fk_planilla_partido FOREIGN KEY (id_partido)
        REFERENCES partido (id_partido) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_planilla_plantel FOREIGN KEY (id_equipo, ci_jugador)
        REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- En gol y tarjeta, la FK compuesta a planilla_partido hace que solo puedan
-- convertir o recibir tarjeta los jugadores que están en la planilla.
-- El partido se juega en un único tiempo de 60 minutos (dato D-01).
-- El resultado no se guarda: sale de contar los goles, y el autogol suma al rival.
CREATE TABLE gol (
    id_gol     INT              NOT NULL AUTO_INCREMENT,
    id_partido INT              NOT NULL,
    ci_jugador VARCHAR(8)       NOT NULL,
    minuto     TINYINT UNSIGNED NOT NULL,
    autogol    BOOLEAN          NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_gol PRIMARY KEY (id_gol),
    CONSTRAINT fk_gol_planilla FOREIGN KEY (id_partido, ci_jugador)
        REFERENCES planilla_partido (id_partido, ci_jugador)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_gol_minuto CHECK (minuto BETWEEN 1 AND 60),
    CONSTRAINT chk_gol_autogol CHECK (autogol IN (0, 1))
) ENGINE = InnoDB;

CREATE TABLE tarjeta (
    id_tarjeta INT              NOT NULL AUTO_INCREMENT,
    id_partido INT              NOT NULL,
    ci_jugador VARCHAR(8)       NOT NULL,
    minuto     TINYINT UNSIGNED NOT NULL,
    color      ENUM('amarilla', 'roja') NOT NULL,
    CONSTRAINT pk_tarjeta PRIMARY KEY (id_tarjeta),
    CONSTRAINT fk_tarjeta_planilla FOREIGN KEY (id_partido, ci_jugador)
        REFERENCES planilla_partido (id_partido, ci_jugador)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_tarjeta_minuto CHECK (minuto BETWEEN 1 AND 60)
) ENGINE = InnoDB;


-- La FK (ci_jugador, id_torneo) al plantel obliga a que el sancionado esté
-- inscripto en esa edición. De ahí sale su equipo para el reporte de
-- sanciones por equipo (ADR 0005).
-- id_tarjeta es un atributo agregado: guarda la tarjeta que originó una sanción
-- automática. Es ON DELETE RESTRICT; la reversión de la sanción se hace junto con
-- la lógica de sanciones (ADR 0010).
CREATE TABLE sancion_jugador (
    id_sancion          INT              NOT NULL AUTO_INCREMENT,
    ci_jugador          VARCHAR(8)       NOT NULL,
    id_torneo           INT              NOT NULL,
    motivo              ENUM('roja', 'acumulación de amarillas', 'disciplinaria') NOT NULL,
    numero_fecha_inicio TINYINT UNSIGNED NOT NULL,
    cantidad_fechas     TINYINT UNSIGNED NOT NULL,
    id_tarjeta          INT              NULL,
    CONSTRAINT pk_sancion_jugador PRIMARY KEY (id_sancion),
    CONSTRAINT uq_sancion_tarjeta UNIQUE (id_tarjeta),  -- una tarjeta genera a lo sumo una sanción
    CONSTRAINT fk_sancion_plantel FOREIGN KEY (ci_jugador, id_torneo)
        REFERENCES equipo_jugador_torneo (ci_jugador, id_torneo)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sancion_tarjeta FOREIGN KEY (id_tarjeta)
        REFERENCES tarjeta (id_tarjeta) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_sancion_fecha_inicio CHECK (numero_fecha_inicio >= 1),
    CONSTRAINT chk_sancion_cantidad CHECK (cantidad_fechas >= 1),
    -- Una sanción automática (roja o acumulación) dura 1 fecha y tiene tarjeta de origen.
    -- Una disciplinaria no tiene tarjeta y puede durar varias fechas.
    CONSTRAINT chk_sancion_origen CHECK (
        (motivo = 'disciplinaria' AND id_tarjeta IS NULL)
        OR (motivo <> 'disciplinaria' AND id_tarjeta IS NOT NULL AND cantidad_fechas = 1)
    )
) ENGINE = InnoDB;
