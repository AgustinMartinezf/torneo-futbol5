from typing import Literal

from pydantic import BaseModel, Field


class JugadorPlanillaIn(BaseModel):
    ci_jugador: str = Field(pattern=r"^[0-9]{7,8}$")
    id_equipo: int = Field(gt=0)


class GolIn(BaseModel):
    ci_jugador: str = Field(pattern=r"^[0-9]{7,8}$")
    minuto: int = Field(ge=1, le=60)
    autogol: bool = False


class TarjetaIn(BaseModel):
    ci_jugador: str = Field(pattern=r"^[0-9]{7,8}$")
    minuto: int = Field(ge=1, le=60)
    color: Literal["amarilla", "roja"]
