'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

/**
 * Marca la activación del día como leída.
 *
 * El identificador llega del formulario, así que no se confía en él: quien lo
 * protege es la política RLS de `daily_activations`, que solo deja actualizar
 * las filas de un portal propio. Validar aquí que es un UUID evita además que
 * un valor con otra forma llegue hasta la consulta.
 */
export async function marcarActivacionLeida(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return

  const supabase = await createClient()

  const { error } = await supabase
    .from('daily_activations')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id.data)
    // Solo la primera vez: volver a pulsar no debe mover la fecha de lectura.
    .is('read_at', null)

  if (error) {
    console.error('[activacion] no se pudo marcar como leída', error)
    return
  }

  revalidatePath('/activacion')
  revalidatePath('/portal')
}
