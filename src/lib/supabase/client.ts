'use client'

import { createBrowserClient } from '@supabase/ssr'

import { getPublicEnv } from '@/lib/env/public'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Cliente de navegador. Solo clave anon: toda la seguridad real vive en RLS.
 */
export function createClient() {
  const env = getPublicEnv()

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
