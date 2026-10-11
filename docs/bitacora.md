# Bitácora del trabajo

Una entrada por turno. La escribe quien hizo el turno, antes de abrir el PR.

| Fecha | Integrante | Turno / feature | Qué se hizo | Decisiones y problemas |
|---|---|---|---|---|
| 10/10/2026 | | 00 · Setup | Estructura del repositorio, Docker Compose, esqueleto de backend y frontend. | React + Vite por experiencia previa del grupo; FastAPI por validación con Pydantic y documentación automática. |
| 11/10/2026 | Agustín Martínez | 01 · Modelo de datos | Esquema completo en `db/init/01_schema.sql` con las 14 tablas de la letra y constraints con nombre. DER en Mermaid (`docs/der/der.md`), 10 ADR en `docs/adr/`, supuestos y preguntas para el docente en `docs/supuestos.md`, y sección 2 del informe. Probamos 65 operaciones inválidas y la base rechazó todas con la constraint esperada. | Respetamos la PK de partido de la letra y agregamos UNIQUE(id_partido) porque MySQL 8.4 lo pide para las FK. Mantuvimos id_torneo en el plantel con una FK compuesta, y así la regla de un equipo por edición quedó en un UNIQUE. Usamos columnas generadas para la cancha ocupada y el cruce repetido. Todas las FK son ON DELETE RESTRICT, y el cambio de CI se propaga por cascada; lo probamos. Problema: el puerto 3306 estaba ocupado por un MySQL local, y para la prueba publicamos la base en el 3307 sin cambiar el compose. |
