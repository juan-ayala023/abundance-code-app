import { DateTime } from 'luxon'

/**
 * Convierte los datos de nacimiento en el instante UTC exacto.
 *
 * Es la pieza que más cartas estropea en producción. Una hora de nacimiento no
 * es "una hora": es una hora local en un lugar y una fecha concretos, y el
 * desfase con UTC de ese lugar ha cambiado a lo largo de la historia. Colombia,
 * sin ir más lejos, tuvo horario de verano entre 1992 y 1993.
 *
 * Por eso el cálculo va siempre contra la zona IANA + la fecha real, nunca
 * contra el desfase de hoy.
 */

/** Hora local usada cuando el usuario no conoce su hora de nacimiento. */
const HORA_POR_DEFECTO = '12:00'

export type BirthInput = {
  /** Fecha local de nacimiento, `YYYY-MM-DD`. */
  birthDate: string
  /** Hora local `HH:mm`. Debe ser null si `timeUnknown`. */
  birthTime: string | null
  timeUnknown: boolean
  /** Identificador IANA, p.ej. `America/Bogota`. */
  tz: string
}

export type Ambiguedad =
  /** La hora local existió una sola vez. Caso normal. */
  | 'ninguna'
  /** Esa hora local no existió: el reloj saltó hacia delante (cambio a verano). */
  | 'inexistente'
  /** Esa hora local ocurrió dos veces: el reloj retrocedió (vuelta a invierno). */
  | 'repetida'

export type BirthInstant = {
  /** Instante UTC en ISO 8601. */
  utc: string
  /** Desfase aplicado, en minutos respecto a UTC. Se guarda para poder auditar. */
  offsetMinutes: number
  zone: string
  /** `partial` cuando la hora es desconocida: sin casas, ascendente ni medio cielo. */
  precision: 'exact' | 'partial'
  ambiguity: Ambiguedad
}

export class BirthInstantError extends Error {}

export function resolveBirthInstant(input: BirthInput): BirthInstant {
  const { birthDate, timeUnknown, tz } = input

  if (timeUnknown && input.birthTime !== null) {
    throw new BirthInstantError(
      'No puede haber hora de nacimiento si se marcó como desconocida.',
    )
  }

  const horaLocal = timeUnknown ? HORA_POR_DEFECTO : input.birthTime
  if (!horaLocal) {
    throw new BirthInstantError('Falta la hora de nacimiento.')
  }

  const dt = DateTime.fromISO(`${birthDate}T${horaLocal}`, { zone: tz })

  if (!dt.isValid) {
    throw new BirthInstantError(
      dt.invalidReason === 'unsupported zone'
        ? `Zona horaria desconocida: ${tz}`
        : `Fecha u hora de nacimiento no válidas: ${birthDate} ${horaLocal}`,
    )
  }

  return {
    utc: dt.toUTC().toISO()!,
    offsetMinutes: dt.offset,
    zone: tz,
    precision: timeUnknown ? 'partial' : 'exact',
    ambiguity: detectarAmbiguedad(dt, birthDate, horaLocal),
  }
}

/**
 * Saltos de horario de verano que hay para 30 min, 1 h y 2 h. Cubre desde Lord
 * Howe (media hora) hasta los saltos dobles históricos.
 */
const SALTOS_POSIBLES_EN_MINUTOS = [30, 60, 120]

/**
 * Los dos casos raros del horario de verano.
 *
 * Ninguno impide calcular la carta, pero hay que registrarlos: en una hora
 * repetida elegimos una de las dos —Luxon toma la primera, la del desfase
 * anterior al cambio— y el usuario merece saberlo antes de que su ascendente
 * dependa de esa elección silenciosa.
 */
function detectarAmbiguedad(
  dt: DateTime,
  fechaPedida: string,
  horaPedida: string,
): Ambiguedad {
  const pedida = `${fechaPedida} ${horaPedida}`

  // Si Luxon devolvió una hora distinta a la pedida, esa hora local no existió
  // y la desplazó hacia delante.
  if (dt.toFormat('yyyy-MM-dd HH:mm') !== pedida) return 'inexistente'

  // Una hora repetida es aquella que otro instante distinto también produce.
  // Buscarla directamente es más fiable que deducirla de los desfases vecinos.
  for (const minutes of SALTOS_POSIBLES_EN_MINUTOS) {
    if (dt.plus({ minutes }).toFormat('yyyy-MM-dd HH:mm') === pedida) {
      return 'repetida'
    }
  }

  return 'ninguna'
}
