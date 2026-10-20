"""Configuración leída de las variables de entorno (ver .env.example)."""
import os

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "120"))
JWT_ALGORITMO = "HS256"

if len(JWT_SECRET.encode("utf-8")) < 32:
    raise RuntimeError("JWT_SECRET debe tener al menos 32 bytes aleatorios. Configuralo en .env.")
