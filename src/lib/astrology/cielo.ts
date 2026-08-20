import 'server-only'

import { createLocalChartProvider } from './local'
import { aspectosDeTransito, type AspectoTransito } from './transitos'
import type { Carta } from './types'

/**
 * El cielo de hoy, y qué le hace a una carta.
 *
 * Estaba escondido dentro de `lectura/activacion.ts`, donde solo servía para
 * alimentar el prompt. Vive aquí porque no es parte de generar un texto: es un
 * hecho astronómico sobre el día, y ahora también se le enseña al usuario tal
 * cual, sin pasar por la IA.
 *
 * Se toma el **mediodía UTC** del día en curso y no el instante exacto. Así el
 * cielo de un día es el mismo se mire a la hora que se mire —la pantalla no
 * cambia entre dos recargas— y coincide exactamente con el que se usó para
 * escribir la activación de ese día. La Luna se mueve unos 13° diarios, de modo
 * que el mediodía es el mejor representante del conjunto.
 *
 * La posición geográfica es irrelevante y por eso va a cero: las longitudes
 * eclípticas son geocéntricas. Se pide `partial` porque no hacen falta casas.
 */
export async function cieloDeHoy(): Promise<Carta | null> {
  const hoy = new Date()
  hoy.setUTCHours(12, 0, 0, 0)

  try {
    return await createLocalChartProvider().calcular({
      utc: hoy.toISOString(),
      lat: 0,
      lng: 0,
      tz: 'UTC',
      precision: 'partial',
    })
  } catch (error) {
    console.error('[cielo] no se pudo calcular el cielo de hoy', error)
    return null
  }
}

/**
 * Los tránsitos de hoy sobre una carta natal.
 *
 * Devuelve `null` —y no una lista vacía— cuando el cálculo falla, porque las dos
 * cosas se cuentan distinto en pantalla: sin cielo no se puede decir nada, y con
 * cielo y sin aspectos sí se dice algo («hoy no te toca de cerca»), que es una
 * lectura legítima del día y no un error.
 */
export async function transitosDeHoy(natal: Carta): Promise<AspectoTransito[] | null> {
  const cielo = await cieloDeHoy()
  if (!cielo) return null

  return aspectosDeTransito(natal, cielo)
}
