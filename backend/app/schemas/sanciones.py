from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


MotivoSancion = Literal["roja", "acumulación de amarillas", "disciplinaria"]


# Por la API solo se cargan disciplinarias: las otras las generan los triggers de tarjeta.
class SancionIn(BaseModel):
    ci_jugador: str = Field(pattern=r"^[0-9]{7,8}$")
    id_torneo: int = Field(gt=0)
    numero_fecha_inicio: int = Field(ge=1, le=255)
    cantidad_fechas: int = Field(ge=1, le=255)


class SancionOut(SancionIn):
    id_sancion: int
    motivo: MotivoSancion
    numero_fecha_fin: int
    nombre: str
    apellido: str
    id_equipo: int
    equipo: str
    torneo: str
    id_tarjeta: int | None
    id_partido_tarjeta: int | None
    dia_tarjeta: date | None
