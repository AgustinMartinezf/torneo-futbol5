import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import ConfirmarBorrado from '../components/ConfirmarBorrado.jsx'
import Formulario, { Campo } from '../components/Formulario.jsx'
import Tabla from '../components/Tabla.jsx'
import { validarCamiseta, validarEquipo } from '../validaciones.js'

const COLUMNAS = [
  { campo: 'nombre', titulo: 'Nombre' }, { campo: 'facultad', titulo: 'Facultad' },
  { campo: 'torneo', titulo: 'Edición' }, { campo: 'estado', titulo: 'Estado' },
  { campo: 'cantidad_jugadores', titulo: 'Jugadores' },
  { campo: 'ci_capitan', titulo: 'Capitán', mostrar: (e) => e.ci_capitan || 'Sin elegir' },
]
const COLUMNAS_PLANTEL = [
  { campo: 'numero_camiseta', titulo: 'Camiseta' }, { campo: 'ci_jugador', titulo: 'Cédula' },
  { campo: 'nombre', titulo: 'Nombre' }, { campo: 'apellido', titulo: 'Apellido' }, { campo: 'tipo', titulo: 'Tipo' },
]

export default function EquiposPage() {
  const { pedir } = useAuth()
  const [equipos, setEquipos] = useState([])
  const [torneos, setTorneos] = useState([])
  const [facultades, setFacultades] = useState([])
  const [edicion, setEdicion] = useState('')
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [errores, setErrores] = useState({})
  const [errorFormulario, setErrorFormulario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [elegido, setElegido] = useState(null)
  const [paraBorrar, setParaBorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError('')
    Promise.all([pedir('/equipos'), pedir('/torneos'), pedir('/facultades')])
      .then(([lista, ediciones, listaFacultades]) => {
        if (activo) {
          setEquipos(lista)
          setTorneos(ediciones)
          setFacultades(listaFacultades)
        }
      })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [revision])

  function abrir(equipo = null) {
    setFormulario({ original: equipo, valores: equipo ? { ...equipo } : {
      nombre: '', id_torneo: edicion, id_facultad: '', ci_capitan: null,
    } })
    setErrores({})
    setErrorFormulario('')
  }

  function cambiar(nombre, valor) {
    setFormulario((actual) => ({ ...actual, valores: { ...actual.valores, [nombre]: valor } }))
  }

  async function guardar() {
    const encontrados = validarEquipo(formulario.valores, torneos, facultades, equipos, formulario.original?.id_equipo)
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return
    setEnviando(true)
    try {
      const { nombre, id_torneo, id_facultad, ci_capitan } = formulario.valores
      const ruta = formulario.original ? `/equipos/${formulario.original.id_equipo}` : '/equipos'
      await pedir(ruta, { method: formulario.original ? 'PUT' : 'POST', body: {
        nombre: nombre.trim(), id_torneo: Number(id_torneo), id_facultad: Number(id_facultad), ci_capitan,
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
      await pedir(`/equipos/${paraBorrar.id_equipo}`, { method: 'DELETE' })
      if (elegido === paraBorrar.id_equipo) setElegido(null)
      setParaBorrar(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  const bloqueado = Boolean(formulario?.original && (formulario.original.cantidad_jugadores > 0 || formulario.original.estado !== 'inscripción'))
  const visibles = equipos.filter((e) => !edicion || e.id_torneo === Number(edicion))
  return (
    <section>
      <div className="barra-titulo"><h1>Equipos y planteles</h1>
        <button disabled={cargando || Boolean(error)} onClick={() => abrir()}>Nuevo equipo</button>
        <Link to="/torneos">Administrar torneos</Link>
      </div>
      <div className="filtros"><label htmlFor="filtro-edicion">Edición
        <select id="filtro-edicion" value={edicion} onChange={(e) => { setEdicion(e.target.value); setElegido(null) }}>
          <option value="">Todas</option>
          {torneos.map((t) => <option key={t.id_torneo} value={t.id_torneo}>{t.nombre}</option>)}
        </select>
      </label></div>
      {formulario && <div className="panel-formulario">
        <h2>{formulario.original ? 'Editar equipo' : 'Nuevo equipo'}</h2>
        <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando} onCancelar={() => setFormulario(null)}>
          <Campo etiqueta="Nombre" nombre="nombre" valor={formulario.valores.nombre} onChange={cambiar} error={errores.nombre} maxLength={60} />
          <div className="campo"><label htmlFor="id_torneo">Edición</label>
            <select id="id_torneo" value={formulario.valores.id_torneo} disabled={bloqueado} onChange={(e) => cambiar('id_torneo', e.target.value)} aria-invalid={errores.id_torneo ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {torneos.map((t) => <option key={t.id_torneo} value={t.id_torneo} disabled={t.estado !== 'inscripción'}>{t.nombre} ({t.estado})</option>)}
            </select>
            {errores.id_torneo && <p className="error-campo">{errores.id_torneo}</p>}
          </div>
          <div className="campo"><label htmlFor="id_facultad">Facultad</label>
            <select id="id_facultad" value={formulario.valores.id_facultad} disabled={bloqueado} onChange={(e) => cambiar('id_facultad', e.target.value)} aria-invalid={errores.id_facultad ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {facultades.map((f) => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
            </select>
            {errores.id_facultad && <p className="error-campo">{errores.id_facultad}</p>}
          </div>
          {bloqueado && <p>La edición y la facultad se cambian con el plantel vacío y durante la inscripción.</p>}
          <p>El capitán se elige desde el plantel, después de inscribir jugadores.</p>
        </Formulario>
      </div>}
      {cargando && <p>Cargando equipos...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!cargando && !error && <div className="tabla-contenedor"><Tabla columnas={COLUMNAS} filas={visibles} clave="id_equipo" vacio="No hay equipos en esta edición." acciones={(equipo) => <>
        <button onClick={() => setElegido(equipo.id_equipo)}>Plantel</button>
        <button className="secundario" onClick={() => abrir(equipo)}>Editar</button>
        <button className="peligro" disabled={equipo.estado !== 'inscripción'} onClick={() => { setParaBorrar(equipo); setErrorBorrado('') }}>Borrar</button>
      </>} /></div>}
      {elegido && <Plantel key={elegido} idEquipo={elegido} revisionEquipos={revision}
        onCambio={() => setRevision((n) => n + 1)} onCerrar={() => setElegido(null)} />}
      <ConfirmarBorrado abierto={Boolean(paraBorrar)} mensaje={paraBorrar ? `¿Borrar ${paraBorrar.nombre}? Si tiene plantel o partidos, la baja se rechaza.` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={borrar} onCancelar={() => setParaBorrar(null)} />
    </section>
  )
}

function Plantel({ idEquipo, revisionEquipos, onCambio, onCerrar }) {
  const { pedir } = useAuth()
  const [equipo, setEquipo] = useState(null)
  const [plantel, setPlantel] = useState([])
  const [disponibles, setDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [errores, setErrores] = useState({})
  const [errorFormulario, setErrorFormulario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [capitan, setCapitan] = useState('')
  const [errorCapitan, setErrorCapitan] = useState('')
  const [paraBorrar, setParaBorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')
  const [borrando, setBorrando] = useState(false)
  const base = `/equipos/${idEquipo}`

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError('')
    Promise.all([pedir(base), pedir(`${base}/jugadores`)])
      .then(async ([datos, lista]) => {
        const libres = await pedir(`/jugadores?id_facultad=${datos.id_facultad}&id_torneo=${datos.id_torneo}`)
        if (activo) {
          setEquipo(datos)
          setPlantel(lista)
          setDisponibles(libres)
          setCapitan(datos.ci_capitan || '')
        }
      })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [idEquipo, revisionEquipos])

  function abrir(jugador = null) {
    setFormulario({ original: jugador, ci_jugador: jugador?.ci_jugador || '', numero_camiseta: jugador?.numero_camiseta || '' })
    setErrores({})
    setErrorFormulario('')
  }

  async function guardar() {
    const encontrados = {}
    if (equipo.estado !== 'inscripción') encontrados.ci_jugador = 'El plantel solo se modifica en inscripción.'
    if (!formulario.original) {
      const jugador = disponibles.find((j) => j.ci === formulario.ci_jugador)
      if (!jugador) encontrados.ci_jugador = 'Seleccioná un jugador disponible de la facultad del equipo.'
      else if (['docente', 'funcionario'].includes(jugador.tipo) && equipo.cantidad_docentes_funcionarios >= 2) encontrados.ci_jugador = 'El plantel ya tiene 2 docentes o funcionarios.'
      if (plantel.length >= 10) encontrados.ci_jugador = 'El plantel ya tiene 10 jugadores.'
    }
    const errorNumero = validarCamiseta(formulario.numero_camiseta, plantel, formulario.original?.ci_jugador)
    if (errorNumero) encontrados.numero_camiseta = errorNumero
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return
    setEnviando(true)
    try {
      const ruta = formulario.original ? `${base}/jugadores/${formulario.ci_jugador}` : `${base}/jugadores`
      const body = { numero_camiseta: Number(formulario.numero_camiseta) }
      if (!formulario.original) body.ci_jugador = formulario.ci_jugador
      await pedir(ruta, { method: formulario.original ? 'PUT' : 'POST', body })
      setFormulario(null)
      onCambio()
    } catch (e) {
      setErrorFormulario(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function guardarCapitan() {
    setErrorCapitan('')
    if (capitan && !plantel.some((j) => j.ci_jugador === capitan)) {
      setErrorCapitan('El capitán debe ser del plantel.')
      return
    }
    if (equipo.estado !== 'inscripción') {
      setErrorCapitan('El capitán solo se cambia en inscripción.')
      return
    }
    setEnviando(true)
    try {
      await pedir(base, { method: 'PUT', body: { nombre: equipo.nombre, id_torneo: equipo.id_torneo, id_facultad: equipo.id_facultad, ci_capitan: capitan || null } })
      onCambio()
    } catch (e) {
      setErrorCapitan(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function quitar() {
    setBorrando(true)
    setErrorBorrado('')
    try {
      await pedir(`${base}/jugadores/${paraBorrar.ci_jugador}`, { method: 'DELETE' })
      setParaBorrar(null)
      onCambio()
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  if (cargando) return <p>Cargando plantel...</p>
  if (error) return <div className="panel-formulario"><p className="error" role="alert">{error}</p><button onClick={onCerrar}>Cerrar plantel</button></div>
  const modificable = equipo.estado === 'inscripción'
  return (
    <div className="panel-formulario">
      <div className="barra-titulo"><h2>Plantel de {equipo.nombre}</h2><button className="secundario" onClick={onCerrar}>Cerrar plantel</button></div>
      <p>{equipo.facultad}. {plantel.length} de 10 jugadores; {equipo.cantidad_docentes_funcionarios} de 2 docentes o funcionarios.</p>
      <p>{modificable ? 'Para iniciar la edición se necesitan al menos 5 jugadores y un capitán.' : 'La inscripción está cerrada. El plantel se muestra solo para consulta.'}</p>
      {modificable ? <Formulario onSubmit={guardarCapitan} error={errorCapitan} enviando={enviando} textoBoton="Guardar capitán">
        <div className="campo"><label htmlFor="capitan">Capitán</label>
          <select id="capitan" value={capitan} onChange={(e) => setCapitan(e.target.value)} disabled={!modificable}>
            <option value="">Sin capitán</option>
            {plantel.map((j) => <option key={j.ci_jugador} value={j.ci_jugador}>{j.nombre} {j.apellido} ({j.ci_jugador})</option>)}
          </select>
        </div>
      </Formulario> : <p>Capitán: {equipo.ci_capitan || 'Sin elegir'}</p>}
      {modificable && <p>Para sacar al capitán, primero guardá otro capitán o dejá el equipo sin capitán durante la inscripción.</p>}
      <button disabled={!modificable || plantel.length >= 10 || enviando} onClick={() => abrir()}>Inscribir jugador</button>
      {formulario && modificable && <div>
        <h3>{formulario.original ? 'Cambiar camiseta' : 'Inscribir jugador'}</h3>
        <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando} onCancelar={() => setFormulario(null)}>
          {!formulario.original && <div className="campo"><label htmlFor="ci_jugador">Jugador</label>
            <select id="ci_jugador" value={formulario.ci_jugador} onChange={(e) => setFormulario({ ...formulario, ci_jugador: e.target.value })} aria-invalid={errores.ci_jugador ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {disponibles.map((j) => <option key={j.ci} value={j.ci} disabled={['docente', 'funcionario'].includes(j.tipo) && equipo.cantidad_docentes_funcionarios >= 2}>{j.nombre} {j.apellido} ({j.ci}, {j.tipo})</option>)}
            </select>
            {disponibles.length === 0 && <p>No quedan jugadores disponibles de esta facultad en la edición.</p>}
            {errores.ci_jugador && <p className="error-campo">{errores.ci_jugador}</p>}
          </div>}
          <Campo etiqueta="Número de camiseta" nombre="numero_camiseta" tipo="number" min={1} max={99}
            valor={formulario.numero_camiseta} error={errores.numero_camiseta} onChange={(nombre, valor) => setFormulario({ ...formulario, [nombre]: valor })} />
        </Formulario>
      </div>}
      <div className="tabla-contenedor"><Tabla columnas={COLUMNAS_PLANTEL} filas={plantel} clave="ci_jugador" vacio="El equipo todavía no tiene jugadores." acciones={(j) => <>
        <button className="secundario" disabled={!modificable || enviando} onClick={() => abrir(j)}>Camiseta</button>
        <button className="peligro" disabled={!modificable || j.ci_jugador === equipo.ci_capitan || enviando} title={j.ci_jugador === equipo.ci_capitan ? 'Primero cambiá el capitán.' : undefined}
          onClick={() => { setParaBorrar(j); setErrorBorrado('') }}>Sacar</button>
      </>} /></div>
      <ConfirmarBorrado abierto={Boolean(paraBorrar)} mensaje={paraBorrar ? `¿Sacar a ${paraBorrar.nombre} ${paraBorrar.apellido} del plantel?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={quitar} onCancelar={() => setParaBorrar(null)} />
    </div>
  )
}
