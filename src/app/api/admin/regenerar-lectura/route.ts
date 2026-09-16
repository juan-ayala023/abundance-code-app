import { NextResponse } from 'next/server'
import { z } from 'zod'

import { autorizaLlamadaDeLanding } from '@/lib/access/secretoEntrante'
import { COLUMNAS_PARA_RETIRAR, retirarLecturas } from '@/lib/lectura/retirar'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * «Regenerar lectura» para el panel de administración, que vive en la landing.
 *
 * Existe porque la lectura base y el retrato se escriben una vez y se guardan
 * en el portal para siempre: cada vez que se toca la voz con la que se
 * escriben (`voz.ts`), todo el mundo sigue leyendo el texto viejo. Cuando la
 * revisión de septiembre de 2026 volvió a ver «demasiada astrología» en un
 * perfil, era la lectura anterior al cambio, no el cambio. Esto va a pasar en
 * cada ajuste del prompt, y no puede depender de un `update` a mano.
 *
 * No genera nada aquí: retira la lectura y el retrato —archivándolos en
 * `reading_versions` con motivo `cambio-de-voz`, releíbles desde la app— y la
 * siguiente visita de esa persona los vuelve a escribir con la voz vigente.
 * Generar en esta petición tardaría más de un minuto y nadie quiere un botón
 * que se queda colgado. La activación de hoy también se retira.
 *
 * Misma autorización que `/api/admin/usuarios`: el secreto compartido con la
 * landing. Se identifica a la persona por correo, que es lo que el panel tiene.
 *
 *   POST /api/admin/regenerar-lectura   { "email": "..." }
 *   200 { "archivadas": ["lectura", "retrato"] }
 *   404 { "message": "…" }                         sin cuenta o sin portal
 *   409 { "message": "…" }                         no había lectura que retirar
 */

const cuerpoSchema = z.object({ email: z.email() })

export async function POST(request: Request) {
  const permiso = autorizaLlamadaDeLanding(request)
  if (!permiso.ok) {
    console.error('[api/admin/regenerar-lectura]', permiso.motivo)
    return NextResponse.json({ message: 'No autorizado' }, { status: permiso.estado })
  }

  const cuerpo = cuerpoSchema.safeParse(await request.json().catch(() => null))
  if (!cuerpo.success) {
    return NextResponse.json({ message: 'Falta el correo' }, { status: 400 })
  }

  const db = createAdminClient()
  const email = cuerpo.data.email.trim().toLowerCase()

  const { data: perfil } = await db
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  if (!perfil) {
    return NextResponse.json({ message: 'No hay una cuenta con ese correo' }, { status: 404 })
  }

  const { data: portal } = await db
    .from('portals')
    .select(COLUMNAS_PARA_RETIRAR)
    .eq('user_id', perfil.id)
    .maybeSingle()

  if (!portal) {
    return NextResponse.json(
      { message: 'Esa cuenta todavía no ha dado sus datos de nacimiento' },
      { status: 404 },
    )
  }

  const retiro = await retirarLecturas(db, portal, 'cambio-de-voz')

  if (!retiro.ok) {
    if (retiro.motivo === 'nada-que-retirar') {
      return NextResponse.json(
        {
          message: 'No había lectura que regenerar: se escribirá en su próxima visita',
        },
        { status: 409 },
      )
    }
    return NextResponse.json({ message: 'No se pudo retirar la lectura' }, { status: 503 })
  }

  return NextResponse.json({ archivadas: retiro.archivadas })
}
