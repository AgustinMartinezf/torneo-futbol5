from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import crear_token, usuario_actual, verificar_contrasena
from app.db import get_conn
from app.repos import auth as repo
from app.schemas.auth import LoginIn, TokenOut, Usuario

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn):
    # Todavía no sabemos el rol y el planillero no puede leer login: usamos la conexión del administrador.
    with get_conn("administrador") as conn:
        fila = repo.buscar_login(conn, datos.correo)
    if fila is None or not verificar_contrasena(datos.contrasena, fila["contrasena"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )
    return TokenOut(token=crear_token(fila["correo"], fila["rol"]), correo=fila["correo"], rol=fila["rol"])


@router.get("/yo", response_model=Usuario)
def yo(usuario: Usuario = Depends(usuario_actual)):
    return usuario
