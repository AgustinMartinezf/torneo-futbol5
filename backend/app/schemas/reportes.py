from pydantic import BaseModel


class PosicionOut(BaseModel):
    id_equipo: int
    equipo: str
    pj: int
    pg: int
    pe: int
    pp: int
    gf: int
    gc: int
    dg: int
    pts: int


class GoleadorOut(BaseModel):
    ci_jugador: str
    nombre: str
    apellido: str
    id_equipo: int
    equipo: str
    goles: int


class FairPlayOut(BaseModel):
    id_equipo: int
    equipo: str
    amarillas: int
    rojas: int
    puntos: int


class PromedioOut(BaseModel):
    numero_fecha: int | None
    partidos: int
    goles: int
    promedio: float | None
