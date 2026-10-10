import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function App() {
  const [estado, setEstado] = useState('verificando...')

  useEffect(() => {
    api('/health')
      .then((d) => setEstado(d.status))
      .catch(() => setEstado('sin conexión con la API'))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Torneo Interfacultades de Fútbol 5</h1>
      <p>Estado de la API: {estado}</p>
    </main>
  )
}
