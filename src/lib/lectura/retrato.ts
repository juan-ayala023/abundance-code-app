import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { idiomaActual } from '@/i18n/idioma'
import { cartaSchema } from '@/lib/astrology/schema'
import type { Database } from '@/lib/supabase/database.types'

import { generarRetrato } from './generar-retrato'
import { retratoSchema, retratoTextoSchema, type Retrato, type RetratoTexto } from './schemas'
import type { Idioma } from '@/i18n/idioma'
import { nombreDePila } from './voz'

/**
 * El retrato de la carta, generándolo si todavía no existe.
 *
 * Idempotente, igual que `asegurarLecturaBase()` y por las mismas dos razones:
 * cada generación se paga, y un texto personal que cambiara solo entre visitas
 * sería desconcertante para quien ya lo leyó.
 *
 * Devuelve `null` si falta la carta o si la generación falla. No lanza: la
 * pantalla que lo pide tiene su propio estado para cuando no está.
 */

type Cliente = SupabaseClient<Database>

export type PortalParaRetrato = {
  id: string
  full_name: string | null
  chart: unknown
  chart_reading: unknown
}

export const COLUMNAS_RETRATO = 'id, full_name, chart, chart_reading'

/** El retrato en el idioma de la interfaz, si existe. Ver `lecturaEnIdioma`. */
export function retratoEnIdioma(
  retrato: Retrato,
  idioma: Idioma,
): { texto: RetratoTexto; original: boolean } | null {
  const escritoEn = retrato.idioma ?? 'es'
  if (escritoEn === idioma) return { texto: retrato, original: true }
  const guardado = retratoTextoSchema.safeParse(retrato.traducciones?.[idioma])
  return guardado.success ? { texto: guardado.data, original: false } : null
}

export async function asegurarRetrato(
  supabase: Cliente,
  portal: PortalParaRetrato,
): Promise<Retrato | null> {
  const guardado = retratoSchema.safeParse(portal.chart_reading)
  if (guardado.success) return guardado.data

  // Sin carta no hay nada que interpretar. La IA no la calcula.
  const carta = cartaSchema.safeParse(portal.chart)
  if (!carta.success) return null

  let retrato: Retrato
  try {
    retrato = await generarRetrato({
      idioma: await idiomaActual(),
      nombre: nombreDePila(portal.full_name),
      carta: carta.data,
    })
  } catch (error) {
    console.error('[retrato] no se pudo generar', { portal: portal.id, error })
    return null
  }

  const { error } = await supabase
    .from('portals')
    .update({ chart_reading: retrato, chart_reading_at: new Date().toISOString() })
    .eq('id', portal.id)
    /*
     * Si otra petición se adelantó, la suya manda: es la que el usuario puede
     * estar leyendo ya. Sin esto, dos pestañas abiertas a la vez dejarían dos
     * retratos distintos y el segundo pisaría al primero a mitad de lectura.
     */
    .is('chart_reading', null)

  if (error) {
    console.error('[retrato] no se pudo guardar', error)
  }

  return retrato
}
