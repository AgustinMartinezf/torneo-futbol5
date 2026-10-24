import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import { SECCIONES } from './menu.js'
import FacultadesPage from './pages/FacultadesPage.jsx'
import InicioPage from './pages/InicioPage.jsx'
import JugadoresPage from './pages/JugadoresPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PendientePage from './pages/PendientePage.jsx'

export default function App() {
  const paginas = { jugadores: <JugadoresPage />, facultades: <FacultadesPage /> }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<InicioPage />} />
          {/* Cada funcionalidad reemplaza su PendientePage por la página real. */}
          {SECCIONES.map((s) => (
            <Route key={s.ruta} element={<RutaProtegida roles={s.roles} />}>
              <Route path={s.ruta} element={paginas[s.ruta] ?? <PendientePage titulo={s.texto} />} />
            </Route>
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
