import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetServerEnvCache } from '@/lib/env/server'

/**
 * El cliente del backend de la landing.
 *
 * Se prueba contra respuestas HTTP fabricadas, no contra su servidor: lo que
 * hay que asegurar es que **cada código de respuesta lleva al usuario a algún
 * sitio con salida**. Un 410 y un 404 se parecen mucho desde el código y no se
 * parecen en nada desde la persona que acaba de pagar: uno tiene arreglo —pedir
 * otro enlace— y el otro no.
 */

const RESPUESTA = {
  email: 'maria@gmail.com',
  name: 'María',
  plan: 'monthly',
  status: 'active',
  source: 'stripe',
  currentPeriodEnd: '2026-09-04T20:15:26.918+00:00',
  hasAccess: true,
  utmCampaign: 'hero',
}

function responder(status: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function importarModulo() {
  vi.resetModules()
  return import('./landing')
}

beforeEach(() => {
  process.env.LANDING_API_URL = 'https://api.abundacecode.test/'
  process.env.APP_SHARED_SECRET = 'secreto-de-prueba'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-prueba'
  resetServerEnvCache()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('canjearToken', () => {
  it('devuelve el acceso y manda el secreto y el id de usuario', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(responder(200, { ...RESPUESTA, alreadyRedeemed: false }))
    vi.stubGlobal('fetch', fetchFalso)

    const { canjearToken } = await importarModulo()
    const r = await canjearToken('tok_123', 'user-1')

    expect(r).toMatchObject({ ok: true, acceso: { email: 'maria@gmail.com', hasAccess: true } })

    const [url, init] = fetchFalso.mock.calls[0]!
    // La barra final de la variable de entorno no puede duplicarse en la ruta.
    expect(url).toBe('https://api.abundacecode.test/api/access/redeem')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secreto-de-prueba')
    expect(JSON.parse(init.body as string)).toEqual({ token: 'tok_123', appUserId: 'user-1' })
  })

  /*
   * El contrato lo subraya: un token ya canjeado NO es un error. El usuario
   * puede recargar o volver a abrir el enlace del correo, y su acceso existe.
   */
  it('deja entrar cuando el token ya se había canjeado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        responder(200, { ...RESPUESTA, alreadyRedeemed: true, redeemedAt: '2026-08-09T10:00:00Z' }),
      ),
    )

    const { canjearToken } = await importarModulo()
    const r = await canjearToken('tok_123', 'user-1')

    expect(r.ok).toBe(true)
    if (r.ok) expect(r.acceso.alreadyRedeemed).toBe(true)
  })

  it('distingue el token caducado y conserva el email para reenviarlo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        responder(410, { message: 'caducó', reason: 'expired', email: 'maria@gmail.com' }),
      ),
    )

    const { canjearToken } = await importarModulo()
    const r = await canjearToken('tok_viejo', 'user-1')

    expect(r).toEqual({ ok: false, fallo: { motivo: 'caducado', email: 'maria@gmail.com' } })
  })

  it('distingue el token inexistente, que no tiene arreglo por reenvío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responder(404, { reason: 'not_found' })))

    const { canjearToken } = await importarModulo()
    expect(await canjearToken('nada', 'user-1')).toEqual({
      ok: false,
      fallo: { motivo: 'no-encontrado' },
    })
  })

  /*
   * 401 y 503 son problemas entre los dos equipos —secreto mal puesto de un
   * lado o del otro—, no del usuario. Se separan de `error` para que el log
   * diga dónde mirar.
   */
  it.each([401, 503])('trata el %i como falta de configuración', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responder(status, { message: 'no' })))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { canjearToken } = await importarModulo()
    const r = await canjearToken('tok', 'user-1')

    expect(r).toEqual({ ok: false, fallo: { motivo: 'sin-configurar' } })
  })

  it('no revienta si su backend no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { canjearToken } = await importarModulo()
    expect((await canjearToken('tok', 'user-1')).ok).toBe(false)
  })

  it('rechaza una respuesta que no cumple el contrato', async () => {
    // Sin `hasAccess`, que es el campo del que depende el acceso entero.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responder(200, { email: 'a@b.c' })))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { canjearToken } = await importarModulo()
    expect(await canjearToken('tok', 'user-1')).toEqual({ ok: false, fallo: { motivo: 'error' } })
  })
})

describe('consultarEstado', () => {
  it('devuelve el acceso del correo', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(responder(200, RESPUESTA))
    vi.stubGlobal('fetch', fetchFalso)

    const { consultarEstado } = await importarModulo()
    const estado = await consultarEstado('maria@gmail.com')

    expect(estado).toMatchObject({ hasAccess: true, status: 'active' })
    expect(fetchFalso.mock.calls[0]![0]).toBe(
      'https://api.abundacecode.test/api/access/status?email=maria%40gmail.com',
    )
  })

  it('entiende que no hay compra', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responder(200, { email: 'x@y.z', hasAccess: false, status: 'none' })),
    )

    const { consultarEstado } = await importarModulo()
    expect(await consultarEstado('x@y.z')).toMatchObject({ hasAccess: false })
  })

  /*
   * Devolver null y no `sin acceso` es la diferencia entre «no sabemos» y «no
   * tiene». Quien llama conserva lo que ya tenía: una caída de su servidor no
   * puede echar de la app a quien ya estaba validado.
   */
  it('devuelve null —no «sin acceso»— cuando su backend falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('caído')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { consultarEstado } = await importarModulo()
    expect(await consultarEstado('maria@gmail.com')).toBeNull()
  })

  it('tolera un estado que todavía no conocemos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(responder(200, { ...RESPUESTA, status: 'inventado', hasAccess: true })),
    )

    const { consultarEstado } = await importarModulo()
    const estado = await consultarEstado('maria@gmail.com')

    // El estado desconocido se degrada, pero el acceso lo sigue diciendo hasAccess.
    expect(estado).toMatchObject({ status: 'none', hasAccess: true })
  })
})

describe('urlDelPortalDeFacturacion', () => {
  it('devuelve la url de Stripe', async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValue(responder(200, { url: 'https://billing.stripe.com/x' }))
    vi.stubGlobal('fetch', fetchFalso)

    const { urlDelPortalDeFacturacion } = await importarModulo()
    expect(await urlDelPortalDeFacturacion('maria@gmail.com')).toBe(
      'https://billing.stripe.com/x',
    )

    // Este endpoint es público en su lado: no lleva el secreto compartido.
    const [, init] = fetchFalso.mock.calls[0]!
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('devuelve null si no hay suscripción para ese correo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responder(404, { message: 'no' })))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { urlDelPortalDeFacturacion } = await importarModulo()
    expect(await urlDelPortalDeFacturacion('nadie@x.com')).toBeNull()
  })
})
