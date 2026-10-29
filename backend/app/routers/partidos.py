from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import complejos, equipos, torneos, turnos
from app.repos import partidos as repo
from app.schemas.partidos import PartidoIn, PartidoOut

router = APIRouter(prefix="/partidos", tags=["partidos"], dependencies=[Depends(requiere_rol("administrador"))])

# Supuestos S-01 y S-19.
TRANSICIONES = {
    "programado": ["jugado", "postergado", "cancelado"],
    "postergado": ["programado", "cancelado"],
    "jugado": [],
    "cancelado": [],
}


def validar_datos_partido(conn, datos: PartidoIn, id_partido: int | None = None):
    torneo = torneos.obtener(conn, datos.id_torneo)
    if torneo is None:
        raise HTTPException(status_code=400, detail="La edición indicada no existe.")
    if torneo["estado"] != "en curso":
        raise HTTPException(status_code=400, detail="Solo se pueden programar partidos de una edición en curso.")
    if not torneo["fecha_inicio"] <= datos.dia <= torneo["fecha_fin"]:
        raise HTTPException(status_code=400, detail="El día del partido tiene que estar entre el inicio y el fin de la edición.")
    for id_equipo in (datos.id_equipo_local, datos.id_equipo_visitante):
        equipo = equipos.obtener(conn, id_equipo)
        if equipo is None or equipo["id_torneo"] != datos.id_torneo:
            raise HTTPException(status_code=400, detail="Los dos equipos tienen que ser de la edición del partido.")
        if equipo["cantidad_jugadores"] < 5:
            raise HTTPException(status_code=400, detail="Los dos equipos deben tener al menos 5 jugadores en el plantel.")
    if not any(t["id_turno"] == datos.id_turno for t in turnos.listar(conn)):
        raise HTTPException(status_code=400, detail="El turno indicado no existe.")
    if complejos.obtener_cancha(conn, datos.id_complejo, datos.nombre_cancha) is None:
        raise HTTPException(status_code=400, detail="La cancha indicada no existe en ese complejo.")
    valores = datos.model_dump()
    if datos.estado != "cancelado":
        if repo.equipo_juega_en_fecha(conn, valores, id_partido):
            raise HTTPException(status_code=400, detail="Un equipo no puede jugar más de un partido en la misma fecha del torneo.")
        if repo.cruce_repetido(conn, valores, id_partido):
            raise HTTPException(status_code=409, detail="Esos equipos ya tienen un partido en la edición.")
    if datos.estado in ("programado", "jugado") and repo.cancha_ocupada(conn, valores, id_partido):
        raise HTTPException(status_code=409, detail="La cancha ya tiene un partido ese día y en ese turno.")
    if datos.estado == "jugado" and not repo.turno_terminado(conn, datos.dia, datos.id_turno):
        raise HTTPException(status_code=400, detail="El partido todavía no se jugó: su turno no terminó.")


@router.get("", response_model=list[PartidoOut])
def listar_partidos(
    id_torneo: int | None = Query(default=None, gt=0),
    numero_fecha: int | None = Query(default=None, ge=1),
    conn=Depends(conexion_del_usuario),
):
    return repo.listar(conn, id_torneo, numero_fecha)


@router.get("/{id_partido}", response_model=PartidoOut)
def obtener_partido(id_partido: int, conn=Depends(conexion_del_usuario)):
    partido = repo.obtener(conn, id_partido)
    if partido is None:
        raise HTTPException(status_code=404, detail="El partido no existe.")
    return partido


@router.post("", response_model=PartidoOut, status_code=status.HTTP_201_CREATED)
def crear_partido(datos: PartidoIn, conn=Depends(conexion_del_usuario)):
    if datos.estado != "programado":
        raise HTTPException(status_code=400, detail="Un partido nuevo se crea como programado.")
    validar_datos_partido(conn, datos)
    return repo.crear(conn, datos.model_dump())


@router.put("/{id_partido}", response_model=PartidoOut)
def actualizar_partido(id_partido: int, datos: PartidoIn, conn=Depends(conexion_del_usuario)):
    partido = obtener_partido(id_partido, conn)
    if partido["estado"] in ("jugado", "cancelado"):
        raise HTTPException(status_code=400, detail="Un partido jugado o cancelado no se puede modificar.")
    if datos.id_torneo != partido["id_torneo"]:
        raise HTTPException(status_code=400, detail="No se puede cambiar la edición de un partido.")
    if datos.estado != partido["estado"] and datos.estado not in TRANSICIONES[partido["estado"]]:
        raise HTTPException(status_code=400, detail="Un partido programado pasa a jugado, postergado o cancelado, y uno postergado vuelve a programado o se cancela.")
    if partido["tiene_planilla"] and (datos.id_equipo_local != partido["id_equipo_local"]
                                      or datos.id_equipo_visitante != partido["id_equipo_visitante"]):
        raise HTTPException(status_code=400, detail="No se pueden cambiar los equipos de un partido que ya tiene planilla.")
    validar_datos_partido(conn, datos, id_partido)
    return repo.actualizar(conn, id_partido, datos.model_dump())


@router.delete("/{id_partido}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_partido(id_partido: int, conn=Depends(conexion_del_usuario)):
    partido = obtener_partido(id_partido, conn)
    if partido["estado"] == "jugado":
        raise HTTPException(status_code=400, detail="Un partido jugado no se puede eliminar.")
    if partido["tiene_planilla"]:
        raise HTTPException(status_code=409, detail="No se puede borrar el partido porque tiene planilla.")
    repo.eliminar(conn, id_partido)
