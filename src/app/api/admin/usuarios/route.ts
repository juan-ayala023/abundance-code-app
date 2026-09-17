import { NextResponse } from 'next/server'
import { z } from 'zod'

import { correosDeCortesia, esCortesia } from '@/lib/access/cortesia'
import { tieneAcceso } from '@/lib/access/entitlement'
import { autorizaLlamadaDeLanding } from '@/lib/access/secretoEntrante'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Quién se ha registrado en la app y quién tiene acceso — para el panel de
 * administración, que vive en la landing.
 *
 * Existe porque el panel estaba ciego, y no por un fallo suyo: la landing y la
 * app usan proyectos de Supabase distintos, así que el panel no ve ni un solo
 * usuario de la app. Y las cortesías no las vería igualmente aunque compartieran
 * base, porque no son una fila: son la variable `ACCESOS_CORTESIA` que solo lee
 * este servidor (ver `cortesia.ts`).
 *
 * Por eso el cálculo se hace aquí y se envía resuelto. La alternativa —que la
 * landing leyera esta base por su cuenta— la dejaría igual de ciega para las
 * cortesías, que son justo las que no se veían.
 *
 * Solo lectura. Conceder o revocar el acceso sigue siendo cosa de Stripe y de
 * la variable de entorno; esta ruta no escribe nada.
 */

/** Cota de seguridad: el panel pagina, y esto no puede volverse una descarga
 *  de toda la base por una llamada mal hecha. */
const MAXIMO = 500

export type AccesoDeUsuario = 'cortesia' | 'comprado' | 'inactivo' | 'sin-compra'

export type UsuarioPortal = {
  /** `null` para las cortesías que todavía no han entrado: no hay cuenta que borrar. */
  id: string | null
  email: string
  nombre: string | null
  /** `null` cuando está en la lista de cortesía pero todavía no ha entrado. */
  registradoEn: string | null
  /** Completó el onboarding: tiene carta natal generada. */
  tienePortal: boolean
  /** Última vez que inició sesión. `null` si nunca (cortesía sin entrar). */
  ultimoAccesoEn: string | null
  acceso: AccesoDeUsuario
  plan: string | null
  /** `status` del entitlement, cuando existe una compra. */
  estado: string | null
  fuente: string | null
}

function normaliza(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export async function GET(request: Request) {
  const permiso = autorizaLlamadaDeLanding(request)

  if (!permiso.ok) {
    console.error('[api/admin/usuarios]', permiso.motivo)
    return NextResponse.json({ message: 'No autorizado' }, { status: permiso.estado })
  }

  const db = createAdminClient()

  /* Las tres lecturas son independientes: en serie multiplicarían por tres la
     latencia de una pantalla que solo muestra una tabla. */
  const [perfiles, entitlements, portales, cuentas] = await Promise.all([
    db
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(MAXIMO),
    db.from('entitlements').select('email, status, plan, source, has_access').limit(MAXIMO),
    db.from('portals').select('user_id').limit(MAXIMO),
    /* La última entrada vive en auth, no en profiles. Es el dato que permite
       ver quién lleva semanas sin volver, que es lo que decide una baja. */
    db.auth.admin.listUsers({ perPage: MAXIMO }),
  ])

  const fallo = perfiles.error ?? entitlements.error ?? portales.error ?? cuentas.error

  if (fallo) {
    console.error('[api/admin/usuarios] error leyendo la base', fallo)
    return NextResponse.json({ message: 'No se pudo leer la base' }, { status: 503 })
  }

  const cortesias = new Set(correosDeCortesia())
  const conPortal = new Set((portales.data ?? []).map((fila) => fila.user_id))
  const ultimoAcceso = new Map(
    (cuentas.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
  )

  const porEmail = new Map(
    (entitlements.data ?? []).map((fila) => [normaliza(fila.email), fila]),
  )

  const usuarios: UsuarioPortal[] = (perfiles.data ?? []).map((perfil) => {
    const email = normaliza(perfil.email)
    const compra = porEmail.get(email) ?? null

    /* Mismo orden que `resolveAccess`: la compra manda; la cortesía solo cuenta
       si no hay compra o si la compra ya no da acceso. */
    const acceso: AccesoDeUsuario = compra && tieneAcceso(compra)
      ? 'comprado'
      : cortesias.has(email)
        ? 'cortesia'
        : compra
          ? 'inactivo'
          : 'sin-compra'

    return {
      id: perfil.id,
      email: perfil.email,
      nombre: perfil.full_name,
      registradoEn: perfil.created_at,
      tienePortal: conPortal.has(perfil.id),
      ultimoAccesoEn: ultimoAcceso.get(perfil.id) ?? null,
      acceso,
      plan: compra?.plan ?? null,
      estado: compra?.status ?? null,
      fuente: compra?.source ?? null,
    }
  })

  /* Cortesías concedidas a alguien que todavía no ha entrado. Sin esto el panel
     seguiría mintiendo por omisión: dirías que has dado tres accesos y verías
     dos, sin nada que explicara el tercero. */
  const registrados = new Set(usuarios.map((usuario) => normaliza(usuario.email)))

  for (const email of cortesias) {
    if (registrados.has(email)) continue

    usuarios.push({
      id: null,
      email,
      nombre: null,
      registradoEn: null,
      tienePortal: false,
      ultimoAccesoEn: null,
      acceso: 'cortesia',
      plan: null,
      estado: null,
      fuente: null,
    })
  }

  const cuenta = (valor: AccesoDeUsuario) =>
    usuarios.filter((usuario) => usuario.acceso === valor).length

  return NextResponse.json({
    usuarios,
    resumen: {
      total: usuarios.length,
      cortesia: cuenta('cortesia'),
      comprado: cuenta('comprado'),
      inactivo: cuenta('inactivo'),
      sinCompra: cuenta('sin-compra'),
      /* Cuántos han llegado a generar su carta. Es la métrica de si el producto
         se está usando, distinta de cuántos pueden entrar. */
      conPortal: usuarios.filter((usuario) => usuario.tienePortal).length,
    },
  })
}

/**
 * Borra la cuenta de un usuario de la app — para el panel de administración.
 *
 * Es un borrado de verdad: `auth.users` con cascada a perfil, portal, carta,
 * lecturas y consultas. Lo que NO borra es el registro de compra en la landing
 * ni, si lo hubiera, nada en Stripe: quien tenga una suscripción activa debe
 * cancelarse en Stripe antes, y eso lo comprueba la landing, que es quien
 * conoce las suscripciones, antes de llamar aquí.
 *
 * Si el correo está en la lista de cortesía, se borra igual pero se avisa: al
 * volver a entrar con Google tendría acceso otra vez, porque la cortesía no
 * vive en la base sino en ACCESOS_CORTESIA. Quitarlo de ahí es cosa de Railway.
 */
const borradoSchema = z.object({ id: z.string().uuid() })

export async function DELETE(request: Request) {
  const permiso = autorizaLlamadaDeLanding(request)

  if (!permiso.ok) {
    console.error('[api/admin/usuarios] DELETE', permiso.motivo)
    return NextResponse.json({ message: 'No autorizado' }, { status: permiso.estado })
  }

  const cuerpo = borradoSchema.safeParse(await request.json().catch(() => null))
  if (!cuerpo.success) {
    return NextResponse.json({ message: 'Falta el id del usuario' }, { status: 400 })
  }

  const db = createAdminClient()
  const { id } = cuerpo.data

  const { data: perfil } = await db.from('profiles').select('email').eq('id', id).maybeSingle()
  if (!perfil) {
    return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
  }

  const { error } = await db.auth.admin.deleteUser(id)
  if (error) {
    console.error('[api/admin/usuarios] no se pudo borrar', { id, error })
    return NextResponse.json({ message: 'No se pudo borrar el usuario' }, { status: 500 })
  }

  console.log(`[api/admin/usuarios] borrado ${perfil.email} (${id}) por el panel`)

  return NextResponse.json({
    ok: true,
    email: perfil.email,
    /* Para que el panel avise: seguirá entrando mientras esté en la lista. */
    cortesia: esCortesia(perfil.email),
  })
}
