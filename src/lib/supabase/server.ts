import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { getPublicEnv } from '@/lib/env/public'
import { getServerEnv } from '@/lib/env/server'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Cliente de servidor ligado a la sesión del usuario (respeta RLS).
 * Úsalo en Server Components, Server Actions y Route Handlers.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const env = getPublicEnv()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Los Server Components no pueden escribir cookies. El refresco de
            // sesión lo hace el middleware, así que ignorar aquí es correcto.
          }
        },
      },
    },
  )
}

/**
 * Cliente administrativo: SALTA RLS. Solo para el webhook de Stripe y tareas
 * de sistema equivalentes. Nunca lo expongas a una ruta que reciba input de
 * usuario sin autorizar antes.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv()

  return createSupabaseClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
