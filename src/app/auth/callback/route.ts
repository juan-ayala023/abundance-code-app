import { NextResponse, type NextRequest } from 'next/server'

import { resolveAccess } from '@/lib/access/entitlement'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/validation/schemas'

/**
 * Retorno del login con Google.
 *
 * Supabase redirige aquí con un `code` que hay que canjear por una sesión.
 * Tras canjearlo se resuelve el acceso y se decide el destino: nunca se deja
 * al usuario en una página en blanco ni en un error sin salida (CLAUDE.md §3).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = resolveOrigin(request)

  // Google devuelve `error=access_denied` si el usuario cancela el consentimiento.
  const oauthError = searchParams.get('error')
  if (oauthError) {
    console.warn('[auth/callback] el proveedor devolvió un error', {
      error: oauthError,
      description: searchParams.get('error_description'),
    })
    return NextResponse.redirect(`${origin}/activar?error=cancelado`)
  }

  const code = searchParams.get('code')
  if (!code) {
    console.warn('[auth/callback] llamada sin código de autorización')
    return NextResponse.redirect(`${origin}/activar?error=sin_codigo`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Detalle completo al log, mensaje accionable al usuario.
    console.error('[auth/callback] falló el canje del código', error)
    return NextResponse.redirect(`${origin}/activar?error=sesion`)
  }

  const next = safeNextPath(searchParams.get('next'), '/portal')
  const access = await resolveAccess()

  switch (access.kind) {
    case 'concedido':
      return NextResponse.redirect(`${origin}${next}`)
    case 'sin-compra':
      return NextResponse.redirect(`${origin}/activar/vincular`)
    case 'inactivo':
      return NextResponse.redirect(`${origin}/activar/vincular?estado=inactivo`)
    default:
      // La sesión se acaba de crear; llegar aquí significa que se perdió.
      console.error('[auth/callback] sin sesión después de canjear el código')
      return NextResponse.redirect(`${origin}/activar?error=sesion`)
  }
}

/**
 * En despliegues detrás de proxy (Vercel), `request.url` trae el host interno.
 * El host público viaja en `x-forwarded-host`, y sin esto la redirección
 * llevaría al usuario a una URL que no existe de cara a fuera.
 */
function resolveOrigin(request: NextRequest): string {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')

  if (!forwardedHost) return origin

  const protocol = request.headers.get('x-forwarded-proto') ?? 'https'
  return `${protocol}://${forwardedHost}`
}
