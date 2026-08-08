import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Verifica RLS contra el proyecto Supabase real.
 *
 * El objetivo no es comprobar que las políticas existen, sino que un usuario
 * autenticado NO puede leer ni escribir los datos de otro. Se crean dos
 * usuarios de verdad y se ataca desde uno al otro.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type TestUser = {
  id: string
  email: string
  client: SupabaseClient
}

const PASSWORD = 'Test-Password-1234!'
const stamp = Date.now()

async function createTestUser(label: string): Promise<TestUser> {
  const email = `rls-${label}-${stamp}@example.com`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw new Error(`No se pudo crear ${label}: ${error.message}`)

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (signInError) throw new Error(`No se pudo autenticar ${label}: ${signInError.message}`)

  return { id: data.user!.id, email, client }
}

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
})

afterAll(async () => {
  for (const user of [alice, bob]) {
    if (user?.id) await admin.auth.admin.deleteUser(user.id)
  }
  await admin.from('entitlements').delete().like('email', `rls-%-${stamp}@example.com`)
})

describe('profiles', () => {
  it('el trigger crea el perfil al nacer el usuario', async () => {
    const { data, error } = await alice.client
      .from('profiles')
      .select('id, email, locale')
      .eq('id', alice.id)
      .single()

    expect(error).toBeNull()
    expect(data?.email).toBe(alice.email)
    expect(data?.locale).toBe('es')
  })

  it('un usuario no ve el perfil de otro', async () => {
    const { data, error } = await bob.client
      .from('profiles')
      .select('id')
      .eq('id', alice.id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe('portals', () => {
  it('el dueño puede crear su portal', async () => {
    const { error } = await alice.client
      .from('portals')
      .insert({ user_id: alice.id, full_name: 'Alice', birth_city: 'Bogotá' })

    expect(error).toBeNull()
  })

  it('un usuario NO puede crear un portal a nombre de otro', async () => {
    const { error } = await bob.client
      .from('portals')
      .insert({ user_id: alice.id, full_name: 'Suplantación' })

    // 42501 = violación de política RLS.
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('un usuario NO ve el portal de otro', async () => {
    const { data, error } = await bob.client.from('portals').select('id, full_name')

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('un usuario NO puede modificar el portal de otro', async () => {
    const { data, error } = await bob.client
      .from('portals')
      .update({ full_name: 'Secuestrado' })
      .eq('user_id', alice.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([]) // 0 filas afectadas

    const { data: intacto } = await alice.client
      .from('portals')
      .select('full_name')
      .single()
    expect(intacto?.full_name).toBe('Alice')
  })

  it('rechaza una hora de nacimiento con time_unknown', async () => {
    const { error } = await alice.client
      .from('portals')
      .update({ time_unknown: true, birth_time: '12:00:00' })
      .eq('user_id', alice.id)

    expect(error).not.toBeNull() // constraint portals_hora_coherente
  })

  it('rechaza una latitud fuera de rango', async () => {
    const { error } = await alice.client
      .from('portals')
      .update({ lat: 120 })
      .eq('user_id', alice.id)

    expect(error).not.toBeNull()
  })
})

describe('entitlements', () => {
  beforeAll(async () => {
    const { error } = await admin
      .from('entitlements')
      .insert({ email: alice.email, status: 'active', plan: 'base', source: 'test' })
    if (error) throw new Error(`No se pudo sembrar el entitlement: ${error.message}`)
  })

  it('el dueño lo ve por coincidencia de email, sin estar vinculado aún', async () => {
    const { data, error } = await alice.client
      .from('entitlements')
      .select('email, status, user_id')
      .single()

    expect(error).toBeNull()
    expect(data?.status).toBe('active')
    expect(data?.user_id).toBeNull()
  })

  it('otro usuario NO lo ve', async () => {
    const { data, error } = await bob.client.from('entitlements').select('email')

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('el usuario NO puede escribir en entitlements', async () => {
    const { error } = await alice.client
      .from('entitlements')
      .insert({ email: `forjado-${stamp}@example.com`, status: 'active' })

    expect(error).not.toBeNull()
  })

  it('el usuario NO puede concederse acceso modificando su fila', async () => {
    const { error } = await alice.client
      .from('entitlements')
      .update({ status: 'active', current_period_end: '2099-01-01' })
      .eq('email', alice.email)

    expect(error).not.toBeNull()
  })

  it('claim_entitlement vincula la compra con la cuenta', async () => {
    const { data, error } = await alice.client.rpc('claim_entitlement')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0]?.user_id).toBe(alice.id)
  })

  it('claim_entitlement devuelve lista vacía a quien no compró', async () => {
    const { data, error } = await bob.client.rpc('claim_entitlement')

    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe('stripe_events', () => {
  it('no es accesible para un usuario autenticado', async () => {
    const { error } = await alice.client.from('stripe_events').select('id')

    expect(error).not.toBeNull()
  })

  it('no es accesible de forma anónima', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await anon.from('stripe_events').select('id')

    expect(error).not.toBeNull()
  })
})

describe('acceso anónimo', () => {
  it('un visitante sin sesión no ve ningún portal', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await anon.from('portals').select('id')

    // Sin GRANT a anon: o error de permisos, o cero filas. Nunca datos.
    expect(data ?? []).toEqual([])
    if (error) expect(error.code).toBeDefined()
  })
})
