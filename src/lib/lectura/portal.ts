import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { idiomaActual } from '@/i18n/idioma'
import { cartaSchema } from '@/lib/astrology/schema'
import type { Database } from '@/lib/supabase/database.types'

import { generarLecturaBase } from './generar'
import { lecturaBaseSchema, type LecturaBase } from './schemas'

/**
 * La lectura base del portal, generándola si todavía no existe.
 *
 * Idempotente, igual que `asegurarCarta()`: la lectura se genera **una sola
 * vez** por usuario (CLAUDE.md §8). No es solo cuestión de coste —cada
 * generación se paga— sino de sentido: la lectura base es un texto que el
 * usuario ya leyó, y que cambiara sola entre visitas sería desconcertante.
 *
 * Devuelve `null` si falta la carta o si la generación falla. No lanza: la
 * pantalla que la pide tiene su propio estado para cuando no está.
 */

type Cliente = SupabaseClient<Database>

export type PortalParaLectura = {
  id: string
  full_name: string | null
  chart: unknown
  base_reading: unknown
}

export const COLUMNAS_LECTURA = 'id, full_name, chart, base_reading'

export async function asegurarLecturaBase(
  supabase: Cliente,
  portal: PortalParaLectura,
): Promise<LecturaBase | null> {
  const guardada = lecturaBaseSchema.safeParse(portal.base_reading)
  if (guardada.success) return guardada.data

  // Sin carta no hay nada que interpretar. La IA no la calcula: si falta, se
  // vuelve del onboarding o de `asegurarCarta()`, no de aquí.
  const carta = cartaSchema.safeParse(portal.chart)
  if (!carta.success) return null

  let lectura: LecturaBase
  try {
    lectura = await generarLecturaBase({
      idioma: await idiomaActual(),
      nombre: portal.full_name,
      carta: carta.data,
    })
  } catch (error) {
    console.error('[lectura] no se pudo generar', { portal: portal.id, error })
    return null
  }

  const { error } = await supabase
    .from('portals')
    .update({ base_reading: lectura, base_reading_at: new Date().toISOString() })
    .eq('id', portal.id)
    // Si otra petición se adelantó, la suya manda: es la que el usuario ya
    // puede estar leyendo. Evita que dos pestañas dejen lecturas distintas.
    .is('base_reading', null)

  if (error) {
    console.error('[lectura] no se pudo guardar', error)
  }

  return lectura
}
