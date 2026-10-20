import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import ConfirmarBorrado from '../components/ConfirmarBorrado.jsx'
import Formulario, { Campo } from '../components/Formulario.jsx'
import Tabla from '../components/Tabla.jsx'

const COLUMNAS = [{ campo: 'id_facultad', titulo: 'ID' }, { campo: 'nombre', titulo: 'Nombre' }]

export default function FacultadesPage() {
  const { pedir } = useAuth()
  const [facultades, setFacultades] = useState([])
  const [revision, setRevision] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [errorListado, setErrorListado] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [errorNombre, setErrorNombre] = useState('')
  const [errorFormulario, setErrorFormulario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [paraBorrar, setParaBorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setErrorListado('')
    pedir('/facultades')
      .then((lista) => { if (activo) setFacultades(lista) })
      .catch((e) => { if (activo) setErrorListado(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [revision])

  function abrir(facultad = null) {
    setFormulario({ id_facultad: facultad?.id_facultad ?? null, nombre: facultad?.nombre ?? '' })
    setErrorNombre('')
    setErrorFormulario('')
  }

  async function guardar() {
    const nombre = formulario.nombre.trim()
    if (!nombre || nombre.length > 100) {
      setErrorNombre('Ingresá un nombre de hasta 100 caracteres.')
      return
    }
    setErrorNombre('')
    setErrorFormulario('')
    setEnviando(true)
    try {
      const ruta = formulario.id_facultad === null ? '/facultades' : `/facultades/${formulario.id_facultad}`
      await pedir(ruta, { method: formulario.id_facultad === null ? 'POST' : 'PUT', body: { nombre } })
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
      await pedir(`/facultades/${paraBorrar.id_facultad}`, { method: 'DELETE' })
      setParaBorrar(null)
      setRevision((n) => n + 1)
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  return (
    <section>
      <div className="barra-titulo">
        <h1>Facultades</h1>
        <button type="button" onClick={() => abrir()}>Nueva facultad</button>
        <Link to="/jugadores">Volver a jugadores</Link>
      </div>

      {formulario && (
        <div className="panel-formulario">
          <h2>{formulario.id_facultad === null ? 'Nueva facultad' : 'Editar facultad'}</h2>
          <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando}
            onCancelar={() => setFormulario(null)}>
            <Campo etiqueta="Nombre" nombre="nombre" valor={formulario.nombre}
              onChange={(_, valor) => setFormulario({ ...formulario, nombre: valor })}
              error={errorNombre} maxLength={100} />
          </Formulario>
        </div>
      )}

      {cargando && <p>Cargando facultades...</p>}
      {errorListado && <p className="error" role="alert">{errorListado}</p>}
      {!cargando && !errorListado && (
        <div className="tabla-contenedor">
          <Tabla columnas={COLUMNAS} filas={facultades} clave="id_facultad" acciones={(facultad) => (
            <>
              <button type="button" className="secundario" onClick={() => abrir(facultad)}>Editar</button>
              <button type="button" className="peligro" onClick={() => {
                setParaBorrar(facultad)
                setErrorBorrado('')
              }}>Borrar</button>
            </>
          )} />
        </div>
      )}

      <ConfirmarBorrado abierto={Boolean(paraBorrar)}
        mensaje={paraBorrar ? `¿Borrar la facultad ${paraBorrar.nombre}?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={confirmarBorrado}
        onCancelar={() => setParaBorrar(null)} />
    </section>
  )
}
