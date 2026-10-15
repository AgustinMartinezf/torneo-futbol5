-- Usuarios de base de datos con permisos diferenciados (administrador / planillero).
USE torneo_futbol5;

-- Usamos las contraseñas de desarrollo de .env.example.
-- Si las cambiamos en .env, también cambiamos las cuentas de MySQL.
CREATE USER 'app_admin'@'%' IDENTIFIED BY 'cambiar_admin';
CREATE USER 'app_planillero'@'%' IDENTIFIED BY 'cambiar_planillero';

GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON torneo_futbol5.* TO 'app_admin'@'%';

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

-- El planillero tiene permisos tabla por tabla. Cada vista o procedimiento nuevo
-- que necesite usar lleva su propio GRANT acá.
