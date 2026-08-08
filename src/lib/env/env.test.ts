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

  it('trata una variable VACÍA como ausente, no como inválida', async () => {
    // Los .env se escriben con marcadores vacíos. Sin esto, tener
    // `ANTHROPIC_API_KEY=` sin valor tumbaba el webhook de Stripe, que no
    // tiene ninguna relación con la IA.
    Object.assign(process.env, REQUIRED)
    process.env.ANTHROPIC_API_KEY = ''
    process.env.GEOCODING_API_KEY = '   '

    const { getServerEnv } = await import('./server')

    expect(() => getServerEnv()).not.toThrow()
    expect(getServerEnv().ANTHROPIC_API_KEY).toBeUndefined()
    expect(getServerEnv().GEOCODING_API_KEY).toBeUndefined()
  })
})

describe('requireServerEnv', () => {
  const original = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('devuelve el valor cuando está presente', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'

    const { requireServerEnv } = await import('./server')

    expect(requireServerEnv('STRIPE_SECRET_KEY', 'hablar con Stripe')).toBe('sk_test_x')
  })

  it('el error nombra la variable Y para qué hacía falta', async () => {
    // Un "falta configuración" genérico obliga a leer el código para saber qué
    // configurar. Este mensaje se entiende desde el log.
    process.env.STRIPE_SECRET_KEY = ''

    const { requireServerEnv, MissingEnvError } = await import('./server')

    expect(() => requireServerEnv('STRIPE_SECRET_KEY', 'hablar con Stripe')).toThrow(
      MissingEnvError,
    )
    expect(() => requireServerEnv('STRIPE_SECRET_KEY', 'hablar con Stripe')).toThrow(
      /STRIPE_SECRET_KEY.*hablar con Stripe/,
    )
  })
})
