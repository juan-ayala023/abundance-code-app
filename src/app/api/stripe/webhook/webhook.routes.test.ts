import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Webhook de Stripe, de punta a punta contra el servidor de producción.
 *
 * Los eventos se firman aquí con el mismo algoritmo que usa Stripe, así que no
 * hace falta el CLI ni una cuenta conectada: se ejercita el camino real —firma,
 * idempotencia y escritura— y no una imitación.
 */

const BASE_URL = 'http://127.0.0.1:3100'
const WEBHOOK_URL = `${BASE_URL}/api/stripe/webhook`

const secret = process.env.STRIPE_WEBHOOK_SECRET!
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const stamp = Date.now()
const email = `webhook-${stamp}@example.com`
const idsUsados: string[] = []

function construirEvento(id: string, type: string, object: unknown) {
  idsUsados.push(id)
  return JSON.stringify({
    id,
    object: 'event',
    type,
    created: Math.floor(Date.now() / 1000),
    data: { object },
  })
}

async function enviar(payload: string, opciones?: { firma?: string | null }) {
  const firma =
    opciones && 'firma' in opciones
      ? opciones.firma
      : stripe.webhooks.generateTestHeaderString({ payload, secret })

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(firma ? { 'stripe-signature': firma } : {}),
    },
    body: payload,
  })

  return { status: res.status, body: await res.json() }
}

afterAll(async () => {
  await db.from('entitlements').delete().eq('email', email)
  if (idsUsados.length > 0) {
    await db.from('stripe_events').delete().in('id', idsUsados)
  }
})

describe('verificación de firma', () => {
  it('rechaza una petición sin firma', async () => {
    const { status } = await enviar(
      construirEvento(`evt_sin_firma_${stamp}`, 'checkout.session.completed', {}),
      { firma: null },
    )

    expect(status).toBe(400)
  })

  it('rechaza una firma falsificada', async () => {
    // Sin esta comprobación, cualquiera se concedería acceso con un POST.
    const { status } = await enviar(
      construirEvento(`evt_firma_mala_${stamp}`, 'checkout.session.completed', {
        customer_email: email,
        payment_status: 'paid',
        mode: 'payment',
      }),
      { firma: 't=1,v1=falsificada' },
    )

    expect(status).toBe(400)
  })

  it('rechaza una firma válida sobre OTRO contenido', async () => {
    // Firma legítima pero de un payload distinto: el ataque de sustitución.
    const original = construirEvento(`evt_a_${stamp}`, 'checkout.session.completed', {
      customer_email: 'inocente@example.com',
      payment_status: 'paid',
      mode: 'payment',
    })
    const firmaDeOtro = stripe.webhooks.generateTestHeaderString({
      payload: original,
      secret,
    })

    const manipulado = construirEvento(`evt_b_${stamp}`, 'checkout.session.completed', {
      customer_email: email,
      payment_status: 'paid',
      mode: 'payment',
    })

    const { status } = await enviar(manipulado, { firma: firmaDeOtro })
    expect(status).toBe(400)
  })
})

describe('compra completada', () => {
  const idEvento = `evt_compra_${stamp}`

  it('concede el acceso', async () => {
    const { status, body } = await enviar(
      construirEvento(idEvento, 'checkout.session.completed', {
        customer_email: email,
        payment_status: 'paid',
        mode: 'subscription',
        customer: 'cus_test',
        subscription: 'sub_test',
        metadata: { plan: 'base' },
      }),
    )

    expect(status).toBe(200)
    expect(body.applied).toBe(true)

    const { data } = await db
      .from('entitlements')
      .select('status, plan, source')
      .eq('email', email)
      .single()

    expect(data?.status).toBe('active')
    expect(data?.plan).toBe('base')
    expect(data?.source).toBe('stripe')
  })

  it('el reenvío del mismo evento no vuelve a aplicarse', async () => {
    // Stripe reintenta ante cualquier duda. Un reintento no puede duplicar nada.
    const { status, body } = await enviar(
      construirEvento(idEvento, 'checkout.session.completed', {
        customer_email: email,
        payment_status: 'paid',
        mode: 'subscription',
        metadata: { plan: 'OTRO-PLAN' },
      }),
    )

    expect(status).toBe(200)
    expect(body.duplicated).toBe(true)

    const { data } = await db
      .from('entitlements')
      .select('plan')
      .eq('email', email)
      .single()

    expect(data?.plan).toBe('base') // no lo pisó el reenvío
  })
})

describe('eventos que no conceden nada', () => {
  it('acepta y descarta un evento irrelevante', async () => {
    const { status, body } = await enviar(
      construirEvento(`evt_irrelevante_${stamp}`, 'invoice.created', {}),
    )

    expect(status).toBe(200)
    expect(body.applied).toBe(false)
  })

  it('acepta y descarta una compra sin email', async () => {
    // No hay con qué emparejarla. Se confirma igual: reintentarlo no ayudaría.
    const { status, body } = await enviar(
      construirEvento(`evt_sin_email_${stamp}`, 'checkout.session.completed', {
        customer_email: null,
        payment_status: 'paid',
        mode: 'payment',
      }),
    )

    expect(status).toBe(200)
    expect(body.applied).toBe(false)
  })
})
