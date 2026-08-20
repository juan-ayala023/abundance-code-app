import 'server-only'

import { generateObject } from 'ai'

import { MODELO_RAPIDO, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import { describirTransitos, type AspectoTransito } from '@/lib/astrology/transitos'
import type { Idioma } from '@/i18n/idioma'
import { LIMITES, vozComun } from '@/lib/lectura/voz'
import type { Carta } from '@/lib/astrology/types'

import { activacionDiariaSchema, type ActivacionDiaria } from './schemas'

/**
 * Genera la activación de un día.
 *
 * Va con `gpt-5-mini` y no con el modelo de la lectura: se genera una vez al
 * día por usuario, así que es donde el coste se multiplica. La lectura base es
 * un texto largo y único; esto son cinco frases con un propósito concreto.
 *
 * Igual que la lectura, la IA no calcula astronomía: recibe la carta y los
 * tránsitos del día ya calculados.
 */

export class ActivacionError extends Error {}

const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code. Escribes la Activación del Día: una señal breve para que la persona observe algo concreto hoy.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}
- **Hoy manda el cielo.** Lo que escribes sale del tránsito de hoy sobre su carta, no de su carta a secas: si no, mañana dirías lo mismo. Nombra una vez, en palabras llanas, qué se está moviendo —«la Luna pasando por tu casa del trabajo», «Marte tocando tu Venus»— y dedica el resto a qué se nota de eso en un día normal.
- Muy breve: cada campo entre 25 y 45 palabras. Son cinco frases con intención, no un ensayo.
- Cotidiano y accionable. «Qué activar» cabe en un día cualquiera; no es un propósito de vida.
- La pregunta de reflexión es una pregunta de verdad, abierta, que no se responde con sí o no.
- No repitas su lectura base: eso ya lo leyó.

QUÉ NO HACES
${LIMITES}`

export async function generarActivacionDiaria(entrada: {
  /** Nombre de pila, si se conoce. Lo usa `vozComun()`. */
  nombre: string | null
  carta: Carta
  transitos: AspectoTransito[]
  dia: number
  total: number
  idioma: Idioma
}): Promise<ActivacionDiaria> {
  const prompt = [
    `Día ${entrada.dia} de ${entrada.total} del portal.`,
    '',
    'CARTA NATAL:',
    describirCarta(entrada.carta),
    '',
    describirTransitos(entrada.transitos),
    '',
    'Escribe la activación de hoy.',
  ].join('\n')

  try {
    const { object, usage } = await generateObject({
      model: modelo(MODELO_RAPIDO),
      schema: activacionDiariaSchema,
      system: sistema(entrada.idioma, entrada.nombre?.trim() || null),
      prompt,
      // Texto corto y muy pautado: razonar mucho aquí no mejora el resultado y
      // sí multiplica el coste, que se paga treinta veces por usuario.
      providerOptions: opcionesRazonamiento('low'),
    })

    console.info('[activacion] generada', {
      dia: entrada.dia,
      entrada: usage.inputTokens,
      salida: usage.outputTokens,
      razonamiento: usage.outputTokenDetails?.reasoningTokens,
    })

    return object
  } catch (error) {
    console.error('[activacion] falló la generación', error)
    throw new ActivacionError('No pudimos preparar tu activación de hoy.')
  }
}
