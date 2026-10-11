# Bitácora del trabajo

Una entrada por turno. La escribe quien hizo el turno, antes de abrir el PR.

| Fecha | Integrante | Turno / feature | Qué se hizo | Decisiones y problemas |
|---|---|---|---|---|
| 10/10/2026 | | 00 · Setup | Estructura del repositorio, Docker Compose, esqueleto de backend y frontend. | React + Vite por experiencia previa del grupo; FastAPI por validación con Pydantic y documentación automática. |
| 11/10/2026 | Agustín Martínez | 01 · Modelo de datos | Hicimos el script de la base (`db/init/01_schema.sql`) con las 14 tablas de la letra y sus constraints. También el DER, las explicaciones de cada decisión en `docs/adr/`, los supuestos con las preguntas para el docente y la sección 2 del informe. Probamos que la base rechace datos inválidos (65 casos) y que funcione el cambio de CI en cascada. | La PK de partido la dejamos como en la letra, pero tuvimos que agregar UNIQUE(id_partido) porque MySQL no dejaba crear las FK. Dejamos id_torneo en el plantel con una FK compuesta, y así la regla de un equipo por torneo quedó con un UNIQUE. Para la cancha ocupada y los cruces repetidos usamos columnas generadas. No usamos borrado en cascada en ninguna FK. |
