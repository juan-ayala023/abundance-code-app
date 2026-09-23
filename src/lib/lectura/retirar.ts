import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/supabase/database.types'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { zonaDelPortal } from '@/lib/time/dia'

/**
 * Retira la lectura base y el retrato de un portal, conservándolos.
 *
 * Hay dos motivos para que una lectura deje de valer: que cambien los datos de
 * nacimiento (la carta ya no es la de esa persona) o que cambie la voz con la
 * que se escriben (el texto ya no es el que queremos que lea). En los dos
 * casos pasa lo mismo: la versión anterior se archiva en `reading_versions`
 * con los datos sobre los que se escribió, se vacía en el portal para que la
 * siguiente visita la vuelva a escribir, y se borra la activación de hoy para
 * que también se escriba con la voz nueva. Las de días pasados se quedan:
 * fueron las de esos días. Las consultas de la guía se conservan todas.
 *
 * Con el cliente administrativo: el usuario no tiene `insert` en la tabla de
 * versiones, a propósito.
 *
 * Si no se puede archivar, NO se vacía nada: perder un texto que la persona
 * ya leyó es peor que dejarle uno desactualizado un rato más.
 */

export type MotivoDeRetiro = 'correccion-nacimiento' | 'cambio-de-voz'

export type PortalARetirar = {
  id: string
  created_at: string | null
  tz: string | null
  birth_date: string | null
  birth_time: string | null
  time_unknown: boolean | null
  birth_city: string | null
  birth_country: string | null
  base_reading: Json | null
  base_reading_at: string | null
  chart_reading: Json | null
  chart_reading_at: string | null
}

/** Las columnas que hace falta leer del portal para poder retirarlo. */
export const COLUMNAS_PARA_RETIRAR =
  'id, created_at, tz, birth_date, birth_time, time_unknown, birth_city, birth_country, base_reading, base_reading_at, chart_reading, chart_reading_at'

export type ResultadoRetiro =
  | { ok: true; archivadas: ('lectura' | 'retrato')[] }
  | {
      ok: false
      motivo: 'nada-que-retirar' | 'no-se-pudo-archivar' | 'no-se-pudo-vaciar'
    }

export async function retirarLecturas(
  admin: SupabaseClient<Database>,
  portal: PortalARetirar,
  motivo: MotivoDeRetiro,
): Promise<ResultadoRetiro> {
  const nacimiento = {
    birth_date: portal.birth_date,
    birth_time: portal.birth_time,
    time_unknown: portal.time_unknown ?? false,
    birth_city: portal.birth_city,
    birth_country: portal.birth_country,
    reason: motivo,
  }

  const versiones = [
    portal.base_reading
      ? {
          portal_id: portal.id,
          kind: 'lectura' as const,
          content: portal.base_reading,
          generated_at: portal.base_reading_at,
          ...nacimiento,
        }
      : null,
    portal.chart_reading
      ? {
          portal_id: portal.id,
          kind: 'retrato' as const,
          content: portal.chart_reading,
          generated_at: portal.chart_reading_at,
          ...nacimiento,
        }
      : null,
  ].filter((version) => version !== null)

  if (versiones.length === 0) return { ok: false, motivo: 'nada-que-retirar' }

  const { error: errorArchivo } = await admin.from('reading_versions').insert(versiones)
  if (errorArchivo) {
    console.error('[retirar] no se pudieron archivar las lecturas', errorArchivo)
    return { ok: false, motivo: 'no-se-pudo-archivar' }
  }

  const { error: errorVaciado } = await admin
    .from('portals')
    .update({
      base_reading: null,
      base_reading_at: null,
      chart_reading: null,
      chart_reading_at: null,
    })
    .eq('id', portal.id)

  if (errorVaciado) {
    console.error('[retirar] no se pudieron vaciar las lecturas', errorVaciado)
    return { ok: false, motivo: 'no-se-pudo-vaciar' }
  }

  const ciclo = diaDelCiclo(portal.created_at, zonaDelPortal(portal))
  if (ciclo) {
    const { error: errorActivacion } = await admin
      .from('daily_activations')
      .delete()
      .eq('portal_id', portal.id)
      .gte('day_number', ciclo.diaReal)

    if (errorActivacion) {
      // No es motivo para fallar: la lectura ya está retirada. La activación
      // de hoy se quedará con la voz vieja hasta mañana.
      console.error('[retirar] no se pudo retirar la activación de hoy', errorActivacion)
    }
  }

  return { ok: true, archivadas: versiones.map((v) => v.kind) }
}
