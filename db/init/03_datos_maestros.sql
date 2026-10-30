-- Datos maestros y de prueba. Cada funcionalidad agrega los que necesita para probarse.
-- La letra pide al menos 6 equipos y 3 fechas disputadas.
SET NAMES utf8mb4;
USE torneo_futbol5;

INSERT INTO facultad (id_facultad, nombre) VALUES
    (1, 'Ingeniería y Tecnologías'),
    (2, 'Ciencias Empresariales'),
    (3, 'Derecho y Artes Liberales'),
    (4, 'Ciencias de la Salud'),
    (5, 'Comunicación');

INSERT INTO turno (id_turno, hora_inicio, hora_fin) VALUES
    (1, '18:00:00', '19:00:00'),
    (2, '19:00:00', '20:00:00'),
    (3, '20:00:00', '21:00:00'),
    (4, '21:00:00', '22:00:00'),
    (5, '22:00:00', '23:00:00');

-- Los complejos y las personas son datos ficticios.
-- El complejo 3 no tiene canchas y la Cancha 3 del complejo 1 no tiene partidos: sirven
-- para probar las bajas permitidas.
INSERT INTO complejo (id_complejo, nombre, direccion, departamento) VALUES
    (1, 'Complejo del Parque', 'Calle del Parque 1200', 'Montevideo'),
    (2, 'Complejo del Lago', 'Calle del Lago 800', 'Canelones'),
    (3, 'Complejo de la Costa', 'Rambla Costanera 450', 'Maldonado');

INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) VALUES
    ('Cancha 1', 1, 'sintético', 0),
    ('Cancha 2', 1, 'parquet', 1),
    ('Cancha 1', 2, 'sintético', 1),
    ('Cancha 2', 2, 'parquet', 1),
    ('Cancha 3', 1, 'sintético', 0);

INSERT INTO torneo (id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado) VALUES
    (1, 'Interfacultades 2026 segundo semestre', 2026, 2, '2026-10-19', '2026-11-30', 'inscripción'),
    (2, 'Interfacultades 2026 primer semestre', 2026, 1, '2026-03-02', '2026-06-30', 'inscripción');
-- La edición 2 tiene fechas pasadas para cargar partidos jugados y probar los reportes.
-- Arranca en inscripción para poder cargarle planteles; al final del archivo pasa a 'finalizado'.

-- Hashes bcrypt con costo 12. Las claves de prueba están en el README.
INSERT INTO login (correo, contrasena, rol) VALUES
    ('admin@torneo.example', '$2b$12$hcwnqBWaAq7DLKVnwJBWPOt8Urz/kvaiJl.wyF183RjZvnmmbwWNC', 'administrador'),
    ('planillero@torneo.example', '$2b$12$uIiL0H25M/Abx1H1j7VuMO7sl52lbs7QCnwxup6xFSHsQfW7wpGHa', 'planillero');

INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo) VALUES
    ('50000000', 'Facundo', 'Pérez', 'jugador01@torneo.example', '2000-01-01', 1, 'grado'),
    ('50000016', 'Agustín', 'Pérez', 'jugador02@torneo.example', '2001-02-02', 1, 'grado'),
    ('50000022', 'Gerónimo', 'Pérez', 'jugador03@torneo.example', '2002-03-03', 1, 'grado'),
    ('50000038', 'Juan', 'Pérez', 'jugador04@torneo.example', '2003-04-04', 1, 'grado'),
    ('50000044', 'Santiago', 'Pérez', 'jugador05@torneo.example', '2004-05-05', 1, 'grado'),
    ('50000050', 'Mateo', 'Pérez', 'jugador06@torneo.example', '2000-06-06', 1, 'grado'),
    ('50000066', 'Nicolás', 'Pérez', 'jugador07@torneo.example', '2001-07-07', 1, 'grado'),
    ('50000072', 'Martín', 'Pérez', 'jugador08@torneo.example', '2002-08-08', 1, 'grado'),
    ('50000088', 'Lucía', 'Pérez', 'jugador09@torneo.example', '2003-09-09', 1, 'posgrado'),
    ('50000094', 'Valentina', 'Pérez', 'jugador10@torneo.example', '2004-10-10', 1, 'posgrado'),
    ('50000107', 'Camila', 'Pérez', 'jugador11@torneo.example', '2000-11-11', 1, 'posgrado'),
    ('50000113', 'Sofía', 'Pérez', 'jugador12@torneo.example', '1985-12-12', 1, 'docente'),
    ('50000129', 'Emilia', 'Pérez', 'jugador13@torneo.example', '1985-01-13', 1, 'funcionario'),
    ('50000135', 'Facundo', 'González', 'jugador14@torneo.example', '2003-02-14', 2, 'grado'),
    ('50000141', 'Agustín', 'González', 'jugador15@torneo.example', '2004-03-15', 2, 'grado'),
    ('50000157', 'Gerónimo', 'González', 'jugador16@torneo.example', '2000-04-16', 2, 'grado'),
    ('50000163', 'Juan', 'González', 'jugador17@torneo.example', '2001-05-17', 2, 'grado'),
    ('50000179', 'Santiago', 'González', 'jugador18@torneo.example', '2002-06-18', 2, 'grado'),
    ('50000185', 'Mateo', 'González', 'jugador19@torneo.example', '2003-07-19', 2, 'grado'),
    ('50000191', 'Nicolás', 'González', 'jugador20@torneo.example', '2004-08-20', 2, 'grado'),
    ('50000204', 'Martín', 'González', 'jugador21@torneo.example', '2000-09-21', 2, 'grado'),
    ('50000210', 'Lucía', 'González', 'jugador22@torneo.example', '2001-10-22', 2, 'posgrado'),
    ('50000226', 'Valentina', 'González', 'jugador23@torneo.example', '2002-11-23', 2, 'posgrado'),
    ('50000232', 'Camila', 'González', 'jugador24@torneo.example', '2003-12-24', 2, 'posgrado'),
    ('50000248', 'Sofía', 'González', 'jugador25@torneo.example', '1985-01-25', 2, 'docente'),
    ('50000254', 'Emilia', 'González', 'jugador26@torneo.example', '1985-02-26', 2, 'funcionario'),
    ('50000260', 'Facundo', 'Rodríguez', 'jugador27@torneo.example', '2001-03-27', 3, 'grado'),
    ('50000276', 'Agustín', 'Rodríguez', 'jugador28@torneo.example', '2002-04-28', 3, 'grado'),
    ('50000282', 'Gerónimo', 'Rodríguez', 'jugador29@torneo.example', '2003-05-01', 3, 'grado'),
    ('50000298', 'Juan', 'Rodríguez', 'jugador30@torneo.example', '2004-06-02', 3, 'grado'),
    ('50000301', 'Santiago', 'Rodríguez', 'jugador31@torneo.example', '2000-07-03', 3, 'grado'),
    ('50000317', 'Mateo', 'Rodríguez', 'jugador32@torneo.example', '2001-08-04', 3, 'grado'),
    ('50000323', 'Nicolás', 'Rodríguez', 'jugador33@torneo.example', '2002-09-05', 3, 'grado'),
    ('50000339', 'Martín', 'Rodríguez', 'jugador34@torneo.example', '2003-10-06', 3, 'grado'),
    ('50000345', 'Lucía', 'Rodríguez', 'jugador35@torneo.example', '2004-11-07', 3, 'posgrado'),
    ('50000351', 'Valentina', 'Rodríguez', 'jugador36@torneo.example', '2000-12-08', 3, 'posgrado'),
    ('50000367', 'Camila', 'Rodríguez', 'jugador37@torneo.example', '2001-01-09', 3, 'posgrado'),
    ('50000373', 'Sofía', 'Rodríguez', 'jugador38@torneo.example', '1985-02-10', 3, 'docente'),
    ('50000389', 'Emilia', 'Rodríguez', 'jugador39@torneo.example', '1985-03-11', 3, 'funcionario'),
    ('50000395', 'Facundo', 'Fernández', 'jugador40@torneo.example', '2004-04-12', 4, 'grado'),
    ('50000408', 'Agustín', 'Fernández', 'jugador41@torneo.example', '2000-05-13', 4, 'grado'),
    ('50000414', 'Gerónimo', 'Fernández', 'jugador42@torneo.example', '2001-06-14', 4, 'grado'),
    ('50000420', 'Juan', 'Fernández', 'jugador43@torneo.example', '2002-07-15', 4, 'grado'),
    ('50000436', 'Santiago', 'Fernández', 'jugador44@torneo.example', '2003-08-16', 4, 'grado'),
    ('50000442', 'Mateo', 'Fernández', 'jugador45@torneo.example', '2004-09-17', 4, 'grado'),
    ('50000458', 'Nicolás', 'Fernández', 'jugador46@torneo.example', '2000-10-18', 4, 'grado'),
    ('50000464', 'Martín', 'Fernández', 'jugador47@torneo.example', '2001-11-19', 4, 'grado'),
    ('50000470', 'Lucía', 'Fernández', 'jugador48@torneo.example', '2002-12-20', 4, 'posgrado'),
    ('50000486', 'Valentina', 'Fernández', 'jugador49@torneo.example', '2003-01-21', 4, 'posgrado'),
    ('50000492', 'Camila', 'Fernández', 'jugador50@torneo.example', '2004-02-22', 4, 'posgrado'),
    ('50000505', 'Sofía', 'Fernández', 'jugador51@torneo.example', '1985-03-23', 4, 'docente'),
    ('50000511', 'Emilia', 'Fernández', 'jugador52@torneo.example', '1985-04-24', 4, 'funcionario'),
    ('1234561', 'Valeria', 'Suárez', 'jugador53@torneo.example', '2002-03-04', 1, 'grado');

-- La facultad 5 no tiene jugadores y Valeria no está en ningún plantel: sirven para
-- probar bajas permitidas. El plantel de abajo sirve para probar las que rechazan las FK.
INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad, ci_capitan) VALUES
    (1, 'Ingeniería Verde', 2, 1, NULL);

INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) VALUES
    (1, '50000000', 2, 1),
    (1, '50000016', 2, 2),
    (1, '50000022', 2, 3),
    (1, '50000038', 2, 4),
    (1, '50000044', 2, 5);

UPDATE equipo SET ci_capitan = '50000000' WHERE id_equipo = 1;

INSERT INTO equipo (id_equipo, nombre, id_torneo, id_facultad, ci_capitan) VALUES
    (2, 'Ingeniería Azul', 2, 1, NULL),
    (3, 'Empresariales Verde', 2, 2, NULL),
    (4, 'Empresariales Azul', 2, 2, NULL),
    (5, 'Derecho Verde', 2, 3, NULL),
    (6, 'Salud Verde', 2, 4, NULL),
    (7, 'Ingeniería Verde', 1, 1, NULL),
    (8, 'Empresariales Verde', 1, 2, NULL);

INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) VALUES
    (2, '50000050', 2, 1),
    (2, '50000066', 2, 2),
    (2, '50000072', 2, 3),
    (2, '50000088', 2, 4),
    (2, '50000113', 2, 5),
    (2, '50000129', 2, 6),
    (3, '50000135', 2, 1),
    (3, '50000141', 2, 2),
    (3, '50000157', 2, 3),
    (3, '50000163', 2, 4),
    (3, '50000248', 2, 5),
    (3, '50000254', 2, 6),
    (4, '50000179', 2, 1),
    (4, '50000185', 2, 2),
    (4, '50000191', 2, 3),
    (4, '50000204', 2, 4),
    (4, '50000210', 2, 5),
    (4, '50000226', 2, 6),
    (4, '50000232', 2, 7),
    (5, '50000260', 2, 1),
    (5, '50000276', 2, 2),
    (5, '50000282', 2, 3),
    (5, '50000298', 2, 4),
    (5, '50000373', 2, 5),
    (5, '50000389', 2, 6),
    (6, '50000395', 2, 1),
    (6, '50000408', 2, 2),
    (6, '50000414', 2, 3),
    (6, '50000420', 2, 4),
    (6, '50000505', 2, 5),
    (6, '50000511', 2, 6),
    (7, '50000000', 1, 1),
    (7, '50000016', 1, 2),
    (7, '50000022', 1, 3),
    (7, '50000038', 1, 4),
    (7, '50000113', 1, 5),
    (7, '50000129', 1, 6),
    (8, '50000135', 1, 1),
    (8, '50000141', 1, 2),
    (8, '50000157', 1, 3),
    (8, '50000163', 1, 4),
    (8, '50000248', 1, 5),
    (8, '50000254', 1, 6);

UPDATE equipo SET ci_capitan = '50000050' WHERE id_equipo = 2;
UPDATE equipo SET ci_capitan = '50000135' WHERE id_equipo = 3;
UPDATE equipo SET ci_capitan = '50000179' WHERE id_equipo = 4;
UPDATE equipo SET ci_capitan = '50000260' WHERE id_equipo = 5;
UPDATE equipo SET ci_capitan = '50000395' WHERE id_equipo = 6;
UPDATE equipo SET ci_capitan = '50000000' WHERE id_equipo = 7;
UPDATE equipo SET ci_capitan = '50000135' WHERE id_equipo = 8;

UPDATE torneo SET estado = 'en curso' WHERE id_torneo = 2;

-- Rueda completa de la edición 2: 5 fechas de 3 partidos. Se cargan como programados; el registro
-- de planillas los marca como jugados. El 14 queda postergado y el 15 cancelado para los reportes.
-- Las columnas generadas no se insertan.
INSERT INTO partido (id_partido, id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, nombre_cancha, id_complejo) VALUES
    (1, 2, 1, 1, 6, '2026-03-17', 1, 'Cancha 1', 1),
    (2, 2, 1, 2, 5, '2026-03-17', 2, 'Cancha 1', 1),
    (3, 2, 1, 3, 4, '2026-03-17', 1, 'Cancha 1', 2),
    (4, 2, 2, 1, 5, '2026-04-07', 1, 'Cancha 2', 1),
    (5, 2, 2, 6, 4, '2026-04-07', 2, 'Cancha 2', 1),
    (6, 2, 2, 2, 3, '2026-04-07', 2, 'Cancha 2', 2),
    (7, 2, 3, 1, 4, '2026-04-28', 3, 'Cancha 1', 1),
    (8, 2, 3, 5, 3, '2026-04-28', 3, 'Cancha 1', 2),
    (9, 2, 3, 6, 2, '2026-04-28', 4, 'Cancha 1', 1),
    (10, 2, 4, 1, 3, '2026-05-19', 1, 'Cancha 1', 1),
    (11, 2, 4, 4, 2, '2026-05-19', 2, 'Cancha 2', 1),
    (12, 2, 4, 5, 6, '2026-05-19', 1, 'Cancha 2', 2),
    (13, 2, 5, 1, 2, '2026-06-09', 2, 'Cancha 1', 1),
    (14, 2, 5, 3, 6, '2026-06-09', 3, 'Cancha 1', 1),
    (15, 2, 5, 4, 5, '2026-06-09', 2, 'Cancha 1', 2);

UPDATE partido SET estado = 'postergado' WHERE id_partido = 14;
UPDATE partido SET estado = 'cancelado' WHERE id_partido = 15;
