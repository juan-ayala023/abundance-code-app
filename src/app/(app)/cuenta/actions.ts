'use server'

import { redirect } from 'next/navigation'

import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { urlDelPortalDeFacturacion } from '@/lib/access/landing'

/**
 * Lleva al portal de facturación de Stripe.
 *
 * Cancelar, cambiar la tarjeta y ver facturas son tres pantallas que **no hay
 * que construir**: las sirve Stripe, y el backend de la landing es quien abre
 * la sesión porque es quien tiene el `stripe_customer_id`. Esta app no toca
 * Stripe ni necesita ninguna de sus claves.
 *
 * El correo sale de la sesión, nunca de un campo del formulario: si viniera del
 * cliente, cualquiera podría pedir el portal de otra persona y acabar viendo
 * —y cancelando— una suscripción ajena.
 */
export async function abrirPortalDeFacturacion() {
  const acceso = await resolveAccess()
  const entitlement = entitlementDe(acceso)

  if (!entitlement) redirect('/cuenta?portal=sin-compra')

  const url = await urlDelPortalDeFacturacion(entitlement.email)

  // Sin URL no se inventa nada: se vuelve diciendo que no se pudo.
  if (!url) redirect('/cuenta?portal=error')

  redirect(url)
}
