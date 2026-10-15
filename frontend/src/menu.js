// Secciones de la aplicación y qué roles las ven. El menú y las rutas salen de esta lista.
export const SECCIONES = [
  { ruta: 'jugadores', texto: 'Jugadores', roles: ['administrador'] },
  { ruta: 'complejos', texto: 'Complejos y canchas', roles: ['administrador'] },
  { ruta: 'equipos', texto: 'Equipos y planteles', roles: ['administrador'] },
  { ruta: 'partidos', texto: 'Partidos', roles: ['administrador'] },
  { ruta: 'planillas', texto: 'Planillas', roles: ['administrador', 'planillero'] },
  { ruta: 'sanciones', texto: 'Sanciones', roles: ['administrador'] },
  { ruta: 'reportes', texto: 'Reportes', roles: ['administrador'] },
]
