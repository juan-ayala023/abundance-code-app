import { DateTime } from 'luxon'

/**
 * El «hoy» de una persona.
 *
 * Hasta septiembre de 2026 el día cambiaba a medianoche UTC para todo el
 * mundo: en Colombia, a las siete de la tarde, y alguien que abría la app
 * después de cenar veía la activación de «mañana» con la fecha de mañana. La
 * revisión lo señaló y, puesto en pantalla, no había forma de defenderlo.
 *
 * El día se corta ahora a medianoche en la zona horaria del lugar de
 * nacimiento (`portals.tz`, IANA, la misma que se usó para calcular la
 * carta). No es exactamente «donde vive», pero es un dato que ya está, que no
 * cambia solo, y que acierta para casi todo el mundo; la alternativa —la zona
 * del navegador— exigiría una cookie y cambiaría el día al viajar. Sin zona
 * válida se cae a UTC, que es lo que había.
 *
 * Todo lo que dependa de «qué día es» pasa por aquí: el ciclo de 30 días, la
 * activación diaria y el contador de consultas de la guía. Si se cortan a
 * horas distintas, la persona ve «día 12» en un sitio y la activación del 13
 * en otro.
 */

/**
 * La zona horaria con la que se cuenta el día de un portal.
 *
 * **Una sola regla, y es esta**: la hora del lugar donde está la persona
 * (`display_tz`, que guarda el navegador la primera vez que entra). Antes se
 * usaba la de la ciudad de nacimiento, y quien nació en Bogotá y vive en
 * Sídney veía el día anterior al suyo. Mientras no se sepa dónde está, se usa
 * la de nacimiento, que es mejor que UTC.
 */
export function zonaDelPortal(portal: {
  display_tz?: string | null
  tz?: string | null
}): string {
  return zonaDe(portal.display_tz ?? portal.tz)
}

export function zonaDe(tz: string | null | undefined): string {
  return tz && DateTime.local().setZone(tz).isValid ? tz : 'UTC'
}

/** La fecha de hoy en esa zona, `AAAA-MM-DD`. */
export function fechaDeHoy(tz: string | null | undefined, ahora = new Date()): string {
  return DateTime.fromJSDate(ahora, { zone: zonaDe(tz) }).toISODate()!
}

/**
 * El instante en que empezó el día de hoy en esa zona. Para consultas
 * `created_at >= …` que cuenten «lo de hoy».
 */
export function inicioDelDia(tz: string | null | undefined, ahora = new Date()): Date {
  return DateTime.fromJSDate(ahora, { zone: zonaDe(tz) }).startOf('day').toJSDate()
}

/**
 * Días de calendario entre dos instantes, contados en esa zona. El mismo día
 * es 0; el siguiente es 1 aunque hayan pasado dos horas.
 */
export function diasDeCalendarioEntre(
  desde: Date,
  hasta: Date,
  tz: string | null | undefined,
): number {
  const zona = zonaDe(tz)
  const a = DateTime.fromJSDate(desde, { zone: zona }).startOf('day')
  const b = DateTime.fromJSDate(hasta, { zone: zona }).startOf('day')
  return Math.round(b.diff(a, 'days').days)
}
