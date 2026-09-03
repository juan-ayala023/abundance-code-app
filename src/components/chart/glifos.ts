import type { Cuerpo, Signo, TipoAspecto } from '@/lib/astrology/types'

/**
 * Símbolos astrológicos.
 *
 * Se usan los caracteres Unicode en vez de trazados SVG propios: son los
 * mismos que emplea toda la astrología occidental y evitan mantener veinte
 * dibujos a mano. Si en algún momento hace falta un estilo tipográfico
 * concreto, este es el único archivo que habría que cambiar.
 */

/**
 * Selector de presentación TEXTO.
 *
 * Sin él, Windows y Android resuelven los signos del zodiaco con la fuente de
 * emojis: salían como pastillas moradas de color fijo, ignorando el `fill` del
 * SVG y el color del texto. Es exactamente lo que hacía que la rueda no se
 * pareciera a una carta astrológica impresa. U+FE0E es la forma estándar de
 * pedir el glifo tipográfico en vez del dibujo a color.
 */
const TEXTO = '︎'

/** Añade el selector de texto a todos los glifos de un mapa. */
function comoTexto<Clave extends string>(glifos: Record<Clave, string>): Record<Clave, string> {
  return Object.fromEntries(
    Object.entries<string>(glifos).map(([clave, glifo]) => [clave, glifo + TEXTO]),
  ) as Record<Clave, string>
}

export const GLIFO_SIGNO: Record<Signo, string> = comoTexto({
  aries: '♈',
  tauro: '♉',
  geminis: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  escorpio: '♏',
  sagitario: '♐',
  capricornio: '♑',
  acuario: '♒',
  piscis: '♓',
})

export const NOMBRE_SIGNO: Record<Signo, string> = {
  aries: 'Aries',
  tauro: 'Tauro',
  geminis: 'Géminis',
  cancer: 'Cáncer',
  leo: 'Leo',
  virgo: 'Virgo',
  libra: 'Libra',
  escorpio: 'Escorpio',
  sagitario: 'Sagitario',
  capricornio: 'Capricornio',
  acuario: 'Acuario',
  piscis: 'Piscis',
}

export const GLIFO_CUERPO: Record<Cuerpo, string> = comoTexto({
  sol: '☉',
  luna: '☽',
  mercurio: '☿',
  venus: '♀',
  marte: '♂',
  jupiter: '♃',
  saturno: '♄',
  urano: '♅',
  neptuno: '♆',
  pluton: '♇',
})

export const NOMBRE_CUERPO: Record<Cuerpo, string> = {
  sol: 'Sol',
  luna: 'Luna',
  mercurio: 'Mercurio',
  venus: 'Venus',
  marte: 'Marte',
  jupiter: 'Júpiter',
  saturno: 'Saturno',
  urano: 'Urano',
  neptuno: 'Neptuno',
  pluton: 'Plutón',
}

export const NOMBRE_ASPECTO: Record<TipoAspecto, string> = {
  conjuncion: 'Conjunción',
  sextil: 'Sextil',
  cuadratura: 'Cuadratura',
  trigono: 'Trígono',
  oposicion: 'Oposición',
}

/**
 * Elemento de cada signo. Da el color de fondo de su sector.
 *
 * Es la convención de siempre: fuego, tierra, aire y agua se repiten en ese
 * orden a lo largo del zodiaco.
 */
export const ELEMENTO_SIGNO: Record<Signo, 'fuego' | 'tierra' | 'aire' | 'agua'> = {
  aries: 'fuego',
  tauro: 'tierra',
  geminis: 'aire',
  cancer: 'agua',
  leo: 'fuego',
  virgo: 'tierra',
  libra: 'aire',
  escorpio: 'agua',
  sagitario: 'fuego',
  capricornio: 'tierra',
  acuario: 'aire',
  piscis: 'agua',
}

export const COLOR_ELEMENTO: Record<'fuego' | 'tierra' | 'aire' | 'agua', string> = {
  fuego: 'var(--color-fuego)',
  tierra: 'var(--color-tierra)',
  aire: 'var(--color-aire)',
  agua: 'var(--color-agua)',
}

/**
 * Color de cada aspecto.
 *
 * Convención de la carta impresa: sextil verde, trígono azul, cuadratura y
 * oposición en rojo, conjunción en gris. Antes estaban desaturados hacia la
 * gama crema de la marca y las líneas del centro de la rueda se perdían unas
 * en otras; distinguir un trígono de una cuadratura de un vistazo es la mitad
 * de para qué sirve el dibujo.
 */
export const COLOR_ASPECTO: Record<TipoAspecto, string> = {
  conjuncion: '#8d8579',
  sextil: '#2c8a4f',
  trigono: '#2453a8',
  cuadratura: '#c0392b',
  oposicion: '#c0392b',
}

/**
 * Color de cada elemento para los GLIFOS de la rueda.
 *
 * Distinto de `COLOR_ELEMENTO`, que son rellenos suaves pensados para barras y
 * fondos. Aquí el color va sobre un trazo fino de 30 px sobre blanco, así que
 * necesita saturación o el signo no se lee. Es además el código de siempre en
 * las cartas impresas: fuego rojo, tierra verde, aire naranja, agua azul.
 */
export const COLOR_ELEMENTO_GLIFO: Record<'fuego' | 'tierra' | 'aire' | 'agua', string> = {
  fuego: '#c0392b',
  tierra: '#1e7a45',
  aire: '#d97a1a',
  agua: '#2453a8',
}

/**
 * Color de cada planeta en la rueda.
 *
 * Los tonos tradicionales de la carta impresa —Sol dorado, Venus verde, Marte
 * rojo, Plutón casi negro— pero bajados de luminosidad lo justo para que todos
 * pasen contraste sobre fondo claro. El amarillo puro del Sol, tal cual, es
 * ilegible.
 */
export const COLOR_CUERPO: Record<Cuerpo, string> = {
  sol: '#c9960c',
  luna: '#4f86bd',
  mercurio: '#8f8a1e',
  venus: '#2c8a4f',
  marte: '#c0392b',
  jupiter: '#d97a1a',
  saturno: '#6f6a63',
  urano: '#2453a8',
  neptuno: '#6a3fa0',
  pluton: '#2b2b2b',
}

/**
 * Trazo de la rueda: círculos, marcas de grado y divisiones de signo.
 *
 * Azul de tinta china, no el dorado de la marca. La rueda es un instrumento de
 * lectura, y las líneas tienen que sostenerse por sí solas sobre blanco.
 */
export const COLOR_TRAZO_RUEDA = '#2b3574'
export const COLOR_TRAZO_CASA = '#9aa0ae'
export const COLOR_EJE = '#c0392b'
