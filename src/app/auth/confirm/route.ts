import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

import { destinoTrasEntrar } from '@/lib/access/destino'
import { resolveAccess } from '@/lib/access/entitlement'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/validation/schemas'

/**
 * Entrada por el enlace del correo, válida desde cualquier navegador.
 *
 * El enlace mágico clásico (`/auth/callback?code=…`) usa PKCE: el código solo
 * lo puede canjear el navegador que pidió el correo, porque el secreto vive en
 * sus cookies. Andrea pidió el enlace en el ordenador y lo abrió en el móvil
 * (16 sept 2026): el canje fallaba, volvía a la pantalla de acceso, pedía otro
 * correo… y así en bucle.
 *
 * Con `token_hash` no hace falta ese secreto: Supabase verifica el hash y crea
 * la sesión aquí mismo, en el navegador que abra el enlace, sea cual sea. Para
 * usarlo, la plantilla «Magic Link» de Supabase (Authentication → Email
 * Templates) tiene que enlazar a
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
 *
 * en vez de a {{ .ConfirmationURL }}. Mientras la plantilla no cambie, el
 * enlace sigue llegando a /auth/callback y todo funciona como antes.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = resolveOrigin(request)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = destinoDesde(searchParams.get('next'), origin)

  if (!tokenHash || !type) {
    console.warn('[auth/confirm] llamada sin token_hash o sin type')
    return NextResponse.redirect(`${origin}/activar?error=sin_codigo`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    console.error('[auth/confirm] falló la verificación del enlace', error)
    return NextResponse.redirect(`${origin}/activar?error=sesion`)
  }

  const access = await resolveAccess()

  switch (access.kind) {
    case 'concedido':
      return NextResponse.redirect(`${origin}${await destinoTrasEntrar(supabase, next)}`)
    case 'sin-compra':
      return NextResponse.redirect(`${origin}/activar/vincular`)
    case 'inactivo':
      return NextResponse.redirect(`${origin}/activar/vincular?estado=inactivo`)
    default:
      console.error('[auth/confirm] sin sesión después de verificar el enlace')
      return NextResponse.redirect(`${origin}/activar?error=sesion`)
  }
}

/**
 * A dónde ir después de entrar.
 *
 * La plantilla manda `next={{ .RedirectTo }}`, y `RedirectTo` es la URL
 * completa que pidió el cliente: `https://app…/auth/callback?next=/activar?token=…`.
 * De ahí se saca el `next` interior (que es donde viaja el token de compra).
 * Si llega una ruta relativa, se usa tal cual; cualquier otra cosa, al portal.
 */
function destinoDesde(valor: string | null, origin: string): string {
  if (!valor) return '/portal'
  if (valor.startsWith('/')) return safeNextPath(valor, '/portal')
  try {
    const url = new URL(valor)
    if (url.origin === origin) {
      const interior = url.searchParams.get('next')
      if (interior) return safeNextPath(interior, '/portal')
      return safeNextPath(url.pathname + url.search, '/portal')
    }
  } catch {
    /* no es una URL */
  }
  return '/portal'
}

function resolveOrigin(request: NextRequest): string {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (!forwardedHost) return origin
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https'
  return `${protocol}://${forwardedHost}`
}
