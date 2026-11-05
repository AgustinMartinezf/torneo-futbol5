SET NAMES utf8mb4;
USE torneo_futbol5;

-- Ejecutar como app_admin con mysql --force.
-- Esperado: ERROR 1142, el administrador no inserta sanciones directamente.
INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas)
VALUES ('50000016', 2, 'disciplinaria', 5, 1);
-- Esperado: ERROR 1142, el administrador no borra sanciones automáticas directamente.
DELETE FROM sancion_jugador WHERE id_sancion = 1;

START TRANSACTION;
CALL crear_sancion_disciplinaria('50000016', 2, 5, 1, @id_qa);
SELECT @id_qa AS sancion_disciplinaria_creada;
CALL borrar_sancion_disciplinaria(@id_qa);
SELECT 'Alta y baja disciplinaria permitidas' AS caso;
ROLLBACK;

-- Esperado: ERROR 1644, el procedimiento no borra sanciones automáticas.
CALL borrar_sancion_disciplinaria(1);
