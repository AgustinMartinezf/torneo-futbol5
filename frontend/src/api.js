export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

let alNoAutorizado = null

export function registrarAlNoAutorizado(funcion) {
  alNoAutorizado = funcion
}

export async function api(path, { method = 'GET', body, token } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('No hay conexión con el servidor.')
  }
  const data = await res.json().catch(() => null)
  if (res.status === 401 && token && alNoAutorizado) alNoAutorizado()
  if (!res.ok) throw new Error(textoDeError(data?.detail, res.status))
  return data
}

function textoDeError(detail, status) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((e) => e.msg).join(' ')
  return `Error ${status}`
}
