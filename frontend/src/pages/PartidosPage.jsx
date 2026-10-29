import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import ConfirmarBorrado from '../components/ConfirmarBorrado.jsx'
import Formulario, { Campo } from '../components/Formulario.jsx'
import Tabla from '../components/Tabla.jsx'
import { TRANSICIONES_PARTIDO, validarPartido } from '../validaciones.js'

const COLUMNAS = [
  { campo: 'numero_fecha', titulo: 'Fecha' }, { campo: 'dia', titulo: 'Día' },
  { campo: 'hora_inicio', titulo: 'Hora' }, { campo: 'equipo_local', titulo: 'Local' },
  { campo: 'equipo_visitante', titulo: 'Visitante' },
  { campo: 'nombre_cancha', titulo: 'Cancha', mostrar: (p) => `${p.nombre_cancha} (${p.complejo})` },
  { campo: 'estado', titulo: 'Estado' },
]

export default function PartidosPage() {
  const { pedir } = useAuth()
  const [partidos, setPartidos] = useState([])
  const [torneos, setTorneos] = useState([])
  const [turnos, setTurnos] = useState([])
  const [complejos, setComplejos] = useState([])
  const [edicion, setEdicion] = useState('')
  const [numeroFecha, setNumeroFecha] = useState('')
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [equipos, setEquipos] = useState([])
  const [canchas, setCanchas] = useState([])
  const [errores, setErrores] = useState({})
  const [errorFormulario, setErrorFormulario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [paraBorrar, setParaBorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError('')
    Promise.all([pedir('/partidos'), pedir('/torneos'), pedir('/turnos'), pedir('/complejos')])
      .then(([lista, ediciones, listaTurnos, listaComplejos]) => {
        if (activo) {
          setPartidos(lista)
          setTorneos(ediciones)
          setTurnos(listaTurnos)
          setComplejos(listaComplejos)
        }
      })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [revision])

  const idTorneoFormulario = formulario?.valores.id_torneo
  const idComplejoFormulario = formulario?.valores.id_complejo

  useEffect(() => {
    let activo = true
    setEquipos([])
    if (!idTorneoFormulario) return
    pedir(`/equipos?id_torneo=${idTorneoFormulario}`)
      .then((lista) => { if (activo) setEquipos(lista) })
      .catch((e) => { if (activo) setErrorFormulario(e.message) })
    return () => { activo = false }
  }, [idTorneoFormulario])

  useEffect(() => {
    let activo = true
    setCanchas([])
    if (!idComplejoFormulario) return
    pedir(`/complejos/${idComplejoFormulario}/canchas`)
      .then((lista) => { if (activo) setCanchas(lista) })
      .catch((e) => { if (activo) setErrorFormulario(e.message) })
    return () => { activo = false }
  }, [idComplejoFormulario])

  function abrir(partido = null) {
    setFormulario({ original: partido, valores: partido ? { ...partido } : {
      id_torneo: torneos.some((t) => t.id_torneo === Number(edicion) && t.estado === 'en curso') ? edicion : '',
      numero_fecha: numeroFecha, id_equipo_local: '', id_equipo_visitante: '', dia: '',
      id_turno: '', id_complejo: '', nombre_cancha: '', estado: 'programado',
    } })
    setErrores({})
    setErrorFormulario('')
  }

  function cambiar(nombre, valor) {
    setFormulario((actual) => {
      const valores = { ...actual.valores, [nombre]: valor }
      if (nombre === 'id_torneo') {
        valores.id_equipo_local = ''
        valores.id_equipo_visitante = ''
      }
      if (nombre === 'id_complejo') valores.nombre_cancha = ''
      return { ...actual, valores }
    })
  }

  async function guardar() {
    const encontrados = validarPartido(formulario.valores, formulario.original, torneos, equipos, turnos, partidos)
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return
    setEnviando(true)
    try {
      const v = formulario.valores
      const ruta = formulario.original ? `/partidos/${formulario.original.id_partido}` : '/partidos'
      await pedir(ruta, { method: formulario.original ? 'PUT' : 'POST', body: {
        id_torneo: Number(v.id_torneo), numero_fecha: Number(v.numero_fecha),
        id_equipo_local: Number(v.id_equipo_local), id_equipo_visitante: Number(v.id_equipo_visitante),
        dia: v.dia, id_turno: Number(v.id_turno), nombre_cancha: v.nombre_cancha,
        id_complejo: Number(v.id_complejo), estado: v.estado,
      } })
      setFormulario(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorFormulario(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function borrar() {
    setBorrando(true)
    setErrorBorrado('')
    try {
      await pedir(`/partidos/${paraBorrar.id_partido}`, { method: 'DELETE' })
      setParaBorrar(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  const visibles = partidos.filter((p) => (!edicion || p.id_torneo === Number(edicion))
    && (!numeroFecha || p.numero_fecha === Number(numeroFecha)))
  const torneoFormulario = torneos.find((t) => t.id_torneo === Number(idTorneoFormulario))
  const estadoAnterior = formulario?.original?.estado ?? 'programado'
  const estados = formulario?.original ? [estadoAnterior, ...TRANSICIONES_PARTIDO[estadoAnterior]] : ['programado']
  return (
    <section>
      <div className="barra-titulo"><h1>Partidos</h1>
        <button disabled={cargando || Boolean(error)} onClick={() => abrir()}>Nuevo partido</button>
      </div>
      <div className="filtros">
        <label htmlFor="filtro-edicion">Edición
          <select id="filtro-edicion" value={edicion} onChange={(e) => setEdicion(e.target.value)}>
            <option value="">Todas</option>
            {torneos.map((t) => <option key={t.id_torneo} value={t.id_torneo}>{t.nombre}</option>)}
          </select>
        </label>
        <label htmlFor="filtro-fecha">Número de fecha
          <input id="filtro-fecha" type="number" min={1} value={numeroFecha} onChange={(e) => setNumeroFecha(e.target.value)} />
        </label>
      </div>
      {formulario && <div className="panel-formulario">
        <h2>{formulario.original ? 'Editar partido' : 'Nuevo partido'}</h2>
        <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando} onCancelar={() => setFormulario(null)}>
          <div className="campo"><label htmlFor="id_torneo">Edición</label>
            <select id="id_torneo" value={formulario.valores.id_torneo} disabled={Boolean(formulario.original)} onChange={(e) => cambiar('id_torneo', e.target.value)} aria-invalid={errores.id_torneo ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {torneos.map((t) => <option key={t.id_torneo} value={t.id_torneo} disabled={t.estado !== 'en curso'}>{t.nombre} ({t.estado})</option>)}
            </select>
            {errores.id_torneo && <p className="error-campo">{errores.id_torneo}</p>}
          </div>
          <Campo etiqueta="Número de fecha" nombre="numero_fecha" tipo="number" min={1} max={255}
            valor={formulario.valores.numero_fecha} onChange={cambiar} error={errores.numero_fecha} />
          <div className="campo"><label htmlFor="id_equipo_local">Local</label>
            <select id="id_equipo_local" value={formulario.valores.id_equipo_local} disabled={formulario.original?.tiene_planilla} onChange={(e) => cambiar('id_equipo_local', e.target.value)} aria-invalid={errores.id_equipo_local ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {equipos.map((e) => <option key={e.id_equipo} value={e.id_equipo}>{e.nombre} ({e.cantidad_jugadores} jugadores)</option>)}
            </select>
            {errores.id_equipo_local && <p className="error-campo">{errores.id_equipo_local}</p>}
          </div>
          <div className="campo"><label htmlFor="id_equipo_visitante">Visitante</label>
            <select id="id_equipo_visitante" value={formulario.valores.id_equipo_visitante} disabled={formulario.original?.tiene_planilla} onChange={(e) => cambiar('id_equipo_visitante', e.target.value)} aria-invalid={errores.id_equipo_visitante ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {equipos.map((e) => <option key={e.id_equipo} value={e.id_equipo}>{e.nombre} ({e.cantidad_jugadores} jugadores)</option>)}
            </select>
            {errores.id_equipo_visitante && <p className="error-campo">{errores.id_equipo_visitante}</p>}
          </div>
          <Campo etiqueta="Día" nombre="dia" tipo="date" valor={formulario.valores.dia} onChange={cambiar} error={errores.dia}
            min={torneoFormulario?.fecha_inicio} max={torneoFormulario?.fecha_fin} />
          <div className="campo"><label htmlFor="id_turno">Turno</label>
            <select id="id_turno" value={formulario.valores.id_turno} onChange={(e) => cambiar('id_turno', e.target.value)} aria-invalid={errores.id_turno ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {turnos.map((t) => <option key={t.id_turno} value={t.id_turno}>{t.hora_inicio} a {t.hora_fin}</option>)}
            </select>
            {errores.id_turno && <p className="error-campo">{errores.id_turno}</p>}
          </div>
          <div className="campo"><label htmlFor="id_complejo">Complejo</label>
            <select id="id_complejo" value={formulario.valores.id_complejo} onChange={(e) => cambiar('id_complejo', e.target.value)} aria-invalid={errores.id_complejo ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {complejos.map((c) => <option key={c.id_complejo} value={c.id_complejo}>{c.nombre}</option>)}
            </select>
            {errores.id_complejo && <p className="error-campo">{errores.id_complejo}</p>}
          </div>
          <div className="campo"><label htmlFor="nombre_cancha">Cancha</label>
            <select id="nombre_cancha" value={formulario.valores.nombre_cancha} disabled={!idComplejoFormulario} onChange={(e) => cambiar('nombre_cancha', e.target.value)} aria-invalid={errores.nombre_cancha ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {canchas.map((c) => <option key={c.nombre_cancha} value={c.nombre_cancha}>{c.nombre_cancha} ({c.superficie})</option>)}
            </select>
            {errores.nombre_cancha && <p className="error-campo">{errores.nombre_cancha}</p>}
          </div>
          <div className="campo"><label htmlFor="estado">Estado</label>
            <select id="estado" value={formulario.valores.estado} disabled={!formulario.original} onChange={(e) => cambiar('estado', e.target.value)} aria-invalid={errores.estado ? 'true' : undefined}>
              {estados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
            </select>
            {errores.estado && <p className="error-campo">{errores.estado}</p>}
          </div>
          {!formulario.original && <p>El partido se crea como programado. Para postergarlo o cancelarlo, editalo después.</p>}
          {estadoAnterior === 'postergado' && <p>Para reprogramarlo, cambiá el día, el turno o la cancha y pasalo a programado.</p>}
          {formulario.original?.tiene_planilla && <p>El partido ya tiene planilla: no se pueden cambiar los equipos.</p>}
        </Formulario>
      </div>}
      {cargando && <p>Cargando partidos...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!cargando && !error && <div className="tabla-contenedor"><Tabla columnas={COLUMNAS} filas={visibles} clave="id_partido" vacio="No hay partidos con esos filtros." acciones={(partido) => <>
        <button className="secundario" disabled={['jugado', 'cancelado'].includes(partido.estado)} onClick={() => abrir(partido)}>Editar</button>
        <button className="peligro" disabled={partido.estado === 'jugado'} onClick={() => { setParaBorrar(partido); setErrorBorrado('') }}>Borrar</button>
      </>} /></div>}
      <ConfirmarBorrado abierto={Boolean(paraBorrar)} mensaje={paraBorrar ? `¿Borrar el partido ${paraBorrar.equipo_local} contra ${paraBorrar.equipo_visitante} de la fecha ${paraBorrar.numero_fecha}?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={borrar} onCancelar={() => setParaBorrar(null)} />
    </section>
  )
}
