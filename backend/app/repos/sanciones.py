_SELECT = (
    "SELECT s.id_sancion, s.ci_jugador, s.id_torneo, s.motivo, s.numero_fecha_inicio, s.cantidad_fechas, "
    "s.numero_fecha_inicio + s.cantidad_fechas - 1 AS numero_fecha_fin, j.nombre, j.apellido, "
    "e.id_equipo, e.nombre AS equipo, t.nombre AS torneo, s.id_tarjeta, "
    "ta.id_partido AS id_partido_tarjeta, p.dia AS dia_tarjeta "
    "FROM sancion_jugador s JOIN jugador j ON j.ci = s.ci_jugador "
    "JOIN torneo t ON t.id_torneo = s.id_torneo "
    "JOIN equipo_jugador_torneo ejt ON ejt.ci_jugador = s.ci_jugador AND ejt.id_torneo = s.id_torneo "
    "JOIN equipo e ON e.id_equipo = ejt.id_equipo "
    "LEFT JOIN tarjeta ta ON ta.id_tarjeta = s.id_tarjeta "
    "LEFT JOIN partido p ON p.id_partido = ta.id_partido"
)


def listar(conn, id_torneo: int | None, id_equipo: int | None, motivo: str | None) -> list[dict]:
    condiciones = []
    parametros = []
    if id_torneo is not None:
        condiciones.append("s.id_torneo = %s")
        parametros.append(id_torneo)
    if id_equipo is not None:
        condiciones.append("e.id_equipo = %s")
        parametros.append(id_equipo)
    if motivo is not None:
        condiciones.append("s.motivo = %s")
        parametros.append(motivo)
    consulta = _SELECT
    if condiciones:
        consulta += " WHERE " + " AND ".join(condiciones)
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(consulta + " ORDER BY s.id_torneo, s.numero_fecha_inicio, e.nombre, j.apellido", parametros)
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener(conn, id_sancion: int) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(_SELECT + " WHERE s.id_sancion = %s LIMIT 1", (id_sancion,))
        return cursor.fetchone()
    finally:
        cursor.close()


def jugador_en_edicion(conn, ci_jugador: str, id_torneo: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %s AND id_torneo = %s LIMIT 1",
            (ci_jugador, id_torneo),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def crear(conn, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO sancion_jugador (ci_jugador, id_torneo, motivo, numero_fecha_inicio, cantidad_fechas) "
            "VALUES (%s, %s, 'disciplinaria', %s, %s)",
            (datos["ci_jugador"], datos["id_torneo"], datos["numero_fecha_inicio"], datos["cantidad_fechas"]),
        )
        id_sancion = cursor.lastrowid
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_sancion)


def actualizar(conn, id_sancion: int, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE sancion_jugador SET ci_jugador = %s, id_torneo = %s, numero_fecha_inicio = %s, "
            "cantidad_fechas = %s WHERE id_sancion = %s",
            (datos["ci_jugador"], datos["id_torneo"], datos["numero_fecha_inicio"], datos["cantidad_fechas"],
             id_sancion),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_sancion)


def eliminar(conn, id_sancion: int):
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM sancion_jugador WHERE id_sancion = %s", (id_sancion,))
        conn.commit()
    finally:
        cursor.close()
