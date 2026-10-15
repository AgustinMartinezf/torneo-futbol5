import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import Tabla from '../components/Tabla.jsx'

const COLUMNAS = [
  { campo: 'correo', titulo: 'Correo' },
  { campo: 'rol', titulo: 'Rol' },
]

export default function InicioPage() {
  const { sesion, pedir } = useAuth()
  const esAdmin = sesion.rol === 'administrador'
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!esAdmin) return
    pedir('/usuarios')
      .then(setUsuarios)
      .catch((e) => setError(e.message))
    // pedir cambia en cada render: alcanza con pedir la lista al entrar.
  }, [esAdmin])

  return (
    <section>
      <h1>Inicio</h1>
      <p>Ingresaste como {sesion.rol}. Elegí una sección en el menú.</p>
      {esAdmin && (
        <>
          <h2>Cuentas de la aplicación</h2>
          {error ? <p className="error">{error}</p> : <Tabla columnas={COLUMNAS} filas={usuarios} clave="correo" />}
        </>
      )}
    </section>
  )
}
