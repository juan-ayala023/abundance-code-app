import type Stripe from 'stripe'

import type { EntitlementStatus } from '@/lib/access/entitlement'

/**
 * Traduce un evento de Stripe a un cambio sobre `entitlements`.
 *
 * Se mantiene sin efectos secundarios y sin red para poder probarlo con
 * eventos de ejemplo: la lógica de "quién tiene acceso" es demasiado
 * importante como para que solo se ejercite contra Stripe en real.
 */

export type ActualizacionEntitlement = {
  email: string
  status: EntitlementStatus
  plan: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: string | null
  /** Fecha del evento, para descartar los que lleguen fuera de orden. */
  eventAt: string
}

/**
 * Estados de suscripción de Stripe traducidos a los nuestros.
 *
 * `incomplete` y `paused` van a 'none' y no a 'canceled' a propósito: nunca
 * llegó a haber acceso, así que no es una cancelación.
 */
const ESTADOS: Record<Stripe.Subscription.Status, EntitlementStatus> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'canceled',
  incomplete_expired: 'canceled',
  incomplete: 'none',
  paused: 'none',
}

/** Eventos que nos interesan. El resto se confirma y se ignora. */
export const EVENTOS_RELEVANTES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const

export function interpretarEvento(event: Stripe.Event): ActualizacionEntitlement | null {
  const eventAt = new Date(event.created * 1000).toISOString()

  switch (event.type) {
    case 'checkout.session.completed':
      return desdeCheckout(event.data.object as Stripe.Checkout.Session, eventAt)

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return desdeSuscripcion(event.data.object as Stripe.Subscription, eventAt)

    default:
      return null
  }
}

function desdeCheckout(
  session: Stripe.Checkout.Session,
  eventAt: string,
): ActualizacionEntitlement | null {
  const email = normalizarEmail(
    session.customer_email ?? session.customer_details?.email ?? null,
  )

  // Sin email no hay forma de emparejar la compra con la cuenta de Google.
  // CLAUDE.md §3 exige que la landing cree la sesión con `customer_email`.
  if (!email) return null

  // Un pago sin completar no concede nada.
  if (session.payment_status === 'unpaid') return null

  return {
    email,
    status: 'active',
    plan: leerPlan(session),
    stripeCustomerId: idDe(session.customer),
    stripeSubscriptionId: idDe(session.subscription),
    // Un pago único no tiene periodo: el acceso no caduca por fecha.
    currentPeriodEnd: null,
    eventAt,
  }
}

function desdeSuscripcion(
  sub: Stripe.Subscription,
  eventAt: string,
): ActualizacionEntitlement | null {
  // `deleted` puede llegar con estado activo; el evento manda sobre el campo.
  const email = normalizarEmail(leerEmailDeSuscripcion(sub))
  if (!email) return null

  return {
    email,
    status: ESTADOS[sub.status] ?? 'none',
    plan: sub.items.data[0]?.price?.nickname ?? sub.items.data[0]?.price?.id ?? null,
    stripeCustomerId: idDe(sub.customer),
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: leerFinDePeriodo(sub),
    eventAt,
  }
}

/**
 * El email puede venir en el cliente expandido o en los metadatos.
 *
 * Si la suscripción llega sin expandir, `customer` es solo un id y no hay
 * email: quien llame tendrá que resolverlo contra la API antes de descartarlo.
 */
function leerEmailDeSuscripcion(sub: Stripe.Subscription): string | null {
  const cliente = sub.customer

  if (typeof cliente !== 'string' && cliente && !('deleted' in cliente && cliente.deleted)) {
    const email = (cliente as Stripe.Customer).email
    if (email) return email
  }

  return sub.metadata?.email ?? null
}

/**
 * Stripe movió `current_period_end` del nivel de la suscripción al de cada
 * item. Se leen los dos para no depender de la versión de API del webhook.
 */
function leerFinDePeriodo(sub: Stripe.Subscription): string | null {
  const enSuscripcion = (sub as unknown as { current_period_end?: number })
    .current_period_end
  const enItem = sub.items?.data?.[0]?.current_period_end

  const segundos = enSuscripcion ?? enItem
  return typeof segundos === 'number' ? new Date(segundos * 1000).toISOString() : null
}

function leerPlan(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.plan ?? (session.mode === 'subscription' ? null : 'pago-unico')
}

function idDe(valor: string | { id: string } | null | undefined): string | null {
  if (!valor) return null
  return typeof valor === 'string' ? valor : valor.id
}

function normalizarEmail(email: string | null): string | null {
  const limpio = email?.trim().toLowerCase()
  return limpio ? limpio : null
}
