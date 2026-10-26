def listar(conn) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM torneo ORDER BY anio DESC, semestre DESC")
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener(conn, id_torneo: int) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM torneo WHERE id_torneo = %s", (id_torneo,))
        return cursor.fetchone()
    finally:
        cursor.close()


def crear(conn, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin, estado) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (datos["nombre"], datos["anio"], datos["semestre"], datos["fecha_inicio"], datos["fecha_fin"], datos["estado"]),
        )
        id_torneo = cursor.lastrowid
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_torneo)


def actualizar(conn, id_torneo: int, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE torneo SET nombre = %s, anio = %s, semestre = %s, fecha_inicio = %s, fecha_fin = %s, estado = %s "
            "WHERE id_torneo = %s",
            (datos["nombre"], datos["anio"], datos["semestre"], datos["fecha_inicio"], datos["fecha_fin"], datos["estado"], id_torneo),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_torneo)


def eliminar(conn, id_torneo: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM torneo WHERE id_torneo = %s", (id_torneo,))
        borrado = cursor.rowcount > 0
        conn.commit()
        return borrado
    finally:
        cursor.close()

