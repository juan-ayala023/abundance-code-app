import { describe, expect, it } from 'vitest'

import { RUTAS_PROTEGIDAS } from '@/lib/access/rutas'

const BASE_URL = 'http://127.0.0.1:3100'

async function pedir(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' })
  return { status: res.status, location: res.headers.get('location') }
}

describe('rutas públicas', () => {
  it.each(['/', '/activar'])('%s responde sin exigir sesión', async (path) => {
    const { status } = await pedir(path)
    expect(status).toBe(200)
  })
})

describe('rutas protegidas sin sesión', () => {
  /*
   * Se recorre la lista entera, no una muestra: una ruta nueva añadida a
   * RUTAS_PROTEGIDAS queda cubierta automáticamente.
   */
  it.each(RUTAS_PROTEGIDAS)('%s redirige a /activar', async (path) => {
    const { status, location } = await pedir(path)

    expect(status).toBe(307)
    expect(location).toContain('/activar')
  })

  it('conserva el destino para volver después del login', async () => {
    const { location } = await pedir('/portal')
    expect(location).toBe(`/activar?next=${encodeURIComponent('/portal')}`)
  })

  it('protege también las subrutas, existan o no como página', async () => {
    const { status, location } = await pedir('/carta/algo')

    // Sin middleware esto devolvería un 404 y parecería inofensivo.
    expect(status).toBe(307)
    expect(location).toContain('/activar')
  })

  it('no captura rutas que solo comparten prefijo', async () => {
    const { status } = await pedir('/portales')
    expect(status).toBe(404)
  })
})

describe('callback de autenticación', () => {
  it('sin código, devuelve al inicio con un motivo, no a un error crudo', async () => {
    const { status, location } = await pedir('/auth/callback')

    expect(status).toBe(307)
    expect(location).toContain('/activar?error=sin_codigo')
  })

  it('si el proveedor devuelve error, tampoco deja al usuario colgado', async () => {
    const { status, location } = await pedir('/auth/callback?error=access_denied')

    expect(status).toBe(307)
    expect(location).toContain('/activar?error=cancelado')
  })
})
