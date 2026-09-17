import { idiomaActual } from '@/i18n/idioma'
import 'server-only'

import { transitosDeHoy } from '@/lib/astrology/cielo'
import type { Carta } from '@/lib/astrology/types'
import { createAdminClient } from '@/lib/supabase/server'

import { generarActivacionDiaria } from './generar-activacion'
import { activacionDiariaSchema, type ActivacionDiaria } from './schemas'
import { nombreDePila } from './voz'

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
  /** El día REAL del portal (`ciclo.diaReal`), sin saturar en 30: es la clave de la fila. */
  dia: number,
  total: number,
  /** La fecha de calendario a la que corresponde, `AAAA-MM-DD` (`ciclo.fecha`). */
  fecha: string,
  /** `full_name` tal cual; aquí se reduce al nombre de pila antes de dárselo al modelo. */
  nombre: string | null,
): Promise<ActivacionGuardada | null> {
  const admin = createAdminClient()

  const { data: existente } = await admin
    .from('daily_activations')
    .select('id, content, read_at')
    .eq('portal_id', portalId)
    .eq('day_number', dia)
    .maybeSingle()

  const idioma = await idiomaActual()

  if (existente) {
    const contenido = activacionDiariaSchema.safeParse(existente.content)
    /*
     * La activación es de un día: si se escribió en otro idioma que el que la
     * persona usa ahora, se vuelve a escribir en el suyo en vez de enseñarle
     * títulos en inglés con párrafos en español.
     */
    if (contenido.success && (contenido.data.idioma ?? 'es') === idioma) {
      return { id: existente.id, contenido: contenido.data, leidaEn: existente.read_at }
    }
    if (!contenido.success) {
      // Guardada con una forma que ya no encaja: se regenera en vez de romper.
      console.error('[activacion] contenido guardado inválido', { portalId, dia })
    }
  }

  const transitos = await transitosDeHoy(carta)
  if (!transitos) return null

  let contenido: ActivacionDiaria
  try {
    contenido = await generarActivacionDiaria({
      nombre: nombreDePila(nombre),
      carta,
      transitos,
      dia,
      total,
      fecha,
      idioma,
    })
    contenido = { ...contenido, idioma }
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
