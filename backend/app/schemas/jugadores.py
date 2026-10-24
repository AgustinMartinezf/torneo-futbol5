from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.validaciones import ci_uruguaya_valida, fecha_nacimiento_razonable


TipoJugador = Literal["grado", "posgrado", "docente", "funcionario"]


class JugadorIn(BaseModel):
    ci: str = Field(min_length=7, max_length=8)
    nombre: str = Field(min_length=1, max_length=60)
    apellido: str = Field(min_length=1, max_length=60)
    email: EmailStr = Field(max_length=100)
    fecha_nacimiento: date
    id_facultad: int = Field(gt=0)
    tipo: TipoJugador

    @field_validator("ci")
    @classmethod
    def cedula_valida(cls, valor: str) -> str:
        if not ci_uruguaya_valida(valor):
            raise ValueError("La cédula debe tener 7 u 8 dígitos y un verificador válido.")
        return valor

    @field_validator("nombre", "apellido")
    @classmethod
    def texto_no_vacio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre y el apellido son obligatorios.")
        return valor

    @field_validator("fecha_nacimiento")
    @classmethod
    def edad_razonable(cls, valor: date) -> date:
        if not fecha_nacimiento_razonable(valor):
            raise ValueError("La edad del jugador debe estar entre 16 y 120 años.")
        return valor


class JugadorOut(BaseModel):
    ci: str
    nombre: str
    apellido: str
    email: str
    fecha_nacimiento: date
    id_facultad: int
    tipo: TipoJugador
    facultad: str
