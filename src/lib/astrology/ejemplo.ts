import type { Carta } from './types'
import { gradoEnSigno, signoDe } from './types'

/**
 * Carta SINTÉTICA para desarrollar la rueda.
 *
 * Los valores están inventados, no calculados: sirven para tener una carta
 * plausible con la que dibujar mientras no hay proveedor de cálculo. No debe
 * mostrarse nunca a un usuario como si fuera la suya.
 */

function planeta(cuerpo: Carta['planetas'][number]['cuerpo'], longitud: number, casa: number, retrogrado = false) {
  return {
    cuerpo,
    longitud,
    signo: signoDe(longitud),
    gradoEnSigno: gradoEnSigno(longitud),
    casa,
    retrogrado,
  }
}

export const CARTA_DE_EJEMPLO: Carta = {
  precision: 'exact',
  utc: '2003-07-17T08:42:00.000Z',
  sistemaCasas: 'placidus',

  planetas: [
    planeta('sol', 114.2, 10),
    planeta('luna', 331.8, 6),
    planeta('mercurio', 132.6, 11),
    planeta('venus', 96.4, 9),
    planeta('marte', 341.1, 6),
    planeta('jupiter', 138.9, 11),
    planeta('saturno', 84.7, 9),
    planeta('urano', 331.4, 6, true),
    planeta('neptuno', 342.5, 6, true),
    planeta('pluton', 257.9, 3, true),
  ],

  // Cúspides de Placidus: no son múltiplos de 30, y su desigualdad es
  // justamente lo que distingue este sistema de las casas iguales.
  cuspides: [16.5, 43.2, 72.8, 106.4, 138.1, 166.9, 196.5, 223.2, 252.8, 286.4, 318.1, 346.9],
  ascendente: 16.5,
  medioCielo: 286.4,

  aspectos: [
    { a: 'sol', b: 'mercurio', tipo: 'conjuncion', orbe: 18.4 },
    { a: 'sol', b: 'jupiter', tipo: 'conjuncion', orbe: 24.7 },
    { a: 'sol', b: 'luna', tipo: 'trigono', orbe: 2.4 },
    { a: 'luna', b: 'marte', tipo: 'conjuncion', orbe: 9.3 },
    { a: 'luna', b: 'neptuno', tipo: 'conjuncion', orbe: 10.7 },
    { a: 'venus', b: 'saturno', tipo: 'conjuncion', orbe: 11.7 },
    { a: 'venus', b: 'urano', tipo: 'cuadratura', orbe: 5.0 },
    { a: 'marte', b: 'pluton', tipo: 'cuadratura', orbe: 6.8 },
    { a: 'mercurio', b: 'pluton', tipo: 'oposicion', orbe: 5.3 },
    { a: 'saturno', b: 'neptuno', tipo: 'oposicion', orbe: 17.8 },
    { a: 'jupiter', b: 'urano', tipo: 'trigono', orbe: 12.5 },
  ],
}

/** La misma carta sin hora conocida: sin casas, ascendente ni medio cielo. */
export const CARTA_PARCIAL_DE_EJEMPLO: Carta = {
  ...CARTA_DE_EJEMPLO,
  precision: 'partial',
  planetas: CARTA_DE_EJEMPLO.planetas.map((p) => ({ ...p, casa: null })),
  cuspides: [],
  ascendente: null,
  medioCielo: null,
}
