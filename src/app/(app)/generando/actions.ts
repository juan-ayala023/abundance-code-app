'use server'

import { revalidatePath } from 'next/cache'

import { asegurarCarta, COLUMNAS_CARTA } from '@/lib/astrology/portal'
import { asegurarLecturaBase, COLUMNAS_LECTURA } from '@/lib/lectura/portal'
import { createClient } from '@/lib/supabase/server'

/**
 * Genera la lectura base, si aún no existe.
 *
 * La dispara la pantalla `/generando`, no el onboarding: tarda del orden de un
 * minuto y dejar el formulario colgado todo ese rato haría pensar que se ha
 * roto. Es idempotente, así que recargar la pantalla no genera dos.
 *
 * Devuelve si hay lectura, para que la pantalla sepa cuándo pasar a `/lectura-base`.
 */
export async function generarLectura(): Promise<{ lista: boolean }> {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select(`${COLUMNAS_CARTA}, ${COLUMNAS_LECTURA}`)
    .maybeSingle()

  if (!portal) return { lista: false }

  // La carta primero: es la entrada de la lectura, y quien llega aquí desde el
  // onboarding ya debería tenerla. Esto cubre a quien no.
  await asegurarCarta(supabase, portal)

  // Se relee para que la lectura parta de la carta recién guardada.
  const { data: actualizado } = await supabase
    .from('portals')
    .select(COLUMNAS_LECTURA)
    .eq('id', portal.id)
    .maybeSingle()

  if (!actualizado) return { lista: false }

  const lectura = await asegurarLecturaBase(supabase, actualizado)

  if (lectura) {
    revalidatePath('/lectura-base')
    revalidatePath('/portal')
  }

  return { lista: Boolean(lectura) }
}
