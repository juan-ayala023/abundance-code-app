import type Stripe from 'stripe'
import { describe, expect, it } from 'vitest'

import { clienteSinEmail, interpretarEvento } from './entitlements'

const CREATED = 1_770_000_000 // segundos epoch
const FECHA_EVENTO = new Date(CREATED * 1000).toISOString()

function evento(type: string, object: unknown): Stripe.Event {
  return {
    id: 'evt_test',
    type,
    created: CREATED,
    data: { object },
  } as Stripe.Event
}

describe('checkout.session.completed', () => {
  it('concede acceso usando customer_email', () => {
    const r = interpretarEvento(
      evento('checkout.session.completed', {
        customer_email: 'Comprador@Example.com',
        payment_status: 'paid',
        mode: 'subscription',
        customer: 'cus_1',
        subscription: 'sub_1',
        metadata: { plan: 'base' },
      }),
    )

    expect(r).toMatchObject({
      email: 'comprador@example.com', // normalizado a minúsculas
      status: 'active',
      plan: 'base',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      eventAt: FECHA_EVENTO,
    })
  })

  it('cae a customer_details.email si no hay customer_email', () => {
    const r = interpretarEvento(
      evento('checkout.session.completed', {
        customer_email: null,
        customer_details: { email: 'otro@example.com' },
        payment_status: 'paid',
        mode: 'payment',
      }),
    )

    expect(r?.email).toBe('otro@example.com')
    expect(r?.plan).toBe('pago-unico')
  })

  it('ignora una compra sin email: no habría con qué emparejarla', () => {
    const r = interpretarEvento(
      evento('checkout.session.completed', {
        customer_email: null,
        payment_status: 'paid',
        mode: 'payment',
      }),
    )

    expect(r).toBeNull()
  })

  it('ignora un pago no completado', () => {
    const r = interpretarEvento(
      evento('checkout.session.completed', {
        customer_email: 'a@b.com',
        payment_status: 'unpaid',
        mode: 'payment',
      }),
    )

    expect(r).toBeNull()
  })
})

describe('eventos de suscripción', () => {
  function suscripcion(status: string, extra: Record<string, unknown> = {}) {
    return {
      id: 'sub_1',
      status,
      customer: { id: 'cus_1', email: 'cliente@example.com' },
      items: {
        data: [
          {
            price: { id: 'price_1', nickname: 'Mensual' },
            current_period_end: 1_780_000_000,
          },
        ],
      },
      ...extra,
    }
  }

  it('traduce una suscripción activa', () => {
    const r = interpretarEvento(
      evento('customer.subscription.updated', suscripcion('active')),
    )

    expect(r).toMatchObject({
      email: 'cliente@example.com',
      status: 'active',
      plan: 'Mensual',
      stripeSubscriptionId: 'sub_1',
      currentPeriodEnd: new Date(1_780_000_000 * 1000).toISOString(),
    })
  })

  it.each([
    ['trialing', 'trialing'],
    ['past_due', 'past_due'],
    ['canceled', 'canceled'],
    ['unpaid', 'canceled'],
    ['incomplete_expired', 'canceled'],
  ])('traduce el estado %s a %s', (stripeStatus, esperado) => {
    const r = interpretarEvento(
      evento('customer.subscription.updated', suscripcion(stripeStatus)),
    )
    expect(r?.status).toBe(esperado)
  })

  it.each(['incomplete', 'paused'])(
    'traduce %s a none, no a canceled: nunca llegó a haber acceso',
    (stripeStatus) => {
      const r = interpretarEvento(
        evento('customer.subscription.updated', suscripcion(stripeStatus)),
      )
      expect(r?.status).toBe('none')
    },
  )

  it('lee current_period_end del nivel de la suscripción si viene ahí', () => {
    const r = interpretarEvento(
      evento(
        'customer.subscription.updated',
        suscripcion('active', { current_period_end: 1_790_000_000 }),
      ),
    )

    expect(r?.currentPeriodEnd).toBe(new Date(1_790_000_000 * 1000).toISOString())
  })

  it('usa el id del precio cuando no hay nickname', () => {
    const sub = suscripcion('active')
    sub.items.data[0]!.price.nickname = null as unknown as string

    const r = interpretarEvento(evento('customer.subscription.updated', sub))
    expect(r?.plan).toBe('price_1')
  })

  /**
   * Así llega SIEMPRE un webhook de verdad: Stripe no expande `customer`.
   *
   * Los casos de arriba escriben el cliente expandido porque es cómodo, y eso
   * ocultaba que en producción ningún evento de suscripción se aplicaba.
   */
  describe('tal como llega de Stripe, con el cliente sin expandir', () => {
    const sinExpandir = () =>
      evento('customer.subscription.updated', {
        ...suscripcion('active'),
        customer: 'cus_1',
      })

    it('no puede resolverse por sí solo: no hay email en el evento', () => {
      expect(interpretarEvento(sinExpandir())).toBeNull()
    })

    it('pide el id del cliente para ir a buscarlo', () => {
      expect(clienteSinEmail(sinExpandir())).toBe('cus_1')
    })

    it('se aplica cuando quien llama aporta el email', () => {
      const r = interpretarEvento(sinExpandir(), 'Cliente@Example.com')

      expect(r).toMatchObject({
        email: 'cliente@example.com',
        status: 'active',
        stripeSubscriptionId: 'sub_1',
      })
    })

    it('no pide nada cuando el evento ya trae email', () => {
      expect(
        clienteSinEmail(evento('customer.subscription.updated', suscripcion('active'))),
      ).toBeNull()
    })

    it('no pide nada para un evento que no nos afecta', () => {
      expect(clienteSinEmail(evento('invoice.created', { customer: 'cus_1' }))).toBeNull()
    })
  })
})

describe('eventos irrelevantes', () => {
  it.each([
    'invoice.created',
    'customer.created',
    'payment_intent.succeeded',
    'charge.refunded',
  ])('%s no produce cambios', (tipo) => {
    expect(interpretarEvento(evento(tipo, {}))).toBeNull()
  })
})
