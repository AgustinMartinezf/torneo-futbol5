_SELECT = (
    "SELECT e.*, f.nombre AS facultad, t.nombre AS torneo, t.estado, "
    "(SELECT COUNT(*) FROM equipo_jugador_torneo ejt WHERE ejt.id_equipo = e.id_equipo) AS cantidad_jugadores, "
    "(SELECT COUNT(*) FROM equipo_jugador_torneo ejt JOIN jugador j ON j.ci = ejt.ci_jugador "
    "WHERE ejt.id_equipo = e.id_equipo AND j.tipo IN ('docente', 'funcionario')) AS cantidad_docentes_funcionarios "
    "FROM equipo e JOIN facultad f ON f.id_facultad = e.id_facultad JOIN torneo t ON t.id_torneo = e.id_torneo"
)


def listar(conn, id_torneo: int | None = None) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        if id_torneo is None:
            cursor.execute(_SELECT + " ORDER BY e.nombre")
        else:
            cursor.execute(_SELECT + " WHERE e.id_torneo = %s ORDER BY e.nombre", (id_torneo,))
        return cursor.fetchall()
    finally:
        cursor.close()


def obtener(conn, id_equipo: int) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(_SELECT + " WHERE e.id_equipo = %s", (id_equipo,))
        return cursor.fetchone()
    finally:
        cursor.close()


def crear(conn, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO equipo (nombre, id_torneo, id_facultad, ci_capitan) VALUES (%s, %s, %s, %s)",
            (datos["nombre"], datos["id_torneo"], datos["id_facultad"], datos["ci_capitan"]),
        )
        id_equipo = cursor.lastrowid
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_equipo)


def actualizar(conn, id_equipo: int, datos: dict) -> dict:
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE equipo SET nombre = %s, id_torneo = %s, id_facultad = %s, ci_capitan = %s WHERE id_equipo = %s",
            (datos["nombre"], datos["id_torneo"], datos["id_facultad"], datos["ci_capitan"], id_equipo),
        )
        conn.commit()
    finally:
        cursor.close()
    return obtener(conn, id_equipo)


def eliminar(conn, id_equipo: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM equipo WHERE id_equipo = %s", (id_equipo,))
        borrado = cursor.rowcount > 0
        conn.commit()
        return borrado
    finally:
        cursor.close()


def listar_plantel(conn, id_equipo: int) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT ejt.*, j.nombre, j.apellido, j.tipo, j.id_facultad FROM equipo_jugador_torneo ejt "
            "JOIN jugador j ON j.ci = ejt.ci_jugador WHERE ejt.id_equipo = %s ORDER BY ejt.numero_camiseta",
            (id_equipo,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()


def inscribir(conn, equipo: dict, datos: dict):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO equipo_jugador_torneo (id_equipo, ci_jugador, id_torneo, numero_camiseta) VALUES (%s, %s, %s, %s)",
            (equipo["id_equipo"], datos["ci_jugador"], equipo["id_torneo"], datos["numero_camiseta"]),
        )
        conn.commit()
    finally:
        cursor.close()


def cambiar_camiseta(conn, id_equipo: int, ci: str, numero: int):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE equipo_jugador_torneo SET numero_camiseta = %s WHERE id_equipo = %s AND ci_jugador = %s",
            (numero, id_equipo, ci),
        )
        conn.commit()
    finally:
        cursor.close()


def quitar_jugador(conn, id_equipo: int, ci: str):
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM equipo_jugador_torneo WHERE id_equipo = %s AND ci_jugador = %s", (id_equipo, ci))
        conn.commit()
    finally:
        cursor.close()


def inscripto_en_edicion(conn, ci: str, id_torneo: int) -> bool:
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM equipo_jugador_torneo WHERE ci_jugador = %s AND id_torneo = %s", (ci, id_torneo))
        return cursor.fetchone() is not None
    finally:
        cursor.close()

