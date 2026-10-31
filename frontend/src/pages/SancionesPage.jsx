import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import ConfirmarBorrado from '../components/ConfirmarBorrado.jsx'
import Formulario, { Campo } from '../components/Formulario.jsx'
import Tabla from '../components/Tabla.jsx'
import { MOTIVOS_SANCION, validarSancion } from '../validaciones.js'

const COLUMNAS = [
  { campo: 'torneo', titulo: 'Edición' },
  { campo: 'equipo', titulo: 'Equipo' },
  { campo: 'nombre', titulo: 'Jugador', mostrar: (s) => `${s.nombre} ${s.apellido} (${s.ci_jugador})` },
  { campo: 'motivo', titulo: 'Motivo' },
  { campo: 'numero_fecha_inicio', titulo: 'Fechas', mostrar: (s) => s.cantidad_fechas === 1
    ? `${s.numero_fecha_inicio}` : `${s.numero_fecha_inicio} a ${s.numero_fecha_fin}` },
  { campo: 'id_tarjeta', titulo: 'Origen', mostrar: (s) => s.id_tarjeta
    ? `Tarjeta del partido ${s.id_partido_tarjeta} (${s.dia_tarjeta})` : 'Organización' },
]

export default function SancionesPage() {
  const { pedir } = useAuth()
  const [sanciones, setSanciones] = useState([])
  const [torneos, setTorneos] = useState([])
  const [edicion, setEdicion] = useState('')
  const [equiposFiltro, setEquiposFiltro] = useState([])
  const [equipo, setEquipo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [equipos, setEquipos] = useState([])
  const [plantel, setPlantel] = useState([])
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
    const filtros = new URLSearchParams()
    if (edicion) filtros.set('id_torneo', edicion)
    if (equipo) filtros.set('id_equipo', equipo)
    if (motivo) filtros.set('motivo', motivo)
    Promise.all([pedir(`/sanciones?${filtros}`), pedir('/torneos')])
      .then(([lista, ediciones]) => {
        if (activo) {
          setSanciones(lista)
          setTorneos(ediciones)
        }
      })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [edicion, equipo, motivo, revision])

  useEffect(() => {
    let activo = true
    setEquiposFiltro([])
    setEquipo('')
    if (!edicion) return
    pedir(`/equipos?id_torneo=${edicion}`)
      .then((lista) => { if (activo) setEquiposFiltro(lista) })
      .catch((e) => { if (activo) setError(e.message) })
    return () => { activo = false }
  }, [edicion])

  const idTorneoFormulario = formulario?.valores.id_torneo
  const idEquipoFormulario = formulario?.valores.id_equipo

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
    setPlantel([])
    if (!idEquipoFormulario) return
    pedir(`/equipos/${idEquipoFormulario}/jugadores`)
      .then((lista) => { if (activo) setPlantel(lista) })
      .catch((e) => { if (activo) setErrorFormulario(e.message) })
    return () => { activo = false }
  }, [idEquipoFormulario])

  function abrir(sancion = null) {
    const enCurso = torneos.some((t) => t.id_torneo === Number(edicion) && t.estado === 'en curso')
    setFormulario({ original: sancion, valores: sancion ? {
      id_torneo: String(sancion.id_torneo), id_equipo: String(sancion.id_equipo), ci_jugador: sancion.ci_jugador,
      numero_fecha_inicio: sancion.numero_fecha_inicio, cantidad_fechas: sancion.cantidad_fechas,
    } : {
      id_torneo: enCurso ? edicion : '', id_equipo: enCurso ? equipo : '', ci_jugador: '',
      numero_fecha_inicio: '', cantidad_fechas: '',
    } })
    setErrores({})
    setErrorFormulario('')
  }

  function cambiar(nombre, valor) {
    setFormulario((actual) => {
      const valores = { ...actual.valores, [nombre]: valor }
      if (nombre === 'id_torneo') valores.id_equipo = ''
      if (nombre === 'id_torneo' || nombre === 'id_equipo') valores.ci_jugador = ''
      return { ...actual, valores }
    })
  }

  async function guardar() {
    const encontrados = validarSancion(formulario.valores, torneos, plantel)
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return
    setEnviando(true)
    try {
      const v = formulario.valores
      const ruta = formulario.original ? `/sanciones/${formulario.original.id_sancion}` : '/sanciones'
      await pedir(ruta, { method: formulario.original ? 'PUT' : 'POST', body: {
        ci_jugador: v.ci_jugador, id_torneo: Number(v.id_torneo),
        numero_fecha_inicio: Number(v.numero_fecha_inicio), cantidad_fechas: Number(v.cantidad_fechas),
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
      await pedir(`/sanciones/${paraBorrar.id_sancion}`, { method: 'DELETE' })
      setParaBorrar(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  function editable(sancion) {
    return sancion.motivo === 'disciplinaria'
      && torneos.some((t) => t.id_torneo === sancion.id_torneo && t.estado === 'en curso')
  }

  return (
    <section>
      <div className="barra-titulo"><h1>Sanciones</h1>
        <button disabled={cargando || Boolean(error)} onClick={() => abrir()}>Nueva sanción disciplinaria</button>
      </div>
      <div className="filtros">
        <label htmlFor="filtro-edicion">Edición
          <select id="filtro-edicion" value={edicion} onChange={(e) => setEdicion(e.target.value)}>
            <option value="">Todas</option>
            {torneos.map((t) => <option key={t.id_torneo} value={t.id_torneo}>{t.nombre}</option>)}
          </select>
        </label>
        <label htmlFor="filtro-equipo">Equipo
          <select id="filtro-equipo" value={equipo} disabled={!edicion} onChange={(e) => setEquipo(e.target.value)}>
            <option value="">Todos</option>
            {equiposFiltro.map((e) => <option key={e.id_equipo} value={e.id_equipo}>{e.nombre}</option>)}
          </select>
        </label>
        <label htmlFor="filtro-motivo">Motivo
          <select id="filtro-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="">Todos</option>
            {MOTIVOS_SANCION.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      <p>Las sanciones por roja y por acumulación de amarillas se generan solas al cargar la tarjeta en la planilla.
        Para revertirlas hay que borrar la tarjeta.</p>
      {formulario && <div className="panel-formulario">
        <h2>{formulario.original ? 'Editar sanción disciplinaria' : 'Nueva sanción disciplinaria'}</h2>
        <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando} onCancelar={() => setFormulario(null)}>
          <div className="campo"><label htmlFor="id_torneo">Edición</label>
            <select id="id_torneo" value={formulario.valores.id_torneo} onChange={(e) => cambiar('id_torneo', e.target.value)} aria-invalid={errores.id_torneo ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {torneos.map((t) => <option key={t.id_torneo} value={t.id_torneo} disabled={t.estado !== 'en curso'}>{t.nombre} ({t.estado})</option>)}
            </select>
            {errores.id_torneo && <p className="error-campo">{errores.id_torneo}</p>}
          </div>
          <div className="campo"><label htmlFor="id_equipo">Equipo</label>
            <select id="id_equipo" value={formulario.valores.id_equipo} disabled={!idTorneoFormulario} onChange={(e) => cambiar('id_equipo', e.target.value)} aria-invalid={errores.id_equipo ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {equipos.map((e) => <option key={e.id_equipo} value={e.id_equipo}>{e.nombre}</option>)}
            </select>
            {errores.id_equipo && <p className="error-campo">{errores.id_equipo}</p>}
          </div>
          <div className="campo"><label htmlFor="ci_jugador">Jugador</label>
            <select id="ci_jugador" value={formulario.valores.ci_jugador} disabled={!idEquipoFormulario} onChange={(e) => cambiar('ci_jugador', e.target.value)} aria-invalid={errores.ci_jugador ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {plantel.map((j) => <option key={j.ci_jugador} value={j.ci_jugador}>{j.nombre} {j.apellido} ({j.ci_jugador})</option>)}
            </select>
            {errores.ci_jugador && <p className="error-campo">{errores.ci_jugador}</p>}
          </div>
          <Campo etiqueta="Fecha de inicio" nombre="numero_fecha_inicio" tipo="number" min={1} max={255}
            valor={formulario.valores.numero_fecha_inicio} onChange={cambiar} error={errores.numero_fecha_inicio} />
          <Campo etiqueta="Cantidad de fechas" nombre="cantidad_fechas" tipo="number" min={1} max={255}
            valor={formulario.valores.cantidad_fechas} onChange={cambiar} error={errores.cantidad_fechas} />
          <p>Las planillas ya cargadas no cambian: la sanción se aplica a las que se carguen después.</p>
        </Formulario>
      </div>}
      {cargando && <p>Cargando sanciones...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!cargando && !error && <div className="tabla-contenedor"><Tabla columnas={COLUMNAS} filas={sanciones} clave="id_sancion" vacio="No hay sanciones con esos filtros." acciones={(sancion) => <>
        <button className="secundario" disabled={!editable(sancion)} onClick={() => abrir(sancion)}>Editar</button>
        <button className="peligro" disabled={sancion.motivo !== 'disciplinaria'} onClick={() => { setParaBorrar(sancion); setErrorBorrado('') }}>Borrar</button>
      </>} /></div>}
      <ConfirmarBorrado abierto={Boolean(paraBorrar)} mensaje={paraBorrar ? `¿Borrar la sanción disciplinaria de ${paraBorrar.nombre} ${paraBorrar.apellido}?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={borrar} onCancelar={() => setParaBorrar(null)} />
    </section>
  )
}
