import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getPublicEnv } from '@/lib/env/public'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Refresca la sesión de Supabase y devuelve el usuario.
 *
 * Devuelve también la respuesta porque las cookies renovadas viajan en ella:
 * si se descarta, el usuario pierde la sesión en la siguiente petición.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const env = getPublicEnv()

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // No usar getSession() aquí: no revalida el JWT contra el servidor de auth.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
