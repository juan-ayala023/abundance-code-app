import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { publicEnvSchema } from './public'

describe('publicEnvSchema', () => {
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    NEXT_PUBLIC_LANDING_URL: 'https://abundancecode.com',
  }

  it('acepta una configuración válida', () => {
    expect(publicEnvSchema.parse(valid)).toEqual(valid)
  })

  it('rechaza una URL de Supabase malformada', () => {
    expect(() =>
      publicEnvSchema.parse({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'no-es-una-url' }),
    ).toThrow()
  })

  it('rechaza una anon key vacía', () => {
    expect(() =>
      publicEnvSchema.parse({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }),
    ).toThrow()
  })
})

describe('getServerEnv', () => {
  const REQUIRED = {
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_x',
    ANTHROPIC_API_KEY: 'sk-ant-x',
  }

  const original = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('lanza error nombrando las variables que faltan', async () => {
    for (const key of Object.keys(REQUIRED)) delete process.env[key]

    const { getServerEnv } = await import('./server')

    expect(() => getServerEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('devuelve las variables cuando están todas presentes', async () => {
    Object.assign(process.env, REQUIRED)

    const { getServerEnv } = await import('./server')

    expect(getServerEnv().SUPABASE_SERVICE_ROLE_KEY).toBe('service-role')
  })

  it('no exige las variables opcionales', async () => {
    Object.assign(process.env, REQUIRED)
    delete process.env.OPENAI_API_KEY
    delete process.env.ACCESS_SHARED_SECRET

    const { getServerEnv } = await import('./server')

    expect(getServerEnv().OPENAI_API_KEY).toBeUndefined()
  })
})
