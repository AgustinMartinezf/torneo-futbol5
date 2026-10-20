def listar_usuarios(conn) -> list[dict]:
    """Cuentas de la aplicación, sin el hash de la contraseña."""
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT correo, rol FROM login ORDER BY rol, correo")
        return cursor.fetchall()
    finally:
        cursor.close()
