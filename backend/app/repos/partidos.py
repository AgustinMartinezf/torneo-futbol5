_SELECT = (
    "SELECT p.id_partido, p.id_torneo, p.numero_fecha, p.id_equipo_local, p.id_equipo_visitante, p.dia, "
    "p.id_turno, p.nombre_cancha, p.id_complejo, p.estado, t.nombre AS torneo, el.nombre AS equipo_local, "
    "ev.nombre AS equipo_visitante, LEFT(tu.hora_inicio, 5) AS hora_inicio, c.nombre AS complejo, "
    "EXISTS (SELECT 1 FROM planilla_partido pp WHERE pp.id_partido = p.id_partido) AS tiene_planilla "
    "FROM partido p JOIN torneo t ON t.id_torneo = p.id_torneo "
    "JOIN equipo el ON el.id_equipo = p.id_equipo_local JOIN equipo ev ON ev.id_equipo = p.id_equipo_visitante "
    "JOIN turno tu ON tu.id_turno = p.id_turno JOIN complejo c ON c.id_complejo = p.id_complejo"
)


def listar(conn, id_torneo: int | None, numero_fecha: int | None) -> list[dict]:
    condiciones = []
    parametros = []
    if id_torneo is not None:
        condiciones.append("p.id_torneo = %s")
        parametros.append(id_torneo)
    if numero_fecha is not None:
        condiciones.append("p.numero_fecha = %s")
        parametros.append(numero_fecha)
    consulta = _SELECT
    if condiciones:
        consulta += " WHERE " + " AND ".join(condiciones)
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(consulta + " ORDER BY p.id_torneo, p.numero_fecha, p.dia, tu.hora_inicio", parametros)
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener(conn, id_partido: int) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(_SELECT + " WHERE p.id_partido = %s", (id_partido,))
        return cursor.fetchone()
    finally:
        cursor.close()


def crear(conn, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO partido (id_torneo, numero_fecha, id_equipo_local, id_equipo_visitante, dia, id_turno, "
            "nombre_cancha, id_complejo, estado) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (datos["id_torneo"], datos["numero_fecha"], datos["id_equipo_local"], datos["id_equipo_visitante"],
             datos["dia"], datos["id_turno"], datos["nombre_cancha"], datos["id_complejo"], datos["estado"]),
        )
        id_partido = cursor.lastrowid
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_partido)


def actualizar(conn, id_partido: int, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE partido SET numero_fecha = %s, id_equipo_local = %s, id_equipo_visitante = %s, dia = %s, "
            "id_turno = %s, nombre_cancha = %s, id_complejo = %s, estado = %s WHERE id_partido = %s",
            (datos["numero_fecha"], datos["id_equipo_local"], datos["id_equipo_visitante"], datos["dia"],
             datos["id_turno"], datos["nombre_cancha"], datos["id_complejo"], datos["estado"], id_partido),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_partido)


def eliminar(conn, id_partido: int):
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM partido WHERE id_partido = %s", (id_partido,))
        conn.commit()
    finally:
        cursor.close()


def equipo_juega_en_fecha(conn, datos: dict, id_partido: int | None) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM partido WHERE id_torneo = %s AND numero_fecha = %s AND estado <> 'cancelado' "
            "AND (id_equipo_local IN (%s, %s) OR id_equipo_visitante IN (%s, %s)) AND id_partido <> %s LIMIT 1",
            (datos["id_torneo"], datos["numero_fecha"], datos["id_equipo_local"], datos["id_equipo_visitante"],
             datos["id_equipo_local"], datos["id_equipo_visitante"], id_partido or 0),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def cruce_repetido(conn, datos: dict, id_partido: int | None) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM partido WHERE id_torneo = %s AND estado <> 'cancelado' "
            "AND LEAST(id_equipo_local, id_equipo_visitante) = LEAST(%s, %s) "
            "AND GREATEST(id_equipo_local, id_equipo_visitante) = GREATEST(%s, %s) AND id_partido <> %s LIMIT 1",
            (datos["id_torneo"], datos["id_equipo_local"], datos["id_equipo_visitante"],
             datos["id_equipo_local"], datos["id_equipo_visitante"], id_partido or 0),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


def cancha_ocupada(conn, datos: dict, id_partido: int | None) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM partido WHERE nombre_cancha = %s AND id_complejo = %s AND dia = %s AND id_turno = %s "
            "AND estado IN ('programado', 'jugado') AND id_partido <> %s LIMIT 1",
            (datos["nombre_cancha"], datos["id_complejo"], datos["dia"], datos["id_turno"], id_partido or 0),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()


# La hora se compara en MySQL con NOW(), que usa la zona de Uruguay (el contenedor de la API está en UTC).
def turno_terminado(conn, dia, id_turno: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT TIMESTAMP(%s, hora_fin) <= NOW() FROM turno WHERE id_turno = %s", (dia, id_turno))
        fila = cursor.fetchone()
        return fila is not None and bool(fila[0])
    finally:
        cursor.close()
