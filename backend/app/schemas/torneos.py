from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


EstadoTorneo = Literal["inscripción", "en curso", "finalizado"]


class TorneoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    anio: int = Field(ge=2000, le=2100)
    semestre: int = Field(ge=1, le=2)
    fecha_inicio: date
    fecha_fin: date
    estado: EstadoTorneo = "inscripción"

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre de la edición es obligatorio.")
        return valor

    @model_validator(mode="after")
    def fechas_validas(self):
        if self.fecha_fin <= self.fecha_inicio:
            raise ValueError("La fecha de fin debe ser posterior a la de inicio.")
        if self.fecha_inicio.year != self.anio:
            raise ValueError("La fecha de inicio debe pertenecer al año de la edición.")
        return self


class TorneoOut(TorneoIn):
    id_torneo: int

