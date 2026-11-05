SET NAMES utf8mb4;
USE torneo_futbol5;

-- Ejecutar con mysql --force. Cada intento debe producir el error indicado y cada transacción se revierte.

SELECT 'P01: mínimo de cinco al iniciar' AS caso;
START TRANSACTION;
INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad) VALUES (90, 'QA Plantel corto', 1, 3);
INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) VALUES
    (90, '50000260', 1, 1), (90, '50000276', 1, 2), (90, '50000282', 1, 3), (90, '50000298', 1, 4);
UPDATE equipo SET ci_capitan = '50000260' WHERE id_equipo = 90;
-- Esperado: ERROR 1644, todos los equipos deben tener entre 5 y 10 jugadores y un capitán.
UPDATE torneo SET estado = 'en curso' WHERE id_torneo = 1;
ROLLBACK;

SELECT 'P02: máximo de diez' AS caso;
START TRANSACTION;
INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) VALUES
    (7, '50000044', 1, 7), (7, '50000050', 1, 8), (7, '50000066', 1, 9), (7, '50000072', 1, 10);
-- Esperado: ERROR 1644, el plantel admite como máximo 10 jugadores.
INSERT INTO equipo_jugador_torneo VALUES (7, '50000088', 1, 11);
ROLLBACK;

SELECT 'P03: máximo de dos docentes o funcionarios' AS caso;
START TRANSACTION;
UPDATE jugador SET tipo = 'docente' WHERE ci = '50000044';
-- Esperado: ERROR 1644, el plantel admite como máximo 2 docentes o funcionarios.
INSERT INTO equipo_jugador_torneo VALUES (7, '50000044', 1, 7);
ROLLBACK;

SELECT 'P04: facultad del equipo' AS caso;
-- Esperado: ERROR 1644, todos los jugadores deben ser de la facultad del equipo.
INSERT INTO equipo_jugador_torneo VALUES (7, '50000135', 1, 7);

SELECT 'P05: un equipo por edición' AS caso;
START TRANSACTION;
INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad) VALUES (90, 'QA Segundo equipo', 1, 1);
-- Esperado: ERROR 1062 por uq_ejt_jugador_torneo.
INSERT INTO equipo_jugador_torneo VALUES (90, '50000000', 1, 1);
ROLLBACK;

SELECT 'P06: plantel solo en inscripción' AS caso;
-- Esperado: ERROR 1644, el plantel solo se puede modificar durante la inscripción.
INSERT INTO equipo_jugador_torneo VALUES (1, '1234561', 2, 9);

SELECT 'P07: capitán del plantel' AS caso;
-- Esperado: ERROR 1452 por fk_equipo_capitan.
UPDATE equipo SET ci_capitan = '1234561' WHERE id_equipo = 7;

SELECT 'M01: equipos de la edición' AS caso;
-- Esperado: ERROR 1452 por fk_partido_local.
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (2, 6, 7, 3, '2026-06-16', 1, 'Cancha 1', 1);

SELECT 'M02: mínimo de cinco para programar' AS caso;
START TRANSACTION;
INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad) VALUES (90, 'QA Sin cupo', 1, 3);
INSERT INTO equipo_jugador_torneo VALUES
    (90, '50000260', 1, 1), (90, '50000276', 1, 2), (90, '50000282', 1, 3), (90, '50000298', 1, 4);
UPDATE equipo SET ci_capitan = '50000260' WHERE id_equipo = 90;
-- Esperado: ERROR 1644, no se inicia una edición con un equipo de cuatro; por eso no se puede programar su partido.
UPDATE torneo SET estado = 'en curso' WHERE id_torneo = 1;
ROLLBACK;

SELECT 'M03: no jugar contra sí mismo' AS caso;
-- Esperado: ERROR 3819 por chk_partido_equipos_distintos.
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (2, 6, 1, 1, '2026-06-16', 1, 'Cancha 1', 1);

SELECT 'M04: cruce único salvo cancelado' AS caso;
-- Esperado: ERROR 1062 por uq_partido_cruce.
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (2, 6, 1, 6, '2026-06-16', 1, 'Cancha 1', 1);

SELECT 'M05: un partido por equipo y fecha' AS caso;
-- Esperado: ERROR 1644, un equipo no puede jugar más de un partido en la misma fecha.
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (2, 4, 1, 2, '2026-05-19', 3, 'Cancha 2', 2);

SELECT 'M06: cancha ocupada' AS caso;
-- Esperado: ERROR 1062 por uq_partido_cancha_turno.
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (2, 6, 4, 5, '2026-05-19', 1, 'Cancha 1', 1);

SELECT 'M07: jugado solo al terminar el turno' AS caso;
START TRANSACTION;
UPDATE torneo SET estado = 'en curso' WHERE id_torneo = 1;
INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (90, 1, 1, 7, 8, '2026-11-20', 1, 'Cancha 1', 1);
-- Esperado: ERROR 1644, el turno todavía no terminó.
UPDATE partido SET estado = 'jugado' WHERE id_partido = 90;
ROLLBACK;

SELECT 'M08: un jugado no se borra' AS caso;
-- Esperado: ERROR 1644, un partido jugado no se puede eliminar.
DELETE FROM partido WHERE id_partido = 1;

SELECT 'L01: jugador del plantel' AS caso;
-- Esperado: ERROR 1452 por fk_planilla_plantel.
INSERT INTO planilla_partido VALUES (10, '50000066', 1);

SELECT 'L02: equipo del partido' AS caso;
-- Esperado: ERROR 1644, el equipo de la planilla debe jugar ese partido.
INSERT INTO planilla_partido VALUES (10, '50000179', 4);

SELECT 'L03: suspendido fuera de planilla' AS caso;
-- Esperado: ERROR 1644, el jugador está suspendido para esta fecha.
INSERT INTO planilla_partido VALUES (10, '50000000', 1);

SELECT 'L04: gol solo de jugador de planilla' AS caso;
-- Esperado: ERROR 1452 por fk_gol_planilla.
INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (10, '50000016', 20, 0);

SELECT 'L05: tarjeta solo de jugador de planilla' AS caso;
-- Esperado: ERROR 1452 por fk_tarjeta_planilla.
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (10, '50000016', 20, 'amarilla');

SELECT 'L06: planilla de jugado pasadas 48 horas' AS caso;
-- Esperado: ERROR 1644, pasaron las 48 horas para corregir la planilla.
UPDATE planilla_partido SET id_equipo = 1 WHERE id_partido = 1 AND ci_jugador = '50000000';

SELECT 'L07: gol de jugado pasadas 48 horas' AS caso;
-- Esperado: ERROR 1644, pasaron las 48 horas para corregir los goles.
INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (1, '50000000', 20, 0);

SELECT 'L08: tarjeta de jugado pasadas 48 horas' AS caso;
-- Esperado: ERROR 1644, pasaron las 48 horas para corregir las tarjetas.
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (1, '50000000', 20, 'amarilla');

SELECT 'S01: roja suspende la fecha siguiente' AS caso;
START TRANSACTION;
INSERT INTO planilla_partido VALUES (10, '50000016', 1);
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (10, '50000016', 20, 'roja');
-- Esperado: ERROR 1644, el jugador está suspendido para la fecha siguiente.
INSERT INTO planilla_partido VALUES (13, '50000016', 1);
ROLLBACK;

SELECT 'S02: tercera amarilla suspende la fecha siguiente' AS caso;
-- Esperado: ERROR 1644, el jugador con tres amarillas está suspendido en fecha 4.
INSERT INTO planilla_partido VALUES (10, '50000000', 1);

SELECT 'S03: sanción disciplinaria de varias fechas' AS caso;
-- Esperado: ERROR 1644, el jugador está suspendido en fecha 4.
INSERT INTO planilla_partido VALUES (12, '50000408', 6);

SELECT 'S04: sanción automática coherente con la tarjeta' AS caso;
-- Esperado: ERROR 1644, la sanción no coincide con su tarjeta de origen.
INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas, id_tarjeta)
SELECT '50000016', 2, 'roja', 4, 1, id_tarjeta FROM tarjeta WHERE id_partido = 9 LIMIT 1;

SELECT 'L09: no mover planilla a un partido futuro' AS caso;
START TRANSACTION;
UPDATE torneo SET estado = 'en curso' WHERE id_torneo = 1;
INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (90, 1, 1, 7, 8, '2026-11-20', 1, 'Cancha 1', 1);
INSERT INTO planilla_partido VALUES (10, '50000016', 1);
-- Esperado: ERROR 1644, todavía no empezó el partido.
UPDATE planilla_partido SET id_partido = 90, id_equipo = 7 WHERE id_partido = 10 AND ci_jugador = '50000016';
ROLLBACK;

SELECT 'S05: no sancionar una fecha con planilla cargada' AS caso;
START TRANSACTION;
INSERT INTO planilla_partido VALUES (10, '50000016', 1);
-- Esperado: ERROR 1644, el jugador ya figura en una planilla de la sanción.
INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas)
VALUES ('50000016', 2, 'disciplinaria', 4, 1);
ROLLBACK;

SELECT 'S09: roja con planilla cargada en la fecha siguiente (caso positivo)' AS caso;
START TRANSACTION;
INSERT INTO planilla_partido VALUES (10, '50000016', 1), (13, '50000016', 1);
-- Esperado: sin error. La sanción automática se genera y la planilla del partido 13 no cambia (S-26).
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (10, '50000016', 20, 'roja');
SELECT s.motivo, s.numero_fecha_inicio, s.cantidad_fechas,
       (SELECT COUNT(*) FROM planilla_partido WHERE id_partido = 13 AND ci_jugador = '50000016') AS en_planilla_13
FROM sancion_jugador s JOIN tarjeta t ON t.id_tarjeta = s.id_tarjeta
WHERE t.id_partido = 10 AND t.ci_jugador = '50000016';
ROLLBACK;

SELECT 'T01: la edición nace en inscripción' AS caso;
-- Esperado: ERROR 1644, una edición debe crearse en inscripción.
INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin, estado)
VALUES ('QA Estado inicial', 2027, 2, '2027-08-01', '2027-12-01', 'en curso');

SELECT 'T02: una edición por semestre' AS caso;
-- Esperado: ERROR 1062 por uq_torneo_anio_semestre.
INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin)
VALUES ('QA Semestre repetido', 2026, 1, '2026-03-01', '2026-06-01');

SELECT 'T03: los estados no retroceden' AS caso;
-- Esperado: ERROR 1644, los estados deben avanzar en orden.
UPDATE torneo SET estado = 'inscripción' WHERE id_torneo = 2;

SELECT 'T04: las fechas de la edición tienen orden' AS caso;
-- Esperado: ERROR 3819 por chk_torneo_fechas.
INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin)
VALUES ('QA Fechas invertidas', 2027, 1, '2027-06-01', '2027-03-01');

SELECT 'J01: cédula válida' AS caso;
-- Esperado: ERROR 1644, cédula inválida.
INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo)
VALUES ('1234567', 'QA', 'Inválido', 'qa.ci@example.com', '2000-01-01', 1, 'grado');

SELECT 'J02: edad mínima' AS caso;
-- Esperado: ERROR 1644, la edad debe estar entre 16 y 120 años.
INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo)
VALUES ('7000007', 'QA', 'Menor', 'qa.edad@example.com', '2020-01-01', 1, 'grado');

SELECT 'J03: facultad del jugador inscripto' AS caso;
-- Esperado: ERROR 1644, no se puede cambiar la facultad de un jugador de plantel.
UPDATE jugador SET id_facultad = 2 WHERE ci = '50000000';

SELECT 'P08: camiseta entre 1 y 99' AS caso;
-- Esperado: ERROR 3819 por chk_ejt_camiseta.
UPDATE equipo_jugador_torneo SET numero_camiseta = 100 WHERE id_equipo = 7 AND ci_jugador = '50000000';

SELECT 'P09: no cambiar equipo con UPDATE' AS caso;
-- Esperado: ERROR 1644, hay que sacar e inscribir al jugador.
UPDATE equipo_jugador_torneo SET id_equipo = 8 WHERE id_equipo = 7 AND ci_jugador = '50000000';

SELECT 'E01: equipo solo durante inscripción' AS caso;
-- Esperado: ERROR 1644, solo se inscriben equipos durante la inscripción.
INSERT INTO equipo (nombre, id_torneo, id_facultad) VALUES ('QA Tardío', 2, 1);

SELECT 'M09: día dentro de la edición' AS caso;
-- Esperado: ERROR 1644, el día debe quedar entre inicio y fin de la edición.
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (2, 6, 4, 5, '2026-07-01', 1, 'Cancha 1', 1);

SELECT 'M10: el partido nace programado' AS caso;
-- Esperado: ERROR 1644, un partido nuevo se crea como programado.
INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo, estado)
VALUES (2, 6, 4, 5, '2026-06-16', 1, 'Cancha 1', 1, 'jugado');

SELECT 'M11: un jugado no se modifica' AS caso;
-- Esperado: ERROR 1644, un partido jugado no se puede modificar.
UPDATE partido SET dia = '2026-03-18' WHERE id_partido = 1;

SELECT 'L10: planilla no empieza antes del turno' AS caso;
START TRANSACTION;
UPDATE torneo SET estado = 'en curso' WHERE id_torneo = 1;
INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo)
VALUES (90, 1, 1, 7, 8, '2026-11-20', 1, 'Cancha 1', 1);
-- Esperado: ERROR 1644, todavía no empezó el partido.
INSERT INTO planilla_partido VALUES (90, '50000000', 7);
ROLLBACK;

SELECT 'L11: no cargar planilla de cancelado' AS caso;
-- Esperado: ERROR 1644, no se carga planilla de cancelado.
INSERT INTO planilla_partido VALUES (15, '50000179', 4);

SELECT 'L12: no cargar planilla de postergado' AS caso;
-- Esperado: ERROR 1644, no se carga planilla de postergado.
INSERT INTO planilla_partido VALUES (14, '50000135', 3);

SELECT 'L13: minuto de gol entre 1 y 60' AS caso;
START TRANSACTION;
INSERT INTO planilla_partido VALUES (12, '50000260', 5);
-- Esperado: ERROR 3819 por chk_gol_minuto.
INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (12, '50000260', 61, 0);
ROLLBACK;

SELECT 'L14: minuto de tarjeta entre 1 y 60' AS caso;
START TRANSACTION;
INSERT INTO planilla_partido VALUES (12, '50000260', 5);
-- Esperado: ERROR 3819 por chk_tarjeta_minuto.
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (12, '50000260', 61, 'amarilla');
ROLLBACK;

SELECT 'S06: disciplinaria solo en edición en curso' AS caso;
-- Esperado: ERROR 1644, la edición de la sanción disciplinaria debe estar en curso.
INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas)
VALUES ('50000000', 1, 'disciplinaria', 1, 2);

SELECT 'S07: sanción automática no se modifica' AS caso;
-- Esperado: ERROR 1644, las sanciones por tarjeta no se modifican.
UPDATE sancion_jugador SET cantidad_fechas = 2 WHERE id_sancion = 1;

SELECT 'S08: tarjeta no se modifica' AS caso;
-- Esperado: ERROR 1644, las tarjetas se borran y se cargan de nuevo.
UPDATE tarjeta SET minuto = 42 WHERE id_tarjeta = 1;
