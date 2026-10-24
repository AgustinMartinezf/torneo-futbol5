def listar(conn) -> list[dict]:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id_turno, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio, "
            "TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin FROM turno ORDER BY hora_inicio"
        )
        return cursor.fetchall()
    finally:
        cursor.close()
