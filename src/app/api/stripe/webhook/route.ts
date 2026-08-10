import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'

import { requireServerEnv } from '@/lib/env/server'
import { clienteSinEmail, interpretarEvento } from '@/lib/stripe/entitlements'
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

/**
 * Margen sobre el valor por defecto (15 s). El manejador es rápido, pero entre
 * un arranque en frío y dos viajes a la base de datos puede rozarlo, y agotar
 * el tiempo aquí significa que Stripe da el evento por fallido. Se recupera
 * —hay reintento y el registro se borra al fallar— pero el acceso del cliente
 * llegaría con retraso, que es justo lo que no puede pasar tras un pago.
 */
export const maxDuration = 30

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

  const actualizacion = await interpretarConEmail(event)

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

/**
 * Interpreta el evento, yendo a buscar el email del cliente si no viene.
 *
 * Stripe **no expande `customer`** en los webhooks: llega como `"cus_123"`. Sin
 * este paso, un `customer.subscription.deleted` real no tiene email por ningún
 * lado, se descarta como «evento que no nos afecta» y la cancelación no se
 * aplica jamás — el cliente deja de pagar y conserva el acceso.
 *
 * Se resuelve aquí y no dentro de `interpretarEvento` para que aquella siga sin
 * red y se pueda probar con eventos escritos a mano.
 */
async function interpretarConEmail(event: Stripe.Event) {
  const directo = interpretarEvento(event)
  if (directo) return directo

  const clienteId = clienteSinEmail(event)
  if (!clienteId) return null

  let email: string | null = null

  try {
    const cliente = await getStripe().customers.retrieve(clienteId)
    // Un cliente borrado no expone email; no hay a quién emparejar.
    email = 'deleted' in cliente && cliente.deleted ? null : (cliente.email ?? null)
  } catch (error) {
    /*
     * No se propaga. Devolver 500 haría que Stripe reintentara indefinidamente
     * un evento que quizá nunca podamos resolver, y el registro de idempotencia
     * ya está escrito. Queda en el log con el id del evento para poder
     * reprocesarlo a mano.
     */
    console.error('[stripe/webhook] no se pudo resolver el email del cliente', {
      eventId: event.id,
      type: event.type,
      clienteId,
      error,
    })
    return null
  }

  if (!email) {
    console.error('[stripe/webhook] el cliente de Stripe no tiene email', {
      eventId: event.id,
      type: event.type,
      clienteId,
    })
    return null
  }

  return interpretarEvento(event, email)
}
