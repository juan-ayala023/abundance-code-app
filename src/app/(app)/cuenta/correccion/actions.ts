'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient, createClient } from '@/lib/supabase/server'

import type { EstadoCorreccion } from './estado'

const esquema = z.object({
  datoActual: z.string().trim().min(1).max(300),
  datoCorrecto: z.string().trim().min(1).max(300),
  motivo: z.string().trim().max(1000).optional(),
  confirmado: z.literal('on'),
})

/**
 * Registra una petición de corrección de los datos de nacimiento.
 *
 * No cambia nada: ni la carta, ni las lecturas, ni el portal. Solo deja la
 * petición escrita para que alguien la mire. Es justo lo que pidió el
 * documento del 23 de septiembre —«solo después de aprobar se recalcula la
 * carta»— y la razón es que cambiar el nacimiento invalida la carta y archiva
 * la lectura base y el retrato: contenido que la persona ya leyó.
 *
 * Se escribe con el cliente administrativo porque la política RLS solo le
 * concede `select` al usuario. El portal llega ya resuelto por RLS con su
 * propio cliente, así que el id que se usa aquí es suyo y está verificado.
 */
export async function solicitarCorreccion(
  _previo: EstadoCorreccion,
  formData: FormData,
): Promise<EstadoCorreccion> {
  const datos = esquema.safeParse({
    datoActual: formData.get('datoActual'),
    datoCorrecto: formData.get('datoCorrecto'),
    motivo: formData.get('motivo') ?? undefined,
    confirmado: formData.get('confirmado'),
  })

  if (!datos.success) {
    return { enviada: false, error: await textoDe('faltanDatos') }
  }

  const supabase = await createClient()
  const { data: portal } = await supabase.from('portals').select('id').maybeSingle()
  if (!portal) return { enviada: false, error: await textoDe('sinSesion') }

  const { error } = await createAdminClient().from('correction_requests').insert({
    portal_id: portal.id,
    dato_actual: datos.data.datoActual,
    dato_correcto: datos.data.datoCorrecto,
    motivo: datos.data.motivo || null,
    confirmado: true,
  })

  if (error) {
    console.error('[correccion] no se pudo registrar', error)
    return { enviada: false, error: await textoDe('error') }
  }

  revalidatePath('/cuenta')
  return { enviada: true, error: null }
}

async function textoDe(clave: string): Promise<string> {
  const { getTranslations } = await import('next-intl/server')
  const t = await getTranslations('correccion')
  return t(clave as never)
}
