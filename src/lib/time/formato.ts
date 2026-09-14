import type { Idioma } from '@/i18n/idioma'

/**
 * Fechas para leer, no para parsear.
 *
 * La pantalla de la carta y la de la lectura pintaban `birth_date` tal cual
 * sale de la base —«1990-07-15»— y Mi Cuenta formateaba siempre en español
 * aunque la interfaz estuviera en inglés. La revisión de septiembre de 2026
 * pidió quitar las «fechas en formato técnico»; esto es el único sitio donde se
 * decide cómo se escriben.
 *
 * Todas las funciones devuelven `'—'` ante un valor ausente o inválido: una
 * fecha que no se puede leer no debe romper la pantalla que la enseña.
 */

const VACIO = '—'

/**
 * Una fecha de calendario pura (`AAAA-MM-DD`), como la de nacimiento.
 *
 * Se interpreta en UTC a mediodía a propósito: `new Date('1990-07-15')` es
 * medianoche UTC, que en cualquier huso al oeste de Greenwich ya es el día
 * anterior. Ese desplazamiento fue un bug real del sistema anterior
 * (CLAUDE.md §6) y no se repite aquí.
 */
export function fechaDeCalendario(valor: string | null | undefined, idioma: Idioma): string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return VACIO

  const fecha = new Date(`${valor}T12:00:00Z`)
  if (Number.isNaN(fecha.getTime())) return VACIO

  return fecha.toLocaleDateString(idioma, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Un instante (`timestamptz`), como la fecha de activación del portal. */
export function fechaDeInstante(valor: string | null | undefined, idioma: Idioma): string {
  if (!valor) return VACIO

  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return VACIO

  return fecha.toLocaleDateString(idioma, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Un instante con hora, para el historial de consultas. */
export function fechaYHora(valor: string | null | undefined, idioma: Idioma): string {
  if (!valor) return VACIO

  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return VACIO

  return fecha.toLocaleString(idioma, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Una hora pura (`HH:MM[:SS]`), como la de nacimiento. */
export function horaDeReloj(valor: string | null | undefined): string {
  if (!valor) return VACIO
  return String(valor).slice(0, 5)
}
