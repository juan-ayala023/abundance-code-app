import { DateTime } from 'luxon'

import { diasDeCalendarioEntre, zonaDe } from '@/lib/time/dia'

import { DIAS_DE_PORTAL } from './schemas'

/**
 * El mes de guía: en qué bloque de 30 días está el portal y cuándo empieza.
 *
 * Las doce consultas del documento del 23 de septiembre son «al mes», y aquí
 * el mes es el del portal —treinta días desde que se creó— y no el del
 * calendario. Dos razones:
 *
 *   1. Es el mismo mes que la persona ya ve en su cuenta («Día 12 de 30»), así
 *      que el contador se reinicia el día que ella espera.
 *   2. Con el mes natural, quien comprara el 28 tendría doce consultas para
 *      tres días y doce más el día 1.
 *
 * Devuelve null sin fecha de creación, igual que `diaDelCiclo`: sin ancla no
 * hay bloque que calcular, y es mejor no contar que contar mal.
 */
export function mesDeGuia(
  creadoEn: string | null | undefined,
  tz: string | null | undefined,
  ahora = new Date(),
): { desde: Date; hasta: Date; numero: number } | null {
  if (!creadoEn) return null

  const inicio = new Date(creadoEn)
  if (Number.isNaN(inicio.getTime())) return null

  const transcurridos = diasDeCalendarioEntre(inicio, ahora, tz)
  if (transcurridos < 0) return null

  /* En qué bloque de 30 días cae hoy: 0 el primero, 1 el segundo… */
  const bloque = Math.floor(transcurridos / DIAS_DE_PORTAL)

  /*
   * El principio del bloque, a la hora en que cambia el día para esta persona.
   * Se parte del día de hoy y se retrocede lo que lleve de bloque.
   *
   * Con luxon y no restando milisegundos: un día no siempre dura 24 horas. En
   * el cambio de hora, treinta días de 86.400.000 ms dejan el corte a las once
   * de la noche del día anterior, y una consulta hecha a esa hora se contaría
   * en el mes que no es.
   */
  const diasDentro = transcurridos - bloque * DIAS_DE_PORTAL
  const zona = zonaDe(tz)
  const inicioDelBloque = DateTime.fromJSDate(ahora, { zone: zona })
    .startOf('day')
    .minus({ days: diasDentro })

  return {
    desde: inicioDelBloque.toJSDate(),
    hasta: inicioDelBloque.plus({ days: DIAS_DE_PORTAL }).toJSDate(),
    numero: bloque + 1,
  }
}
