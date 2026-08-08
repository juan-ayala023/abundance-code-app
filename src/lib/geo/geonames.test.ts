import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetServerEnvCache } from '@/lib/env/server'

import { createGeoNamesProvider } from './geonames'
import { GeocodingError } from './types'

/**
 * La red se simula a propósito: lo que se prueba aquí es la interpretación de
 * la respuesta, no que GeoNames esté disponible. Un test que dependa de un
 * servicio externo falla por motivos que no son culpa del código.
 */

const original = { ...process.env }

function respuesta(json: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(json),
  } as Response)
}

const ciudad = {
  geonameId: 3688689,
  name: 'Bogotá',
  adminName1: 'Bogota D.C.',
  countryName: 'Colombia',
  countryCode: 'CO',
  lat: '4.60971',
  lng: '-74.08175',
  timezone: { timeZoneId: 'America/Bogota' },
}

beforeEach(() => {
  // El entorno se cachea tras la primera lectura, así que sin esto el valor de
  // un test se filtraría al siguiente y las pruebas dependerían del orden.
  resetServerEnvCache()
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  process.env.GEOCODING_API_KEY = 'usuario-test'
})

afterEach(() => {
  process.env = { ...original }
  resetServerEnvCache()
  vi.restoreAllMocks()
})

describe('búsqueda de ciudades', () => {
  it('convierte la respuesta al formato interno', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta({ geonames: [ciudad] })))

    const [lugar] = await createGeoNamesProvider().search('Bogota')

    expect(lugar).toEqual({
      providerId: '3688689',
      city: 'Bogotá',
      region: 'Bogota D.C.',
      country: 'Colombia',
      countryCode: 'CO',
      lat: 4.60971, // GeoNames las devuelve como texto
      lng: -74.08175,
      tz: 'America/Bogota',
    })
  })

  it('no llama a la API con menos de dos caracteres', async () => {
    const fetchFalso = vi.fn()
    vi.stubGlobal('fetch', fetchFalso)

    expect(await createGeoNamesProvider().search('B')).toEqual([])
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('descarta lugares sin zona horaria', async () => {
    // Sin zona no se puede calcular el instante de nacimiento: ese lugar no
    // sirve, y ofrecerlo llevaría a un error más adelante.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respuesta({ geonames: [{ ...ciudad, timezone: undefined }] })),
    )

    expect(await createGeoNamesProvider().search('Bogota')).toEqual([])
  })

  it('trata el error de GeoNames aunque venga con HTTP 200', async () => {
    // GeoNames responde 200 y mete el error en el cuerpo. Fiarse del código
    // de estado daría por buena una respuesta vacía.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respuesta({ status: { message: 'user does not exist.', value: 10 } })),
    )

    await expect(createGeoNamesProvider().search('Bogota')).rejects.toThrow(GeocodingError)
  })

  it('rechaza una respuesta con forma inesperada', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta({ geonames: 'no es una lista' })))

    await expect(createGeoNamesProvider().search('Bogota')).rejects.toThrow(GeocodingError)
  })

  it('reintenta una vez ante un fallo de red', async () => {
    const fetchFalso = vi
      .fn()
      .mockRejectedValueOnce(new Error('connect timeout'))
      .mockImplementationOnce(() => respuesta({ geonames: [ciudad] }))
    vi.stubGlobal('fetch', fetchFalso)

    const lugares = await createGeoNamesProvider().search('Bogota')

    expect(fetchFalso).toHaveBeenCalledTimes(2)
    expect(lugares).toHaveLength(1)
  })

  it('se rinde tras agotar los reintentos', async () => {
    const fetchFalso = vi.fn().mockRejectedValue(new Error('connect timeout'))
    vi.stubGlobal('fetch', fetchFalso)

    await expect(createGeoNamesProvider().search('Bogota')).rejects.toThrow(GeocodingError)
    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })

  it('avisa si falta el usuario de GeoNames', async () => {
    process.env.GEOCODING_API_KEY = ''
    vi.stubGlobal('fetch', vi.fn())

    await expect(createGeoNamesProvider().search('Bogota')).rejects.toThrow(
      /GEOCODING_API_KEY/,
    )
  })
})
