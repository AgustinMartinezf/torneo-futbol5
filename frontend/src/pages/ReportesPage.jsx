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
const CANCHAS = [
  { campo: 'complejo', titulo: 'Complejo' }, { campo: 'nombre_cancha', titulo: 'Cancha' },
  { campo: 'partidos', titulo: 'Partidos' },
]
const TURNOS = [
  { campo: 'hora_inicio', titulo: 'Turno', mostrar: (t) => `${t.hora_inicio} a ${t.hora_fin}` },
  { campo: 'partidos', titulo: 'Partidos' },
]
const JUGADORES_FACULTAD = [
  { campo: 'facultad', titulo: 'Facultad' }, { campo: 'tipo', titulo: 'Tipo' },
  { campo: 'jugadores', titulo: 'Jugadores' },
]
const SIN_PLANILLA = [
  { campo: 'equipo', titulo: 'Equipo' }, { campo: 'numero_camiseta', titulo: 'Camiseta' },
  { campo: 'ci_jugador', titulo: 'CI' },
  { campo: 'nombre', titulo: 'Jugador', mostrar: (j) => `${j.nombre} ${j.apellido}` },
]
const SANCIONES = [
  { campo: 'equipo', titulo: 'Equipo' }, { campo: 'roja', titulo: 'Roja' },
  { campo: 'acumulacion', titulo: 'Acumulación de amarillas' },
  { campo: 'disciplinaria', titulo: 'Disciplinaria' }, { campo: 'total', titulo: 'Total' },
]
const ESTADOS = [
  { campo: 'estado', titulo: 'Estado' }, { campo: 'partidos', titulo: 'Partidos' },
  { campo: 'porcentaje', titulo: 'Porcentaje', mostrar: (e) => e.porcentaje === null
    ? '-' : `${e.porcentaje.toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` },
]
const VALLA = [
  { campo: 'equipo', titulo: 'Equipo' }, { campo: 'pj', titulo: 'PJ' }, { campo: 'gc', titulo: 'GC' },
  { campo: 'promedio', titulo: 'GC por partido', mostrar: (e) => e.promedio === null
    ? '-' : e.promedio.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
]
const GOLES_TIPO = [
  { campo: 'tipo', titulo: 'Tipo' }, { campo: 'goles', titulo: 'Goles' },
  { campo: 'goleadores', titulo: 'Jugadores que convirtieron' },
]
const LOCAL_VISITANTE = [
  { campo: 'partidos', titulo: 'Partidos jugados' }, { campo: 'gana_local', titulo: 'Gana el local' },
  { campo: 'empates', titulo: 'Empates' }, { campo: 'gana_visitante', titulo: 'Gana el visitante' },
  { campo: 'goles_local', titulo: 'Goles del local' }, { campo: 'goles_visitante', titulo: 'Goles del visitante' },
]
const REPORTES = ['posiciones', 'goleadores', 'fair-play', 'promedios', 'canchas', 'turnos', 'sin-planilla',
  'sanciones', 'estados', 'valla-menos-vencida', 'goles-por-tipo', 'local-visitante']

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
    Promise.all([...REPORTES.map((reporte) => pedir(`/reportes/${reporte}?id_torneo=${edicion}`)),
      pedir('/reportes/jugadores-por-facultad')])
      .then(([posiciones, goleadores, fairPlay, promedios, canchas, turnos, sinPlanilla, sanciones, estados,
        valla, golesTipo, localVisitante, jugadoresFacultad]) => {
        if (activo) setReportes({
          posiciones, goleadores, fairPlay, promedios, turnos, sinPlanilla, sanciones, estados, valla, golesTipo,
          canchas: canchas.map((c) => ({ ...c, clave: `${c.id_complejo}-${c.nombre_cancha}` })),
          jugadoresFacultad: jugadoresFacultad.map((f) => ({ ...f, clave: `${f.id_facultad}-${f.tipo}` })),
          localVisitante: [localVisitante],
        })
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
        <h2>Canchas más utilizadas</h2>
        <p>Contamos los partidos jugados y programados. Los postergados y cancelados liberan la cancha.</p>
        <div className="tabla-contenedor"><Tabla columnas={CANCHAS} filas={reportes.canchas} clave="clave" /></div>
        <h2>Turnos más utilizados</h2>
        <div className="tabla-contenedor"><Tabla columnas={TURNOS} filas={reportes.turnos} clave="id_turno" /></div>
        <h2>Jugadores por facultad y tipo</h2>
        <p>Todos los jugadores registrados, de cualquier edición.</p>
        <div className="tabla-contenedor"><Tabla columnas={JUGADORES_FACULTAD} filas={reportes.jugadoresFacultad} clave="clave" /></div>
        <h2>Jugadores que nunca figuraron en una planilla</h2>
        <div className="tabla-contenedor"><Tabla columnas={SIN_PLANILLA} filas={reportes.sinPlanilla} clave="ci_jugador" vacio="Todos los jugadores de los planteles figuraron en alguna planilla." /></div>
        <h2>Sanciones por equipo y motivo</h2>
        <div className="tabla-contenedor"><Tabla columnas={SANCIONES} filas={reportes.sanciones} clave="id_equipo" /></div>
        <h2>Partidos por estado</h2>
        <p>El porcentaje es sobre todos los partidos de la edición, incluidos los programados.</p>
        <div className="tabla-contenedor"><Tabla columnas={ESTADOS} filas={reportes.estados} clave="estado" /></div>
        <h2>Valla menos vencida</h2>
        <p>Goles en contra en partidos jugados. Los equipos que no jugaron van al final.</p>
        <div className="tabla-contenedor"><Tabla columnas={VALLA} filas={reportes.valla} clave="id_equipo" /></div>
        <h2>Goles por tipo de jugador</h2>
        <p>Sin autogoles, solo partidos jugados.</p>
        <div className="tabla-contenedor"><Tabla columnas={GOLES_TIPO} filas={reportes.golesTipo} clave="tipo" /></div>
        <h2>Rendimiento de local y visitante</h2>
        <div className="tabla-contenedor"><Tabla columnas={LOCAL_VISITANTE} filas={reportes.localVisitante} clave="partidos" /></div>
      </>}
    </section>
  )
}
