import 'server-only'

import { z } from 'zod'

import { getServerEnv } from '@/lib/env/server'

import { GeocodingError, type GeocodingProvider, type Place } from './types'

/**
 * Adaptador de GeoNames.
 *
 * Elegido porque es gratuito, permite almacenar los resultados —los guardamos
 * en `portals`, así que esto no es un detalle— y devuelve la zona horaria IANA
 * junto al resto del lugar, evitando una segunda llamada.
 *
 * `GEOCODING_API_KEY` contiene el nombre de usuario de GeoNames, no una clave:
 * es lo que ese servicio usa para identificar la cuenta.
 */

const BASE_URL = 'https://secure.geonames.org/searchJSON'
const TIMEOUT_MS = 5000

/** Todo lo que llega de fuera se valida (CLAUDE.md §10.3). */
const geonameSchema = z.object({
  geonameId: z.number(),
  name: z.string(),
  adminName1: z.string().optional(),
  countryName: z.string().optional(),
  countryCode: z.string().optional(),
  // GeoNames devuelve las coordenadas como texto.
  lat: z.string(),
  lng: z.string(),
  timezone: z.object({ timeZoneId: z.string() }).optional(),
})

const respuestaSchema = z.object({
  geonames: z.array(geonameSchema).optional(),
  status: z.object({ message: z.string(), value: z.number() }).optional(),
})

export function createGeoNamesProvider(): GeocodingProvider {
  return {
    async search(query, options) {
      const termino = query.trim()
      if (termino.length < 2) return []

      const username = getServerEnv().GEOCODING_API_KEY
      if (!username) {
        throw new GeocodingError(
          'Falta GEOCODING_API_KEY (usuario de GeoNames) en el entorno.',
        )
      }

      const url = new URL(BASE_URL)
      url.searchParams.set('q', termino)
      url.searchParams.set('maxRows', String(options?.limit ?? 8))
      // featureClass=P limita a poblaciones: sin esto salen ríos y montañas.
      url.searchParams.set('featureClass', 'P')
      url.searchParams.set('orderby', 'population')
      // style=FULL es lo que incluye la zona horaria en la misma respuesta.
      url.searchParams.set('style', 'FULL')
      url.searchParams.set('lang', options?.lang ?? 'es')
      url.searchParams.set('username', username)

      const json = await pedir(url)
      const parsed = respuestaSchema.safeParse(json)

      if (!parsed.success) {
        console.error('[geonames] respuesta con forma inesperada', parsed.error.issues)
        throw new GeocodingError('El servicio de búsqueda de ciudades falló.')
      }

      // GeoNames devuelve los errores con HTTP 200 y un objeto `status`.
      if (parsed.data.status) {
        console.error('[geonames] error del proveedor', parsed.data.status)
        throw new GeocodingError('El servicio de búsqueda de ciudades falló.')
      }

      return (parsed.data.geonames ?? [])
        .filter((item) => item.timezone?.timeZoneId)
        .map(
          (item): Place => ({
            providerId: String(item.geonameId),
            city: item.name,
            region: item.adminName1 || null,
            country: item.countryName ?? '',
            countryCode: item.countryCode ?? '',
            lat: Number(item.lat),
            lng: Number(item.lng),
            tz: item.timezone!.timeZoneId,
          }),
        )
        .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    },
  }
}

async function pedir(url: URL): Promise<unknown> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Las ciudades no cambian de sitio: cachear ahorra llamadas y latencia.
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!res.ok) {
      console.error('[geonames] HTTP', res.status)
      throw new GeocodingError('El servicio de búsqueda de ciudades no respondió.')
    }

    return await res.json()
  } catch (error) {
    if (error instanceof GeocodingError) throw error

    console.error('[geonames] fallo de red', error)
    throw new GeocodingError('No pudimos buscar ciudades ahora mismo.')
  }
}
