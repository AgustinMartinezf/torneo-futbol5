def posiciones(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT e.id_equipo, e.nombre AS equipo, COUNT(r.id_equipo) AS pj,
                   COALESCE(SUM(r.gf > r.gc), 0) AS pg,
                   COALESCE(SUM(r.gf = r.gc), 0) AS pe,
                   COALESCE(SUM(r.gf < r.gc), 0) AS pp,
                   COALESCE(SUM(r.gf), 0) AS gf, COALESCE(SUM(r.gc), 0) AS gc,
                   COALESCE(SUM(r.gf - r.gc), 0) AS dg,
                   COALESCE(SUM(CASE WHEN r.gf > r.gc THEN 3
                                     WHEN r.gf = r.gc THEN 1 ELSE 0 END), 0) AS pts
            FROM equipo e
            LEFT JOIN (
                SELECT p.id_equipo_local AS id_equipo, v.goles_local AS gf, v.goles_visitante AS gc
                FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
                WHERE p.id_torneo = %s AND p.estado = 'jugado'
                UNION ALL
                SELECT p.id_equipo_visitante, v.goles_visitante, v.goles_local
                FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
                WHERE p.id_torneo = %s AND p.estado = 'jugado'
            ) r ON r.id_equipo = e.id_equipo
            WHERE e.id_torneo = %s
            GROUP BY e.id_equipo, e.nombre
            ORDER BY pts DESC, dg DESC, gf DESC, e.nombre, e.id_equipo
        """, (id_torneo, id_torneo, id_torneo))
        return cursor.fetchall()
    finally:
        cursor.close()


def goleadores(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT j.ci AS ci_jugador, j.nombre, j.apellido, e.id_equipo, e.nombre AS equipo,
                   COUNT(*) AS goles
            FROM gol g
            JOIN partido p ON p.id_partido = g.id_partido
            JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador
            JOIN equipo e ON e.id_equipo = pp.id_equipo
            JOIN jugador j ON j.ci = g.ci_jugador
            WHERE p.id_torneo = %s AND p.estado = 'jugado' AND g.autogol = 0
            GROUP BY j.ci, j.nombre, j.apellido, e.id_equipo, e.nombre
            ORDER BY goles DESC, j.ci ASC
            LIMIT 10
        """, (id_torneo,))
        return cursor.fetchall()
    finally:
        cursor.close()


def fair_play(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT e.id_equipo, e.nombre AS equipo,
                   COALESCE(SUM(t.color = 'amarilla'), 0) AS amarillas,
                   COALESCE(SUM(t.color = 'roja'), 0) AS rojas,
                   COALESCE(SUM(CASE WHEN t.color = 'amarilla' THEN 1
                                     WHEN t.color = 'roja' THEN 3 ELSE 0 END), 0) AS puntos
            FROM equipo e
            LEFT JOIN (
                SELECT pp.id_equipo, ta.color
                FROM tarjeta ta
                JOIN partido p ON p.id_partido = ta.id_partido
                JOIN planilla_partido pp ON pp.id_partido = ta.id_partido AND pp.ci_jugador = ta.ci_jugador
                WHERE p.id_torneo = %s AND p.estado = 'jugado'
            ) t ON t.id_equipo = e.id_equipo
            WHERE e.id_torneo = %s
            GROUP BY e.id_equipo, e.nombre
            ORDER BY puntos ASC, e.nombre, e.id_equipo
        """, (id_torneo, id_torneo))
        return cursor.fetchall()
    finally:
        cursor.close()


def promedios(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.numero_fecha, COUNT(*) AS partidos,
                   SUM(v.goles_local + v.goles_visitante) AS goles,
                   ROUND(AVG(v.goles_local + v.goles_visitante), 2) AS promedio
            FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
            WHERE p.id_torneo = %s AND p.estado = 'jugado'
            GROUP BY p.numero_fecha
            UNION ALL
            SELECT NULL AS numero_fecha, COUNT(*) AS partidos,
                   COALESCE(SUM(v.goles_local + v.goles_visitante), 0) AS goles,
                   ROUND(AVG(v.goles_local + v.goles_visitante), 2) AS promedio
            FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
            WHERE p.id_torneo = %s AND p.estado = 'jugado'
            ORDER BY numero_fecha
        """, (id_torneo, id_torneo))
        return cursor.fetchall()
    finally:
        cursor.close()


# Contamos jugados y programados: postergados y cancelados liberan la cancha (ADR 0006).
def canchas(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT c.id_complejo, co.nombre AS complejo, c.nombre_cancha, COUNT(p.id_partido) AS partidos
            FROM cancha c
            JOIN complejo co ON co.id_complejo = c.id_complejo
            LEFT JOIN partido p ON p.id_complejo = c.id_complejo AND p.nombre_cancha = c.nombre_cancha
                 AND p.id_torneo = %s AND p.estado IN ('jugado', 'programado')
            GROUP BY c.id_complejo, co.nombre, c.nombre_cancha
            ORDER BY partidos DESC, co.nombre, c.nombre_cancha
        """, (id_torneo,))
        return cursor.fetchall()
    finally:
        cursor.close()


def turnos(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT t.id_turno, LEFT(t.hora_inicio, 5) AS hora_inicio, LEFT(t.hora_fin, 5) AS hora_fin,
                   COUNT(p.id_partido) AS partidos
            FROM turno t
            LEFT JOIN partido p ON p.id_turno = t.id_turno
                 AND p.id_torneo = %s AND p.estado IN ('jugado', 'programado')
            GROUP BY t.id_turno, t.hora_inicio, t.hora_fin
            ORDER BY partidos DESC, t.hora_inicio
        """, (id_torneo,))
        return cursor.fetchall()
    finally:
        cursor.close()


def jugadores_por_facultad(conn) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT f.id_facultad, f.nombre AS facultad, t.tipo, COUNT(j.ci) AS jugadores
            FROM facultad f
            CROSS JOIN (SELECT 1 AS orden, 'grado' AS tipo UNION ALL SELECT 2, 'posgrado'
                        UNION ALL SELECT 3, 'docente' UNION ALL SELECT 4, 'funcionario') t
            LEFT JOIN jugador j ON j.id_facultad = f.id_facultad AND j.tipo = t.tipo
            GROUP BY f.id_facultad, f.nombre, t.orden, t.tipo
            ORDER BY f.nombre, t.orden
        """)
        return cursor.fetchall()
    finally:
        cursor.close()


def sin_planilla(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT j.ci AS ci_jugador, j.nombre, j.apellido, e.id_equipo, e.nombre AS equipo,
                   ejt.numero_camiseta
            FROM equipo_jugador_torneo ejt
            JOIN equipo e ON e.id_equipo = ejt.id_equipo
            JOIN jugador j ON j.ci = ejt.ci_jugador
            WHERE ejt.id_torneo = %s
              AND NOT EXISTS (
                  SELECT 1
                  FROM planilla_partido pp
                  JOIN partido p ON p.id_partido = pp.id_partido
                  WHERE pp.ci_jugador = ejt.ci_jugador AND p.id_torneo = ejt.id_torneo
              )
            ORDER BY e.nombre, ejt.numero_camiseta
        """, (id_torneo,))
        return cursor.fetchall()
    finally:
        cursor.close()


# El equipo del sancionado sale de su plantel en esa edición (ADR 0005).
def sanciones(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT e.id_equipo, e.nombre AS equipo,
                   COALESCE(SUM(s.motivo = 'roja'), 0) AS roja,
                   COALESCE(SUM(s.motivo = 'acumulación de amarillas'), 0) AS acumulacion,
                   COALESCE(SUM(s.motivo = 'disciplinaria'), 0) AS disciplinaria,
                   COUNT(s.id_sancion) AS total
            FROM equipo e
            LEFT JOIN equipo_jugador_torneo ejt ON ejt.id_equipo = e.id_equipo
            LEFT JOIN sancion_jugador s ON s.ci_jugador = ejt.ci_jugador AND s.id_torneo = ejt.id_torneo
            WHERE e.id_torneo = %s
            GROUP BY e.id_equipo, e.nombre
            ORDER BY total DESC, e.nombre, e.id_equipo
        """, (id_torneo,))
        return cursor.fetchall()
    finally:
        cursor.close()


# Los programados entran en el total, así los cuatro porcentajes suman 100.
def estados(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT s.estado, COUNT(p.id_partido) AS partidos,
                   ROUND(100 * COUNT(p.id_partido)
                         / NULLIF((SELECT COUNT(*) FROM partido WHERE id_torneo = %s), 0), 1) AS porcentaje
            FROM (SELECT 1 AS orden, 'jugado' AS estado UNION ALL SELECT 2, 'programado'
                  UNION ALL SELECT 3, 'postergado' UNION ALL SELECT 4, 'cancelado') s
            LEFT JOIN partido p ON p.estado = s.estado AND p.id_torneo = %s
            GROUP BY s.orden, s.estado
            ORDER BY s.orden
        """, (id_torneo, id_torneo))
        return cursor.fetchall()
    finally:
        cursor.close()


def valla_menos_vencida(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT e.id_equipo, e.nombre AS equipo, COUNT(r.id_equipo) AS pj,
                   COALESCE(SUM(r.gc), 0) AS gc, ROUND(AVG(r.gc), 2) AS promedio
            FROM equipo e
            LEFT JOIN (
                SELECT p.id_equipo_local AS id_equipo, v.goles_visitante AS gc
                FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
                WHERE p.id_torneo = %s AND p.estado = 'jugado'
                UNION ALL
                SELECT p.id_equipo_visitante, v.goles_local
                FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
                WHERE p.id_torneo = %s AND p.estado = 'jugado'
            ) r ON r.id_equipo = e.id_equipo
            WHERE e.id_torneo = %s
            GROUP BY e.id_equipo, e.nombre
            ORDER BY pj = 0, gc, pj DESC, e.nombre, e.id_equipo
        """, (id_torneo, id_torneo, id_torneo))
        return cursor.fetchall()
    finally:
        cursor.close()


def goles_por_tipo(conn, id_torneo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT t.tipo, COUNT(g.id_gol) AS goles, COUNT(DISTINCT g.ci_jugador) AS goleadores
            FROM (SELECT 1 AS orden, 'grado' AS tipo UNION ALL SELECT 2, 'posgrado'
                  UNION ALL SELECT 3, 'docente' UNION ALL SELECT 4, 'funcionario') t
            LEFT JOIN (
                SELECT j.tipo, go.id_gol, go.ci_jugador
                FROM gol go
                JOIN partido p ON p.id_partido = go.id_partido
                JOIN jugador j ON j.ci = go.ci_jugador
                WHERE p.id_torneo = %s AND p.estado = 'jugado' AND go.autogol = 0
            ) g ON g.tipo = t.tipo
            GROUP BY t.orden, t.tipo
            ORDER BY t.orden
        """, (id_torneo,))
        return cursor.fetchall()
    finally:
        cursor.close()


def local_visitante(conn, id_torneo: int) -> dict:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT COUNT(*) AS partidos,
                   COALESCE(SUM(v.goles_local > v.goles_visitante), 0) AS gana_local,
                   COALESCE(SUM(v.goles_local = v.goles_visitante), 0) AS empates,
                   COALESCE(SUM(v.goles_local < v.goles_visitante), 0) AS gana_visitante,
                   COALESCE(SUM(v.goles_local), 0) AS goles_local,
                   COALESCE(SUM(v.goles_visitante), 0) AS goles_visitante
            FROM partido p JOIN v_resultado_partido v ON v.id_partido = p.id_partido
            WHERE p.id_torneo = %s AND p.estado = 'jugado'
        """, (id_torneo,))
        return cursor.fetchone()
    finally:
        cursor.close()
