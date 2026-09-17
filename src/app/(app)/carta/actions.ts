'use server'

import { revalidatePath } from 'next/cache'

import { idiomaActual } from '@/i18n/idioma'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { traducirRetrato } from '@/lib/lectura/generar-retrato'
import { asegurarRetrato, COLUMNAS_RETRATO, retratoEnIdioma } from '@/lib/lectura/retrato'
import { retratoSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

/**
 * Escribe el retrato de la carta, a petición de la pantalla.
 *
 * Antes se escribía durante el render, detrás de un `<Suspense>`. Tardaba más
 * de un minuto y la conexión se cortaba a medias (Andrea, 17 sept 2026:
 * «Estamos escribiendo…» indefinido y luego ERR_HTTP2_PROTOCOL_ERROR). Como
 * acción, la página carga entera, el cliente espera con un estado visible y,
 * si falla, hay botón para volver a intentarlo. `asegurarRetrato` solo guarda
 * si no hay ninguno: dos intentos no producen dos retratos.
 */
export async function escribirRetrato(): Promise<{ listo: boolean; motivo?: 'suscripcion' | 'error' }> {
  const acceso = await resolveAccess()
  if (nivelDeAcceso(entitlementDe(acceso)) === 'solo-lectura') {
    return { listo: false, motivo: 'suscripcion' }
  }

  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select(COLUMNAS_RETRATO).maybeSingle()
  if (!portal) return { listo: false, motivo: 'error' }

  const retrato = await asegurarRetrato(supabase, portal)
  if (!retrato) return { listo: false, motivo: 'error' }

  revalidatePath('/carta')
  return { listo: true }
}

/** Guarda la versión del retrato en el idioma actual de la interfaz. */
export async function traducirRetratoActual(): Promise<{ listo: boolean }> {
  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select('id, chart_reading').maybeSingle()
  const guardado = retratoSchema.safeParse(portal?.chart_reading)
  if (!portal || !guardado.success) return { listo: false }

  const idioma = await idiomaActual()
  if (retratoEnIdioma(guardado.data, idioma)) return { listo: true }

  try {
    const traducido = await traducirRetrato(guardado.data, idioma)
    const { error } = await supabase
      .from('portals')
      .update({
        chart_reading: {
          ...guardado.data,
          traducciones: { ...(guardado.data.traducciones ?? {}), [idioma]: traducido },
        },
      })
      .eq('id', portal.id)
    if (error) throw error
  } catch (error) {
    console.error('[retrato] no se pudo guardar la traducción', error)
    return { listo: false }
  }

  revalidatePath('/carta')
  return { listo: true }
}
