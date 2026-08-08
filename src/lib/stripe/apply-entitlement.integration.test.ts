import { createClient } from '@supabase/supabase-js'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Verifica apply_stripe_entitlement() contra la base real.
 *
 * Lo que se prueba no es que la función escriba —eso es lo fácil— sino que
 * DESCARTA los eventos que llegan fuera de orden. Stripe no garantiza el orden
 * de entrega, y sin esta defensa una cancelación podría quedar pisada por un
 * "updated" retrasado y devolverle el acceso a quien lo canceló.
 */

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const stamp = Date.now()
const email = `stripe-${stamp}@example.com`

const T1 = '2026-01-01T10:00:00.000Z'
const T2 = '2026-01-01T11:00:00.000Z'

async function aplicar(params: {
  status: string
  plan?: string | null
  eventAt: string
  subscriptionId?: string | null
  periodEnd?: string | null
}) {
  const { error } = await db.rpc('apply_stripe_entitlement', {
    p_email: email,
    p_status: params.status,
    p_plan: params.plan ?? null,
    p_stripe_customer_id: 'cus_test',
    p_stripe_subscription_id: params.subscriptionId ?? 'sub_test',
    p_current_period_end: params.periodEnd ?? null,
    p_event_at: params.eventAt,
  } as never)

  if (error) throw new Error(error.message)
}

async function leer() {
  const { data } = await db
    .from('entitlements')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  return data
}

afterAll(async () => {
  await db.from('entitlements').delete().eq('email', email)
})

describe('apply_stripe_entitlement', () => {
  it('crea el entitlement con el primer evento', async () => {
    await aplicar({ status: 'active', plan: 'mensual', eventAt: T1 })

    const fila = await leer()
    expect(fila?.status).toBe('active')
    expect(fila?.plan).toBe('mensual')
    expect(fila?.source).toBe('stripe')
    expect(fila?.user_id).toBeNull()
  })

  it('aplica un evento posterior', async () => {
    await aplicar({ status: 'canceled', eventAt: T2 })

    const fila = await leer()
    expect(fila?.status).toBe('canceled')
  })

  it('DESCARTA un evento anterior que llega tarde', async () => {
    // Este es el caso real: un "updated" con estado activo, emitido antes de la
    // cancelación pero entregado después.
    await aplicar({ status: 'active', eventAt: T1 })

    const fila = await leer()
    expect(fila?.status).toBe('canceled') // sigue cancelado
  })

  it('conserva la vinculación con la cuenta al actualizar', async () => {
    // El webhook no debe deshacer lo que hizo claim_entitlement().
    const usuarioFalso = '00000000-0000-0000-0000-000000000000'
    await db.from('entitlements').update({ user_id: null }).eq('email', email)

    const { data: users } = await db.auth.admin.listUsers()
    const alguno = users?.users?.[0]?.id ?? usuarioFalso

    if (alguno !== usuarioFalso) {
      await db.from('entitlements').update({ user_id: alguno }).eq('email', email)
      await aplicar({ status: 'active', eventAt: '2026-02-01T00:00:00.000Z' })

      const fila = await leer()
      expect(fila?.user_id).toBe(alguno)
      expect(fila?.status).toBe('active')
    }
  })

  it('no borra datos anteriores con un evento que llega incompleto', async () => {
    await aplicar({
      status: 'active',
      plan: 'anual',
      eventAt: '2026-03-01T00:00:00.000Z',
    })
    await aplicar({
      status: 'past_due',
      plan: null,
      eventAt: '2026-03-02T00:00:00.000Z',
    })

    const fila = await leer()
    expect(fila?.status).toBe('past_due')
    expect(fila?.plan).toBe('anual') // no se pierde por venir null
  })
})
