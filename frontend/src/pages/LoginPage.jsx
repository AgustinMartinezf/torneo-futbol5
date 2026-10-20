import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import Formulario, { Campo } from '../components/Formulario.jsx'

const FORMATO_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validar({ correo, contrasena }) {
  const errores = {}
  if (!correo.trim()) errores.correo = 'Ingresá el correo.'
  else if (!FORMATO_CORREO.test(correo.trim())) errores.correo = 'El correo no tiene un formato válido.'
  if (!contrasena) errores.contrasena = 'Ingresá la contraseña.'
  return errores
}

export default function LoginPage() {
  const { sesion, login } = useAuth()
  const [valores, setValores] = useState({ correo: '', contrasena: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (sesion) return <Navigate to="/" replace />

  function cambiar(nombre, valor) {
    setValores((v) => ({ ...v, [nombre]: valor }))
  }

  async function ingresar() {
    const encontrados = validar(valores)
    setErrores(encontrados)
    setError('')
    if (Object.keys(encontrados).length > 0) return
    setEnviando(true)
    try {
      await login(valores.correo.trim(), valores.contrasena)
    } catch (e) {
      setError(e.message)
      setEnviando(false)
    }
  }

  return (
    <div className="pagina-login">
      <h1>Torneo Interfacultades de Fútbol 5</h1>
      <h2>Iniciar sesión</h2>
      <Formulario onSubmit={ingresar} error={error} enviando={enviando} textoBoton="Ingresar">
        <Campo
          etiqueta="Correo"
          nombre="correo"
          tipo="email"
          valor={valores.correo}
          onChange={cambiar}
          error={errores.correo}
          autoComplete="username"
          maxLength={100}
        />
        <Campo
          etiqueta="Contraseña"
          nombre="contrasena"
          tipo="password"
          valor={valores.contrasena}
          onChange={cambiar}
          error={errores.contrasena}
          autoComplete="current-password"
          maxLength={72}
        />
      </Formulario>
    </div>
  )
}
