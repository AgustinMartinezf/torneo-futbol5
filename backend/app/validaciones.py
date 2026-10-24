"""Comprobamos estas reglas también en los formularios y en MySQL."""
import re
from datetime import date


PESOS_CI = (2, 9, 8, 7, 6, 3, 4)


def ci_uruguaya_valida(ci: str) -> bool:
    if re.fullmatch(r"[0-9]{7,8}", ci) is None:
        return False
    digitos = ci.zfill(8)
    suma = sum(int(digito) * peso for digito, peso in zip(digitos[:7], PESOS_CI))
    return (10 - suma % 10) % 10 == int(digitos[7])


def fecha_nacimiento_razonable(fecha: date, hoy: date | None = None) -> bool:
    hoy = hoy or date.today()
    edad = hoy.year - fecha.year - ((hoy.month, hoy.day) < (fecha.month, fecha.day))
    return 16 <= edad <= 120
