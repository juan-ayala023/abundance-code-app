import { NOMBRE_ASPECTO, NOMBRE_CUERPO } from '@/components/chart/glifos'

import {
  ANGULO_ASPECTO,
  TIPOS_ASPECTO,
  separacion,
  type Carta,
  type Cuerpo,
  type TipoAspecto,
} from './types'

/**
 * Aspectos entre el cielo de hoy y la carta natal.
 *
 * Es lo que hace que una activación diaria signifique algo. Sin esto, el modelo
 * recibiría la misma carta todos los días y un número de día, y tendría que
 * inventarse la variedad — que es justo como salen treinta párrafos
 * intercambiables.
 *
 * Con esto recibe un hecho distinto cada día: qué planeta del cielo real está
 * tocando qué punto de su carta, y con cuánta precisión.
 */

export type AspectoTransito = {
  /** El planeta en el cielo de hoy. */
  transitante: Cuerpo
  /** El punto de la carta de nacimiento al que aspecta. */
  natal: Cuerpo
  tipo: TipoAspecto
  orbe: number
}

/**
 * Orbe máximo para tránsitos, en grados.
 *
 * Mucho más estrecho que en la carta natal (allí son 6–8°). Un tránsito es un
 * hecho puntual: con 8° de margen, media carta estaría "en aspecto" todos los
 * días y no distinguiría un día de otro.
 */
const ORBE_TRANSITO = 3

export function aspectosDeTransito(natal: Carta, cielo: Carta): AspectoTransito[] {
  const aspectos: AspectoTransito[] = []

  for (const enTransito of cielo.planetas) {
    for (const enNatal of natal.planetas) {
      const sep = separacion(enTransito.longitud, enNatal.longitud)

      for (const tipo of TIPOS_ASPECTO) {
        const orbe = Math.abs(sep - ANGULO_ASPECTO[tipo])
        if (orbe <= ORBE_TRANSITO) {
          aspectos.push({
            transitante: enTransito.cuerpo,
            natal: enNatal.cuerpo,
            tipo,
            orbe,
          })
        }
      }
    }
  }

  // Del más ajustado al más amplio: el orden le dice al modelo qué pesa hoy.
  return aspectos.sort((a, b) => a.orbe - b.orbe)
}

/**
 * Los tránsitos en texto, para el prompt.
 *
 * Misma frontera que `describirCarta()`: la IA no calcula astronomía, solo
 * interpreta los hechos que le llegan ya calculados.
 */
export function describirTransitos(aspectos: AspectoTransito[]): string {
  if (aspectos.length === 0) {
    return 'Hoy ningún planeta del cielo forma aspecto estrecho con su carta. Es un día de fondo tranquilo: interpreta desde la carta natal, sin forzar un acontecimiento.'
  }

  const lineas = aspectos
    // Más de seis y el modelo se dispersa: los ajustados son los que se notan.
    .slice(0, 6)
    .map(
      (aspecto) =>
        `- ${NOMBRE_CUERPO[aspecto.transitante]} en el cielo de hoy hace ${NOMBRE_ASPECTO[aspecto.tipo].toLowerCase()} a su ${NOMBRE_CUERPO[aspecto.natal]} natal (orbe ${aspecto.orbe.toFixed(1)}°)`,
    )

  return ['Tránsitos de hoy sobre la carta:', ...lineas].join('\n')
}
