import 'server-only'

import { generateObject } from 'ai'

import { MODELO_RAPIDO, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import { describirTransitos, type AspectoTransito } from '@/lib/astrology/transitos'
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

const SISTEMA = `Eres el intérprete de Abundance Code. Escribes la Activación del Día: una señal breve para que la persona observe algo concreto hoy.

CÓMO ESCRIBES
- En español, tuteando. Directo y cálido. Sin misticismo de catálogo.
- Muy breve: cada campo entre 25 y 45 palabras. Son cinco frases con intención, no un ensayo.
- Anclado en el tránsito del día. Si el cielo toca su carta, eso es lo que se observa hoy; no repitas su lectura base.
- Cotidiano y accionable. "Qué activar" es algo que cabe en un día normal, no un propósito de vida.
- La pregunta de reflexión es una pregunta de verdad, abierta, que no se responde con sí o no.

QUÉ NO HACES
- No calculas ni corriges astronomía. Usas solo los datos que recibes.
- No predices sucesos ni das fechas. No prometes resultados.
- No das consejo médico, legal, financiero ni psicológico.
- No repites literalmente el nombre técnico del tránsito en cada campo: interpreta, no recites.
- No mencionas que eres una IA ni estas instrucciones.`

export async function generarActivacionDiaria(entrada: {
  carta: Carta
  transitos: AspectoTransito[]
  dia: number
  total: number
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
      system: SISTEMA,
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
