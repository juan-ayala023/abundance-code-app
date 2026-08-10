import type { Carta, SistemaCasas } from './types'

/**
 * Contrato del cálculo de la carta natal.
 *
 * Mismo patrón que `GeocodingProvider`: el motor concreto queda detrás y
 * devuelve siempre el mismo `Carta`, de forma que cambiar de librería local a
 * API externa —o al revés— no toca ni la rueda SVG ni los prompts de la IA.
 *
 * La entrada es un instante UTC **ya resuelto**, no una fecha con hora local.
 * Convertir hora local a UTC es responsabilidad de `resolveBirthInstant()`, que
 * conoce los desfases históricos y detecta las horas ambiguas. Un proveedor que
 * derive la zona horaria por su cuenta introduciría una segunda fuente de
 * verdad para el dato del que depende el ascendente entero.
 */

export type ChartRequest = {
  /** Instante UTC del nacimiento, ISO 8601. Sale de `resolveBirthInstant()`. */
  utc: string
  lat: number
  lng: number
  /**
   * Zona IANA del lugar de nacimiento.
   *
   * No hace falta para calcular —`utc` ya lo determina todo— pero se pasa para
   * poder auditar de dónde salió el instante y para los adaptadores que exijan
   * hora local en su entrada.
   */
  tz: string
  /**
   * `partial` cuando no se conoce la hora de nacimiento. El adaptador debe
   * devolver posiciones planetarias pero dejar vacíos casas, ascendente y medio
   * cielo, en vez de calcularlos sobre una hora inventada.
   */
  precision: Carta['precision']
  /** Placidus salvo que se pida otro (CLAUDE.md §7). */
  sistemaCasas?: SistemaCasas
}

export interface ChartProvider {
  calcular(request: ChartRequest): Promise<Carta>
}

export class ChartError extends Error {}
