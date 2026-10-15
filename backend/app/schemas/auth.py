from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginIn(BaseModel):
    correo: EmailStr = Field(max_length=100)
    contrasena: str = Field(min_length=1)

    @field_validator("contrasena")
    @classmethod
    def largo_bcrypt(cls, valor: str) -> str:
        # bcrypt solo usa los primeros 72 bytes de la contraseña.
        if len(valor.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede tener más de 72 caracteres.")
        return valor


class Usuario(BaseModel):
    correo: str
    rol: Literal["administrador", "planillero"]


class TokenOut(BaseModel):
    token: str
    correo: str
    rol: Literal["administrador", "planillero"]
