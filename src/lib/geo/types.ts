/**
 * Un lugar de nacimiento ya resuelto.
 *
 * Este es el contrato que consume el resto de la app. El proveedor concreto
 * (hoy GeoNames) queda detrás: cambiarlo es sustituir un adaptador, no tocar
 * el formulario ni el motor.
 */
export type Place = {
  /** Identificador del proveedor. Sirve para depurar de dónde salió el dato. */
  providerId: string
  /** Nombre de la ciudad. */
  city: string
  /** Región o departamento, si el proveedor lo da. */
  region: string | null
  country: string
  countryCode: string
  lat: number
  lng: number
  /** Identificador IANA, p.ej. `America/Bogota`. */
  tz: string
}

export interface GeocodingProvider {
  /** Busca lugares por nombre. Devuelve lista vacía si no hay coincidencias. */
  search(query: string, options?: { limit?: number; lang?: string }): Promise<Place[]>
}

export class GeocodingError extends Error {}
