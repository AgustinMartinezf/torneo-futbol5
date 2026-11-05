SET NAMES utf8mb4;
USE torneo_futbol5;

START TRANSACTION;
INSERT INTO planilla_partido VALUES (10, '50000016', 1);
INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (10, '50000016', 10, 0);
INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (10, '50000016', 20, 'amarilla');
SELECT 'Lectura y escritura de planilla, gol y tarjeta permitidas' AS caso;
ROLLBACK;

-- Esperado: ERROR 1142, el planillero no modifica partidos directamente.
UPDATE partido SET estado = 'jugado' WHERE id_partido = 10;
-- Esperado: ERROR 1142, el planillero no crea jugadores.
INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo)
VALUES ('1234561', 'QA', 'QA', 'qa@example.com', '2000-01-01', 1, 'grado');
-- Esperado: ERROR 1142, el planillero no borra sanciones.
DELETE FROM sancion_jugador WHERE id_sancion = 1;
-- Esperado: ERROR 1142, el planillero no lee contraseñas de login.
SELECT * FROM login;
