import 'server-only'

import { generateObject } from 'ai'

import { MODELO_LECTURA, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import type { Idioma } from '@/i18n/idioma'
import { LIMITES, vozComun } from '@/lib/lectura/voz'
import type { Carta } from '@/lib/astrology/types'

import {
  retratoExactoSchema,
  retratoParcialSchema,
  type Retrato,
} from './schemas'

/**
 * Genera el retrato de la carta: quién es esta persona, planeta a planeta.
 *
 * Se distingue de la lectura base y no la repite. La lectura base habla de
 * **temas** —abundancia, bloqueos, decisiones— y es lo que el producto vende.
 * Esto es el retrato astrológico clásico: recorre la carta pieza a pieza y
 * explica qué función cumple cada una en esta persona concreta. Van en pantallas
 * distintas justamente porque responden a preguntas distintas: la lectura base a
 * «qué me pasa con el dinero», el retrato a «quién soy».
 *
 * **El encargo del cliente, literal: que no diga «tu Sol está en Cáncer».** Esa
 * frase es un dato, no una interpretación, y el usuario ya la tiene en la tabla
 * de posiciones que hay justo encima. Aquí se pide lo contrario: describir a la
 * persona. La posición se pinta aparte, sacada de la carta, para que el párrafo
 * no tenga que gastarse en recitarla.
 *
 * Reglas de CLAUDE.md §8 que se aplican aquí, igual que en `generar.ts`:
 * - Siempre en servidor.
 * - La IA **nunca** calcula astronomía: recibe la carta ya calculada por
 *   `describirCarta()`.
 * - El esquema obliga: no puede devolver un retrato al que le falte una parte.
 */

export class RetratoError extends Error {}

/**
 * Qué tiene que cubrir cada sección.
 *
 * Va en el prompt, una línea por sección, y es lo que impide que diez párrafos
 * sobre la misma persona acaben diciendo diez veces lo mismo. Cada planeta tiene
 * un oficio en astrología, y el encargo es ese oficio: sin decirlo, el modelo
 * escribe diez variaciones del carácter general.
 */
const ENCARGOS = [
  'sol: quién es cuando no está actuando para nadie. Su forma de ser de fondo, qué la enciende y de qué está hecha su voluntad. Es el centro del retrato; que se note.',
  'luna: su mundo emocional y lo que necesita para sentirse a salvo. Cómo reacciona antes de pensar, y de qué se rodea cuando está mal.',
  'ascendente: cómo aparece al llegar a un sitio, la impresión que deja antes de abrir la boca, y en qué se diferencia eso de quien es por dentro (el Sol).',
  'mercurio: cómo piensa y cómo habla. A qué velocidad procesa, si necesita datos o imágenes, cómo discute y cómo aprende.',
  'venus: cómo quiere y qué valora. Qué la atrae, cómo trata a quien le importa, y su relación con el placer, el gasto y la belleza.',
  'marte: cómo actúa cuando algo hay que hacerlo. Su forma de empezar, de sostener el esfuerzo, de enfadarse y de defender lo suyo.',
  'jupiter: dónde se expande con facilidad, dónde tiene suerte y confianza — y dónde eso mismo se le va de las manos por exceso.',
  'saturno: dónde le cuesta, qué se toma en serio y qué lección repite. Es la sección más honesta del retrato: sin dramatizar, pero sin suavizarla hasta que no diga nada.',
  'habilidades: qué sabe hacer bien, deducido de los aspectos armónicos, del elemento y la modalidad dominantes y de los planetas mejor situados. Concreto y utilizable, no una lista de adjetivos halagadores.',
  'nudo: la tensión central de la carta, sacada de los aspectos más cerrados. Qué dos partes suyas tiran en direcciones distintas, y qué se gana cuando dejan de pelearse.',
]

const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code, un portal de astrología personalizada.

Escribes el Retrato de la Carta: el recorrido por la carta natal de una persona, pieza a pieza. Lo lee una sola persona, sobre su propia carta, debajo de la rueda y de la tabla de posiciones.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}
- **Describes a la persona, no su carta.** Esta regla manda sobre cualquier otra, y aquí es distinta del resto del producto por una razón concreta: la posición ya está impresa junto al título de cada sección, y el usuario tiene además la tabla completa encima de tu texto. Así que NO escribas «tu Sol está en Cáncer» ni «con Mercurio en Leo tiendes a...». Escribe lo que esa posición SIGNIFICA en cómo esta persona es, piensa, quiere o reacciona.
- Puedes nombrar un planeta cuando la frase lo necesite —«esa parte tuya que empuja», «lo que Saturno te ha ido enseñando»—, pero nunca para anunciar una posición.
- Cada sección, entre 70 y 110 palabras. La apertura, entre 60 y 90.
- No repitas entre secciones. Cada una tiene su encargo y se queda en él.

QUÉ NO HACES
${LIMITES}`

export async function generarRetrato(entrada: {
  nombre: string | null
  carta: Carta
  idioma: Idioma
}): Promise<Retrato> {
  const nombre = entrada.nombre?.trim() || null
  const exacta = entrada.carta.precision === 'exact'

  /*
   * Sin hora de nacimiento no hay Ascendente, así que su encargo ni se envía.
   * `describirCarta()` ya se lo dice al modelo, pero una instrucción que
   * describe una sección inexistente invita a escribirla igualmente en otra.
   */
  const encargos = exacta
    ? ENCARGOS
    : ENCARGOS.filter((linea) => !linea.startsWith('ascendente:'))

  const prompt = [
    'CARTA NATAL YA CALCULADA:',
    describirCarta(entrada.carta),
    '',
    'QUÉ CUBRE CADA SECCIÓN:',
    ...encargos.map((linea) => `- ${linea}`),
    '',
    'La apertura presenta a la persona en conjunto: el trío principal y la impresión general de la carta. No adelanta lo que dirán las secciones.',
  ].join('\n')

  try {
    const { object, usage } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: exacta ? retratoExactoSchema : retratoParcialSchema,
      system: sistema(entrada.idioma, nombre),
      prompt,
      /*
       * Mismo esfuerzo que la lectura base, y por la misma razón: se genera una
       * sola vez por usuario y es contenido que la persona va a leer entero.
       * Aquí pesa además que son diez secciones que no deben repetirse entre sí,
       * que es precisamente lo que el razonamiento sostiene.
       */
      providerOptions: opcionesRazonamiento('medium'),
    })

    console.info('[retrato] generado', {
      precision: entrada.carta.precision,
      entrada: usage.inputTokens,
      salida: usage.outputTokens,
      razonamiento: usage.outputTokenDetails?.reasoningTokens,
    })

    return object
  } catch (error) {
    console.error('[retrato] falló la generación', error)
    throw new RetratoError('No pudimos preparar tu retrato ahora mismo.')
  }
}
