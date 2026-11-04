import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import Tabla from '../components/Tabla.jsx'

const POSICIONES = [
  { campo: 'equipo', titulo: 'Equipo' },
  ...['pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'pts'].map((campo) => ({
    campo, titulo: campo === 'pts' ? 'Pts' : campo.toUpperCase(),
  })),
]
const GOLEADORES = [
  { campo: 'ci_jugador', titulo: 'CI' },
  { campo: 'nombre', titulo: 'Jugador', mostrar: (j) => `${j.nombre} ${j.apellido}` },
  { campo: 'equipo', titulo: 'Equipo' }, { campo: 'goles', titulo: 'Goles' },
]
const FAIR_PLAY = [
  { campo: 'equipo', titulo: 'Equipo' }, { campo: 'amarillas', titulo: 'Amarillas' },
  { campo: 'rojas', titulo: 'Rojas' }, { campo: 'puntos', titulo: 'Puntos' },
]
const PROMEDIOS = [
  { campo: 'numero_fecha', titulo: 'Fecha', mostrar: (f) => f.numero_fecha ?? 'Total de la edición' },
  { campo: 'partidos', titulo: 'Partidos jugados' }, { campo: 'goles', titulo: 'Goles' },
  { campo: 'promedio', titulo: 'Promedio', mostrar: (f) => f.promedio === null
    ? 'Sin partidos jugados' : f.promedio.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
]

export default function ReportesPage() {
  const { pedir } = useAuth()
  const [torneos, setTorneos] = useState([])
  const [edicion, setEdicion] = useState('')
  const [reportes, setReportes] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    pedir('/torneos')
      .then((lista) => { if (activo) setTorneos(lista) })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    let activo = true
    if (!edicion) return
    setCargando(true)
    setError('')
    setReportes(null)
    Promise.all(['posiciones', 'goleadores', 'fair-play', 'promedios']
      .map((reporte) => pedir(`/reportes/${reporte}?id_torneo=${edicion}`)))
      .then(([posiciones, goleadores, fairPlay, promedios]) => {
        if (activo) setReportes({ posiciones, goleadores, fairPlay, promedios })
      })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [edicion])

  return (
    <section>
      <h1>Reportes</h1>
      <div className="filtros">
        <label htmlFor="reporte-edicion">Edición
          <select id="reporte-edicion" value={edicion} onChange={(e) => {
            setEdicion(e.target.value)
            setReportes(null)
            setError('')
            setCargando(false)
          }}>
            <option value="">Seleccionar edición</option>
            {torneos.map((t) => <option key={t.id_torneo} value={t.id_torneo}>{t.nombre}</option>)}
          </select>
        </label>
      </div>
      {cargando && <p>Cargando reportes...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!edicion && !cargando && !error && <p>Seleccioná una edición para ver los reportes.</p>}
      {edicion && reportes && !cargando && !error && <>
        <h2>Tabla de posiciones</h2>
        <div className="tabla-contenedor"><Tabla columnas={POSICIONES} filas={reportes.posiciones} clave="id_equipo" /></div>
        <h2>Goleadores</h2>
        <p>Mostramos hasta 10 jugadores, sin autogoles. En caso de empate ordenamos por CI de menor a mayor.</p>
        <div className="tabla-contenedor"><Tabla columnas={GOLEADORES} filas={reportes.goleadores} clave="ci_jugador" vacio="No hay goles registrados en partidos jugados." /></div>
        <h2>Fair play por equipo</h2>
        <p>Amarilla: 1 punto. Roja: 3 puntos. El menor puntaje es el mejor.</p>
        <div className="tabla-contenedor"><Tabla columnas={FAIR_PLAY} filas={reportes.fairPlay} clave="id_equipo" /></div>
        <h2>Promedio de goles por partido</h2>
        <div className="tabla-contenedor"><Tabla columnas={PROMEDIOS} filas={reportes.promedios} clave="numero_fecha" /></div>
        <p>Los cuatro reportes cuentan solo partidos jugados.</p>
      </>}
    </section>
  )
}
