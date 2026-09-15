'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/** Cierra la sesión y devuelve al usuario al inicio del flujo de acceso. */
export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/activar')
}

/**
 * Cierra la sesión y vuelve a /activar con el token intacto, para entrar con
 * otra cuenta de Google y canjearlo ahí.
 *
 * Es la salida de la pantalla de confirmación: quien llega con un token y una
 * sesión abierta de antes puede no querer atar la compra a esa sesión. El
 * 15 de septiembre de 2026 la primera compra real quedó vinculada a la cuenta
 * que estaba abierta en el navegador, no a la de quien pagó.
 */
export async function cambiarDeCuenta(token: string, next: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const destino = new URLSearchParams({ token })
  if (next && next !== '/portal') destino.set('next', next)

  redirect(`/activar?${destino.toString()}`)
}
