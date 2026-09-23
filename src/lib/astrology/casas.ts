import type { Carta, PosicionPlanetaria, Signo } from './types'
import { gradoEnSigno, signoDe } from './types'

/**
 * Las doce casas de una carta, con lo que cae en cada una.
 *
 * Las casas ya estaban calculadas —viven en `carta.cuspides` y en el campo
 * `casa` de cada planeta— pero no había forma de mirarlas: la rueda las dibuja
 * y la tabla dice en cuál está cada planeta, y con eso solo se entiende si ya
 * se sabe astrología. La revisión del 23 de septiembre pidió las doce
 * explicadas, no cinco ni un resumen.
 *
 * Aquí solo se organiza lo que la carta ya sabe. El texto de cada casa es fijo
 * y vive en los diccionarios: es una explicación, no una interpretación, y por
 * eso no pasa por el modelo ni cuesta nada.
 */

/** Una casa tal como se enseña. */
export type CasaNatal = {
  /** 1–12. */
  numero: number
  /** El signo donde empieza la casa. */
  signo: Signo
  /** Grado de la cúspide dentro de su signo, redondeado hacia abajo. */
  grado: number
  /**
   * Los signos que la casa recorre además del de su cúspide.
   *
   * Con Placidus una casa puede abarcar más de treinta grados y contener un
   * signo entero. Se dice en el detalle técnico porque explica por qué un
   * planeta aparece en una casa cuyo signo no es el suyo.
   */
  signosSiguientes: Signo[]
  /** Los planetas que caen dentro, en el orden de la carta. */
  planetas: PosicionPlanetaria[]
}

/**
 * En qué casa natal cae una longitud.
 *
 * Las cúspides vienen en orden desde la 1. Una casa va de su cúspide a la
 * siguiente, cruzando 0° Aries cuando toca. Sin cúspides (carta parcial) no
 * hay casas y se devuelve null, que es la verdad: no se inventa.
 */
export function casaDe(longitud: number, cuspides: number[]): number | null {
  if (cuspides.length !== 12) return null

  const grados = normalizar(longitud)

  for (let i = 0; i < 12; i += 1) {
    const inicio = cuspides[i]!
    const fin = cuspides[(i + 1) % 12]!
    const cruzaCero = fin < inicio
    const dentro = cruzaCero
      ? grados >= inicio || grados < fin
      : grados >= inicio && grados < fin
    if (dentro) return i + 1
  }

  return null
}

/**
 * Las doce casas de esta carta, o `null` si no las tiene.
 *
 * Sin hora de nacimiento la carta se calcula `partial` y **no hay casas**.
 * Devolver una lista vacía o doce casas en Aries sería peor que no devolver
 * nada: la pantalla las pintaría como si fueran las de esa persona.
 */
export function casasDe(carta: Carta): CasaNatal[] | null {
  if (carta.cuspides.length !== 12) return null

  return carta.cuspides.map((cuspide, indice) => {
    const numero = indice + 1
    const siguiente = carta.cuspides[(indice + 1) % 12]!

    return {
      numero,
      signo: signoDe(cuspide),
      grado: Math.floor(gradoEnSigno(cuspide)),
      signosSiguientes: signosEntre(cuspide, siguiente),
      /*
       * Se usa el campo que ya trae el planeta y solo se recalcula si falta:
       * así la casa que se enseña es exactamente la misma que dice la tabla de
       * posiciones, incluso si el proveedor del cálculo redondea de otra forma.
       */
      planetas: carta.planetas.filter(
        (planeta) => (planeta.casa ?? casaDe(planeta.longitud, carta.cuspides)) === numero,
      ),
    }
  })
}

/**
 * Los signos que hay entre dos cúspides, sin contar el de la primera.
 *
 * Casi siempre está vacío. Aparece cuando una casa es ancha —habitual en
 * latitudes altas— y entonces explica un planeta que parece fuera de sitio.
 */
function signosEntre(desde: number, hasta: number): Signo[] {
  /*
   * Se avanza por grados y no por índices de signo. Comparar el signo inicial
   * con el final no distingue una casa estrecha dentro de un solo signo de otra
   * que da la vuelta entera al zodiaco: en los dos casos coinciden.
   */
  const arco = normalizar(hasta - desde) || 360
  const signos: Signo[] = []

  let indice = indiceDeSigno(signoDe(desde))
  /* Lo que falta desde la cúspide para salir de su propio signo. */
  let recorrido = 30 - gradoEnSigno(desde)

  while (recorrido < arco && signos.length < 12) {
    indice = (indice + 1) % 12
    signos.push(SIGNOS_EN_ORDEN[indice]!)
    recorrido += 30
  }

  return signos
}

const SIGNOS_EN_ORDEN = [
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
] as const satisfies readonly Signo[]

function indiceDeSigno(signo: Signo): number {
  return SIGNOS_EN_ORDEN.indexOf(signo)
}

function normalizar(longitud: number): number {
  return ((longitud % 360) + 360) % 360
}
