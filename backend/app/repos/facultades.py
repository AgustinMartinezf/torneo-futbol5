def listar(conn) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id_facultad, nombre FROM facultad ORDER BY nombre")
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener(conn, id_facultad: int) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id_facultad, nombre FROM facultad WHERE id_facultad = %s",
            (id_facultad,),
        )
        return cursor.fetchone()
    finally:
        cursor.close()


def crear(conn, nombre: str) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO facultad (nombre) VALUES (%s)", (nombre,))
        id_facultad = cursor.lastrowid
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_facultad)


def actualizar(conn, id_facultad: int, nombre: str) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE facultad SET nombre = %s WHERE id_facultad = %s",
            (nombre, id_facultad),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_facultad)


def eliminar(conn, id_facultad: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM facultad WHERE id_facultad = %s", (id_facultad,))
        borrado = cursor.rowcount > 0
        conn.commit()
        return borrado
    finally:
        cursor.close()
