from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import planillas as repo
from app.schemas.planillas import GolIn, JugadorPlanillaIn, TarjetaIn


router = APIRouter(
    prefix="/planillas", tags=["planillas"],
    dependencies=[Depends(requiere_rol("planillero", "administrador"))],
)


@router.get("")
def listar_partidos(conn=Depends(conexion_del_usuario)):
    return repo.listar_partidos(conn)


@router.get("/{id_partido}")
def obtener_planilla(id_partido: int, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    planteles = repo.listar_planteles(conn, id_partido)
    return {
        **partido,
        "plantel_local": [j for j in planteles if j["id_equipo"] == partido["id_equipo_local"]],
        "plantel_visitante": [j for j in planteles if j["id_equipo"] == partido["id_equipo_visitante"]],
        "planilla": [j for j in planteles if j["presente"]],
        "goles": repo.listar_goles(conn, id_partido),
        "tarjetas": repo.listar_tarjetas(conn, id_partido),
    }


@router.post("/{id_partido}/jugadores", status_code=status.HTTP_201_CREATED)
def agregar_jugador(id_partido: int, datos: JugadorPlanillaIn, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    if not partido["puede_editar"]:
        raise HTTPException(status_code=400, detail="Pasaron las 48 horas para corregir la planilla del partido.")
    if datos.id_equipo not in (partido["id_equipo_local"], partido["id_equipo_visitante"]):
        raise HTTPException(status_code=400, detail="El equipo de la planilla debe jugar ese partido.")
    if not repo.jugador_del_plantel(conn, datos.id_equipo, datos.ci_jugador):
        raise HTTPException(status_code=400, detail="El jugador no pertenece al plantel de ese equipo.")
    if repo.jugador_suspendido(conn, id_partido, datos.ci_jugador):
        raise HTTPException(status_code=400, detail="El jugador está suspendido para esta fecha.")
    repo.agregar_jugador(conn, id_partido, datos.ci_jugador, datos.id_equipo)
    return {"detail": "Jugador agregado a la planilla."}


@router.delete("/{id_partido}/jugadores/{ci_jugador}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_jugador(id_partido: int, ci_jugador: str, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    if not partido["puede_editar"]:
        raise HTTPException(status_code=400, detail="Pasaron las 48 horas para corregir la planilla del partido.")
    if not repo.jugador_en_planilla(conn, id_partido, ci_jugador):
        raise HTTPException(status_code=404, detail="El jugador no figura en la planilla.")
    repo.quitar_jugador(conn, id_partido, ci_jugador)


@router.post("/{id_partido}/goles", status_code=status.HTTP_201_CREATED)
def agregar_gol(id_partido: int, datos: GolIn, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    if not partido["puede_editar"]:
        raise HTTPException(status_code=400, detail="Pasaron las 48 horas para corregir los goles del partido.")
    if not repo.jugador_en_planilla(conn, id_partido, datos.ci_jugador):
        raise HTTPException(status_code=400, detail="Solo pueden hacer goles los jugadores que figuran en la planilla.")
    repo.agregar_gol(conn, id_partido, datos.model_dump())
    return {"detail": "Gol agregado."}


@router.delete("/{id_partido}/goles/{id_gol}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_gol(id_partido: int, id_gol: int, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    if not partido["puede_editar"]:
        raise HTTPException(status_code=400, detail="Pasaron las 48 horas para corregir los goles del partido.")
    if not repo.gol_del_partido(conn, id_partido, id_gol):
        raise HTTPException(status_code=404, detail="El gol no existe en ese partido.")
    repo.quitar_gol(conn, id_partido, id_gol)


@router.post("/{id_partido}/tarjetas", status_code=status.HTTP_201_CREATED)
def agregar_tarjeta(id_partido: int, datos: TarjetaIn, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    if not partido["puede_editar"]:
        raise HTTPException(status_code=400, detail="Pasaron las 48 horas para corregir las tarjetas del partido.")
    if not repo.jugador_en_planilla(conn, id_partido, datos.ci_jugador):
        raise HTTPException(status_code=400, detail="Solo pueden recibir tarjetas los jugadores que figuran en la planilla.")
    repo.agregar_tarjeta(conn, id_partido, datos.model_dump())
    return {"detail": "Tarjeta agregada."}


@router.delete("/{id_partido}/tarjetas/{id_tarjeta}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_tarjeta(id_partido: int, id_tarjeta: int, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    if not partido["puede_editar"]:
        raise HTTPException(status_code=400, detail="Pasaron las 48 horas para corregir las tarjetas del partido.")
    if not repo.tarjeta_del_partido(conn, id_partido, id_tarjeta):
        raise HTTPException(status_code=404, detail="La tarjeta no existe en ese partido.")
    repo.quitar_tarjeta(conn, id_partido, id_tarjeta)


@router.post("/{id_partido}/jugado")
def marcar_partido_jugado(id_partido: int, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener_partido(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no está disponible para cargar planilla.")
    if partido["estado"] != "programado":
        raise HTTPException(status_code=400, detail="Solo se puede marcar como jugado un partido programado.")
    if not partido["turno_terminado"]:
        raise HTTPException(status_code=400, detail="El partido todavía no se jugó: su turno no terminó.")
    repo.marcar_jugado(conn, id_partido)
    return {"detail": "Partido marcado como jugado."}
