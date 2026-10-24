-- Usuarios de base de datos con permisos diferenciados (administrador / planillero).
USE torneo_futbol5;

-- Usamos las contraseñas de desarrollo de .env.example.
-- Si las cambiamos en .env, también cambiamos las cuentas de MySQL.
CREATE USER 'app_admin'@'%' IDENTIFIED BY 'cambiar_admin';
CREATE USER 'app_planillero'@'%' IDENTIFIED BY 'cambiar_planillero';

-- Al admin también le damos permisos tabla por tabla: con permisos sobre toda la base,
-- MySQL responde a un error de FK con 1216/1217, que no trae el nombre de la constraint.
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.login TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.facultad TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.jugador TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.torneo TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.equipo TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.equipo_jugador_torneo TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.complejo TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.cancha TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.turno TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.partido TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.planilla_partido TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.gol TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.tarjeta TO 'app_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.sancion_jugador TO 'app_admin'@'%';
GRANT EXECUTE ON torneo_futbol5.* TO 'app_admin'@'%';

GRANT SELECT ON torneo_futbol5.facultad TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.jugador TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.torneo TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.equipo TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.equipo_jugador_torneo TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.complejo TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.cancha TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.turno TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.partido TO 'app_planillero'@'%';
GRANT SELECT ON torneo_futbol5.sancion_jugador TO 'app_planillero'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.planilla_partido TO 'app_planillero'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.gol TO 'app_planillero'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.tarjeta TO 'app_planillero'@'%';
-- El planillero no modifica partido directamente: lo marca como jugado con el
-- procedimiento, que solo permite pasar de programado a jugado.
GRANT EXECUTE ON PROCEDURE torneo_futbol5.marcar_partido_jugado TO 'app_planillero'@'%';

-- Cada tabla o vista nueva lleva su GRANT para los dos usuarios, y cada procedimiento
-- que use el planillero lleva su GRANT EXECUTE.
