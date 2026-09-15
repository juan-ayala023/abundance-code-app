import 'server-only'

import type { createClient } from '@/lib/supabase/server'

type Cliente = Awaited<ReturnType<typeof createClient>>

/**
 * A dónde mandar a alguien que acaba de entrar.
 *
 * Quien todavía no tiene datos de nacimiento va **al formulario**, no al
 * portal: el portal sin carta es una pantalla con una sola tarjeta que dice
 * «completa tus datos», y el comprador nuevo —que acaba de pagar y quiere ver
 * algo— no debería tener que encontrarla y pulsarla.
 *
 * Solo se aplica cuando el destino es el genérico (`/portal`). Si la persona
 * pidió una ruta concreta, se respeta. Y solo se decide aquí, en la entrada:
 * quien más tarde navegue a `/portal` sin datos sigue viendo la tarjeta, sin
 * quedar atrapado en el formulario.
 */
export async function destinoTrasEntrar(supabase: Cliente, next: string): Promise<string> {
  if (next !== '/portal') return next

  const { data } = await supabase.from('portals').select('birth_date').maybeSingle()

  return data?.birth_date ? '/portal' : '/onboarding'
}
