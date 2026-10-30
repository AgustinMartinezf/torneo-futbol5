from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


EstadoPartido = Literal["programado", "jugado", "postergado", "cancelado"]


class PartidoIn(BaseModel):
    id_torneo: int = Field(gt=0)
    numero_fecha: int = Field(ge=1, le=255)
    id_equipo_local: int = Field(gt=0)
    id_equipo_visitante: int = Field(gt=0)
    dia: date
    id_turno: int = Field(gt=0)
    nombre_cancha: str = Field(min_length=1, max_length=50)
    id_complejo: int = Field(gt=0)
    estado: EstadoPartido = "programado"

    @field_validator("nombre_cancha")
    @classmethod
    def cancha_no_vacia(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("La cancha es obligatoria.")
        return valor

    @model_validator(mode="after")
    def equipos_distintos(self):
        if self.id_equipo_local == self.id_equipo_visitante:
            raise ValueError("Un equipo no puede jugar contra sí mismo.")
        return self


class PartidoOut(PartidoIn):
    id_partido: int
    torneo: str
    equipo_local: str
    equipo_visitante: str
    hora_inicio: str
    complejo: str
    tiene_planilla: bool
