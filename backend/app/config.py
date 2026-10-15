"""Configuración leída de las variables de entorno (ver .env.example)."""
import os

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "120"))
JWT_ALGORITMO = "HS256"

if not JWT_SECRET:
    raise RuntimeError("Falta la variable de entorno JWT_SECRET.")
