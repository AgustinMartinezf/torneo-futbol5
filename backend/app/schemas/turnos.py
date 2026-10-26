from pydantic import BaseModel


class TurnoOut(BaseModel):
    id_turno: int
    hora_inicio: str
    hora_fin: str
