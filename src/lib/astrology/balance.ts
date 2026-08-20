import { SIGNOS, signoDe, type Carta, type Signo } from './types'

/**
 * Reparto por elementos y modalidades de una carta.
 *
 * Es de las primeras cosas que mira quien sabe leer una carta, y de las que más
 * dicen de un vistazo: si alguien tiene siete planetas en agua, eso explica más
 * que cualquiera de los siete por separado.
 *
 * No lo calcula la IA ni hace falta pedírselo a nadie: sale de contar los signos
 * de los planetas, y por eso es gratis y siempre exacto. La app lo tenía delante
 * —`ELEMENTO_SIGNO` ya existía para colorear la rueda— y no lo enseñaba en
 * ninguna parte.
 */

export const ELEMENTOS = ['fuego', 'tierra', 'aire', 'agua'] as const
export type Elemento = (typeof ELEMENTOS)[number]

export const MODALIDADES = ['cardinal', 'fijo', 'mutable'] as const
export type Modalidad = (typeof MODALIDADES)[number]

/**
 * Elemento y modalidad se derivan de la POSICIÓN del signo en el zodiaco, no de
 * una tabla escrita a mano.
 *
 * Los dos ciclos son la estructura del zodiaco, no una convención que alguien
 * eligiera: los elementos se repiten cada cuatro signos y las modalidades cada
 * tres, empezando los dos en Aries. Derivarlos evita que una tabla de doce
 * entradas se desincronice de la otra al tocarlas.
 */
export function elementoDe(signo: Signo): Elemento {
  return ELEMENTOS[SIGNOS.indexOf(signo) % 4]!
}

export function modalidadDe(signo: Signo): Modalidad {
  return MODALIDADES[SIGNOS.indexOf(signo) % 3]!
}

export type Balance = {
  elementos: { clave: Elemento; cuenta: number; porcentaje: number }[]
  modalidades: { clave: Modalidad; cuenta: number; porcentaje: number }[]
  /** El elemento con más peso. Null si hay empate en lo más alto. */
  elementoDominante: Elemento | null
  /** El elemento sin ningún planeta, si solo falta uno. Null si hay varios o ninguno. */
  elementoAusente: Elemento | null
}

/**
 * El reparto de una carta.
 *
 * Cuenta **los diez planetas**, y no incluye el Ascendente aunque tenga signo.
 * Es la convención habitual, y además evita que dos personas con la misma carta
 * salgan con repartos distintos solo porque una dio su hora de nacimiento y la
 * otra no: el reparto tiene que significar lo mismo para todo el mundo.
 */
export function balanceDe(carta: Carta): Balance {
  const signos = carta.planetas.map((planeta) => signoDe(planeta.longitud))
  const total = signos.length || 1

  const contar = <T extends string>(claves: readonly T[], de: (s: Signo) => T) =>
    claves.map((clave) => {
      const cuenta = signos.filter((signo) => de(signo) === clave).length
      return { clave, cuenta, porcentaje: Math.round((cuenta / total) * 100) }
    })

  const elementos = contar(ELEMENTOS, elementoDe)
  const modalidades = contar(MODALIDADES, modalidadDe)

  const maximo = Math.max(...elementos.map((e) => e.cuenta))
  const enLoAlto = elementos.filter((e) => e.cuenta === maximo)
  const vacios = elementos.filter((e) => e.cuenta === 0)

  return {
    elementos,
    modalidades,
    /*
     * Empate arriba: no hay dominante. Decir «tu elemento es el fuego» cuando
     * hay tres de fuego y tres de aire sería elegir por sorteo y presentarlo
     * como un rasgo de la persona.
     */
    elementoDominante: enLoAlto.length === 1 ? enLoAlto[0]!.clave : null,
    /*
     * Un elemento ausente dice mucho; dos o tres ya no distinguen nada y la
     * frase se convierte en una lista. Solo se señala cuando falta exactamente
     * uno.
     */
    elementoAusente: vacios.length === 1 ? vacios[0]!.clave : null,
  }
}
