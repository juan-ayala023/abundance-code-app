import { NextResponse, type NextRequest } from 'next/server'

import { esRutaProtegida } from '@/lib/access/rutas'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Refresca la sesión en cada petición y cierra el paso a las rutas del
 * grupo (app) a quien no tiene sesión.
 *
 * Aquí solo se comprueba la SESIÓN, no el entitlement: consultar la base de
 * datos en el edge por cada petición saldría caro. La comprobación de compra
 * activa vive en el layout de (app), que se ejecuta una vez por navegación.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const { pathname, search } = request.nextUrl

  if (!user && esRutaProtegida(pathname)) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/activar'
    destino.search = ''
    // Para devolverlo a donde quería ir una vez identificado.
    destino.searchParams.set('next', `${pathname}${search}`)

    return NextResponse.redirect(destino)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto estáticos e imágenes.
     * El webhook de Stripe se excluye a propósito: no tiene sesión de usuario
     * y no debe pasar por el refresco de cookies.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
}
