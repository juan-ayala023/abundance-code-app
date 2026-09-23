'use server'

import { revalidatePath } from 'next/cache'

import { idiomaActual } from '@/i18n/idioma'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { cartaSchema } from '@/lib/astrology/schema'
import { asegurarActivacion } from '@/lib/lectura/activacion'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { traducirMes } from '@/lib/lectura/generar-mes'
import { asegurarMes, COLUMNAS_MES, mesEnIdioma, mesGuardado } from '@/lib/lectura/mes'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { zonaDelPortal } from '@/lib/time/dia'

/**
 * Escribe la activación de hoy, a petición de la pantalla.
 *
 * Antes se generaba durante el render de `/activacion`: la página tardaba más
 * de diez segundos y, si el modelo fallaba, se pintaba la lista de títulos sin
 * texto —«apartados vacíos presentados como lectura», en la revisión del 23 de
 * septiembre—. Ahora la página carga siempre, y esto se pide aparte con su
 * estado y su botón de reintentar.
 *
 * `asegurarActivacion` es idempotente por `(portal_id, day_number)`: reintentar
 * no duplica ni cobra dos veces.
 */
export async function escribirActivacion(): Promise<{
  listo: boolean
  motivo?: 'suscripcion' | 'sin-carta' | 'error'
}> {
  const acceso = await resolveAccess()
  if (nivelDeAcceso(entitlementDe(acceso)) === 'solo-lectura') {
    return { listo: false, motivo: 'suscripcion' }
  }

  const supabase = await createClient()
  const { data: portal } = await supabase
    .from('portals')
    .select('id, full_name, chart, created_at, tz, display_tz')
    .maybeSingle()

  if (!portal) return { listo: false, motivo: 'error' }

  const carta = cartaSchema.safeParse(portal.chart)
  if (!carta.success) return { listo: false, motivo: 'sin-carta' }

  const ciclo = diaDelCiclo(portal.created_at, zonaDelPortal(portal))
  if (!ciclo) return { listo: false, motivo: 'error' }

  const activacion = await asegurarActivacion(
    portal.id,
    carta.data,
    ciclo.diaReal,
    ciclo.total,
    ciclo.fecha,
    portal.full_name,
  )

  if (!activacion) return { listo: false, motivo: 'error' }

  revalidatePath('/activacion')
  revalidatePath('/portal')
  return { listo: true }
}

/**
 * La zona horaria del dispositivo, guardada la primera vez que se ve.
 *
 * El día del portal se contaba con la zona de la ciudad de nacimiento. Alguien
 * que nació en Bogotá y vive en Sídney veía «22 de septiembre» cuando allí ya
 * era 23 (revisión del 23 sept). La regla pasa a ser una sola y comprensible:
 * **el día es el de donde está la persona**. Se guarda para que el servidor
 * pueda calcularlo igual sin el navegador delante.
 */
export async function guardarZonaHoraria(zona: string): Promise<void> {
  if (!zona || zona.length > 64) return

  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select('id, display_tz').maybeSingle()
  if (!portal || portal.display_tz === zona) return

  await supabase.from('portals').update({ display_tz: zona }).eq('id', portal.id)
  revalidatePath('/activacion')
  revalidatePath('/portal')
}

/** Para que la pantalla sepa en qué idioma pedir la activación guardada. */
export async function idiomaDeLaInterfaz(): Promise<string> {
  return idiomaActual()
}

/**
 * Escribe la lectura del mes, a petición de la pantalla.
 *
 * Tarda: calcular 31 días de cielo y escribir dieciséis apartados. Por eso se
 * pide desde el cliente y no durante el render. El tiempo máximo lo declara la
 * página (`maxDuration` en page.tsx): un fichero «use server» solo puede
 * exportar funciones.
 */
export async function escribirMes(): Promise<{
  listo: boolean
  motivo?: 'suscripcion' | 'sin-carta' | 'error'
}> {
  const acceso = await resolveAccess()
  if (nivelDeAcceso(entitlementDe(acceso)) === 'solo-lectura') {
    return { listo: false, motivo: 'suscripcion' }
  }

  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select(COLUMNAS_MES).maybeSingle()
  if (!portal) return { listo: false, motivo: 'error' }
  if (!portal.chart) return { listo: false, motivo: 'sin-carta' }

  const mes = await asegurarMes(supabase, portal)
  if (!mes) return { listo: false, motivo: 'error' }

  revalidatePath('/activacion')
  revalidatePath('/portal')
  return { listo: true }
}

/**
 * Guarda la versión de la lectura del mes en el idioma actual de la interfaz.
 *
 * Igual que con la lectura base: se traduce a petición, no al cambiar de
 * idioma, y la traducción se guarda al lado del original sin tocarlo.
 */
export async function traducirMesActual(): Promise<{ listo: boolean }> {
  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select('id').maybeSingle()
  if (!portal) return { listo: false }

  const guardado = await mesGuardado(supabase, portal.id)
  if (!guardado) return { listo: false }

  const idioma = await idiomaActual()
  if (mesEnIdioma(guardado.contenido, idioma)) return { listo: true }

  try {
    const traducida = await traducirMes(guardado.contenido, idioma)
    const { error } = await createAdminClient()
      .from('forecasts')
      .update({
        content: {
          ...guardado.contenido,
          traducciones: { ...(guardado.contenido.traducciones ?? {}), [idioma]: traducida },
        } as never,
      })
      .eq('portal_id', portal.id)
      .eq('desde', guardado.desde)
    if (error) throw error
  } catch (error) {
    console.error('[mes] no se pudo guardar la traducción', error)
    return { listo: false }
  }

  revalidatePath('/activacion')
  return { listo: true }
}
