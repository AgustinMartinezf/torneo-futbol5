from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import reportes as repo, torneos
from app.schemas.reportes import (
    CanchaUsoOut, EstadoPartidosOut, FairPlayOut, GoleadorOut, GolesTipoOut, JugadoresFacultadOut,
    LocalVisitanteOut, PosicionOut, PromedioOut, SancionesEquipoOut, SinPlanillaOut, TurnoUsoOut, VallaOut,
)

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


@router.get("/canchas", response_model=list[CanchaUsoOut])
def canchas(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.canchas(conn, id_torneo)


@router.get("/turnos", response_model=list[TurnoUsoOut])
def turnos(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.turnos(conn, id_torneo)


@router.get("/jugadores-por-facultad", response_model=list[JugadoresFacultadOut])
def jugadores_por_facultad(conn=Depends(conexion_del_usuario)):
    return repo.jugadores_por_facultad(conn)


@router.get("/sin-planilla", response_model=list[SinPlanillaOut])
def sin_planilla(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.sin_planilla(conn, id_torneo)


@router.get("/sanciones", response_model=list[SancionesEquipoOut])
def sanciones(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.sanciones(conn, id_torneo)


@router.get("/estados", response_model=list[EstadoPartidosOut])
def estados(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.estados(conn, id_torneo)


@router.get("/valla-menos-vencida", response_model=list[VallaOut])
def valla_menos_vencida(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.valla_menos_vencida(conn, id_torneo)


@router.get("/goles-por-tipo", response_model=list[GolesTipoOut])
def goles_por_tipo(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.goles_por_tipo(conn, id_torneo)


@router.get("/local-visitante", response_model=LocalVisitanteOut)
def local_visitante(id_torneo: int = Query(gt=0), conn=Depends(conexion_del_usuario)):
    validar_edicion(conn, id_torneo)
    return repo.local_visitante(conn, id_torneo)
