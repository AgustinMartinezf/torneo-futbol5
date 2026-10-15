import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'

// Sin sesión manda al login. Con roles, solo deja pasar a esos roles.
export default function RutaProtegida({ roles }) {
  const { sesion } = useAuth()

  if (!sesion) return <Navigate to="/login" replace />
  if (roles && !roles.includes(sesion.rol)) return <Navigate to="/" replace />
  return <Outlet />
}
