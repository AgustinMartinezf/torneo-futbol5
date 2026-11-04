from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import torneos
from app.repos import sanciones as repo
from app.schemas.sanciones import MotivoSancion, SancionIn, SancionOut

router = APIRouter(prefix="/sanciones", tags=["sanciones"], dependencies=[Depends(requiere_rol("administrador"))])

NO_AUTOMATICA = "Las sanciones por tarjeta no se editan ni se borran: se revierten borrando la tarjeta en la planilla."


def validar_disciplinaria(conn, datos: SancionIn):
    torneo = torneos.obtener(conn, datos.id_torneo)
    if torneo is None:
        raise HTTPException(status_code=400, detail="La edición indicada no existe.")
    if torneo["estado"] != "en curso":
        raise HTTPException(status_code=400, detail="Las sanciones disciplinarias solo se aplican en una edición en curso.")
    if not repo.jugador_en_edicion(conn, datos.ci_jugador, datos.id_torneo):
        raise HTTPException(status_code=400, detail="El jugador no está en un plantel de esa edición.")


@router.get("", response_model=list[SancionOut])
def listar_sanciones(
    id_torneo: int | None = Query(default=None, gt=0),
    id_equipo: int | None = Query(default=None, gt=0),
    motivo: MotivoSancion | None = None,
    conn=Depends(conexion_del_usuario),
):
    return repo.listar(conn, id_torneo, id_equipo, motivo)


@router.get("/{id_sancion}", response_model=SancionOut)
def obtener_sancion(id_sancion: int, conn=Depends(conexion_del_usuario)):
    sancion = repo.obtener(conn, id_sancion)
    if sancion is None:
        raise HTTPException(status_code=404, detail="La sanción no existe.")
    return sancion


@router.post("", response_model=SancionOut, status_code=status.HTTP_201_CREATED)
def crear_sancion(datos: SancionIn, conn=Depends(conexion_del_usuario)):
    validar_disciplinaria(conn, datos)
    return repo.crear(conn, datos.model_dump())


@router.put("/{id_sancion}", response_model=SancionOut)
def actualizar_sancion(id_sancion: int, datos: SancionIn, conn=Depends(conexion_del_usuario)):
    sancion = obtener_sancion(id_sancion, conn)
    if sancion["motivo"] != "disciplinaria":
        raise HTTPException(status_code=400, detail=NO_AUTOMATICA)
    if torneos.obtener(conn, sancion["id_torneo"])["estado"] != "en curso":
        raise HTTPException(status_code=400, detail="Las sanciones disciplinarias solo se aplican en una edición en curso.")
    validar_disciplinaria(conn, datos)
    return repo.actualizar(conn, id_sancion, datos.model_dump())


@router.delete("/{id_sancion}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_sancion(id_sancion: int, conn=Depends(conexion_del_usuario)):
    sancion = obtener_sancion(id_sancion, conn)
    if sancion["motivo"] != "disciplinaria":
        raise HTTPException(status_code=400, detail=NO_AUTOMATICA)
    repo.eliminar(conn, id_sancion)
