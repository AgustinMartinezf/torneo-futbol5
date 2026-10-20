"""Autenticación con JWT y control de acceso por rol.

El token lleva el correo y el rol. Con el rol elegimos la conexión de base de datos
de cada request (ver db.conexion_del_usuario).
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import JWT_ALGORITMO, JWT_EXPIRES_MINUTES, JWT_SECRET
from app.schemas.auth import Usuario

ROLES = ("administrador", "planillero")

_bearer = HTTPBearer(auto_error=False)


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    return bcrypt.checkpw(contrasena.encode("utf-8"), hash_guardado.encode("utf-8"))


def crear_token(correo: str, rol: str) -> str:
    vence = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MINUTES)
    datos = {"sub": correo, "rol": rol, "exp": vence}
    return jwt.encode(datos, JWT_SECRET, algorithm=JWT_ALGORITMO)


def _no_autenticado(mensaje: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=mensaje,
        headers={"WWW-Authenticate": "Bearer"},
    )


def usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> Usuario:
    if credenciales is None:
        raise _no_autenticado("Tenés que iniciar sesión.")
    try:
        datos = jwt.decode(
            credenciales.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITMO],
            options={"require": ["sub", "rol", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        raise _no_autenticado("La sesión venció. Volvé a iniciar sesión.")
    except jwt.InvalidTokenError:
        raise _no_autenticado("La sesión no es válida. Volvé a iniciar sesión.")
    if datos.get("rol") not in ROLES or not datos.get("sub"):
        raise _no_autenticado("La sesión no es válida. Volvé a iniciar sesión.")
    return Usuario(correo=datos["sub"], rol=datos["rol"])


def requiere_rol(*roles: str):
    """Dependencia que deja pasar solo a los usuarios con alguno de los roles indicados."""
    def verificar(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permiso para hacer esta operación.",
            )
        return usuario

    return verificar
