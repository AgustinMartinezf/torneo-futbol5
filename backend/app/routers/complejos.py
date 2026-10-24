from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import complejos as repo
from app.schemas.complejos import CanchaIn, CanchaOut, ComplejoIn, ComplejoOut

router = APIRouter(
    prefix="/complejos",
    tags=["complejos"],
    dependencies=[Depends(requiere_rol("administrador"))],
)


def validar_complejo(conn, id_complejo: int):
    if repo.obtener(conn, id_complejo) is None:
        raise HTTPException(status_code=404, detail="El complejo no existe.")


@router.get("", response_model=list[ComplejoOut])
def listar_complejos(conn=Depends(conexion_del_usuario)):
    return repo.listar(conn)


@router.get("/{id_complejo}", response_model=ComplejoOut)
def obtener_complejo(id_complejo: int, conn=Depends(conexion_del_usuario)):
    complejo = repo.obtener(conn, id_complejo)
    if complejo is None:
        raise HTTPException(status_code=404, detail="El complejo no existe.")
    return complejo


@router.post("", response_model=ComplejoOut, status_code=status.HTTP_201_CREATED)
def crear_complejo(datos: ComplejoIn, conn=Depends(conexion_del_usuario)):
    return repo.crear(conn, datos.model_dump())


@router.put("/{id_complejo}", response_model=ComplejoOut)
def actualizar_complejo(id_complejo: int, datos: ComplejoIn, conn=Depends(conexion_del_usuario)):
    validar_complejo(conn, id_complejo)
    return repo.actualizar(conn, id_complejo, datos.model_dump())


@router.delete("/{id_complejo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_complejo(id_complejo: int, conn=Depends(conexion_del_usuario)):
    if not repo.eliminar(conn, id_complejo):
        raise HTTPException(status_code=404, detail="El complejo no existe.")


@router.get("/{id_complejo}/canchas", response_model=list[CanchaOut])
def listar_canchas(id_complejo: int, conn=Depends(conexion_del_usuario)):
    validar_complejo(conn, id_complejo)
    return repo.listar_canchas(conn, id_complejo)


@router.post(
    "/{id_complejo}/canchas", response_model=CanchaOut, status_code=status.HTTP_201_CREATED
)
def crear_cancha(id_complejo: int, datos: CanchaIn, conn=Depends(conexion_del_usuario)):
    validar_complejo(conn, id_complejo)
    return repo.crear_cancha(conn, id_complejo, datos.model_dump())


@router.put("/{id_complejo}/canchas/{nombre_cancha}", response_model=CanchaOut)
def actualizar_cancha(
    id_complejo: int, nombre_cancha: str, datos: CanchaIn, conn=Depends(conexion_del_usuario)
):
    if repo.obtener_cancha(conn, id_complejo, nombre_cancha) is None:
        raise HTTPException(status_code=404, detail="La cancha no existe.")
    return repo.actualizar_cancha(conn, id_complejo, nombre_cancha, datos.model_dump())


@router.delete("/{id_complejo}/canchas/{nombre_cancha}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_cancha(id_complejo: int, nombre_cancha: str, conn=Depends(conexion_del_usuario)):
    if not repo.eliminar_cancha(conn, id_complejo, nombre_cancha):
        raise HTTPException(status_code=404, detail="La cancha no existe.")
