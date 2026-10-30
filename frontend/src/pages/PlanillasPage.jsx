import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import Tabla from '../components/Tabla.jsx'

const COLUMNAS_PARTIDOS = [
  { campo: 'numero_fecha', titulo: 'Fecha' },
  { campo: 'dia', titulo: 'Día' },
  { campo: 'hora_inicio', titulo: 'Hora' },
  { campo: 'equipo_local', titulo: 'Local' },
  { campo: 'equipo_visitante', titulo: 'Visitante' },
  { campo: 'resultado', titulo: 'Resultado', mostrar: (p) => `${p.goles_local} - ${p.goles_visitante}` },
  { campo: 'estado', titulo: 'Estado' },
]

export default function PlanillasPage() {
  const { pedir } = useAuth()
  const [partidos, setPartidos] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [partido, setPartido] = useState(null)
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [operando, setOperando] = useState(false)
  const [error, setError] = useState('')
  const [errorGol, setErrorGol] = useState('')
  const [errorTarjeta, setErrorTarjeta] = useState('')
  const [gol, setGol] = useState({ ci_jugador: '', minuto: '', autogol: false })
  const [tarjeta, setTarjeta] = useState({ ci_jugador: '', minuto: '', color: 'amarilla' })

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError('')
    Promise.all([
      pedir('/planillas'),
      seleccionado ? pedir(`/planillas/${seleccionado}`) : Promise.resolve(null),
    ])
      .then(([lista, detalle]) => {
        if (activo) {
          setPartidos(lista)
          setPartido(detalle)
        }
      })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [seleccionado, revision])

  async function ejecutar(ruta, opciones) {
    setOperando(true)
    setError('')
    try {
      await pedir(ruta, opciones)
      setRevision((n) => n + 1)
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setOperando(false)
    }
  }

  function elegir(id) {
    if (id === seleccionado) setRevision((n) => n + 1)
    else setSeleccionado(id)
    setPartido(null)
    setGol({ ci_jugador: '', minuto: '', autogol: false })
    setTarjeta({ ci_jugador: '', minuto: '', color: 'amarilla' })
    setErrorGol('')
    setErrorTarjeta('')
  }

  async function cambiarPresencia(jugador) {
    const ruta = `/planillas/${partido.id_partido}/jugadores`
    if (jugador.presente) {
      await ejecutar(`${ruta}/${jugador.ci_jugador}`, { method: 'DELETE' })
    } else {
      await ejecutar(ruta, { method: 'POST', body: {
        ci_jugador: jugador.ci_jugador, id_equipo: jugador.id_equipo,
      } })
    }
  }

  async function agregarGol(evento) {
    evento.preventDefault()
    const minuto = Number(gol.minuto)
    if (!partido.planilla.some((j) => j.ci_jugador === gol.ci_jugador)) {
      setErrorGol('Seleccioná un jugador de la planilla.')
      return
    }
    if (!Number.isInteger(minuto) || minuto < 1 || minuto > 60) {
      setErrorGol('El minuto debe estar entre 1 y 60.')
      return
    }
    setErrorGol('')
    if (await ejecutar(`/planillas/${partido.id_partido}/goles`, { method: 'POST', body: {
      ci_jugador: gol.ci_jugador, minuto, autogol: gol.autogol,
    } })) setGol({ ci_jugador: '', minuto: '', autogol: false })
  }

  async function agregarTarjeta(evento) {
    evento.preventDefault()
    const minuto = Number(tarjeta.minuto)
    if (!partido.planilla.some((j) => j.ci_jugador === tarjeta.ci_jugador)) {
      setErrorTarjeta('Seleccioná un jugador de la planilla.')
      return
    }
    if (!Number.isInteger(minuto) || minuto < 1 || minuto > 60) {
      setErrorTarjeta('El minuto debe estar entre 1 y 60.')
      return
    }
    if (!['amarilla', 'roja'].includes(tarjeta.color)) {
      setErrorTarjeta('Seleccioná una tarjeta válida.')
      return
    }
    setErrorTarjeta('')
    if (await ejecutar(`/planillas/${partido.id_partido}/tarjetas`, { method: 'POST', body: {
      ci_jugador: tarjeta.ci_jugador, minuto, color: tarjeta.color,
    } })) setTarjeta({ ci_jugador: '', minuto: '', color: 'amarilla' })
  }

  async function marcarJugado() {
    if (!window.confirm('¿Marcar este partido como jugado?')) return
    await ejecutar(`/planillas/${partido.id_partido}/jugado`, { method: 'POST' })
  }

  function mostrarPlantel(jugadores) {
    return <div className="tabla-contenedor"><Tabla columnas={[
      { campo: 'numero_camiseta', titulo: 'Camiseta' },
      { campo: 'nombre', titulo: 'Jugador', mostrar: (j) => `${j.nombre} ${j.apellido}` },
      { campo: 'ci_jugador', titulo: 'Cédula' },
      { campo: 'presente', titulo: 'Planilla', mostrar: (j) => j.presente ? 'Presente' : j.suspendido ? 'Suspendido' : 'Ausente' },
    ]} filas={jugadores} clave="ci_jugador" acciones={(j) => <button
      className={j.presente ? 'peligro' : 'secundario'}
      disabled={operando || !partido.puede_editar || (!j.presente && j.suspendido)}
      onClick={() => cambiarPresencia(j)}>{j.presente ? 'Quitar' : 'Agregar'}</button>}
    /></div>
  }

  return <section>
    <h1>Planillas</h1>
    {cargando && <p>Cargando planillas...</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {!cargando && <div className="tabla-contenedor"><Tabla columnas={COLUMNAS_PARTIDOS} filas={partidos}
      clave="id_partido" vacio="No hay partidos programados o jugados de ediciones en curso."
      acciones={(p) => <button className="secundario" onClick={() => elegir(p.id_partido)}>
        {p.id_partido === seleccionado ? 'Actualizar' : 'Abrir planilla'}
      </button>} /></div>}

    {partido && <div className="panel-formulario">
      <h2>{partido.equipo_local} {partido.goles_local} - {partido.goles_visitante} {partido.equipo_visitante}</h2>
      <p>{partido.torneo}, fecha {partido.numero_fecha}. {partido.dia}, {partido.hora_inicio} a {partido.hora_fin}. Estado: {partido.estado}.</p>
      {!partido.puede_editar && <p>Pasaron las 48 horas desde el fin del turno. La planilla queda de consulta.</p>}
      {partido.estado === 'programado' && <button disabled={operando || !partido.turno_terminado}
        onClick={marcarJugado}>Marcar como jugado</button>}
      {partido.estado === 'programado' && !partido.turno_terminado && <p>Se puede marcar jugado cuando termine el turno.</p>}

      <h2>Plantel local</h2>
      {mostrarPlantel(partido.plantel_local)}
      <h2>Plantel visitante</h2>
      {mostrarPlantel(partido.plantel_visitante)}

      <h2>Goles</h2>
      <div className="tabla-contenedor"><Tabla columnas={[
        { campo: 'minuto', titulo: 'Minuto' },
        { campo: 'nombre', titulo: 'Jugador', mostrar: (g) => `${g.nombre} ${g.apellido}` },
        { campo: 'autogol', titulo: 'Tipo', mostrar: (g) => g.autogol ? 'Autogol' : 'Gol' },
      ]} filas={partido.goles} clave="id_gol" vacio="No hay goles registrados."
      acciones={(g) => <button className="peligro" disabled={operando || !partido.puede_editar}
        onClick={() => ejecutar(`/planillas/${partido.id_partido}/goles/${g.id_gol}`, { method: 'DELETE' })}>Quitar</button>} /></div>
      {Boolean(partido.puede_editar) && <form className="formulario" onSubmit={agregarGol}>
        <div className="campo"><label htmlFor="gol-jugador">Jugador</label><select id="gol-jugador" value={gol.ci_jugador}
          onChange={(e) => setGol({ ...gol, ci_jugador: e.target.value })}>
          <option value="">Seleccionar</option>
          {partido.planilla.map((j) => <option key={j.ci_jugador} value={j.ci_jugador}>{j.nombre} {j.apellido} ({j.ci_jugador})</option>)}
        </select></div>
        <div className="campo"><label htmlFor="gol-minuto">Minuto</label><input id="gol-minuto" type="number" min="1" max="60"
          value={gol.minuto} onChange={(e) => setGol({ ...gol, minuto: e.target.value })} /></div>
        <label><input type="checkbox" checked={gol.autogol} onChange={(e) => setGol({ ...gol, autogol: e.target.checked })} /> Autogol</label>
        {errorGol && <p className="error-campo">{errorGol}</p>}
        <button disabled={operando}>Agregar gol</button>
      </form>}

      <h2>Tarjetas</h2>
      <div className="tabla-contenedor"><Tabla columnas={[
        { campo: 'minuto', titulo: 'Minuto' },
        { campo: 'nombre', titulo: 'Jugador', mostrar: (t) => `${t.nombre} ${t.apellido}` },
        { campo: 'color', titulo: 'Color' },
      ]} filas={partido.tarjetas} clave="id_tarjeta" vacio="No hay tarjetas registradas."
      acciones={(t) => <button className="peligro" disabled={operando || !partido.puede_editar}
        onClick={() => ejecutar(`/planillas/${partido.id_partido}/tarjetas/${t.id_tarjeta}`, { method: 'DELETE' })}>Quitar</button>} /></div>
      {Boolean(partido.puede_editar) && <form className="formulario" onSubmit={agregarTarjeta}>
        <div className="campo"><label htmlFor="tarjeta-jugador">Jugador</label><select id="tarjeta-jugador" value={tarjeta.ci_jugador}
          onChange={(e) => setTarjeta({ ...tarjeta, ci_jugador: e.target.value })}>
          <option value="">Seleccionar</option>
          {partido.planilla.map((j) => <option key={j.ci_jugador} value={j.ci_jugador}>{j.nombre} {j.apellido} ({j.ci_jugador})</option>)}
        </select></div>
        <div className="campo"><label htmlFor="tarjeta-minuto">Minuto</label><input id="tarjeta-minuto" type="number" min="1" max="60"
          value={tarjeta.minuto} onChange={(e) => setTarjeta({ ...tarjeta, minuto: e.target.value })} /></div>
        <div className="campo"><label htmlFor="tarjeta-color">Color</label><select id="tarjeta-color" value={tarjeta.color}
          onChange={(e) => setTarjeta({ ...tarjeta, color: e.target.value })}>
          <option value="amarilla">Amarilla</option><option value="roja">Roja</option>
        </select></div>
        {errorTarjeta && <p className="error-campo">{errorTarjeta}</p>}
        <button disabled={operando}>Agregar tarjeta</button>
      </form>}
    </div>}
  </section>
}
