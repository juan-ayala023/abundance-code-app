import 'server-only'

import { createLocalChartProvider } from '@/lib/astrology/local'
import { aspectosDeTransito } from '@/lib/astrology/transitos'
import type { Carta } from '@/lib/astrology/types'
import { createAdminClient } from '@/lib/supabase/server'

import { generarActivacionDiaria } from './generar-activacion'
import { activacionDiariaSchema, type ActivacionDiaria } from './schemas'

/**
 * La activación de un día, generándola si todavía no existe.
 *
 * Se escribe con el cliente administrativo **a propósito**: la política RLS no
 * concede `insert` al usuario sobre `daily_activations` porque el contenido lo
 * genera el servidor. El portal llega ya resuelto por RLS con el cliente del
 * usuario, así que el id que se usa aquí es suyo y está verificado.
 *
 * Idempotente por `(portal_id, day_number)`, que además tiene una restricción
 * única en la base: dos peticiones simultáneas no dejan dos activaciones.
 */

export type ActivacionGuardada = {
  id: string
  contenido: ActivacionDiaria
  leidaEn: string | null
}

export async function asegurarActivacion(
  portalId: string,
  carta: Carta,
  dia: number,
  total: number,
): Promise<ActivacionGuardada | null> {
  const admin = createAdminClient()

  const { data: existente } = await admin
    .from('daily_activations')
    .select('id, content, read_at')
    .eq('portal_id', portalId)
    .eq('day_number', dia)
    .maybeSingle()

  if (existente) {
    const contenido = activacionDiariaSchema.safeParse(existente.content)
    if (contenido.success) {
      return { id: existente.id, contenido: contenido.data, leidaEn: existente.read_at }
    }
    // Guardada con una forma que ya no encaja: se regenera en vez de romper.
    console.error('[activacion] contenido guardado inválido', { portalId, dia })
  }

  const transitos = await calcularTransitos(carta)
  if (!transitos) return null

  let contenido: ActivacionDiaria
  try {
    contenido = await generarActivacionDiaria({ carta, transitos, dia, total })
  } catch (error) {
    console.error('[activacion] no se pudo generar', { portalId, dia, error })
    return null
  }

  const { data: guardada, error } = await admin
    .from('daily_activations')
    .upsert(
      { portal_id: portalId, day_number: dia, content: contenido },
      { onConflict: 'portal_id,day_number' },
    )
    .select('id, read_at')
    .single()

  if (error || !guardada) {
    console.error('[activacion] no se pudo guardar', error)
    return null
  }

  return { id: guardada.id, contenido, leidaEn: guardada.read_at }
}

/**
 * El cielo de hoy, contra la carta de nacimiento.
 *
 * Se toma el mediodía UTC del día en curso y no el instante exacto: así la
 * activación de un día es la misma se pida a la hora que se pida, y regenerarla
 * da el mismo punto de partida. La Luna se mueve unos 13° al día, de modo que
 * el mediodía es el mejor representante del conjunto.
 *
 * La posición geográfica es la del nacimiento y da igual: las longitudes
 * eclípticas son geocéntricas. Se pide `partial` porque no hacen falta casas.
 */
async function calcularTransitos(carta: Carta) {
  const hoy = new Date()
  hoy.setUTCHours(12, 0, 0, 0)

  try {
    const cielo = await createLocalChartProvider().calcular({
      utc: hoy.toISOString(),
      lat: 0,
      lng: 0,
      tz: 'UTC',
      precision: 'partial',
    })

    return aspectosDeTransito(carta, cielo)
  } catch (error) {
    console.error('[activacion] no se pudieron calcular los tránsitos', error)
    return null
  }
}
