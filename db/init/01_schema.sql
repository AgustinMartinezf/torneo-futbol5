-- Esquema de la base del Torneo Interfacultades de Fútbol 5 (MySQL 8.4, InnoDB, utf8mb4).
-- Las decisiones de diseño están en docs/adr/ y dónde se valida cada regla, en docs/informe.md (§3.2).
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS torneo_futbol5;
CREATE DATABASE torneo_futbol5
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE torneo_futbol5;


-- No se relaciona con jugador: las cuentas son de la organización (ADR 0008).
CREATE TABLE login (
    correo      VARCHAR(100) NOT NULL,
    contrasena  VARCHAR(255) NOT NULL,
    rol         ENUM('administrador', 'planillero') NOT NULL,
    CONSTRAINT pk_login PRIMARY KEY (correo),
    CONSTRAINT chk_login_correo
        CHECK (REGEXP_LIKE(correo, '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')),
    -- Formato de un hash bcrypt, para que no se pueda guardar una contraseña en claro.
    CONSTRAINT chk_login_contrasena_hash
        CHECK (REGEXP_LIKE(contrasena, '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$', 'c'))
) ENGINE = InnoDB;


CREATE TABLE facultad (
    id_facultad INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(100) NOT NULL,
    CONSTRAINT pk_facultad PRIMARY KEY (id_facultad),
    CONSTRAINT uq_facultad_nombre UNIQUE (nombre),
    CONSTRAINT chk_facultad_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)
) ENGINE = InnoDB;


-- La CI es VARCHAR porque es un identificador (ADR 0009).
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
    -- El formato de la CI se controla solo acá: MySQL no deja poner un CHECK en una
    -- columna que está en una FK con ON UPDATE CASCADE, como las que apuntan a jugador.ci.
    CONSTRAINT chk_jugador_ci CHECK (REGEXP_LIKE(ci, '^[0-9]{7,8}$')),
    CONSTRAINT chk_jugador_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_jugador_apellido CHECK (CHAR_LENGTH(TRIM(apellido)) > 0),
    CONSTRAINT chk_jugador_email
        CHECK (REGEXP_LIKE(email, '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')),
    -- CURDATE() no se puede usar en un CHECK: la edad la controlan los triggers de abajo.
    CONSTRAINT chk_jugador_fecha_nacimiento CHECK (fecha_nacimiento >= '1900-01-01')
) ENGINE = InnoDB;


DELIMITER //
CREATE FUNCTION ci_uruguaya_valida(p_ci VARCHAR(8))
RETURNS BOOLEAN DETERMINISTIC NO SQL
BEGIN
    DECLARE v_ci CHAR(8);
    DECLARE v_suma INT;

    IF p_ci IS NULL OR NOT REGEXP_LIKE(p_ci, '^[0-9]{7,8}$', 'c') THEN
        RETURN FALSE;
    END IF;

    SET v_ci = LPAD(p_ci, 8, '0');
    SET v_suma = CAST(SUBSTRING(v_ci, 1, 1) AS UNSIGNED) * 2
               + CAST(SUBSTRING(v_ci, 2, 1) AS UNSIGNED) * 9
               + CAST(SUBSTRING(v_ci, 3, 1) AS UNSIGNED) * 8
               + CAST(SUBSTRING(v_ci, 4, 1) AS UNSIGNED) * 7
               + CAST(SUBSTRING(v_ci, 5, 1) AS UNSIGNED) * 6
               + CAST(SUBSTRING(v_ci, 6, 1) AS UNSIGNED) * 3
               + CAST(SUBSTRING(v_ci, 7, 1) AS UNSIGNED) * 4;
    RETURN MOD(10 - MOD(v_suma, 10), 10) = CAST(RIGHT(v_ci, 1) AS UNSIGNED);
END//

-- Rango de edad de 16 a 120 años (supuesto S-13).
CREATE TRIGGER trg_jugador_validar_insert
BEFORE INSERT ON jugador
FOR EACH ROW
BEGIN
    IF NOT ci_uruguaya_valida(NEW.ci) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La cédula debe tener 7 u 8 dígitos y un verificador válido.';
    END IF;
    IF NEW.fecha_nacimiento IS NULL
       OR TIMESTAMPDIFF(YEAR, NEW.fecha_nacimiento, CURDATE()) NOT BETWEEN 16 AND 120 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La edad del jugador debe estar entre 16 y 120 años.';
    END IF;
END//

CREATE TRIGGER trg_jugador_validar_update
BEFORE UPDATE ON jugador
FOR EACH ROW
BEGIN
    IF NOT ci_uruguaya_valida(NEW.ci) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La cédula debe tener 7 u 8 dígitos y un verificador válido.';
    END IF;
    IF NEW.fecha_nacimiento IS NULL
       OR TIMESTAMPDIFF(YEAR, NEW.fecha_nacimiento, CURDATE()) NOT BETWEEN 16 AND 120 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La edad del jugador debe estar entre 16 y 120 años.';
    END IF;
    IF NEW.id_facultad <> OLD.id_facultad AND EXISTS (
        SELECT 1 FROM equipo_jugador_torneo ejt JOIN equipo e ON e.id_equipo = ejt.id_equipo
        WHERE ejt.ci_jugador = OLD.ci AND e.id_facultad <> NEW.id_facultad
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede cambiar la facultad: el jugador tiene un plantel de otra facultad.';
    END IF;
    IF NEW.tipo <> OLD.tipo AND NEW.tipo IN ('docente', 'funcionario') AND EXISTS (
        SELECT 1 FROM equipo_jugador_torneo propio
        WHERE propio.ci_jugador = OLD.ci AND (
            SELECT COUNT(*) FROM equipo_jugador_torneo otro JOIN jugador j ON j.ci = otro.ci_jugador
            WHERE otro.id_equipo = propio.id_equipo AND otro.ci_jugador <> OLD.ci
              AND j.tipo IN ('docente', 'funcionario')
        ) >= 2
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El cambio de tipo supera el máximo de 2 docentes o funcionarios en un plantel.';
    END IF;
END//
DELIMITER ;


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


-- ci_capitan admite NULL porque el equipo se crea antes que su plantel; su FK es circular
-- y se agrega después con ALTER TABLE (ADR 0004). Una facultad puede tener varios equipos (S-03).
CREATE TABLE equipo (
    id_equipo   INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(60)  NOT NULL,
    id_torneo   INT          NOT NULL,
    id_facultad INT          NOT NULL,
    ci_capitan  VARCHAR(8)   NULL,
    CONSTRAINT pk_equipo PRIMARY KEY (id_equipo),
    CONSTRAINT uq_equipo_nombre_torneo UNIQUE (nombre, id_torneo),
    -- Destino de las FK compuestas del plantel y del partido (ADR 0003).
    CONSTRAINT uq_equipo_id_torneo UNIQUE (id_equipo, id_torneo),
    CONSTRAINT fk_equipo_torneo FOREIGN KEY (id_torneo)
        REFERENCES torneo (id_torneo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_equipo_facultad FOREIGN KEY (id_facultad)
        REFERENCES facultad (id_facultad) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_equipo_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)
) ENGINE = InnoDB;


-- id_torneo es redundante, pero con la FK compuesta a equipo no puede quedar inconsistente
-- y permite UNIQUE(ci_jugador, id_torneo): un jugador en un solo equipo por edición (ADR 0003).
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

ALTER TABLE equipo
    ADD CONSTRAINT fk_equipo_capitan FOREIGN KEY (id_equipo, ci_capitan)
        REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- El CASCADE de las FK (id_equipo, ci_jugador) arrastraría un cambio de id_equipo a las planillas
-- viejas sin error, así que no lo dejamos cambiar (ADR 0007). El cambio de CI sigue andando
-- porque las acciones en cascada no disparan triggers.
DELIMITER //
CREATE TRIGGER trg_ejt_no_cambiar_equipo
BEFORE UPDATE ON equipo_jugador_torneo
FOR EACH ROW
BEGIN
    IF NEW.id_equipo <> OLD.id_equipo OR NEW.id_torneo <> OLD.id_torneo THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede cambiar el equipo de un jugador del plantel. Hay que sacarlo e inscribirlo de nuevo.';
    END IF;
    IF (SELECT estado FROM torneo WHERE id_torneo = OLD.id_torneo) <> 'inscripción' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel solo se puede modificar durante la inscripción.';
    END IF;
    IF (SELECT id_facultad FROM jugador WHERE ci = NEW.ci_jugador)
       <> (SELECT id_facultad FROM equipo WHERE id_equipo = NEW.id_equipo) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Todos los jugadores deben ser de la facultad del equipo.';
    END IF;
    IF (SELECT tipo FROM jugador WHERE ci = NEW.ci_jugador) IN ('docente', 'funcionario')
       AND (SELECT COUNT(*) FROM equipo_jugador_torneo ejt JOIN jugador j ON j.ci = ejt.ci_jugador
            WHERE ejt.id_equipo = NEW.id_equipo AND ejt.ci_jugador <> OLD.ci_jugador
              AND j.tipo IN ('docente', 'funcionario')) >= 2 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel admite como máximo 2 docentes o funcionarios.';
    END IF;
END//

CREATE TRIGGER trg_ejt_validar_insert
BEFORE INSERT ON equipo_jugador_torneo
FOR EACH ROW
BEGIN
    IF (SELECT estado FROM torneo WHERE id_torneo = NEW.id_torneo) <> 'inscripción' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel solo se puede modificar durante la inscripción.';
    END IF;
    IF (SELECT id_facultad FROM jugador WHERE ci = NEW.ci_jugador)
       <> (SELECT id_facultad FROM equipo WHERE id_equipo = NEW.id_equipo) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Todos los jugadores deben ser de la facultad del equipo.';
    END IF;
    IF (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = NEW.id_equipo) >= 10 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel admite como máximo 10 jugadores.';
    END IF;
    IF (SELECT tipo FROM jugador WHERE ci = NEW.ci_jugador) IN ('docente', 'funcionario')
       AND (SELECT COUNT(*) FROM equipo_jugador_torneo ejt JOIN jugador j ON j.ci = ejt.ci_jugador
            WHERE ejt.id_equipo = NEW.id_equipo AND j.tipo IN ('docente', 'funcionario')) >= 2 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel admite como máximo 2 docentes o funcionarios.';
    END IF;
END//

CREATE TRIGGER trg_ejt_validar_delete
BEFORE DELETE ON equipo_jugador_torneo
FOR EACH ROW
BEGIN
    IF (SELECT estado FROM torneo WHERE id_torneo = OLD.id_torneo) <> 'inscripción' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El plantel solo se puede modificar durante la inscripción.';
    END IF;
END//

CREATE TRIGGER trg_equipo_validar_insert
BEFORE INSERT ON equipo
FOR EACH ROW
BEGIN
    IF (SELECT estado FROM torneo WHERE id_torneo = NEW.id_torneo) <> 'inscripción' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se pueden inscribir equipos durante la inscripción.';
    END IF;
END//

CREATE TRIGGER trg_equipo_validar_update
BEFORE UPDATE ON equipo
FOR EACH ROW
BEGIN
    IF (NEW.id_facultad <> OLD.id_facultad OR NEW.id_torneo <> OLD.id_torneo
        OR COALESCE(NEW.ci_capitan, '') <> COALESCE(OLD.ci_capitan, ''))
       AND ((SELECT estado FROM torneo WHERE id_torneo = OLD.id_torneo) <> 'inscripción'
            OR (SELECT estado FROM torneo WHERE id_torneo = NEW.id_torneo) <> 'inscripción') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La facultad, la edición y el capitán solo se cambian durante la inscripción.';
    END IF;
    IF NEW.id_facultad <> OLD.id_facultad AND EXISTS (
        SELECT 1 FROM equipo_jugador_torneo ejt JOIN jugador j ON j.ci = ejt.ci_jugador
        WHERE ejt.id_equipo = OLD.id_equipo AND j.id_facultad <> NEW.id_facultad
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede cambiar la facultad del equipo porque tiene jugadores de otra facultad.';
    END IF;
END//

CREATE TRIGGER trg_equipo_validar_delete
BEFORE DELETE ON equipo
FOR EACH ROW
BEGIN
    IF (SELECT estado FROM torneo WHERE id_torneo = OLD.id_torneo) <> 'inscripción' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se pueden borrar equipos durante la inscripción.';
    END IF;
END//

CREATE TRIGGER trg_torneo_validar_insert
BEFORE INSERT ON torneo
FOR EACH ROW
BEGIN
    IF NEW.estado <> 'inscripción' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Una edición debe crearse en inscripción.';
    END IF;
END//

CREATE TRIGGER trg_torneo_validar_update
BEFORE UPDATE ON torneo
FOR EACH ROW
BEGIN
    IF NEW.estado <> OLD.estado AND NOT (
        (OLD.estado = 'inscripción' AND NEW.estado = 'en curso')
        OR (OLD.estado = 'en curso' AND NEW.estado = 'finalizado')
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Los estados deben avanzar de inscripción a en curso y luego a finalizado.';
    END IF;
    IF NEW.estado = 'en curso' AND OLD.estado = 'inscripción' AND EXISTS (
        SELECT 1 FROM equipo e WHERE e.id_torneo = OLD.id_torneo
        AND (e.ci_capitan IS NULL OR
             (SELECT COUNT(*) FROM equipo_jugador_torneo ejt WHERE ejt.id_equipo = e.id_equipo) NOT BETWEEN 5 AND 10)
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Para iniciar la edición todos los equipos deben tener entre 5 y 10 jugadores y un capitán.';
    END IF;
END//
DELIMITER ;


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


CREATE TABLE cancha (
    nombre_cancha VARCHAR(50) NOT NULL,
    id_complejo   INT         NOT NULL,
    superficie    ENUM('sintético', 'parquet') NOT NULL,
    techada       BOOLEAN     NOT NULL,
    CONSTRAINT pk_cancha PRIMARY KEY (nombre_cancha, id_complejo),
    CONSTRAINT fk_cancha_complejo FOREIGN KEY (id_complejo)
        REFERENCES complejo (id_complejo) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_cancha_nombre CHECK (CHAR_LENGTH(TRIM(nombre_cancha)) > 0),
    CONSTRAINT chk_cancha_nombre_sin_barra CHECK (LOCATE('/', nombre_cancha) = 0),
    CONSTRAINT chk_cancha_techada CHECK (techada IN (0, 1))  -- BOOLEAN es TINYINT(1) y aceptaría un 5
) ENGINE = InnoDB;

-- Una cancha no cambia de complejo: por el CASCADE de fk_partido_cancha, también cambiaría
-- dónde se jugaron sus partidos (supuesto S-15). Cambiarle el nombre sí se puede.
DELIMITER //
CREATE TRIGGER trg_cancha_no_cambiar_complejo
BEFORE UPDATE ON cancha
FOR EACH ROW
BEGIN
    IF NEW.id_complejo <> OLD.id_complejo THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede cambiar el complejo de una cancha.';
    END IF;
END//
DELIMITER ;


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


-- UNIQUE(id_partido) porque MySQL 8.4 pide una clave única exacta para las FK de la planilla (ADR 0002).
-- Las columnas generadas valen NULL cuando el partido libera la cancha o el cruce, y un UNIQUE
-- no compara los NULL entre sí: así esas dos reglas dependen del estado (ADR 0006, S-01).
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


-- SQL SECURITY DEFINER: corre con los permisos de quien lo creó, así el planillero marca un
-- partido como jugado sin tener UPDATE en partido (informe §3.3). NOW() usa America/Montevideo.
DELIMITER //
CREATE PROCEDURE marcar_partido_jugado(IN p_id_partido INT)
    MODIFIES SQL DATA
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_estado VARCHAR(20) DEFAULT NULL;
    DECLARE v_fin DATETIME DEFAULT NULL;

    SELECT p.estado, TIMESTAMP(p.dia, t.hora_fin)
      INTO v_estado, v_fin
      FROM partido p
      JOIN turno t ON t.id_turno = p.id_turno
     WHERE p.id_partido = p_id_partido
       FOR UPDATE;

    IF v_estado IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El partido no existe.';
    ELSEIF v_estado <> 'programado' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se puede marcar como jugado un partido programado.';
    ELSEIF v_fin > NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El partido todavía no se jugó: su turno no terminó.';
    END IF;

    UPDATE partido SET estado = 'jugado' WHERE id_partido = p_id_partido;
END//
DELIMITER ;


-- Reglas para programar un partido que no entran en un UNIQUE o un CHECK (informe §3.2).
-- Con la edición en curso los planteles ya no cambian y todos tienen 5 a 10 jugadores, pero igual lo chequeamos.
-- Un partido cancelado no cuenta para la regla de un partido por equipo y fecha (S-20).
DELIMITER //
CREATE TRIGGER trg_partido_validar_insert
BEFORE INSERT ON partido
FOR EACH ROW
BEGIN
    IF NEW.estado <> 'programado' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un partido nuevo se crea como programado.';
    END IF;
    IF (SELECT estado FROM torneo WHERE id_torneo = NEW.id_torneo) <> 'en curso' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se pueden programar partidos de una edición en curso.';
    END IF;
    IF (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = NEW.id_equipo_local) < 5
       OR (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = NEW.id_equipo_visitante) < 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Los dos equipos deben tener al menos 5 jugadores en el plantel.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM partido p
        WHERE p.id_torneo = NEW.id_torneo AND p.numero_fecha = NEW.numero_fecha AND p.estado <> 'cancelado'
          AND (p.id_equipo_local IN (NEW.id_equipo_local, NEW.id_equipo_visitante)
               OR p.id_equipo_visitante IN (NEW.id_equipo_local, NEW.id_equipo_visitante))
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un equipo no puede jugar más de un partido en la misma fecha del torneo.';
    END IF;
    IF NEW.dia < (SELECT fecha_inicio FROM torneo WHERE id_torneo = NEW.id_torneo)
       OR NEW.dia > (SELECT fecha_fin FROM torneo WHERE id_torneo = NEW.id_torneo) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El día del partido tiene que estar entre el inicio y el fin de la edición.';
    END IF;
END//

-- Estados (S-01, S-19): programado pasa a jugado, postergado o cancelado; postergado vuelve a programado
-- al reprogramarlo o se cancela. Jugado y cancelado ya no cambian. Para jugado usamos la misma condición
-- que marcar_partido_jugado, así vale también cuando el administrador edita el partido.
CREATE TRIGGER trg_partido_validar_update
BEFORE UPDATE ON partido
FOR EACH ROW
BEGIN
    IF OLD.estado IN ('jugado', 'cancelado') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un partido jugado o cancelado no se puede modificar.';
    END IF;
    IF NEW.id_torneo <> OLD.id_torneo THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede cambiar la edición de un partido.';
    END IF;
    IF NEW.estado <> OLD.estado AND NOT (
        (OLD.estado = 'programado' AND NEW.estado IN ('jugado', 'postergado', 'cancelado'))
        OR (OLD.estado = 'postergado' AND NEW.estado IN ('programado', 'cancelado'))
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un partido programado pasa a jugado, postergado o cancelado, y uno postergado vuelve a programado o se cancela.';
    END IF;
    IF NEW.estado = 'jugado'
       AND TIMESTAMP(NEW.dia, (SELECT hora_fin FROM turno WHERE id_turno = NEW.id_turno)) > NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El partido todavía no se jugó: su turno no terminó.';
    END IF;
    IF (NEW.id_equipo_local <> OLD.id_equipo_local OR NEW.id_equipo_visitante <> OLD.id_equipo_visitante)
       AND EXISTS (SELECT 1 FROM planilla_partido WHERE id_partido = OLD.id_partido) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se pueden cambiar los equipos de un partido que ya tiene planilla.';
    END IF;
    IF (SELECT estado FROM torneo WHERE id_torneo = NEW.id_torneo) <> 'en curso' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se pueden modificar partidos de una edición en curso.';
    END IF;
    IF (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = NEW.id_equipo_local) < 5
       OR (SELECT COUNT(*) FROM equipo_jugador_torneo WHERE id_equipo = NEW.id_equipo_visitante) < 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Los dos equipos deben tener al menos 5 jugadores en el plantel.';
    END IF;
    IF NEW.estado <> 'cancelado' AND EXISTS (
        SELECT 1 FROM partido p
        WHERE p.id_partido <> OLD.id_partido
          AND p.id_torneo = NEW.id_torneo AND p.numero_fecha = NEW.numero_fecha AND p.estado <> 'cancelado'
          AND (p.id_equipo_local IN (NEW.id_equipo_local, NEW.id_equipo_visitante)
               OR p.id_equipo_visitante IN (NEW.id_equipo_local, NEW.id_equipo_visitante))
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un equipo no puede jugar más de un partido en la misma fecha del torneo.';
    END IF;
    IF NEW.dia < (SELECT fecha_inicio FROM torneo WHERE id_torneo = NEW.id_torneo)
       OR NEW.dia > (SELECT fecha_fin FROM torneo WHERE id_torneo = NEW.id_torneo) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El día del partido tiene que estar entre el inicio y el fin de la edición.';
    END IF;
END//

CREATE TRIGGER trg_partido_validar_delete
BEFORE DELETE ON partido
FOR EACH ROW
BEGIN
    IF OLD.estado = 'jugado' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un partido jugado no se puede eliminar.';
    END IF;
END//
DELIMITER ;


-- La FK compuesta al plantel asegura que el jugador sea de ese equipo. No hay FK directa
-- a jugador: ya está implícita y abriría un segundo camino de cascada (ADR 0005).
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


-- Un partido dura 60 minutos (D-01). El resultado no se guarda: sale de contar los goles,
-- y el autogol suma al rival.
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


-- La FK al plantel obliga a que el sancionado esté inscripto en la edición (ADR 0005).
-- id_tarjeta es un atributo agregado: la tarjeta que originó una sanción automática (ADR 0010).
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
    -- Una sanción automática dura 1 fecha y tiene tarjeta de origen; una disciplinaria no tiene tarjeta.
    CONSTRAINT chk_sancion_origen CHECK (
        (motivo = 'disciplinaria' AND id_tarjeta IS NULL)
        OR (motivo <> 'disciplinaria' AND id_tarjeta IS NOT NULL AND cantidad_fechas = 1)
    )
) ENGINE = InnoDB;
