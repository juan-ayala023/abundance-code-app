/**
 * Formato interno de la carta natal (CLAUDE.md §7).
 *
 * Este es el contrato que se guarda en `portals.chart` y que consume tanto la
 * rueda SVG como la capa de IA. El proveedor del cálculo queda detrás de un
 * adaptador: cambiar de API externa a motor propio no debe tocar ni el dibujo
 * ni los prompts.
 *
 * Todos los grados son ECLÍPTICOS y absolutos: 0–360 desde 0° Aries. Es la
 * única representación sin ambigüedad, y de ella se derivan signo y grado
 * dentro del signo.
 */

export const SIGNOS = [
  'aries',
  'tauro',
  'geminis',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'escorpio',
  'sagitario',
  'capricornio',
  'acuario',
  'piscis',
] as const

export type Signo = (typeof SIGNOS)[number]

export const CUERPOS = [
  'sol',
  'luna',
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
  'pluton',
] as const

export type Cuerpo = (typeof CUERPOS)[number]

export const TIPOS_ASPECTO = [
  'conjuncion',
  'sextil',
  'cuadratura',
  'trigono',
  'oposicion',
] as const

export type TipoAspecto = (typeof TIPOS_ASPECTO)[number]

/** Ángulos exactos de cada aspecto, en grados. */
export const ANGULO_ASPECTO: Record<TipoAspecto, number> = {
  conjuncion: 0,
  sextil: 60,
  cuadratura: 90,
  trigono: 120,
  oposicion: 180,
}

export type PosicionPlanetaria = {
  cuerpo: Cuerpo
  /** Longitud eclíptica absoluta, 0–360 desde 0° Aries. */
  longitud: number
  signo: Signo
  /** Grado dentro del signo, 0–30. */
  gradoEnSigno: number
  /** Casa que ocupa, 1–12. Null si la carta es parcial. */
  casa: number | null
  retrogrado: boolean
}

export type Aspecto = {
  a: Cuerpo
  b: Cuerpo
  tipo: TipoAspecto
  /** Desviación respecto al ángulo exacto, en grados. Siempre positiva. */
  orbe: number
}

/**
 * Precisión de la carta.
 *
 * `partial` significa que no se conocía la hora de nacimiento: hay posiciones
 * planetarias, pero NO casas, ascendente ni medio cielo. La UI debe decirlo
 * de forma explícita en vez de fingir precisión (CLAUDE.md §7).
 */
export type Precision = 'exact' | 'partial'

export const SISTEMAS_CASAS = ['placidus', 'whole-sign', 'koch', 'equal'] as const

export type SistemaCasas = (typeof SISTEMAS_CASAS)[number]

export type Carta = {
  precision: Precision
  /** Instante UTC del nacimiento, ISO 8601. */
  utc: string
  /** Sistema de casas usado. Placidus por defecto. */
  sistemaCasas: SistemaCasas

  planetas: PosicionPlanetaria[]

  /** Longitudes de las 12 cúspides, en orden. Vacío si `partial`. */
  cuspides: number[]
  /** Longitud del Ascendente. Null si `partial`. */
  ascendente: number | null
  /** Longitud del Medio Cielo. Null si `partial`. */
  medioCielo: number | null

  aspectos: Aspecto[]
}

/** El signo al que pertenece una longitud eclíptica. */
export function signoDe(longitud: number): Signo {
  const normalizada = ((longitud % 360) + 360) % 360
  return SIGNOS[Math.floor(normalizada / 30)]!
}

/** El grado dentro de su signo, 0–30. */
export function gradoEnSigno(longitud: number): number {
  const normalizada = ((longitud % 360) + 360) % 360
  return normalizada % 30
}

/**
 * Separación angular más corta entre dos longitudes, 0–180.
 *
 * Es "más corta" a propósito: 350° y 10° están a 20°, no a 340°. Sin esto los
 * aspectos entre planetas a ambos lados de 0° Aries se calcularían mal.
 */
export function separacion(a: number, b: number): number {
  const bruta = Math.abs((((a - b) % 360) + 360) % 360)
  return bruta > 180 ? 360 - bruta : bruta
}
