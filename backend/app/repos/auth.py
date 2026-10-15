"""SQL del login.

Se usa siempre con la conexión de app_admin: app_planillero no tiene SELECT sobre login.
"""


def buscar_login(conn, correo: str) -> dict | None:
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT correo, contrasena, rol FROM login WHERE correo = %s",
            (correo,),
        )
        return cursor.fetchone()
    finally:
        cursor.close()
