'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/** Cierra la sesión y devuelve al inicio del flujo de acceso. */
export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/activar')
}
