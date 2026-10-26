import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import ConfirmarBorrado from '../components/ConfirmarBorrado.jsx'
import Formulario, { Campo } from '../components/Formulario.jsx'
import Tabla from '../components/Tabla.jsx'
import { validarJugador } from '../validaciones.js'

const VACIO = {
  ci: '', nombre: '', apellido: '', email: '', fecha_nacimiento: '', id_facultad: '', tipo: '',
}

const COLUMNAS = [
  { campo: 'ci', titulo: 'Cédula' },
  { campo: 'apellido', titulo: 'Apellido' },
  { campo: 'nombre', titulo: 'Nombre' },
  { campo: 'email', titulo: 'Correo' },
  { campo: 'fecha_nacimiento', titulo: 'Nacimiento' },
  { campo: 'facultad', titulo: 'Facultad' },
  { campo: 'tipo', titulo: 'Tipo' },
]

function rutaConFiltros(filtros) {
  const parametros = new URLSearchParams()
  if (filtros.id_facultad) parametros.set('id_facultad', filtros.id_facultad)
  if (filtros.tipo) parametros.set('tipo', filtros.tipo)
  if (filtros.busqueda) parametros.set('busqueda', filtros.busqueda)
  const consulta = parametros.toString()
  return `/jugadores${consulta ? `?${consulta}` : ''}`
}

export default function JugadoresPage() {
  const { pedir } = useAuth()
  const [jugadores, setJugadores] = useState([])
  const [facultades, setFacultades] = useState([])
  const [filtros, setFiltros] = useState({ id_facultad: '', tipo: '', busqueda: '' })
  const [aplicados, setAplicados] = useState(filtros)
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [errorListado, setErrorListado] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [errores, setErrores] = useState({})
  const [errorFormulario, setErrorFormulario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [paraBorrar, setParaBorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setErrorListado('')
    Promise.all([pedir(rutaConFiltros(aplicados)), pedir('/facultades')])
      .then(([lista, listaFacultades]) => {
        if (!activo) return
        setJugadores(lista)
        setFacultades(listaFacultades)
      })
      .catch((e) => { if (activo) setErrorListado(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [aplicados, revision])

  function nuevo() {
    setFormulario({ modo: 'nuevo', ciOriginal: null, valores: { ...VACIO } })
    setErrores({})
    setErrorFormulario('')
  }

  function editar(jugador) {
    const { ci, nombre, apellido, email, fecha_nacimiento, id_facultad, tipo } = jugador
    setFormulario({
      modo: 'editar', ciOriginal: ci, tienePlantel: jugador.tiene_plantel, cupoDocentesCompleto: jugador.cupo_docentes_completo,
      valores: { ci, nombre, apellido, email, fecha_nacimiento, id_facultad: String(id_facultad), tipo },
    })
    setErrores({})
    setErrorFormulario('')
  }

  function cambiar(nombre, valor) {
    setFormulario((actual) => ({
      ...actual, valores: { ...actual.valores, [nombre]: valor },
    }))
  }

  async function guardar() {
    const encontrados = validarJugador(formulario.valores, facultades)
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return

    const valores = formulario.valores
    const body = {
      ...valores,
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      email: valores.email.trim(),
      id_facultad: Number(valores.id_facultad),
    }
    setEnviando(true)
    try {
      const ruta = formulario.modo === 'nuevo' ? '/jugadores' : `/jugadores/${formulario.ciOriginal}`
      await pedir(ruta, { method: formulario.modo === 'nuevo' ? 'POST' : 'PUT', body })
      setFormulario(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorFormulario(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function confirmarBorrado() {
    setBorrando(true)
    setErrorBorrado('')
    try {
      await pedir(`/jugadores/${paraBorrar.ci}`, { method: 'DELETE' })
      setParaBorrar(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  function aplicarFiltros(e) {
    e.preventDefault()
    setAplicados({ ...filtros, busqueda: filtros.busqueda.trim() })
  }

  function limpiarFiltros() {
    const vacios = { id_facultad: '', tipo: '', busqueda: '' }
    setFiltros(vacios)
    setAplicados(vacios)
  }

  return (
    <section>
      <div className="barra-titulo">
        <h1>Jugadores</h1>
        <button type="button" onClick={nuevo}>Nuevo jugador</button>
        <Link to="/facultades">Administrar facultades</Link>
      </div>

      <form className="filtros" onSubmit={aplicarFiltros}>
        <label>Facultad
          <select value={filtros.id_facultad} onChange={(e) => setFiltros({ ...filtros, id_facultad: e.target.value })}>
            <option value="">Todas</option>
            {facultades.map((f) => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
          </select>
        </label>
        <label>Tipo
          <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option value="">Todos</option>
            <option value="grado">Grado</option>
            <option value="posgrado">Posgrado</option>
            <option value="docente">Docente</option>
            <option value="funcionario">Funcionario</option>
          </select>
        </label>
        <label>Nombre o cédula
          <input value={filtros.busqueda} onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })} maxLength={100} />
        </label>
        <button type="submit">Buscar</button>
        <button type="button" className="secundario" onClick={limpiarFiltros}>Limpiar</button>
      </form>

      {formulario && (
        <div className="panel-formulario">
          <h2>{formulario.modo === 'nuevo' ? 'Nuevo jugador' : 'Editar jugador'}</h2>
          <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando}
            onCancelar={() => setFormulario(null)}>
            <Campo etiqueta="Cédula sin puntos ni guion" nombre="ci" valor={formulario.valores.ci}
              onChange={cambiar} error={errores.ci} maxLength={8} inputMode="numeric" />
            <Campo etiqueta="Nombre" nombre="nombre" valor={formulario.valores.nombre}
              onChange={cambiar} error={errores.nombre} maxLength={60} />
            <Campo etiqueta="Apellido" nombre="apellido" valor={formulario.valores.apellido}
              onChange={cambiar} error={errores.apellido} maxLength={60} />
            <Campo etiqueta="Correo" nombre="email" tipo="email" valor={formulario.valores.email}
              onChange={cambiar} error={errores.email} maxLength={100} />
            <Campo etiqueta="Fecha de nacimiento" nombre="fecha_nacimiento" tipo="date"
              valor={formulario.valores.fecha_nacimiento} onChange={cambiar} error={errores.fecha_nacimiento} />
            <div className="campo">
              <label htmlFor="id_facultad">Facultad</label>
              <select id="id_facultad" value={formulario.valores.id_facultad}
                disabled={formulario.tienePlantel}
                onChange={(e) => cambiar('id_facultad', e.target.value)} aria-invalid={errores.id_facultad ? 'true' : undefined}>
                <option value="">Seleccionar</option>
                {facultades.map((f) => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
              </select>
              {errores.id_facultad && <p className="error-campo">{errores.id_facultad}</p>}
              {formulario.tienePlantel && <p>La facultad no se cambia mientras el jugador tenga un plantel.</p>}
            </div>
            <div className="campo">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" value={formulario.valores.tipo}
                onChange={(e) => cambiar('tipo', e.target.value)} aria-invalid={errores.tipo ? 'true' : undefined}>
                <option value="">Seleccionar</option>
                <option value="grado">Grado</option>
                <option value="posgrado">Posgrado</option>
                <option value="docente" disabled={formulario.cupoDocentesCompleto}>Docente</option>
                <option value="funcionario" disabled={formulario.cupoDocentesCompleto}>Funcionario</option>
              </select>
              {errores.tipo && <p className="error-campo">{errores.tipo}</p>}
              {formulario.cupoDocentesCompleto && <p>Su plantel ya tiene 2 docentes o funcionarios.</p>}
            </div>
          </Formulario>
        </div>
      )}

      {cargando && <p>Cargando jugadores...</p>}
      {errorListado && <p className="error" role="alert">{errorListado}</p>}
      {!cargando && !errorListado && (
        <div className="tabla-contenedor">
          <Tabla columnas={COLUMNAS} filas={jugadores} clave="ci" acciones={(jugador) => (
            <>
              <button type="button" className="secundario" onClick={() => editar(jugador)}>Editar</button>
              <button type="button" className="peligro" onClick={() => {
                setParaBorrar(jugador)
                setErrorBorrado('')
              }}>Borrar</button>
            </>
          )} />
        </div>
      )}

      <ConfirmarBorrado abierto={Boolean(paraBorrar)}
        mensaje={paraBorrar ? `¿Borrar a ${paraBorrar.nombre} ${paraBorrar.apellido} (${paraBorrar.ci})?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={confirmarBorrado}
        onCancelar={() => setParaBorrar(null)} />
    </section>
  )
}
