import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import ConfirmarBorrado from '../components/ConfirmarBorrado.jsx'
import Formulario, { Campo } from '../components/Formulario.jsx'
import Tabla from '../components/Tabla.jsx'
import { DEPARTAMENTOS, SUPERFICIES, validarCancha, validarComplejo } from '../validaciones.js'

const COLUMNAS_COMPLEJOS = [
  { campo: 'nombre', titulo: 'Nombre' },
  { campo: 'direccion', titulo: 'Dirección' },
  { campo: 'departamento', titulo: 'Departamento' },
  { campo: 'cantidad_canchas', titulo: 'Canchas' },
]

const COLUMNAS_CANCHAS = [
  { campo: 'nombre_cancha', titulo: 'Nombre' },
  { campo: 'superficie', titulo: 'Superficie' },
  { campo: 'techada', titulo: 'Techada', mostrar: (c) => (c.techada ? 'Sí' : 'No') },
]

const COLUMNAS_TURNOS = [
  { campo: 'id_turno', titulo: 'Turno' },
  { campo: 'hora_inicio', titulo: 'Desde' },
  { campo: 'hora_fin', titulo: 'Hasta' },
]

export default function ComplejosPage() {
  const { pedir } = useAuth()
  const [complejos, setComplejos] = useState([])
  const [turnos, setTurnos] = useState([])
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
  const [elegido, setElegido] = useState(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setErrorListado('')
    Promise.all([pedir('/complejos'), pedir('/turnos')])
      .then(([lista, listaTurnos]) => {
        if (!activo) return
        setComplejos(lista)
        setTurnos(listaTurnos)
      })
      .catch((e) => { if (activo) setErrorListado(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [revision])

  function abrir(complejo = null) {
    setFormulario({
      id_complejo: complejo?.id_complejo ?? null,
      valores: {
        nombre: complejo?.nombre ?? '',
        direccion: complejo?.direccion ?? '',
        departamento: complejo?.departamento ?? '',
      },
    })
    setErrores({})
    setErrorFormulario('')
  }

  function cambiar(nombre, valor) {
    setFormulario((actual) => ({ ...actual, valores: { ...actual.valores, [nombre]: valor } }))
  }

  async function guardar() {
    const encontrados = validarComplejo(formulario.valores)
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return

    const valores = formulario.valores
    const body = { ...valores, nombre: valores.nombre.trim(), direccion: valores.direccion.trim() }
    setEnviando(true)
    try {
      const nuevo = formulario.id_complejo === null
      const ruta = nuevo ? '/complejos' : `/complejos/${formulario.id_complejo}`
      await pedir(ruta, { method: nuevo ? 'POST' : 'PUT', body })
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
      await pedir(`/complejos/${paraBorrar.id_complejo}`, { method: 'DELETE' })
      if (elegido?.id_complejo === paraBorrar.id_complejo) setElegido(null)
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
        <h1>Complejos y canchas</h1>
        <button type="button" onClick={() => abrir()}>Nuevo complejo</button>
      </div>

      {formulario && (
        <div className="panel-formulario">
          <h2>{formulario.id_complejo === null ? 'Nuevo complejo' : 'Editar complejo'}</h2>
          <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando}
            onCancelar={() => setFormulario(null)}>
            <Campo etiqueta="Nombre" nombre="nombre" valor={formulario.valores.nombre}
              onChange={cambiar} error={errores.nombre} maxLength={100} />
            <Campo etiqueta="Dirección" nombre="direccion" valor={formulario.valores.direccion}
              onChange={cambiar} error={errores.direccion} maxLength={150} />
            <div className="campo">
              <label htmlFor="departamento">Departamento</label>
              <select id="departamento" value={formulario.valores.departamento}
                onChange={(e) => cambiar('departamento', e.target.value)}
                aria-invalid={errores.departamento ? 'true' : undefined}>
                <option value="">Seleccionar</option>
                {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errores.departamento && <p className="error-campo">{errores.departamento}</p>}
            </div>
          </Formulario>
        </div>
      )}

      {cargando && <p>Cargando complejos...</p>}
      {errorListado && <p className="error" role="alert">{errorListado}</p>}
      {!cargando && !errorListado && (
        <div className="tabla-contenedor">
          <Tabla columnas={COLUMNAS_COMPLEJOS} filas={complejos} clave="id_complejo" acciones={(complejo) => (
            <>
              <button type="button" onClick={() => setElegido(complejo)}>Canchas</button>
              <button type="button" className="secundario" onClick={() => abrir(complejo)}>Editar</button>
              <button type="button" className="peligro" onClick={() => {
                setParaBorrar(complejo)
                setErrorBorrado('')
              }}>Borrar</button>
            </>
          )} />
        </div>
      )}

      {elegido && (
        <Canchas key={elegido.id_complejo} complejo={elegido}
          onCambio={() => setRevision((n) => n + 1)} onCerrar={() => setElegido(null)} />
      )}

      <h2>Turnos</h2>
      <p>Los turnos son fijos, de una hora entre las 18:00 y las 23:00, y no se modifican.</p>
      {!cargando && !errorListado && (
        <div className="tabla-contenedor">
          <Tabla columnas={COLUMNAS_TURNOS} filas={turnos} clave="id_turno" />
        </div>
      )}

      <ConfirmarBorrado abierto={Boolean(paraBorrar)}
        mensaje={paraBorrar ? `¿Borrar ${paraBorrar.nombre}?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={confirmarBorrado}
        onCancelar={() => setParaBorrar(null)} />
    </section>
  )
}

function Canchas({ complejo, onCambio, onCerrar }) {
  const { pedir } = useAuth()
  const [canchas, setCanchas] = useState([])
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

  const base = `/complejos/${complejo.id_complejo}/canchas`

  useEffect(() => {
    let activo = true
    setCargando(true)
    setErrorListado('')
    pedir(base)
      .then((lista) => { if (activo) setCanchas(lista) })
      .catch((e) => { if (activo) setErrorListado(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [revision])

  function abrir(cancha = null) {
    setFormulario({
      nombreOriginal: cancha?.nombre_cancha ?? null,
      valores: {
        nombre_cancha: cancha?.nombre_cancha ?? '',
        superficie: cancha?.superficie ?? '',
        techada: cancha ? Boolean(cancha.techada) : false,
      },
    })
    setErrores({})
    setErrorFormulario('')
  }

  function cambiar(nombre, valor) {
    setFormulario((actual) => ({ ...actual, valores: { ...actual.valores, [nombre]: valor } }))
  }

  async function guardar() {
    const encontrados = validarCancha(formulario.valores)
    setErrores(encontrados)
    setErrorFormulario('')
    if (Object.keys(encontrados).length) return

    const body = { ...formulario.valores, nombre_cancha: formulario.valores.nombre_cancha.trim() }
    setEnviando(true)
    try {
      const nueva = formulario.nombreOriginal === null
      const ruta = nueva ? base : `${base}/${encodeURIComponent(formulario.nombreOriginal)}`
      await pedir(ruta, { method: nueva ? 'POST' : 'PUT', body })
      setFormulario(null)
      setRevision((n) => n + 1)
      onCambio()
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
      await pedir(`${base}/${encodeURIComponent(paraBorrar.nombre_cancha)}`, { method: 'DELETE' })
      setParaBorrar(null)
      setRevision((n) => n + 1)
      onCambio()
    } catch (e) {
      setErrorBorrado(e.message)
    } finally {
      setBorrando(false)
    }
  }

  return (
    <div className="panel-formulario">
      <div className="barra-titulo">
        <h2>Canchas de {complejo.nombre}</h2>
        <button type="button" onClick={() => abrir()}>Nueva cancha</button>
        <button type="button" className="secundario" onClick={onCerrar}>Cerrar</button>
      </div>

      {formulario && (
        <Formulario onSubmit={guardar} error={errorFormulario} enviando={enviando}
          onCancelar={() => setFormulario(null)}>
          <Campo etiqueta="Nombre" nombre="nombre_cancha" valor={formulario.valores.nombre_cancha}
            onChange={cambiar} error={errores.nombre_cancha} maxLength={50} />
          <div className="campo">
            <label htmlFor="superficie">Superficie</label>
            <select id="superficie" value={formulario.valores.superficie}
              onChange={(e) => cambiar('superficie', e.target.value)}
              aria-invalid={errores.superficie ? 'true' : undefined}>
              <option value="">Seleccionar</option>
              {SUPERFICIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errores.superficie && <p className="error-campo">{errores.superficie}</p>}
          </div>
          <div className="campo">
            <label>
              <input type="checkbox" checked={formulario.valores.techada}
                onChange={(e) => cambiar('techada', e.target.checked)} /> Techada
            </label>
          </div>
        </Formulario>
      )}

      {cargando && <p>Cargando canchas...</p>}
      {errorListado && <p className="error" role="alert">{errorListado}</p>}
      {!cargando && !errorListado && (
        <div className="tabla-contenedor">
          <Tabla columnas={COLUMNAS_CANCHAS} filas={canchas} clave="nombre_cancha"
            vacio="El complejo no tiene canchas." acciones={(cancha) => (
              <>
                <button type="button" className="secundario" onClick={() => abrir(cancha)}>Editar</button>
                <button type="button" className="peligro" onClick={() => {
                  setParaBorrar(cancha)
                  setErrorBorrado('')
                }}>Borrar</button>
              </>
            )} />
        </div>
      )}

      <ConfirmarBorrado abierto={Boolean(paraBorrar)}
        mensaje={paraBorrar ? `¿Borrar ${paraBorrar.nombre_cancha} (${complejo.nombre})?` : ''}
        error={errorBorrado} borrando={borrando} onConfirmar={confirmarBorrado}
        onCancelar={() => setParaBorrar(null)} />
    </div>
  )
}
