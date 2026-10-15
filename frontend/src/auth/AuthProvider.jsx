import { useEffect, useState } from 'react'
import { api, registrarAlNoAutorizado } from '../api.js'
import { AuthContext } from './AuthContext.js'

const CLAVE = 'sesion'

function sesionGuardada() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE))
  } catch {
    return null
  }
}

export default function AuthProvider({ children }) {
  // sesion = { token, correo, rol } o null si no hay nadie logueado.
  const [sesion, setSesion] = useState(sesionGuardada)

  function logout() {
    localStorage.removeItem(CLAVE)
    setSesion(null)
  }

  useEffect(() => {
    registrarAlNoAutorizado(logout)
    // Al abrir la app revisamos que la sesión guardada siga valiendo. Si venció, el 401 hace logout.
    const guardada = sesionGuardada()
    if (guardada) api('/auth/yo', { token: guardada.token }).catch(() => {})
    return () => registrarAlNoAutorizado(null)
  }, [])

  async function login(correo, contrasena) {
    const datos = await api('/auth/login', { method: 'POST', body: { correo, contrasena } })
    localStorage.setItem(CLAVE, JSON.stringify(datos))
    setSesion(datos)
  }

  // Llamada al back con el token de la sesión.
  function pedir(path, opciones = {}) {
    return api(path, { ...opciones, token: sesion?.token })
  }

  return (
    <AuthContext.Provider value={{ sesion, login, logout, pedir }}>
      {children}
    </AuthContext.Provider>
  )
}
