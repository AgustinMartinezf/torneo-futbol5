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


class CanchaUsoOut(BaseModel):
    id_complejo: int
    complejo: str
    nombre_cancha: str
    partidos: int


class TurnoUsoOut(BaseModel):
    id_turno: int
    hora_inicio: str
    hora_fin: str
    partidos: int


class JugadoresFacultadOut(BaseModel):
    id_facultad: int
    facultad: str
    tipo: str
    jugadores: int


class SinPlanillaOut(BaseModel):
    ci_jugador: str
    nombre: str
    apellido: str
    id_equipo: int
    equipo: str
    numero_camiseta: int


class SancionesEquipoOut(BaseModel):
    id_equipo: int
    equipo: str
    roja: int
    acumulacion: int
    disciplinaria: int
    total: int


class EstadoPartidosOut(BaseModel):
    estado: str
    partidos: int
    porcentaje: float | None


class VallaOut(BaseModel):
    id_equipo: int
    equipo: str
    pj: int
    gc: int
    promedio: float | None


class GolesTipoOut(BaseModel):
    tipo: str
    goles: int
    goleadores: int


class LocalVisitanteOut(BaseModel):
    partidos: int
    gana_local: int
    empates: int
    gana_visitante: int
    goles_local: int
    goles_visitante: int
