"""Traduce los errores de MySQL a un detail en español, buscando el nombre de la constraint.

Cada funcionalidad agrega a MENSAJES las constraints que puede disparar. Un SIGNAL 45000 ya trae su mensaje.
"""
import logging
import re

import mysql.connector
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

ER_SIGNAL = 1644
ER_DUPLICADO = 1062
ER_FK_PADRE_EN_USO = 1451
ER_FK_NO_EXISTE = 1452
# Mismos errores de FK sin el nombre de la constraint (MySQL los da según los permisos del usuario).
ER_FK_NO_EXISTE_SIN_NOMBRE = 1216
ER_FK_EN_USO_SIN_NOMBRE = 1217
ER_CHECK = 3819
ER_VALOR_INVALIDO = 1265
ER_NULO = 1048
ER_MUY_LARGO = 1406
ER_SIN_VALOR = 1364
ER_FECHA_INVALIDA = 1292
ER_TIPO_INVALIDO = 1366
ER_SIN_PERMISO_TABLA = 1142
ER_SIN_PERMISO_COLUMNA = 1143
ER_SIN_PERMISO_RUTINA = 1370
ER_SIN_CONEXION = 2003
ER_HOST_DESCONOCIDO = 2005

MENSAJES = {
    "pk_login": "Ya existe una cuenta con ese correo.",
    "login.PRIMARY": "Ya existe una cuenta con ese correo.",
    "chk_login_correo": "El correo no tiene un formato válido.",
    "chk_login_contrasena_hash": "La contraseña tiene que guardarse como hash bcrypt.",
    "uq_facultad_nombre": "Ya existe una facultad con ese nombre.",
    "chk_facultad_nombre": "El nombre de la facultad es obligatorio.",
    "jugador.PRIMARY": "Ya existe un jugador con esa cédula.",
    "uq_jugador_email": "Ya existe un jugador con ese correo.",
    "fk_jugador_facultad": "La facultad indicada no existe.",
    "chk_jugador_ci": "La cédula tiene que tener 7 u 8 dígitos, sin puntos ni guiones.",
    "chk_jugador_nombre": "El nombre del jugador es obligatorio.",
    "chk_jugador_apellido": "El apellido del jugador es obligatorio.",
    "chk_jugador_email": "El correo del jugador no tiene un formato válido.",
    "chk_jugador_fecha_nacimiento": "La fecha de nacimiento no es válida.",
    "uq_torneo_anio_semestre": "Ya existe una edición para ese año y semestre.",
    "uq_torneo_nombre": "Ya existe una edición con ese nombre.",
    "chk_torneo_fechas": "La fecha de inicio tiene que ser anterior a la de fin.",
    "uq_equipo_nombre_torneo": "Ya existe un equipo con ese nombre en la edición.",
    "uq_ejt_jugador_torneo": "El jugador ya está en un equipo de esta edición.",
    "uq_ejt_camiseta": "Ese número de camiseta ya lo usa otro jugador del equipo.",
    "chk_ejt_camiseta": "El número de camiseta tiene que estar entre 1 y 99.",
    "uq_complejo_nombre": "Ya existe un complejo con ese nombre.",
    "chk_complejo_nombre": "El nombre del complejo es obligatorio.",
    "chk_complejo_direccion": "La dirección del complejo es obligatoria.",
    "fk_cancha_complejo": "El complejo indicado no existe.",
    "chk_cancha_nombre": "El nombre de la cancha es obligatorio.",
    "chk_cancha_nombre_sin_barra": 'El nombre de la cancha no puede contener "/".',
    "cancha.PRIMARY": "Ya existe una cancha con ese nombre en el complejo.",
    "uq_partido_cancha_turno": "La cancha ya tiene un partido ese día y en ese turno.",
    "uq_partido_cruce": "Esos equipos ya tienen un partido en la edición.",
    "chk_partido_equipos_distintos": "Un equipo no puede jugar contra sí mismo.",
    "fk_gol_planilla": "Solo pueden hacer goles los jugadores que figuran en la planilla.",
    "fk_tarjeta_planilla": "Solo pueden recibir tarjetas los jugadores que figuran en la planilla.",
    "planilla_partido.PRIMARY": "El jugador ya figura en la planilla del partido.",
}

# Para una FK, el 1452 (el dato no existe) usa MENSAJES y el 1451 (el dato está en uso) usa este.
MENSAJES_EN_USO = {
    "fk_jugador_facultad": "No se puede borrar la facultad porque tiene jugadores.",
    "fk_equipo_facultad": "No se puede borrar la facultad porque tiene equipos.",
    "fk_equipo_torneo": "No se puede borrar la edición porque tiene equipos.",
    "fk_partido_torneo": "No se puede borrar la edición porque tiene partidos.",
    "fk_cancha_complejo": "No se puede borrar el complejo porque tiene canchas. Borrá primero sus canchas.",
    "fk_partido_cancha": "No se puede borrar la cancha porque tiene partidos.",
    "fk_partido_local": "No se puede borrar el equipo porque tiene partidos.",
    "fk_partido_visitante": "No se puede borrar el equipo porque tiene partidos.",
    "fk_ejt_jugador": "No se puede borrar el jugador porque está en un plantel.",
    "fk_ejt_equipo": "No se puede borrar el equipo porque tiene jugadores en el plantel.",
    "fk_planilla_partido": "No se puede borrar el partido porque tiene planilla.",
}

_PATRONES = {
    ER_DUPLICADO: r"for key '([^']+)'",
    ER_FK_PADRE_EN_USO: r"CONSTRAINT `([^`]+)`",
    ER_FK_NO_EXISTE: r"CONSTRAINT `([^`]+)`",
    ER_CHECK: r"constraint '([^']+)'",
    ER_VALOR_INVALIDO: r"column '([^']+)'",
    ER_NULO: r"Column '([^']+)'",
    ER_MUY_LARGO: r"column '([^']+)'",
    ER_SIN_VALOR: r"Field '([^']+)'",
    ER_FECHA_INVALIDA: r"column '([^']+)'",
    ER_TIPO_INVALIDO: r"column '([^']+)'",
}


def _nombre_en_mensaje(error: mysql.connector.Error) -> str | None:
    patron = _PATRONES.get(error.errno)
    encontrado = re.search(patron, error.msg or "") if patron else None
    return encontrado.group(1) if encontrado else None


def _mensaje_de_constraint(nombre: str | None, por_defecto: str, mensajes: dict = MENSAJES) -> str:
    if nombre is None:
        return por_defecto
    # En los duplicados la clave llega como tabla.nombre (ej. partido.uq_partido_cruce).
    corto = nombre.split(".")[-1]
    return mensajes.get(nombre) or mensajes.get(corto) or f"{por_defecto} ({corto})"


def traducir_error_mysql(error: mysql.connector.Error) -> tuple[int, str]:
    errno = error.errno
    nombre = _nombre_en_mensaje(error)

    if errno == ER_SIGNAL:
        return 400, error.msg
    if errno == ER_DUPLICADO:
        return 409, _mensaje_de_constraint(nombre, "Ya existe un registro con esos datos.")
    if errno == ER_FK_PADRE_EN_USO:
        return 409, _mensaje_de_constraint(
            nombre, "No se puede borrar o cambiar porque otros datos lo usan.", MENSAJES_EN_USO
        )
    if errno == ER_FK_NO_EXISTE:
        return 400, _mensaje_de_constraint(nombre, "Hace referencia a un dato que no existe.")
    if errno == ER_FK_NO_EXISTE_SIN_NOMBRE:
        return 400, "Hace referencia a un dato que no existe."
    if errno == ER_FK_EN_USO_SIN_NOMBRE:
        return 409, "No se puede borrar porque otros datos lo usan."
    if errno == ER_CHECK:
        return 400, _mensaje_de_constraint(nombre, "Los datos no cumplen una regla de la base.")
    campo = f"El campo {nombre}" if nombre else "Un campo"
    if errno in (ER_VALOR_INVALIDO, ER_FECHA_INVALIDA, ER_TIPO_INVALIDO):
        return 400, f"{campo} tiene un valor que no es válido."
    if errno in (ER_NULO, ER_SIN_VALOR):
        return 400, f"{campo} es obligatorio."
    if errno == ER_MUY_LARGO:
        return 400, f"{campo} es demasiado largo."
    if errno in (ER_SIN_PERMISO_TABLA, ER_SIN_PERMISO_COLUMNA, ER_SIN_PERMISO_RUTINA):
        return 403, "No tenés permiso para hacer esta operación."
    if errno in (ER_SIN_CONEXION, ER_HOST_DESCONOCIDO):
        return 503, "No hay conexión con la base de datos."
    return 500, "Error en la base de datos."


def _mensaje_validacion(error: dict) -> str:
    campo = str(error["loc"][-1]) if error.get("loc") else "dato"
    tipo = error.get("type", "")
    if tipo == "missing":
        return f"El campo {campo} es obligatorio."
    if tipo == "string_too_short":
        return f"El campo {campo} no puede estar vacío."
    if tipo == "string_too_long":
        return f"El campo {campo} es demasiado largo."
    if tipo == "value_error" and "email" in error.get("msg", ""):
        return f"El campo {campo} no es un correo válido."
    if tipo == "value_error":
        # Los validadores propios ya tienen el mensaje en español.
        return error["msg"].removeprefix("Value error, ")
    return f"El campo {campo} no es válido."


async def manejar_error_validacion(request: Request, error: RequestValidationError) -> JSONResponse:
    """Errores de Pydantic (422): un solo texto en español en vez de la lista en inglés."""
    mensajes = [_mensaje_validacion(e) for e in error.errors()]
    return JSONResponse(status_code=422, content={"detail": " ".join(dict.fromkeys(mensajes))})


async def manejar_error_mysql(request: Request, error: mysql.connector.Error) -> JSONResponse:
    status_code, detail = traducir_error_mysql(error)
    if status_code >= 500:
        log.error("Error de MySQL no traducido: %s", error)
    return JSONResponse(status_code=status_code, content={"detail": detail})
