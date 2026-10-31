def listar_partidos(conn) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT p.id_partido, p.id_torneo, p.numero_fecha, p.dia, p.estado, "
            "p.id_equipo_local, p.id_equipo_visitante, el.nombre AS equipo_local, "
            "ev.nombre AS equipo_visitante, tr.nombre AS torneo, "
            "LEFT(t.hora_inicio, 5) AS hora_inicio, LEFT(t.hora_fin, 5) AS hora_fin, "
            "r.goles_local, r.goles_visitante, "
            "(TIMESTAMP(p.dia, t.hora_inicio) <= NOW()) AS turno_empezado, "
            "(TIMESTAMP(p.dia, t.hora_fin) <= NOW()) AS turno_terminado, "
            "(p.estado = 'programado' OR NOW() <= TIMESTAMP(p.dia, t.hora_fin) + INTERVAL 48 HOUR) "
            "AS puede_editar "
            "FROM partido p JOIN torneo tr ON tr.id_torneo = p.id_torneo "
            "JOIN equipo el ON el.id_equipo = p.id_equipo_local "
            "JOIN equipo ev ON ev.id_equipo = p.id_equipo_visitante "
            "JOIN turno t ON t.id_turno = p.id_turno "
            "JOIN v_resultado_partido r ON r.id_partido = p.id_partido "
            "WHERE tr.estado = 'en curso' AND p.estado IN ('programado', 'jugado') "
            "ORDER BY p.numero_fecha, p.dia, t.hora_inicio, p.id_partido"
        )
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener_partido(conn, id_partido: int) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT p.id_partido, p.id_torneo, p.numero_fecha, p.dia, p.estado, "
            "p.id_equipo_local, p.id_equipo_visitante, el.nombre AS equipo_local, "
            "ev.nombre AS equipo_visitante, tr.nombre AS torneo, "
            "LEFT(t.hora_inicio, 5) AS hora_inicio, LEFT(t.hora_fin, 5) AS hora_fin, "
            "r.goles_local, r.goles_visitante, "
            "(TIMESTAMP(p.dia, t.hora_inicio) <= NOW()) AS turno_empezado, "
            "(TIMESTAMP(p.dia, t.hora_fin) <= NOW()) AS turno_terminado, "
            "(p.estado = 'programado' OR NOW() <= TIMESTAMP(p.dia, t.hora_fin) + INTERVAL 48 HOUR) "
            "AS puede_editar "
            "FROM partido p JOIN torneo tr ON tr.id_torneo = p.id_torneo "
            "JOIN equipo el ON el.id_equipo = p.id_equipo_local "
            "JOIN equipo ev ON ev.id_equipo = p.id_equipo_visitante "
            "JOIN turno t ON t.id_turno = p.id_turno "
            "JOIN v_resultado_partido r ON r.id_partido = p.id_partido "
            "WHERE tr.estado = 'en curso' AND p.estado IN ('programado', 'jugado') "
            "AND p.id_partido = %s LIMIT 1",
            (id_partido,),
        )
        return cursor.fetchone()
    finally:
        cursor.close()


def listar_planteles(conn, id_partido: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT ejt.id_equipo, ejt.ci_jugador, j.nombre, j.apellido, ejt.numero_camiseta, "
            "EXISTS (SELECT 1 FROM planilla_partido pp WHERE pp.id_partido = p.id_partido "
            "AND pp.ci_jugador = ejt.ci_jugador) AS presente, "
            "EXISTS (SELECT 1 FROM sancion_jugador s WHERE s.ci_jugador = ejt.ci_jugador "
            "AND s.id_torneo = p.id_torneo AND p.numero_fecha BETWEEN s.numero_fecha_inicio "
            "AND s.numero_fecha_inicio + s.cantidad_fechas - 1) AS suspendido "
            "FROM partido p JOIN equipo_jugador_torneo ejt "
            "ON ejt.id_equipo IN (p.id_equipo_local, p.id_equipo_visitante) "
            "JOIN jugador j ON j.ci = ejt.ci_jugador WHERE p.id_partido = %s "
            "ORDER BY FIELD(ejt.id_equipo, p.id_equipo_local, p.id_equipo_visitante), "
            "ejt.numero_camiseta",
            (id_partido,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()


def listar_goles(conn, id_partido: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT g.id_gol, g.ci_jugador, j.nombre, j.apellido, pp.id_equipo, "
            "g.minuto, g.autogol FROM gol g "
            "JOIN planilla_partido pp ON pp.id_partido = g.id_partido AND pp.ci_jugador = g.ci_jugador "
            "JOIN jugador j ON j.ci = g.ci_jugador WHERE g.id_partido = %s "
            "ORDER BY g.minuto, g.id_gol",
            (id_partido,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()


def listar_tarjetas(conn, id_partido: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT ta.id_tarjeta, ta.ci_jugador, j.nombre, j.apellido, pp.id_equipo, "
            "ta.minuto, ta.color FROM tarjeta ta "
            "JOIN planilla_partido pp ON pp.id_partido = ta.id_partido AND pp.ci_jugador = ta.ci_jugador "
            "JOIN jugador j ON j.ci = ta.ci_jugador WHERE ta.id_partido = %s "
            "ORDER BY ta.minuto, ta.id_tarjeta",
            (id_partido,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()


def jugador_del_plantel(conn, id_equipo: int, ci_jugador: str) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM equipo_jugador_torneo WHERE id_equipo = %s AND ci_jugador = %s LIMIT 1",
            (id_equipo, ci_jugador),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def jugador_suspendido(conn, id_partido: int, ci_jugador: str) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM partido p JOIN sancion_jugador s ON s.id_torneo = p.id_torneo "
            "WHERE p.id_partido = %s AND s.ci_jugador = %s "
            "AND p.numero_fecha BETWEEN s.numero_fecha_inicio "
            "AND s.numero_fecha_inicio + s.cantidad_fechas - 1 LIMIT 1",
            (id_partido, ci_jugador),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def jugador_en_planilla(conn, id_partido: int, ci_jugador: str) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s LIMIT 1",
            (id_partido, ci_jugador),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def gol_del_partido(conn, id_partido: int, id_gol: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM gol WHERE id_partido = %s AND id_gol = %s LIMIT 1", (id_partido, id_gol))
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def tarjeta_del_partido(conn, id_partido: int, id_tarjeta: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM tarjeta WHERE id_partido = %s AND id_tarjeta = %s LIMIT 1",
            (id_partido, id_tarjeta),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def agregar_jugador(conn, id_partido: int, ci_jugador: str, id_equipo: int):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO planilla_partido (id_partido, ci_jugador, id_equipo) VALUES (%s, %s, %s)",
            (id_partido, ci_jugador, id_equipo),
        )
        conn.commit()
    finally:
        cursor.close()


def quitar_jugador(conn, id_partido: int, ci_jugador: str):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM planilla_partido WHERE id_partido = %s AND ci_jugador = %s",
            (id_partido, ci_jugador),
        )
        conn.commit()
    finally:
        cursor.close()


def agregar_gol(conn, id_partido: int, datos: dict):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO gol (id_partido, ci_jugador, minuto, autogol) VALUES (%s, %s, %s, %s)",
            (id_partido, datos["ci_jugador"], datos["minuto"], datos["autogol"]),
        )
        conn.commit()
    finally:
        cursor.close()


def quitar_gol(conn, id_partido: int, id_gol: int):
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM gol WHERE id_partido = %s AND id_gol = %s", (id_partido, id_gol))
        conn.commit()
    finally:
        cursor.close()


def agregar_tarjeta(conn, id_partido: int, datos: dict):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO tarjeta (id_partido, ci_jugador, minuto, color) VALUES (%s, %s, %s, %s)",
            (id_partido, datos["ci_jugador"], datos["minuto"], datos["color"]),
        )
        conn.commit()
    finally:
        cursor.close()


def quitar_tarjeta(conn, id_partido: int, id_tarjeta: int):
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tarjeta WHERE id_partido = %s AND id_tarjeta = %s", (id_partido, id_tarjeta))
        conn.commit()
    finally:
        cursor.close()


def marcar_jugado(conn, id_partido: int):
    cursor = conn.cursor()
    try:
        cursor.execute("CALL marcar_partido_jugado(%s)", (id_partido,))
        conn.commit()
    finally:
        cursor.close()
