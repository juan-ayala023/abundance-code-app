import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'

import { requireServerEnv } from '@/lib/env/server'
import { interpretarEvento } from '@/lib/stripe/entitlements'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Webhook de Stripe: la fuente de verdad del acceso (CLAUDE.md §3).
 *
 * Tres reglas que sostienen todo lo demás:
 *
 *  1. Se verifica la firma sobre el cuerpo CRUDO. Sin eso, cualquiera podría
 *     concederse una suscripción activa con un simple POST.
 *  2. Es idempotente por `stripe_events.id`. Stripe reintenta, y un reintento
 *     no puede volver a aplicar nada.
 *  3. Escribe con service_role. Ningún rol público puede tocar `entitlements`.
 *
 * El middleware excluye esta ruta a propósito: no hay sesión de usuario que
 * refrescar y no debe pasar por el ciclo de cookies.
 */

export async function POST(request: NextRequest) {
  const firma = request.headers.get('stripe-signature')
  if (!firma) {
    return NextResponse.json({ error: 'Sin firma' }, { status: 400 })
  }

  // El cuerpo debe leerse tal cual: cualquier reserialización invalida la firma.
  const cuerpo = await request.text()

  let event: Stripe.Event
  try {
    const secreto = requireServerEnv(
      'STRIPE_WEBHOOK_SECRET',
      'verificar la firma del webhook de Stripe',
    )
    event = await getStripe().webhooks.constructEventAsync(cuerpo, firma, secreto)
  } catch (error) {
    /*
     * Distinguir aquí importa. Un catch que devolviera 400 ante cualquier
     * excepción convertiría un fallo de configuración —una variable de entorno
     * ausente— en "firma no válida", y estaríamos buscando el problema en
     * Stripe cuando está en nuestro despliegue.
     */
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      console.error('[stripe/webhook] firma no válida', error.message)
      return NextResponse.json({ error: 'Firma no válida' }, { status: 400 })
    }

    console.error('[stripe/webhook] no se pudo verificar el evento', error)
    // 500 para que Stripe reintente: el evento probablemente era legítimo.
    return NextResponse.json({ error: 'Error temporal' }, { status: 500 })
  }

  const db = createAdminClient()

  // Registrar el evento ANTES de aplicarlo. La clave primaria es lo que hace
  // idempotente el reintento: si ya está, no se vuelve a procesar.
  const { error: errorRegistro } = await db
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })

  if (errorRegistro) {
    // 23505 = clave duplicada: ya lo procesamos. Se confirma y se sale.
    if (errorRegistro.code === '23505') {
      return NextResponse.json({ received: true, duplicated: true })
    }

    console.error('[stripe/webhook] no se pudo registrar el evento', errorRegistro)
    // Sin registro no hay garantía de idempotencia: mejor que Stripe reintente.
    return NextResponse.json({ error: 'Error temporal' }, { status: 500 })
  }

  const actualizacion = interpretarEvento(event)

  if (!actualizacion) {
    // Evento que no nos afecta, o sin email con el que emparejar la compra.
    // Se confirma igualmente: reintentarlo no cambiaría nada.
    return NextResponse.json({ received: true, applied: false })
  }

  /*
   * El generador de tipos de Supabase declara todos los argumentos de función
   * como `string`, sin modelar cuáles aceptan null. Estos cuatro sí lo aceptan
   * —un pago único no tiene suscripción ni fin de periodo— y la función SQL los
   * trata correctamente. El cast se acota aquí para no perder el tipado del
   * resto de la llamada.
   */
  const argumentos = {
    p_email: actualizacion.email,
    p_status: actualizacion.status,
    p_plan: actualizacion.plan,
    p_stripe_customer_id: actualizacion.stripeCustomerId,
    p_stripe_subscription_id: actualizacion.stripeSubscriptionId,
    p_current_period_end: actualizacion.currentPeriodEnd,
    p_event_at: actualizacion.eventAt,
  } satisfies Record<string, string | null>

  const { error } = await db.rpc(
    'apply_stripe_entitlement',
    argumentos as unknown as Parameters<
      typeof db.rpc<'apply_stripe_entitlement'>
    >[1],
  )

  if (error) {
    console.error('[stripe/webhook] no se pudo aplicar el entitlement', {
      eventId: event.id,
      type: event.type,
      error,
    })

    // Se borra el registro para que el reintento de Stripe pueda volver a
    // intentarlo: si no, la idempotencia bloquearía la recuperación.
    await db.from('stripe_events').delete().eq('id', event.id)

    return NextResponse.json({ error: 'Error temporal' }, { status: 500 })
  }

  return NextResponse.json({ received: true, applied: true })
}
