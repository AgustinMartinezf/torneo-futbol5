"""Una conexión por rol, para que valgan los permisos de db/init/02_usuarios.sql."""
import os
from contextlib import contextmanager

import mysql.connector
from fastapi import Depends

from app.auth import usuario_actual
from app.schemas.auth import Usuario

_CREDENCIALES = {
    "administrador": (os.getenv("DB_ADMIN_USER"), os.getenv("DB_ADMIN_PASSWORD")),
    "planillero": (os.getenv("DB_PLANILLERO_USER"), os.getenv("DB_PLANILLERO_PASSWORD")),
}


@contextmanager
def get_conn(rol: str = "administrador"):
    usuario, password = _CREDENCIALES[rol]
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=usuario,
        password=password,
        database=os.getenv("MYSQL_DATABASE", "torneo_futbol5"),
    )
    try:
        yield conn
    finally:
        conn.close()


def conexion_del_usuario(usuario: Usuario = Depends(usuario_actual)):
    """Si el endpoint no hace commit, al cerrar la conexión MySQL deshace los cambios."""
    with get_conn(usuario.rol) as conn:
        yield conn
