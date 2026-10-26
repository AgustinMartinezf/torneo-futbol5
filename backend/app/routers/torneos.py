from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import equipos as repo_equipos
from app.repos import torneos as repo
from app.schemas.torneos import TorneoIn, TorneoOut

router = APIRouter(prefix="/torneos", tags=["torneos"], dependencies=[Depends(requiere_rol("administrador"))])


@router.get("", response_model=list[TorneoOut])
def listar_torneos(conn=Depends(conexion_del_usuario)):
    return repo.listar(conn)


@router.get("/{id_torneo}", response_model=TorneoOut)
def obtener_torneo(id_torneo: int, conn=Depends(conexion_del_usuario)):
    torneo = repo.obtener(conn, id_torneo)
    if torneo is None:
        raise HTTPException(status_code=404, detail="La edición no existe.")
    return torneo


@router.post("", response_model=TorneoOut, status_code=status.HTTP_201_CREATED)
def crear_torneo(datos: TorneoIn, conn=Depends(conexion_del_usuario)):
    if datos.estado != "inscripción":
        raise HTTPException(status_code=400, detail="Una edición debe crearse en inscripción.")
    return repo.crear(conn, datos.model_dump())


@router.put("/{id_torneo}", response_model=TorneoOut)
def actualizar_torneo(id_torneo: int, datos: TorneoIn, conn=Depends(conexion_del_usuario)):
    torneo = obtener_torneo(id_torneo, conn)
    if datos.estado != torneo["estado"]:
        if (torneo["estado"], datos.estado) not in [("inscripción", "en curso"), ("en curso", "finalizado")]:
            raise HTTPException(status_code=400, detail="Los estados deben avanzar de inscripción a en curso y luego a finalizado.")
        if datos.estado == "en curso":
            for equipo in repo_equipos.listar(conn, id_torneo):
                if not 5 <= equipo["cantidad_jugadores"] <= 10 or equipo["ci_capitan"] is None:
                    raise HTTPException(status_code=400, detail="Para iniciar la edición todos los equipos deben tener entre 5 y 10 jugadores y un capitán.")
    return repo.actualizar(conn, id_torneo, datos.model_dump())


@router.delete("/{id_torneo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_torneo(id_torneo: int, conn=Depends(conexion_del_usuario)):
    if not repo.eliminar(conn, id_torneo):
        raise HTTPException(status_code=404, detail="La edición no existe.")

