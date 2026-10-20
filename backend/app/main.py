import mysql.connector
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.errores import manejar_error_mysql, manejar_error_validacion
from app.routers import auth, facultades, jugadores, usuarios

app = FastAPI(title="Torneo Interfacultades de Fútbol 5 - API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(mysql.connector.Error, manejar_error_mysql)
app.add_exception_handler(RequestValidationError, manejar_error_validacion)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(facultades.router)
app.include_router(jugadores.router)


@app.get("/health")
def health():
    return {"status": "ok"}
