from pydantic import BaseModel, Field, field_validator


class FacultadIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre de la facultad es obligatorio.")
        return valor


class FacultadOut(FacultadIn):
    id_facultad: int
