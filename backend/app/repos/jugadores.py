"""Consultamos jugadores con filtros opcionales y parámetros."""

_SELECT = (
    "SELECT j.ci, j.nombre, j.apellido, j.email, j.fecha_nacimiento, "
    "j.id_facultad, j.tipo, f.nombre AS facultad "
    "FROM jugador j JOIN facultad f ON f.id_facultad = j.id_facultad"
)


def listar(conn, id_facultad: int | None, tipo: str | None, busqueda: str | None) -> list[dict]:
    partes = [_SELECT, "WHERE 1 = 1"]
    parametros = []
    if id_facultad is not None:
        partes.append("AND j.id_facultad = %s")
        parametros.append(id_facultad)
    if tipo is not None:
        partes.append("AND j.tipo = %s")
        parametros.append(tipo)
    if busqueda:
        partes.append(
            "AND (INSTR(j.nombre, %s) > 0 OR INSTR(j.apellido, %s) > 0 "
            "OR INSTR(j.ci, %s) > 0 OR INSTR(CONCAT(j.nombre, ' ', j.apellido), %s) > 0)"
        )
        parametros.extend([busqueda] * 4)
    partes.append("ORDER BY j.apellido, j.nombre, j.ci")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(" ".join(partes), tuple(parametros))
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener(conn, ci: str) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(_SELECT + " WHERE j.ci = %s", (ci,))
        return cursor.fetchone()
    finally:
        cursor.close()


def crear(conn, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO jugador (ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (datos["ci"], datos["nombre"], datos["apellido"], datos["email"],
             datos["fecha_nacimiento"], datos["id_facultad"], datos["tipo"]),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, datos["ci"])


def actualizar(conn, ci_actual: str, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE jugador SET ci = %s, nombre = %s, apellido = %s, email = %s, "
            "fecha_nacimiento = %s, id_facultad = %s, tipo = %s WHERE ci = %s",
            (datos["ci"], datos["nombre"], datos["apellido"], datos["email"],
             datos["fecha_nacimiento"], datos["id_facultad"], datos["tipo"], ci_actual),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, datos["ci"])


def eliminar(conn, ci: str) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM jugador WHERE ci = %s", (ci,))
        borrado = cursor.rowcount > 0
        conn.commit()
        return borrado
    finally:
        cursor.close()
