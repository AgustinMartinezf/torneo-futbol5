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

export const DEPARTAMENTOS = [
  'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida',
  'Lavalleja', 'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha',
  'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres',
]
export const SUPERFICIES = ['sintético', 'parquet']

export function validarComplejo(valores) {
  const errores = {}
  if (!valores.nombre.trim() || valores.nombre.trim().length > 100) {
    errores.nombre = 'Ingresá un nombre de hasta 100 caracteres.'
  }
  if (!valores.direccion.trim() || valores.direccion.trim().length > 150) {
    errores.direccion = 'Ingresá una dirección de hasta 150 caracteres.'
  }
  if (!DEPARTAMENTOS.includes(valores.departamento)) {
    errores.departamento = 'Seleccioná un departamento.'
  }
  return errores
}

export function validarCancha(valores) {
  const errores = {}
  if (!valores.nombre_cancha.trim() || valores.nombre_cancha.trim().length > 50) {
    errores.nombre_cancha = 'Ingresá un nombre de hasta 50 caracteres.'
  } else if (valores.nombre_cancha.includes('/')) {
    errores.nombre_cancha = 'El nombre de la cancha no puede contener "/".'
  }
  if (!SUPERFICIES.includes(valores.superficie)) {
    errores.superficie = 'Seleccioná una superficie.'
  }
  return errores
}

export const ESTADOS_TORNEO = ['inscripción', 'en curso', 'finalizado']

export function validarTorneo(valores, original, equipos, torneos) {
  const errores = {}
  if (!valores.nombre.trim() || valores.nombre.trim().length > 100) {
    errores.nombre = 'Ingresá un nombre de hasta 100 caracteres.'
  }
  const anio = Number(valores.anio)
  const semestre = Number(valores.semestre)
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    errores.anio = 'Ingresá un año entre 2000 y 2100.'
  }
  if (![1, 2].includes(semestre)) {
    errores.semestre = 'Seleccioná el semestre.'
  }
  if (!valores.fecha_inicio || Number(valores.fecha_inicio.slice(0, 4)) !== anio) {
    errores.fecha_inicio = 'El inicio debe pertenecer al año de la edición.'
  }
  if (!valores.fecha_fin || valores.fecha_fin <= valores.fecha_inicio) {
    errores.fecha_fin = 'El fin debe ser posterior al inicio.'
  }
  for (const torneo of torneos) {
    if (torneo.id_torneo !== original?.id_torneo && torneo.anio === anio && torneo.semestre === semestre) {
      errores.semestre = 'Ya existe una edición para ese año y semestre.'
    }
  }
  const anterior = original ? ESTADOS_TORNEO.indexOf(original.estado) : 0
  const nuevo = ESTADOS_TORNEO.indexOf(valores.estado)
  if (nuevo < anterior || nuevo > anterior + 1 || nuevo < 0 || (!original && nuevo !== 0)) {
    errores.estado = 'Los estados avanzan de inscripción a en curso y luego a finalizado.'
  }
  if (original?.estado === 'inscripción' && valores.estado === 'en curso') {
    for (const equipo of equipos) {
      if (equipo.id_torneo === original.id_torneo &&
          (equipo.cantidad_jugadores < 5 || equipo.cantidad_jugadores > 10 || !equipo.ci_capitan)) {
        errores.estado = 'Todos los equipos deben tener entre 5 y 10 jugadores y un capitán.'
      }
    }
  }
  return errores
}

export function validarEquipo(valores, torneos, facultades, equipos, idEquipo) {
  const errores = {}
  if (!valores.nombre.trim() || valores.nombre.trim().length > 60) {
    errores.nombre = 'Ingresá un nombre de hasta 60 caracteres.'
  }
  const torneo = torneos.find((t) => t.id_torneo === Number(valores.id_torneo))
  if (!torneo) {
    errores.id_torneo = 'Seleccioná una edición.'
  } else if (!idEquipo && torneo.estado !== 'inscripción') {
    errores.id_torneo = 'La edición debe estar en inscripción.'
  }
  if (!facultades.some((f) => f.id_facultad === Number(valores.id_facultad))) {
    errores.id_facultad = 'Seleccioná una facultad.'
  }
  for (const equipo of equipos) {
    if (equipo.id_equipo !== idEquipo && equipo.id_torneo === Number(valores.id_torneo) &&
        equipo.nombre.toLocaleLowerCase() === valores.nombre.trim().toLocaleLowerCase()) {
      errores.nombre = 'Ya existe un equipo con ese nombre en la edición.'
    }
  }
  return errores
}

export function validarCamiseta(numero, plantel, ci) {
  if (!Number.isInteger(Number(numero)) || Number(numero) < 1 || Number(numero) > 99) return 'Ingresá un número entre 1 y 99.'
  if (plantel.some((j) => j.ci_jugador !== ci && j.numero_camiseta === Number(numero))) return 'Ese número ya lo usa otro jugador del equipo.'
  return ''
}

// Supuestos S-01 y S-19.
export const TRANSICIONES_PARTIDO = {
  programado: ['jugado', 'postergado', 'cancelado'],
  postergado: ['programado', 'cancelado'],
  jugado: [],
  cancelado: [],
}

export function validarPartido(valores, original, torneos, equipos, turnos, partidos, ahora = new Date()) {
  const errores = {}
  const torneo = torneos.find((t) => t.id_torneo === Number(valores.id_torneo))
  if (!torneo) {
    errores.id_torneo = 'Seleccioná una edición.'
  } else if (torneo.estado !== 'en curso') {
    errores.id_torneo = 'La edición debe estar en curso.'
  }
  const fecha = Number(valores.numero_fecha)
  if (!Number.isInteger(fecha) || fecha < 1 || fecha > 255) {
    errores.numero_fecha = 'Ingresá un número de fecha entre 1 y 255.'
  }
  const local = equipos.find((e) => e.id_equipo === Number(valores.id_equipo_local))
  const visitante = equipos.find((e) => e.id_equipo === Number(valores.id_equipo_visitante))
  if (!local) errores.id_equipo_local = 'Seleccioná el equipo local.'
  else if (local.cantidad_jugadores < 5) errores.id_equipo_local = 'El equipo tiene menos de 5 jugadores.'
  if (!visitante) errores.id_equipo_visitante = 'Seleccioná el equipo visitante.'
  else if (visitante.cantidad_jugadores < 5) errores.id_equipo_visitante = 'El equipo tiene menos de 5 jugadores.'
  if (local && visitante && local.id_equipo === visitante.id_equipo) {
    errores.id_equipo_visitante = 'Un equipo no puede jugar contra sí mismo.'
  }
  if (!valores.dia) {
    errores.dia = 'Ingresá el día.'
  } else if (torneo && (valores.dia < torneo.fecha_inicio || valores.dia > torneo.fecha_fin)) {
    errores.dia = 'El día tiene que estar entre el inicio y el fin de la edición.'
  }
  const turno = turnos.find((t) => t.id_turno === Number(valores.id_turno))
  if (!turno) errores.id_turno = 'Seleccioná un turno.'
  if (!valores.id_complejo) errores.id_complejo = 'Seleccioná un complejo.'
  if (!valores.nombre_cancha) errores.nombre_cancha = 'Seleccioná una cancha.'
  const anterior = original?.estado ?? 'programado'
  if (valores.estado !== anterior && !TRANSICIONES_PARTIDO[anterior].includes(valores.estado)) {
    errores.estado = 'Ese cambio de estado no está permitido.'
  }
  if (valores.estado === 'jugado' && valores.dia && turno && new Date(`${valores.dia}T${turno.hora_fin}`) > ahora) {
    errores.estado = 'El partido todavía no se jugó: su turno no terminó.'
  }
  for (const p of partidos) {
    if (p.id_partido === original?.id_partido) continue
    if (['programado', 'jugado'].includes(valores.estado) && ['programado', 'jugado'].includes(p.estado) &&
        p.nombre_cancha === valores.nombre_cancha && p.id_complejo === Number(valores.id_complejo) &&
        p.dia === valores.dia && p.id_turno === Number(valores.id_turno)) {
      errores.nombre_cancha = 'La cancha ya tiene un partido ese día y en ese turno.'
    }
  }
  if (valores.estado !== 'cancelado' && local && visitante) {
    for (const p of partidos) {
      if (p.id_partido === original?.id_partido || p.estado === 'cancelado' || p.id_torneo !== Number(valores.id_torneo)) continue
      const equiposDelPartido = [p.id_equipo_local, p.id_equipo_visitante]
      if (p.numero_fecha === fecha && (equiposDelPartido.includes(local.id_equipo) || equiposDelPartido.includes(visitante.id_equipo))) {
        errores.numero_fecha = 'Uno de los equipos ya juega en esa fecha.'
      }
      if (equiposDelPartido.includes(local.id_equipo) && equiposDelPartido.includes(visitante.id_equipo)) {
        errores.id_equipo_visitante = 'Esos equipos ya tienen un partido en la edición.'
      }
    }
  }
  return errores
}

export const MOTIVOS_SANCION = ['roja', 'acumulación de amarillas', 'disciplinaria']

export function validarSancion(valores, torneos, plantel) {
  const errores = {}
  const torneo = torneos.find((t) => t.id_torneo === Number(valores.id_torneo))
  if (!torneo) {
    errores.id_torneo = 'Seleccioná una edición.'
  } else if (torneo.estado !== 'en curso') {
    errores.id_torneo = 'La edición debe estar en curso.'
  }
  if (!valores.id_equipo) errores.id_equipo = 'Seleccioná un equipo.'
  if (!plantel.some((j) => j.ci_jugador === valores.ci_jugador)) {
    errores.ci_jugador = 'Seleccioná un jugador del plantel.'
  }
  const inicio = Number(valores.numero_fecha_inicio)
  if (!Number.isInteger(inicio) || inicio < 1 || inicio > 255) {
    errores.numero_fecha_inicio = 'Ingresá una fecha de inicio entre 1 y 255.'
  }
  const cantidad = Number(valores.cantidad_fechas)
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 255) {
    errores.cantidad_fechas = 'Ingresá una cantidad de fechas entre 1 y 255.'
  }
  return errores
}
