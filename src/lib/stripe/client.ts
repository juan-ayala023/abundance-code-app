import 'server-only'

import Stripe from 'stripe'

import { requireServerEnv } from '@/lib/env/server'

/**
 * Cliente de Stripe.
 *
 * Esta app NO cobra: solo verifica firmas de webhook y abre el portal de
 * facturación (CLAUDE.md §1). Cualquier cosa que parezca un cobro aquí es
 * una señal de que algo se ha desviado del diseño.
 */
let cliente: Stripe | null = null

export function getStripe(): Stripe {
  if (cliente) return cliente

  cliente = new Stripe(requireServerEnv('STRIPE_SECRET_KEY', 'hablar con Stripe'), {
    // Sin fijar versión de API: se usa la de la cuenta, que es la misma con la
    // que Stripe serializa los webhooks. Fijar una distinta aquí haría que el
    // payload y el SDK dejaran de coincidir.
    typescript: true,
  })

  return cliente
}
