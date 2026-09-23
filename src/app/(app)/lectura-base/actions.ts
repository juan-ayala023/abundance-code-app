'use server'

import { revalidatePath } from 'next/cache'

import { idiomaActual } from '@/i18n/idioma'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import type { Carta } from '@/lib/astrology/types'
import { escribirSeccionesNuevas, traducirLecturaBase } from '@/lib/lectura/generar'
import { lecturaEnIdioma } from '@/lib/lectura/portal'
import { clavesQueFaltan, lecturaBaseSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

/**
 * Guarda la versión de la lectura base en el idioma actual de la interfaz.
 *
 * La lectura se escribe una vez y no se reescribe; lo que se añade es una
 * traducción fiel al lado del original (`traducciones[idioma]`). Se pide desde
 * el aviso de la pantalla, no automáticamente: quien cambia de idioma por
 * curiosidad no debe disparar una llamada al modelo sin saberlo.
 */
export async function traducirLecturaActual(): Promise<{ listo: boolean }> {
  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select('id, base_reading').maybeSingle()
  const guardada = lecturaBaseSchema.safeParse(portal?.base_reading)
  if (!portal || !guardada.success) return { listo: false }

  const idioma = await idiomaActual()
  if (lecturaEnIdioma(guardada.data, idioma)) return { listo: true }

  try {
    const traducida = await traducirLecturaBase(guardada.data, idioma)
    const { error } = await supabase
      .from('portals')
      .update({
        base_reading: {
          ...guardada.data,
          traducciones: { ...(guardada.data.traducciones ?? {}), [idioma]: traducida },
        },
      })
      .eq('id', portal.id)
    if (error) throw error
  } catch (error) {
    console.error('[lectura] no se pudo guardar la traducción', error)
    return { listo: false }
  }

  revalidatePath('/lectura-base')
  revalidatePath('/portal')
  return { listo: true }
}

/**
 * Añade a la lectura guardada las secciones que se crearon después.
 *
 * Solo escribe lo que falta y conserva el resto intacto —incluidas las
 * traducciones ya pedidas, que se quedan como estaban: traducirlas de nuevo
 * cambiaría un texto que la persona ya leyó—. La versión traducida se queda sin
 * las secciones nuevas hasta que se vuelva a pedir, y eso la pantalla lo
 * resuelve enseñando el original con su aviso, que es el camino que ya existe.
 */
export async function ampliarLecturaActual(): Promise<{ listo: boolean; motivo?: 'suscripcion' }> {
  const supabase = await createClient()
  const { data: portal } = await supabase
    .from('portals')
    .select('id, full_name, chart, base_reading')
    .maybeSingle()

  const guardada = lecturaBaseSchema.safeParse(portal?.base_reading)
  if (!portal?.chart || !guardada.success) return { listo: false }

  const faltan = clavesQueFaltan(guardada.data)
  if (faltan.length === 0) return { listo: true }

  /* Escribir es trabajo nuevo: pide suscripción, como el retrato y la guía. */
  const acceso = await resolveAccess()
  if (nivelDeAcceso(entitlementDe(acceso)) === 'solo-lectura') {
    return { listo: false, motivo: 'suscripcion' }
  }

  try {
    const nuevas = await escribirSeccionesNuevas({
      nombre: portal.full_name,
      carta: portal.chart as Carta,
      idioma: guardada.data.idioma ?? 'es',
      lectura: guardada.data,
      claves: faltan,
    })

    const { error } = await supabase
      .from('portals')
      .update({ base_reading: { ...guardada.data, ...nuevas } })
      .eq('id', portal.id)
    if (error) throw error
  } catch (error) {
    console.error('[lectura] no se pudo ampliar', { portal: portal.id, error })
    return { listo: false }
  }

  revalidatePath('/lectura-base')
  return { listo: true }
}
