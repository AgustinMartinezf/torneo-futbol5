import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'

export default function RutaProtegida({ roles }) {
  const { sesion } = useAuth()

  if (!sesion) return <Navigate to="/login" replace />
  if (roles && !roles.includes(sesion.rol)) return <Navigate to="/" replace />
  return <Outlet />
}
