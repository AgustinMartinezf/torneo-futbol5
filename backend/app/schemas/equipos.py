from pydantic import BaseModel, Field, field_validator

from app.validaciones import ci_uruguaya_valida


class EquipoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=60)
    id_torneo: int = Field(gt=0)
    id_facultad: int = Field(gt=0)
    ci_capitan: str | None = None

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre del equipo es obligatorio.")
        return valor

    @field_validator("ci_capitan")
    @classmethod
    def capitan_valido(cls, valor):
        if valor is not None and not ci_uruguaya_valida(valor):
            raise ValueError("La cédula del capitán no es válida.")
        return valor


class EquipoOut(EquipoIn):
    id_equipo: int
    facultad: str
    torneo: str
    estado: str
    cantidad_jugadores: int
    cantidad_docentes_funcionarios: int


class PlantelIn(BaseModel):
    ci_jugador: str
    numero_camiseta: int = Field(ge=1, le=99)

    @field_validator("ci_jugador")
    @classmethod
    def cedula_valida(cls, valor: str) -> str:
        if not ci_uruguaya_valida(valor):
            raise ValueError("La cédula del jugador no es válida.")
        return valor


class CamisetaIn(BaseModel):
    numero_camiseta: int = Field(ge=1, le=99)


class PlantelOut(PlantelIn):
    id_equipo: int
    id_torneo: int
    nombre: str
    apellido: str
    tipo: str
    id_facultad: int

