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
