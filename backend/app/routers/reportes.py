from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import reportes as repo, torneos
from app.schemas.reportes import FairPlayOut, GoleadorOut, PosicionOut, PromedioOut

router = APIRouter(prefix="/reportes", tags=["reportes"], dependencies=[Depends(requiere_rol("administrador"))])


def validar_edicion(conn, id_torneo: int):
    if torneos.obtener(conn, id_torneo) is None:
        raise HTTPException(status_code=404, detail="La edición no existe.")


@router.get("/posiciones", response_model=list[PosicionOut])
def posiciones(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.posiciones(conn, id_torneo)


@router.get("/goleadores", response_model=list[GoleadorOut])
def goleadores(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.goleadores(conn, id_torneo)


@router.get("/fair-play", response_model=list[FairPlayOut])
def fair_play(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.fair_play(conn, id_torneo)


@router.get("/promedios", response_model=list[PromedioOut])
def promedios(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.promedios(conn, id_torneo)
