'use server'

import { revalidatePath } from 'next/cache'

import { idiomaActual } from '@/i18n/idioma'
import { traducirLecturaBase } from '@/lib/lectura/generar'
import { lecturaEnIdioma } from '@/lib/lectura/portal'
import { lecturaBaseSchema } from '@/lib/lectura/schemas'
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
