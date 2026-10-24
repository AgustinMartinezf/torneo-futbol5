from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import requiere_rol
from app.db import conexion_del_usuario
from app.repos import facultades as repo
from app.schemas.facultades import FacultadIn, FacultadOut

router = APIRouter(
    prefix="/facultades",
    tags=["facultades"],
    dependencies=[Depends(requiere_rol("administrador"))],
)


@router.get("", response_model=list[FacultadOut])
def listar_facultades(conn=Depends(conexion_del_usuario)):
    return repo.listar(conn)


@router.get("/{id_facultad}", response_model=FacultadOut)
def obtener_facultad(id_facultad: int, conn=Depends(conexion_del_usuario)):
    facultad = repo.obtener(conn, id_facultad)
    if facultad is None:
        raise HTTPException(status_code=404, detail="La facultad no existe.")
    return facultad


@router.post("", response_model=FacultadOut, status_code=status.HTTP_201_CREATED)
def crear_facultad(datos: FacultadIn, conn=Depends(conexion_del_usuario)):
    return repo.crear(conn, datos.nombre)


@router.put("/{id_facultad}", response_model=FacultadOut)
def actualizar_facultad(id_facultad: int, datos: FacultadIn, conn=Depends(conexion_del_usuario)):
    if repo.obtener(conn, id_facultad) is None:
        raise HTTPException(status_code=404, detail="La facultad no existe.")
    return repo.actualizar(conn, id_facultad, datos.nombre)


@router.delete("/{id_facultad}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_facultad(id_facultad: int, conn=Depends(conexion_del_usuario)):
    if not repo.eliminar(conn, id_facultad):
        raise HTTPException(status_code=404, detail="La facultad no existe.")
