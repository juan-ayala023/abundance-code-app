import { NOMBRE_ASPECTO, NOMBRE_CUERPO, NOMBRE_SIGNO } from '@/components/chart/glifos'

import type { Carta } from './types'

/**
 * La carta natal en texto, para dárselo al modelo.
 *
 * Es la frontera de la regla de CLAUDE.md §8: **la IA nunca calcula
 * astronomía**. Todo lo que el modelo sabe de la carta entra por aquí, ya
 * calculado y en forma de hechos. Así no puede inventarse una posición ni
 * equivocarse en una casa, solo interpretar lo que se le da.
 *
 * Los nombres salen de `glifos.ts` para que la lectura llame a las cosas igual
 * que la rueda y la tabla que el usuario tiene delante.
 */
export function describirCarta(carta: Carta): string {
  const lineas: string[] = []

  lineas.push(
    carta.precision === 'exact'
      ? 'Carta completa: se conoce la hora de nacimiento, así que hay casas, ascendente y medio cielo.'
      : 'Carta parcial: NO se conoce la hora de nacimiento. No hay casas, ni ascendente, ni medio cielo. No menciones ninguno de los tres ni especules sobre ellos.',
  )

  if (carta.ascendente !== null) {
    lineas.push(`Ascendente: ${posicion(carta.ascendente)}.`)
  }
  if (carta.medioCielo !== null) {
    lineas.push(`Medio cielo: ${posicion(carta.medioCielo)}.`)
  }

  lineas.push('', 'Posiciones planetarias:')
  for (const planeta of carta.planetas) {
    const partes = [`- ${NOMBRE_CUERPO[planeta.cuerpo]}: ${posicion(planeta.longitud)}`]
    if (planeta.casa !== null) partes.push(`casa ${planeta.casa}`)
    if (planeta.retrogrado) partes.push('retrógrado')
    lineas.push(partes.join(', '))
  }

  if (carta.aspectos.length > 0) {
    lineas.push('', 'Aspectos (orbe entre paréntesis, cuanto menor más intenso):')
    // Del más ajustado al más amplio: el orden le dice al modelo qué pesa más
    // sin tener que explicárselo.
    const ordenados = [...carta.aspectos].sort((a, b) => a.orbe - b.orbe)
    for (const aspecto of ordenados) {
      lineas.push(
        `- ${NOMBRE_CUERPO[aspecto.a]} ${NOMBRE_ASPECTO[aspecto.tipo].toLowerCase()} ${NOMBRE_CUERPO[aspecto.b]} (${aspecto.orbe.toFixed(1)}°)`,
      )
    }
  }

  return lineas.join('\n')
}

/** «24° 22' de Cáncer». Grados y minutos, que es como se lee una carta. */
function posicion(longitud: number): string {
  const normalizada = ((longitud % 360) + 360) % 360
  const signo = NOMBRE_SIGNO[SIGNO_POR_INDICE[Math.floor(normalizada / 30)]!]
  const dentro = normalizada % 30
  const grados = Math.floor(dentro)
  const minutos = Math.round((dentro - grados) * 60)

  // Redondear los minutos puede dar 60: eso es un grado más, no «24° 60'».
  return minutos === 60
    ? `${grados + 1}° 0' de ${signo}`
    : `${grados}° ${minutos}' de ${signo}`
}

const SIGNO_POR_INDICE = [
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
