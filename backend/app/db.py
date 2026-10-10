"""Acceso a MySQL SIN ORM: conexiones y helpers para ejecutar SQL parametrizado.

Hay una conexión por rol para respetar los permisos definidos a nivel de base de datos
(usuarios app_admin y app_planillero, ver db/init/02_usuarios.sql).
"""
import os
from contextlib import contextmanager

import mysql.connector

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
