'use server'

import { revalidatePath } from 'next/cache'

import { idiomaActual } from '@/i18n/idioma'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { traducirPronostico } from '@/lib/lectura/generar-pronostico'
import {
  asegurarPronostico,
  COLUMNAS_PRONOSTICO,
  pronosticoEnIdioma,
  pronosticoGuardado,
} from '@/lib/lectura/pronostico'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/**
 * Escribe el pronóstico del periodo, a petición de la pantalla.
 *
 * Tarda: calcular 31 días de cielo y escribir cinco ventanas. Por eso se pide
 * desde el cliente y no durante el render. El tiempo máximo lo declara la
 * página (`maxDuration` en page.tsx): un fichero «use server» solo puede
 * exportar funciones.
 */
export async function escribirPronostico(): Promise<{
  listo: boolean
  motivo?: 'suscripcion' | 'sin-carta' | 'error'
}> {
  const acceso = await resolveAccess()
  if (nivelDeAcceso(entitlementDe(acceso)) === 'solo-lectura') {
    return { listo: false, motivo: 'suscripcion' }
  }

  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select(COLUMNAS_PRONOSTICO).maybeSingle()
  if (!portal) return { listo: false, motivo: 'error' }
  if (!portal.chart) return { listo: false, motivo: 'sin-carta' }

  const pronostico = await asegurarPronostico(supabase, portal)
  if (!pronostico) return { listo: false, motivo: 'error' }

  revalidatePath('/pronostico')
  revalidatePath('/portal')
  return { listo: true }
}

/** Guarda la versión del pronóstico en el idioma actual de la interfaz. */
export async function traducirPronosticoActual(): Promise<{ listo: boolean }> {
  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select('id').maybeSingle()
  if (!portal) return { listo: false }

  const vigente = await pronosticoGuardado(supabase, portal.id)
  if (!vigente) return { listo: false }

  const idioma = await idiomaActual()
  if (pronosticoEnIdioma(vigente.contenido, idioma)) return { listo: true }

  try {
    const traducido = await traducirPronostico(vigente.contenido, idioma)

    const { error } = await createAdminClient()
      .from('forecasts')
      .update({
        content: {
          ...vigente.contenido,
          traducciones: { ...(vigente.contenido.traducciones ?? {}), [idioma]: traducido },
        } as never,
      })
      .eq('portal_id', portal.id)
      .eq('desde', vigente.desde)

    if (error) throw error
  } catch (error) {
    console.error('[pronostico] no se pudo guardar la traducción', error)
    return { listo: false }
  }

  revalidatePath('/pronostico')
  return { listo: true }
}
