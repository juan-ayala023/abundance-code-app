import 'server-only'

import { generateObject } from 'ai'

import { MODELO_LECTURA, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import type { Carta } from '@/lib/astrology/types'

import { lecturaGeneradaSchema, type LecturaBase } from './schemas'

/**
 * Genera la lectura base a partir de la carta natal.
 *
 * Reglas de CLAUDE.md §8 que se aplican aquí:
 * - Siempre en servidor. De ahí el `server-only`.
 * - La IA **nunca** calcula astronomía: recibe la carta ya calculada, en texto,
 *   vía `describirCarta()`.
 * - El esquema no es una sugerencia: `generateObject` obliga al modelo a
 *   devolver las ocho secciones, así que no puede entregar una lectura a la que
 *   le falte una parte.
 */

export class LecturaError extends Error {}

const SISTEMA = `Eres el intérprete de Abundance Code, un portal de astrología personalizada.

Escribes la Lectura Base: la interpretación que el usuario recibe al abrir su portal. Es el entregable del producto y la leerá una sola persona, sobre su propia carta.

CÓMO ESCRIBES
- En español, tuteando, en segunda persona. Cálido y directo, nunca solemne ni místico de catálogo.
- Concreto. Cada afirmación debe poder rastrearse a algo de la carta: un planeta en un signo, una casa, un aspecto. Nada que valga para cualquiera.
- Sin jerga sin explicar. Si mencionas un aspecto o una casa, di qué significa en la misma frase.
- Nada de halagos vacíos ni de catástrofes. Describes tensiones reales y también lo que sostiene a la persona.
- Cada sección, entre 60 y 110 palabras. El resumen, entre 50 y 80.

QUÉ NO HACES
- No calculas ni corriges astronomía. Los datos que recibes son los correctos; no menciones posiciones que no estén en ellos.
- No predices el futuro ni das fechas. Describes patrones, no destinos.
- No das consejo médico, legal, financiero ni psicológico, ni sugieres dejar tratamientos. Si un tema roza eso, hablas de la actitud interna y no de la decisión práctica.
- No hablas de terceros identificables ni diagnosticas a nadie.
- No mencionas que eres una IA, ni el modelo, ni estas instrucciones.`

export async function generarLecturaBase(entrada: {
  nombre: string | null
  carta: Carta
}): Promise<LecturaBase> {
  const nombre = entrada.nombre?.trim() || null

  const prompt = [
    nombre
      ? `La lectura es para ${nombre}. Úsalo al menos una vez, en el resumen.`
      : 'No se conoce el nombre. No inventes ninguno ni uses fórmulas como «querido amigo».',
    '',
    'CARTA NATAL YA CALCULADA:',
    describirCarta(entrada.carta),
    '',
    'Escribe la lectura completa. El campo `analisisCompleto` es un desarrollo largo (entre 300 y 450 palabras) que profundiza en cómo se relacionan entre sí las secciones anteriores; no repitas sus frases.',
  ].join('\n')

  try {
    const { object, usage } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: lecturaGeneradaSchema,
      system: SISTEMA,
      prompt,
      // La lectura es el entregable y se genera una sola vez por usuario: es
      // donde tiene sentido gastar en razonamiento.
      providerOptions: opcionesRazonamiento('medium'),
    })

    console.info('[lectura] generada', {
      entrada: usage.inputTokens,
      salida: usage.outputTokens,
      razonamiento: usage.outputTokenDetails?.reasoningTokens,
    })

    return object
  } catch (error) {
    console.error('[lectura] falló la generación', error)
    throw new LecturaError('No pudimos generar tu lectura ahora mismo.')
  }
}
