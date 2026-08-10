import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import { resolveBirthInstant } from '@/lib/time/birth-instant'

import { createLocalChartProvider, VERSION_MOTOR } from './local'
import { cartaSchema } from './schema'
import type { Carta } from './types'

/**
 * La carta del portal, calculándola y guardándola si hace falta.
 *
 * Es idempotente a propósito: se puede llamar desde el onboarding, desde la
 * pantalla de la carta o desde la generación de la lectura, y solo calcula la
 * primera vez. Así las cuentas que ya tenían datos de nacimiento obtienen su
 * carta sin necesidad de una migración de datos.
 *
 * Devuelve `null` cuando no hay con qué calcular o cuando el cálculo falla. No
 * lanza: quedarse sin carta no debe tumbar la pantalla que la pedía, y la carta
 * ausente ya tiene su propio estado en la interfaz.
 */

type Cliente = SupabaseClient<Database>

export type PortalParaCarta = {
  id: string
  birth_date: string | null
  birth_time: string | null
  time_unknown: boolean
  lat: number | null
  lng: number | null
  tz: string | null
  chart: unknown
  chart_version: string | null
}

/** Columnas que `asegurarCarta` necesita. Para no repetir la lista en cada `select`. */
export const COLUMNAS_CARTA =
  'id, birth_date, birth_time, time_unknown, lat, lng, tz, chart, chart_version'

export async function asegurarCarta(
  supabase: Cliente,
  portal: PortalParaCarta,
): Promise<Carta | null> {
  const vigente = leerCartaGuardada(portal)
  if (vigente) return vigente

  const carta = await calcularDesdePortal(portal)
  if (!carta) return null

  const { error } = await supabase
    .from('portals')
    .update({
      chart: carta,
      chart_version: VERSION_MOTOR,
      chart_computed_at: new Date().toISOString(),
    })
    .eq('id', portal.id)

  if (error) {
    // La carta es correcta aunque no se haya podido guardar: se devuelve igual
    // y se recalculará en la siguiente visita.
    console.error('[carta] no se pudo guardar la carta calculada', error)
  }

  return carta
}

/**
 * La carta ya guardada, si sigue siendo utilizable.
 *
 * Se valida aunque la hayamos escrito nosotros: `portals.chart` es una columna
 * que el usuario puede actualizar por RLS, y su contenido acaba en el prompt de
 * la lectura.
 */
function leerCartaGuardada(portal: PortalParaCarta): Carta | null {
  if (!portal.chart || portal.chart_version !== VERSION_MOTOR) return null

  const parsed = cartaSchema.safeParse(portal.chart)
  if (!parsed.success) {
    console.error('[carta] la carta guardada no encaja con el contrato', {
      portal: portal.id,
      issues: parsed.error.issues.slice(0, 3),
    })
    return null
  }

  return parsed.data as Carta
}

async function calcularDesdePortal(portal: PortalParaCarta): Promise<Carta | null> {
  const { birth_date: fecha, lat, lng, tz } = portal

  if (!fecha || lat === null || lng === null || !tz) return null

  try {
    const instante = resolveBirthInstant({
      birthDate: fecha,
      // Postgres devuelve `time` como HH:MM:SS y `resolveBirthInstant` compara
      // contra la hora que se le pidió para detectar las horas que no
      // existieron. Con los segundos puestos, esa comparación nunca casa y
      // toda hora parecería inexistente.
      birthTime: portal.time_unknown ? null : (portal.birth_time?.slice(0, 5) ?? null),
      timeUnknown: portal.time_unknown,
      tz,
    })

    return await createLocalChartProvider().calcular({
      utc: instante.utc,
      // `numeric` llega como texto en algunos caminos del cliente.
      lat: Number(lat),
      lng: Number(lng),
      tz,
      precision: instante.precision,
    })
  } catch (error) {
    console.error('[carta] no se pudo calcular', { portal: portal.id, error })
    return null
  }
}
