import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import ConfirmarBorrado from '../components/ConfirmarBorrado.jsx'
import Formulario, { Campo } from '../components/Formulario.jsx'
import Tabla from '../components/Tabla.jsx'
import { ESTADOS_TORNEO, validarTorneo } from '../validaciones.js'

const COLUMNAS = [
  { campo: 'nombre', titulo: 'Nombre' }, { campo: 'anio', titulo: 'Año' },
  { campo: 'semestre', titulo: 'Semestre' }, { campo: 'fecha_inicio', titulo: 'Inicio' },
  { campo: 'fecha_fin', titulo: 'Fin' }, { campo: 'estado', titulo: 'Estado' },
]

export default function TorneosPage() {
  const { pedir } = useAuth()
  const [torneos, setTorneos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
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
    setError('')
    Promise.all([pedir('/torneos'), pedir('/equipos')])
      .then(([lista, listaEquipos]) => {
        if (activo) {
          setTorneos(lista)
          setEquipos(listaEquipos)
        }
      })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [revision])

  function abrir(torneo = null) {
    setFormulario({ original: torneo, valores: torneo ? { ...torneo } : {
      nombre: '', anio: new Date().getFullYear(), semestre: '', fecha_inicio: '', fecha_fin: '', estado: 'inscripción',
    } })
    setErrores({})
    setErrorFormulario('')
  }

  function cambiar(nombre, valor) {
    setFormulario((actual) => ({ ...actual, valores: { ...actual.valores, [nombre]: valor } }))
  }

  async function guardar() {
    const encontrados = validarTorneo(formulario.valores, formulario.original, equipos, torneos)
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return
    setEnviando(true)
    try {
      const { nombre, anio, semestre, fecha_inicio, fecha_fin, estado } = formulario.valores
      const ruta = formulario.original ? `/torneos/${formulario.original.id_torneo}` : '/torneos'
      await pedir(ruta, { method: formulario.original ? 'PUT' : 'POST', body: {
        nombre: nombre.trim(), anio: Number(anio), semestre: Number(semestre), fecha_inicio, fecha_fin, estado,
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
      await pedir(`/torneos/${paraBorrar.id_torneo}`, { method: 'DELETE' })
      setParaBorrar(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  const estadoActual = ESTADOS_TORNEO.indexOf(formulario?.original?.estado ?? 'inscripción')
  return (
    <section>
      <div className="barra-titulo"><h1>Torneos</h1><button onClick={() => abrir()}>Nueva edición</button></div>
      {formulario && <div className="panel-formulario">
        <h2>{formulario.original ? 'Editar edición' : 'Nueva edición'}</h2>
        <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando} onCancelar={() => setFormulario(null)}>
          <Campo etiqueta="Nombre" nombre="nombre" valor={formulario.valores.nombre} onChange={cambiar} error={errores.nombre} maxLength={100} />
          <Campo etiqueta="Año" nombre="anio" tipo="number" valor={formulario.valores.anio} onChange={cambiar} error={errores.anio} min={2000} max={2100} />
          <div className="campo">
            <label htmlFor="semestre">Semestre</label>
            <select id="semestre" value={formulario.valores.semestre} onChange={(e) => cambiar('semestre', e.target.value)} aria-invalid={errores.semestre ? 'true' : undefined}>
              <option value="">Seleccionar</option><option value="1">Primero</option><option value="2">Segundo</option>
            </select>
            {errores.semestre && <p className="error-campo">{errores.semestre}</p>}
          </div>
          <Campo etiqueta="Inicio" nombre="fecha_inicio" tipo="date" valor={formulario.valores.fecha_inicio} onChange={cambiar} error={errores.fecha_inicio} />
          <Campo etiqueta="Fin" nombre="fecha_fin" tipo="date" valor={formulario.valores.fecha_fin} onChange={cambiar} error={errores.fecha_fin} />
          <div className="campo">
            <label htmlFor="estado">Estado</label>
            <select id="estado" value={formulario.valores.estado} onChange={(e) => cambiar('estado', e.target.value)} aria-invalid={errores.estado ? 'true' : undefined}>
              {ESTADOS_TORNEO.map((estado, i) => <option key={estado} value={estado} disabled={i < estadoActual || i > estadoActual + (formulario.original ? 1 : 0)}>{estado}</option>)}
            </select>
            <p>Para iniciar, todos los equipos deben tener entre 5 y 10 jugadores y capitán. Los estados solo avanzan.</p>
            {errores.estado && <p className="error-campo">{errores.estado}</p>}
          </div>
        </Formulario>
      </div>}
      {cargando && <p>Cargando ediciones...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!cargando && !error && <div className="tabla-contenedor"><Tabla columnas={COLUMNAS} filas={torneos} clave="id_torneo" vacio="Todavía no hay ediciones." acciones={(torneo) => <>
        <button className="secundario" onClick={() => abrir(torneo)}>Editar</button>
        <button className="peligro" onClick={() => { setParaBorrar(torneo); setErrorBorrado('') }}>Borrar</button>
      </>} /></div>}
      <ConfirmarBorrado abierto={Boolean(paraBorrar)} mensaje={paraBorrar ? `¿Borrar ${paraBorrar.nombre}?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={borrar} onCancelar={() => setParaBorrar(null)} />
    </section>
  )
}
