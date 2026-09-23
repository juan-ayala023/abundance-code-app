import 'server-only'

import { DateTime } from 'luxon'
import type { SupabaseClient } from '@supabase/supabase-js'

import { idiomaActual, type Idioma } from '@/i18n/idioma'
import { calcularPronostico, DIAS_PRONOSTICO } from '@/lib/astrology/pronostico'
import { cartaSchema } from '@/lib/astrology/schema'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

import { generarPronostico } from './generar-pronostico'
import { pronosticoGuardadoSchema, pronosticoTextoSchema, type PronosticoGuardado, type PronosticoTexto } from './schemas'
import { nombreDePila } from './voz'

/**
 * El pronóstico vigente de un portal, generándolo si hace falta.
 *
 * El periodo empieza el día en que se pide y dura 30 días. Mientras siga
 * dentro de ese periodo se devuelve el mismo: no se regenera cada vez que
 * alguien abre la pantalla —costaría dinero y, peor, le cambiaría las fechas
 * a quien está siguiendo el mes—. Cuando el periodo vence, el siguiente se
 * escribe a partir de ese día.
 */

type Cliente = SupabaseClient<Database>

export type PortalParaPronostico = {
  id: string
  full_name: string | null
  chart: unknown
  tz: string | null
}

export const COLUMNAS_PRONOSTICO = 'id, full_name, chart, tz'

export type PronosticoVigente = {
  desde: string
  hasta: string
  contenido: PronosticoGuardado
}

/** El pronóstico en curso, si existe y no ha vencido. */
export async function pronosticoGuardado(
  supabase: Cliente,
  portalId: string,
): Promise<PronosticoVigente | null> {
  const hoy = DateTime.utc().toISODate()!

  const { data } = await supabase
    .from('forecasts')
    .select('desde, hasta, content')
    .eq('portal_id', portalId)
    .gte('hasta', hoy)
    .order('desde', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const contenido = pronosticoGuardadoSchema.safeParse(data.content)
  if (!contenido.success) return null

  return { desde: data.desde, hasta: data.hasta, contenido: contenido.data }
}

/**
 * Lo escribe si no hay ninguno vigente.
 *
 * Devuelve `null` cuando no se puede: sin carta calculada no hay nada que
 * mirar, y si el cálculo del periodo o el modelo fallan, la pantalla lo dice
 * y ofrece reintentar — nunca se queda en blanco.
 */
export async function asegurarPronostico(
  supabase: Cliente,
  portal: PortalParaPronostico,
): Promise<PronosticoVigente | null> {
  const vigente = await pronosticoGuardado(supabase, portal.id)
  if (vigente) return vigente

  const carta = cartaSchema.safeParse(portal.chart)
  if (!carta.success) return null

  const calculado = await calcularPronostico(carta.data, { dias: DIAS_PRONOSTICO })
  if (!calculado) return null

  let texto: PronosticoTexto
  try {
    texto = await generarPronostico({
      nombre: nombreDePila(portal.full_name),
      carta: carta.data,
      pronostico: calculado,
      idioma: await idiomaActual(),
    })
  } catch (error) {
    console.error('[pronostico] no se pudo generar', { portal: portal.id, error })
    return null
  }

  const admin = createAdminClient()
  const { error } = await admin.from('forecasts').insert({
    portal_id: portal.id,
    desde: calculado.desde,
    hasta: calculado.hasta,
    content: texto as never,
    eventos: { ventanas: calculado.ventanas, trasfondo: calculado.trasfondo } as never,
  })

  if (error) {
    /*
     * Si otra pestaña se adelantó, la clave única lo impide y su fila manda:
     * es la que esa persona ya puede estar leyendo. Se devuelve la suya.
     */
    console.error('[pronostico] no se pudo guardar', error)
    const otra = await pronosticoGuardado(supabase, portal.id)
    if (otra) return otra
  }

  return { desde: calculado.desde, hasta: calculado.hasta, contenido: texto }
}

/** El pronóstico en el idioma de la interfaz, si está. Ver `lecturaEnIdioma`. */
export function pronosticoEnIdioma(
  guardado: PronosticoGuardado,
  idioma: Idioma,
): { texto: PronosticoTexto; original: boolean } | null {
  const escritoEn = guardado.idioma ?? 'es'
  if (escritoEn === idioma) return { texto: guardado, original: true }

  const traduccion = pronosticoTextoSchema.safeParse(guardado.traducciones?.[idioma])
  return traduccion.success ? { texto: traduccion.data, original: false } : null
}
