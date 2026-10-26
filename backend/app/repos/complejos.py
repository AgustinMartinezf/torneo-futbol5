_SELECT_COMPLEJO = (
    "SELECT c.id_complejo, c.nombre, c.direccion, c.departamento, "
    "(SELECT COUNT(*) FROM cancha ca WHERE ca.id_complejo = c.id_complejo) AS cantidad_canchas "
    "FROM complejo c"
)


def listar(conn) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(_SELECT_COMPLEJO + " ORDER BY c.nombre")
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener(conn, id_complejo: int) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(_SELECT_COMPLEJO + " WHERE c.id_complejo = %s", (id_complejo,))
        return cursor.fetchone()
    finally:
        cursor.close()


def crear(conn, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO complejo (nombre, direccion, departamento) VALUES (%s, %s, %s)",
            (datos["nombre"], datos["direccion"], datos["departamento"]),
        )
        id_complejo = cursor.lastrowid
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_complejo)


def actualizar(conn, id_complejo: int, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE complejo SET nombre = %s, direccion = %s, departamento = %s "
            "WHERE id_complejo = %s",
            (datos["nombre"], datos["direccion"], datos["departamento"], id_complejo),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_complejo)


def eliminar(conn, id_complejo: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM complejo WHERE id_complejo = %s", (id_complejo,))
        borrado = cursor.rowcount > 0
        conn.commit()
        return borrado
    finally:
        cursor.close()


def listar_canchas(conn, id_complejo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT nombre_cancha, id_complejo, superficie, techada FROM cancha "
            "WHERE id_complejo = %s ORDER BY nombre_cancha",
            (id_complejo,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener_cancha(conn, id_complejo: int, nombre_cancha: str) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT nombre_cancha, id_complejo, superficie, techada FROM cancha "
            "WHERE id_complejo = %s AND nombre_cancha = %s",
            (id_complejo, nombre_cancha),
        )
        return cursor.fetchone()
    finally:
        cursor.close()


def crear_cancha(conn, id_complejo: int, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) "
            "VALUES (%s, %s, %s, %s)",
            (datos["nombre_cancha"], id_complejo, datos["superficie"], datos["techada"]),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener_cancha(conn, id_complejo, datos["nombre_cancha"])


# Cambiar nombre_cancha cascadea a los partidos de esa cancha (fk_partido_cancha).
def actualizar_cancha(conn, id_complejo: int, nombre_actual: str, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE cancha SET nombre_cancha = %s, superficie = %s, techada = %s "
            "WHERE id_complejo = %s AND nombre_cancha = %s",
            (datos["nombre_cancha"], datos["superficie"], datos["techada"],
             id_complejo, nombre_actual),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener_cancha(conn, id_complejo, datos["nombre_cancha"])


def eliminar_cancha(conn, id_complejo: int, nombre_cancha: str) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s",
            (id_complejo, nombre_cancha),
        )
        borrado = cursor.rowcount > 0
        conn.commit()
        return borrado
    finally:
        cursor.close()
