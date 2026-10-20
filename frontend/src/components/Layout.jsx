import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import { SECCIONES } from '../menu.js'

export default function Layout() {
  const { sesion, logout } = useAuth()
  const secciones = SECCIONES.filter((s) => s.roles.includes(sesion.rol))

  return (
    <div className="layout">
      <aside className="menu">
        <h2>Fútbol 5</h2>
        <nav>
          <Link to="/">Inicio</Link>
          {secciones.map((s) => (
            <Link key={s.ruta} to={`/${s.ruta}`}>{s.texto}</Link>
          ))}
        </nav>
        <div className="menu-usuario">
          <p>{sesion.correo}</p>
          <p className="rol">{sesion.rol}</p>
          <button type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
