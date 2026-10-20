const PESOS_CI = [2, 9, 8, 7, 6, 3, 4]
const TIPOS = ['grado', 'posgrado', 'docente', 'funcionario']
const FORMATO_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function ciUruguayaValida(ci) {
  if (!/^[0-9]{7,8}$/.test(ci)) return false
  const digitos = ci.padStart(8, '0')
  const suma = PESOS_CI.reduce((total, peso, i) => total + Number(digitos[i]) * peso, 0)
  return (10 - (suma % 10)) % 10 === Number(digitos[7])
}

export function fechaNacimientoRazonable(valor, hoy = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) return false
  const [anio, mes, dia] = valor.split('-').map(Number)
  const edad = hoy.getFullYear() - anio - (
    hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia) ? 1 : 0
  )
  return edad >= 16 && edad <= 120
}

export function validarJugador(valores, facultades) {
  const errores = {}
  if (!ciUruguayaValida(valores.ci)) {
    errores.ci = 'La cédula debe tener 7 u 8 dígitos y un verificador válido.'
  }
  if (!valores.nombre.trim() || valores.nombre.trim().length > 60) {
    errores.nombre = 'Ingresá un nombre de hasta 60 caracteres.'
  }
  if (!valores.apellido.trim() || valores.apellido.trim().length > 60) {
    errores.apellido = 'Ingresá un apellido de hasta 60 caracteres.'
  }
  if (!FORMATO_CORREO.test(valores.email.trim()) || valores.email.trim().length > 100) {
    errores.email = 'Ingresá un correo válido de hasta 100 caracteres.'
  }
  if (!fechaNacimientoRazonable(valores.fecha_nacimiento)) {
    errores.fecha_nacimiento = 'La edad del jugador debe estar entre 16 y 120 años.'
  }
  if (!facultades.some((f) => String(f.id_facultad) === String(valores.id_facultad))) {
    errores.id_facultad = 'Seleccioná una facultad válida.'
  }
  if (!TIPOS.includes(valores.tipo)) {
    errores.tipo = 'Seleccioná un tipo válido.'
  }
  return errores
}
