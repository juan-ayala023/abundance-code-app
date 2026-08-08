import type { Cuerpo, Signo, TipoAspecto } from '@/lib/astrology/types'

/**
 * Símbolos astrológicos.
 *
 * Se usan los caracteres Unicode en vez de trazados SVG propios: son los
 * mismos que emplea toda la astrología occidental y evitan mantener veinte
 * dibujos a mano. Si en algún momento hace falta un estilo tipográfico
 * concreto, este es el único archivo que habría que cambiar.
 */

export const GLIFO_SIGNO: Record<Signo, string> = {
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
}

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

export const GLIFO_CUERPO: Record<Cuerpo, string> = {
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
}

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
  fuego: '#e05252',
  tierra: '#4f9d69',
  aire: '#d9a441',
  agua: '#4a7fc1',
}

/**
 * Color de cada aspecto.
 *
 * Convención de la astrología occidental: los aspectos armónicos en azul y los
 * tensos en rojo. Los tonos elegidos se leen tanto sobre fondo claro como
 * oscuro, porque la carta se muestra en ambos temas.
 */
export const COLOR_ASPECTO: Record<TipoAspecto, string> = {
  conjuncion: '#8b8b8b',
  sextil: '#3b82f6',
  trigono: '#3b82f6',
  cuadratura: '#ef4444',
  oposicion: '#ef4444',
}
