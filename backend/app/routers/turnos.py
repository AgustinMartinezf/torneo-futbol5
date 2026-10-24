from fastapi import APIRouter, Depends

from app.auth import usuario_actual
from app.db import conexion_del_usuario
from app.repos import turnos as repo
from app.schemas.turnos import TurnoOut

# Solo lectura: los turnos son fijos de 18 a 23 (supuesto S-14). Los usan los dos roles.
router = APIRouter(prefix="/turnos", tags=["turnos"], dependencies=[Depends(usuario_actual)])


@router.get("", response_model=list[TurnoOut])
def listar_turnos(conn=Depends(conexion_del_usuario)):
    return repo.listar(conn)
