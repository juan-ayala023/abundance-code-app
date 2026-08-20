import { idiomaActual } from '@/i18n/idioma'
import 'server-only'

import { transitosDeHoy } from '@/lib/astrology/cielo'
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
  /**
   * Hoy siempre es `null`: el botón «Marcar como leída» se retiró de la pantalla
   * a petición del cliente, así que ya nadie escribe `read_at`. Se conserva el
   * campo —y la columna— porque la lectura no cuesta nada y devolver el botón
   * sería reponer la interfaz, no rehacer los datos.
   */
  leidaEn: string | null
}

export async function asegurarActivacion(
  portalId: string,
  carta: Carta,
  dia: number,
  total: number,
  /** Nombre de pila de quien la recibe. Se le pasa al modelo para que le hable a alguien. */
  nombre: string | null,
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

  const transitos = await transitosDeHoy(carta)
  if (!transitos) return null

  let contenido: ActivacionDiaria
  try {
    contenido = await generarActivacionDiaria({
      nombre,
      carta,
      transitos,
      dia,
      total,
      idioma: await idiomaActual(),
    })
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
