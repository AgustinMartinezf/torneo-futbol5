// Cliente HTTP mínimo. Todas las llamadas al backend pasan por acá.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail ?? `Error ${res.status}`)
  return data
}
