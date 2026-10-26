from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import equipos as repo
from app.repos import facultades, jugadores, torneos
from app.schemas.equipos import CamisetaIn, EquipoIn, EquipoOut, PlantelIn, PlantelOut

router = APIRouter(prefix="/equipos", tags=["equipos"], dependencies=[Depends(requiere_rol("administrador"))])


def validar_inscripcion(equipo):
    if equipo["estado"] != "inscripción":
        raise HTTPException(status_code=400, detail="El plantel solo se puede modificar durante la inscripción.")


def validar_datos_equipo(conn, datos):
    torneo = torneos.obtener(conn, datos.id_torneo)
    if torneo is None:
        raise HTTPException(status_code=400, detail="La edición indicada no existe.")
    if facultades.obtener(conn, datos.id_facultad) is None:
        raise HTTPException(status_code=400, detail="La facultad indicada no existe.")
    return torneo


@router.get("", response_model=list[EquipoOut])
def listar_equipos(id_torneo: int | None = Query(default=None, gt=0), conn=Depends(conexion_del_usuario)):
    return repo.listar(conn, id_torneo)


@router.get("/{id_equipo}", response_model=EquipoOut)
def obtener_equipo(id_equipo: int, conn=Depends(conexion_del_usuario)):
    equipo = repo.obtener(conn, id_equipo)
    if equipo is None:
        raise HTTPException(status_code=404, detail="El equipo no existe.")
    return equipo


@router.post("", response_model=EquipoOut, status_code=status.HTTP_201_CREATED)
def crear_equipo(datos: EquipoIn, conn=Depends(conexion_del_usuario)):
    torneo = validar_datos_equipo(conn, datos)
    validar_inscripcion(torneo)
    if datos.ci_capitan is not None:
        raise HTTPException(status_code=400, detail="Primero creá el equipo e inscribí a sus jugadores para elegir capitán.")
    return repo.crear(conn, datos.model_dump())


@router.put("/{id_equipo}", response_model=EquipoOut)
def actualizar_equipo(id_equipo: int, datos: EquipoIn, conn=Depends(conexion_del_usuario)):
    equipo = obtener_equipo(id_equipo, conn)
    torneo = validar_datos_equipo(conn, datos)
    plantel = repo.listar_plantel(conn, id_equipo)
    if (datos.id_torneo != equipo["id_torneo"] or datos.id_facultad != equipo["id_facultad"]
            or datos.ci_capitan != equipo["ci_capitan"]):
        validar_inscripcion(equipo)
        validar_inscripcion(torneo)
    if datos.id_torneo != equipo["id_torneo"] and plantel:
        raise HTTPException(status_code=400, detail="No se puede cambiar la edición de un equipo con plantel.")
    if any(j["id_facultad"] != datos.id_facultad for j in plantel):
        raise HTTPException(status_code=400, detail="No se puede cambiar la facultad del equipo porque tiene jugadores de otra facultad.")
    if datos.ci_capitan is not None and not any(j["ci_jugador"] == datos.ci_capitan for j in plantel):
        raise HTTPException(status_code=400, detail="El capitán debe pertenecer al plantel del equipo.")
    return repo.actualizar(conn, id_equipo, datos.model_dump())


@router.delete("/{id_equipo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_equipo(id_equipo: int, conn=Depends(conexion_del_usuario)):
    equipo = obtener_equipo(id_equipo, conn)
    validar_inscripcion(equipo)
    repo.eliminar(conn, id_equipo)


@router.get("/{id_equipo}/jugadores", response_model=list[PlantelOut])
def listar_plantel(id_equipo: int, conn=Depends(conexion_del_usuario)):
    obtener_equipo(id_equipo, conn)
    return repo.listar_plantel(conn, id_equipo)


@router.post("/{id_equipo}/jugadores", response_model=list[PlantelOut], status_code=status.HTTP_201_CREATED)
def inscribir_jugador(id_equipo: int, datos: PlantelIn, conn=Depends(conexion_del_usuario)):
    equipo = obtener_equipo(id_equipo, conn)
    validar_inscripcion(equipo)
    jugador = jugadores.obtener(conn, datos.ci_jugador)
    if jugador is None:
        raise HTTPException(status_code=400, detail="El jugador indicado no existe.")
    if jugador["id_facultad"] != equipo["id_facultad"]:
        raise HTTPException(status_code=400, detail="Todos los jugadores deben ser de la facultad del equipo.")
    if equipo["cantidad_jugadores"] >= 10:
        raise HTTPException(status_code=400, detail="El plantel admite como máximo 10 jugadores.")
    if jugador["tipo"] in ("docente", "funcionario") and equipo["cantidad_docentes_funcionarios"] >= 2:
        raise HTTPException(status_code=400, detail="El plantel admite como máximo 2 docentes o funcionarios.")
    if repo.inscripto_en_edicion(conn, datos.ci_jugador, equipo["id_torneo"]):
        raise HTTPException(status_code=409, detail="El jugador ya está en un equipo de esta edición.")
    repo.inscribir(conn, equipo, datos.model_dump())
    return repo.listar_plantel(conn, id_equipo)


@router.put("/{id_equipo}/jugadores/{ci}", response_model=list[PlantelOut])
def cambiar_camiseta(id_equipo: int, ci: str, datos: CamisetaIn, conn=Depends(conexion_del_usuario)):
    equipo = obtener_equipo(id_equipo, conn)
    validar_inscripcion(equipo)
    if not any(j["ci_jugador"] == ci for j in repo.listar_plantel(conn, id_equipo)):
        raise HTTPException(status_code=404, detail="El jugador no está en el plantel.")
    repo.cambiar_camiseta(conn, id_equipo, ci, datos.numero_camiseta)
    return repo.listar_plantel(conn, id_equipo)


@router.delete("/{id_equipo}/jugadores/{ci}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_jugador(id_equipo: int, ci: str, conn=Depends(conexion_del_usuario)):
    equipo = obtener_equipo(id_equipo, conn)
    validar_inscripcion(equipo)
    if not any(j["ci_jugador"] == ci for j in repo.listar_plantel(conn, id_equipo)):
        raise HTTPException(status_code=404, detail="El jugador no está en el plantel.")
    if equipo["ci_capitan"] == ci:
        raise HTTPException(status_code=409, detail="Antes de sacar al capitán hay que elegir otro capitán.")
    repo.quitar_jugador(conn, id_equipo, ci)

