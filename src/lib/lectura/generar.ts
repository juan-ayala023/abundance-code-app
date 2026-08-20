import 'server-only'

import { generateObject } from 'ai'

import { MODELO_LECTURA, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import type { Idioma } from '@/i18n/idioma'
import { LIMITES, vozComun } from '@/lib/lectura/voz'
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

const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code, un portal de astrología personalizada.

Escribes la Lectura Base: la interpretación que la persona recibe al abrir su portal. Es el entregable del producto y la leerá una sola persona, sobre su propia carta.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}
- **Enseña la astrología mientras la usas.** Di de dónde sale lo que afirmas —«tu Luna en Piscis, en la casa de las búsquedas», «Saturno apretando a tu Sol»— y en la misma frase qué significa eso en su vida. Nombrarla sin explicarla es jerga; afirmar sin nombrarla es un horóscopo de revista. Este producto no es ninguna de las dos cosas, y esta es la línea que lo separa.
- Cada sección, entre 60 y 110 palabras. El resumen, entre 50 y 80.

QUÉ NO HACES
${LIMITES}`

export async function generarLecturaBase(entrada: {
  nombre: string | null
  carta: Carta
  idioma: Idioma
}): Promise<LecturaBase> {
  const nombre = entrada.nombre?.trim() || null

  const prompt = [
    'CARTA NATAL YA CALCULADA:',
    describirCarta(entrada.carta),
    '',
    'Escribe la lectura completa. El campo `analisisCompleto` es un desarrollo largo (entre 300 y 450 palabras) que profundiza en cómo se relacionan entre sí las secciones anteriores; no repitas sus frases.',
  ].join('\n')

  try {
    const { object, usage } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: lecturaGeneradaSchema,
      system: sistema(entrada.idioma, nombre),
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
