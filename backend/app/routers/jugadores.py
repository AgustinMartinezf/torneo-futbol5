from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import facultades as repo_facultades
from app.repos import jugadores as repo
from app.schemas.jugadores import JugadorIn, JugadorOut, TipoJugador

router = APIRouter(
    prefix="/jugadores",
    tags=["jugadores"],
    dependencies=[Depends(requiere_rol("administrador"))],
)


def validar_facultad(conn, id_facultad: int):
    if repo_facultades.obtener(conn, id_facultad) is None:
        raise HTTPException(status_code=400, detail="La facultad indicada no existe.")


@router.get("", response_model=list[JugadorOut])
def listar_jugadores(
    id_facultad: int | None = Query(default=None, gt=0),
    tipo: TipoJugador | None = None,
    busqueda: str | None = Query(default=None, max_length=100),
    conn=Depends(conexion_del_usuario),
):
    return repo.listar(conn, id_facultad, tipo, busqueda.strip() if busqueda else None)


@router.get("/{ci}", response_model=JugadorOut)
def obtener_jugador(ci: str, conn=Depends(conexion_del_usuario)):
    jugador = repo.obtener(conn, ci)
    if jugador is None:
        raise HTTPException(status_code=404, detail="El jugador no existe.")
    return jugador


@router.post("", response_model=JugadorOut, status_code=status.HTTP_201_CREATED)
def crear_jugador(datos: JugadorIn, conn=Depends(conexion_del_usuario)):
    validar_facultad(conn, datos.id_facultad)
    return repo.crear(conn, datos.model_dump())


@router.put("/{ci}", response_model=JugadorOut)
def actualizar_jugador(ci: str, datos: JugadorIn, conn=Depends(conexion_del_usuario)):
    if repo.obtener(conn, ci) is None:
        raise HTTPException(status_code=404, detail="El jugador no existe.")
    validar_facultad(conn, datos.id_facultad)
    return repo.actualizar(conn, ci, datos.model_dump())


@router.delete("/{ci}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_jugador(ci: str, conn=Depends(conexion_del_usuario)):
    if not repo.eliminar(conn, ci):
        raise HTTPException(status_code=404, detail="El jugador no existe.")
