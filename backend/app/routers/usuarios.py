from fastapi import APIRouter, Depends

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import usuarios as repo
from app.schemas.auth import Usuario

router = APIRouter(
    prefix="/usuarios",
    tags=["usuarios"],
    dependencies=[Depends(requiere_rol("administrador"))],
)


@router.get("", response_model=list[Usuario])
def listar_usuarios(conn=Depends(conexion_del_usuario)):
    return repo.listar_usuarios(conn)
