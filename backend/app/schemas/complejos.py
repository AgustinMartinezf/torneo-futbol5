from typing import Literal

from pydantic import BaseModel, Field, field_validator


Departamento = Literal[
    "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno",
    "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
    "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto",
    "San José", "Soriano", "Tacuarembó", "Treinta y Tres",
]
Superficie = Literal["sintético", "parquet"]


class ComplejoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    direccion: str = Field(min_length=1, max_length=150)
    departamento: Departamento

    @field_validator("nombre", "direccion")
    @classmethod
    def texto_no_vacio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre y la dirección del complejo son obligatorios.")
        return valor


class ComplejoOut(ComplejoIn):
    id_complejo: int
    cantidad_canchas: int


class CanchaIn(BaseModel):
    nombre_cancha: str = Field(min_length=1, max_length=50)
    superficie: Superficie
    techada: bool

    @field_validator("nombre_cancha")
    @classmethod
    def nombre_no_vacio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre de la cancha es obligatorio.")
        if "/" in valor:
            raise ValueError('El nombre de la cancha no puede contener "/".')
        return valor


class CanchaOut(CanchaIn):
    id_complejo: int
