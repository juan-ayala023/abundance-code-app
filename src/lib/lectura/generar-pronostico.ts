import 'server-only'

import { generateObject } from 'ai'

import { MODELO_LECTURA, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import { describirPronostico } from '@/lib/astrology/describir-pronostico'
import type { Pronostico } from '@/lib/astrology/pronostico'
import type { Carta } from '@/lib/astrology/types'
import type { Idioma } from '@/i18n/idioma'

import { instruccionDeIdioma } from './idioma-prompt'
import { pronosticoGeneradoSchema, type PronosticoTexto } from './schemas'
import { LIMITES_PRONOSTICO, nombreDePila, vozComun } from './voz'

/**
 * El pronóstico del periodo: qué podría pasar, cuándo y en qué área.
 *
 * Es el encargo de Andrea del 22 de septiembre de 2026, y cambia el registro
 * del producto: hasta aquí todo describía —quién eres, qué se mueve hoy— y
 * esto se moja. Por eso se apoya en dos cosas que el resto no necesita:
 *
 *   1. **Las fechas no las pone el modelo.** Llegan calculadas desde
 *      `calcularPronostico()`: días de exacto, estaciones, lunaciones. El
 *      modelo recibe las ventanas con su identificador (`v1`, `v2`…) y solo
 *      escribe sobre ellas. Si se le dejara inventar fechas, las inventaría.
 *   2. **Probabilidad, no certeza.** Se le pide que diga qué es lo más
 *      plausible y con qué respaldo astrológico, no que afirme hechos. La
 *      diferencia entre «el 14 conocerás a alguien» y «alrededor del 14 se
 *      activa el área de los vínculos; la forma más probable es un contacto
 *      que vuelve» es la que separa este producto de la adivinación, y es
 *      además lo que permite sostenerlo por escrito en los términos.
 */

export class PronosticoError extends Error {}

const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code. Escribes el Pronóstico del periodo: qué áreas de la vida de esta persona tienen más probabilidad de activarse, cuándo, y de qué forma podrían manifestarse.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}

QUÉ HACE DISTINTO A ESTE TEXTO
- **Es predictivo y temporal, no descriptivo.** No basta con «es un periodo de transformación», «pueden surgir cambios» o «habrá movimiento emocional». Eso no dice nada. Avanza un nivel: explica QUÉ TIPO DE ACONTECIMIENTO podría materializar esa configuración en la vida cotidiana.
- Ejemplo de lo que NO sirve: «Venus activa asuntos del pasado y genera reflexión sobre los vínculos».
- Ejemplo de lo que sí: «Entre el 12 y el 16 aumenta la posibilidad de que reaparezca un vínculo, una conversación o un asunto sentimental que parecía cerrado. Puede manifestarse como un contacto inesperado, un encuentro, una noticia o una situación que obligue a reconsiderar algo que creías resuelto».
- **Trabajas sobre las ventanas que te doy, con SUS fechas.** No inventes días, no muevas los que te doy, no añadas ventanas que no estén en la lista. Cita cada ventana por su identificador en el campo correspondiente.
- **Cada ventana se explica en este orden**: qué configuración la produce (en palabras corrientes) → qué área de la vida activa → qué manifestaciones son plausibles → qué observar.
- **Dos o tres manifestaciones por ventana, no diez.** Y ordenadas: primero la más probable. Cada una debe poder sostenerse en algo de lo que te he dado.
- **El peso lo marcan los factores que coinciden.** Una ventana con cuatro factores (tránsito exacto + casa relevante + lunación + estación) pesa mucho más que una con un solo aspecto suelto. Respeta la intensidad que te viene indicada: no conviertas una ventana «para observar» en un acontecimiento mayor.
- **Incluye lo favorable y lo difícil**: oportunidades de trabajo, movimientos de dinero, viajes, encuentros, conversaciones importantes, cierres, decisiones, conflictos, cambios de dirección, relaciones, proyectos, expansión o presión. Lo que corresponda a la configuración, sin endulzar ni dramatizar.
- **«Secundarias» son posibilidades, no consejos.** Ahí van temas con menos respaldo astrológico que podrían asomar en el periodo —una sola señal, sin coincidencia de factores—, escritos como lo que son: «con menos respaldo, podría moverse también algo en…». Nunca instrucciones del tipo «escribe lo que quieres pedir» o «respira antes de contestar».
- **El trasfondo va aparte.** Los tránsitos largos describen la etapa del periodo; no tienen día. No les pongas fecha.
- **En relaciones puedes predecir la activación de una dinámica** —reencuentros, contacto, conversaciones, distanciamiento, decisiones, aparición de alguien nuevo, revisión de lo anterior— pero nunca afirmar qué piensa o siente otra persona, ni garantizar que alguien concreto vuelva.

CÓMO SUENA
- Claro y concreto: «la configuración favorece…», «la ventana más fuerte aparece entre…», «la manifestación más probable sería…», «otra expresión posible es…».
- Ni un texto lleno de «quizás» ni una lista de hechos garantizados. Es probabilidad astrológica, y se nota en cómo lo dices.
- ${instruccionDeIdioma(idioma)}

QUÉ NO HACES
${LIMITES_PRONOSTICO}`

export async function generarPronostico(entrada: {
  nombre: string | null
  carta: Carta
  pronostico: Pronostico
  idioma: Idioma
}): Promise<PronosticoTexto> {
  const nombre = nombreDePila(entrada.nombre)
  const { ventanas } = entrada.pronostico

  const prompt = [
    'CARTA NATAL YA CALCULADA:',
    describirCarta(entrada.carta),
    '',
    describirPronostico(entrada.pronostico),
    '',
    `Escribe el pronóstico del periodo. Devuelve una entrada por cada ventana de la lista (${
      ventanas.map((v) => v.id).join(', ') || 'ninguna'
    }), en el mismo orden, con su identificador exacto en el campo "id". La apertura resume el periodo en conjunto y nombra la etapa de fondo. El cierre ordena las ventanas por importancia y dice en una frase qué mirar en cada una.`,
  ].join('\n')

  try {
    const { object, usage } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: pronosticoGeneradoSchema,
      system: sistema(entrada.idioma, nombre),
      prompt,
      // Es el texto con más partes móviles del producto: varias ventanas, cada
      // una con su configuración y sus manifestaciones, sin repetirse entre sí.
      providerOptions: opcionesRazonamiento('medium'),
    })

    console.info('[pronostico] generado', {
      ventanas: ventanas.length,
      entrada: usage.inputTokens,
      salida: usage.outputTokens,
      razonamiento: usage.outputTokenDetails?.reasoningTokens,
    })

    /*
     * El modelo escribe; las fechas las pone el cálculo. Aquí se vuelven a
     * pegar desde `ventanas` por id, así que aunque el modelo se inventara una
     * fecha en su texto, la que se muestra en pantalla es la calculada.
     */
    const porId = new Map(ventanas.map((v) => [v.id, v]))

    return {
      ...object,
      idioma: entrada.idioma,
      ventanas: object.ventanas
        .filter((escrita) => porId.has(escrita.id))
        .map((escrita) => {
          const calculada = porId.get(escrita.id)!
          return {
            ...escrita,
            desde: calculada.desde,
            hasta: calculada.hasta,
            fecha: calculada.fecha,
            nivel: calculada.nivel,
          }
        }),
    }
  } catch (error) {
    console.error('[pronostico] falló la generación', error)
    throw new PronosticoError('No pudimos preparar tu pronóstico ahora mismo.')
  }
}

/** Traduce un pronóstico ya escrito. Ver `traducirLecturaBase`. */
export async function traducirPronostico(
  texto: PronosticoTexto,
  idioma: Idioma,
): Promise<PronosticoTexto> {
  try {
    const { object } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: pronosticoGeneradoSchema,
      system: `Traduces al ${
        idioma === 'en' ? 'inglés' : 'español'
      } un pronóstico astrológico personal, campo por campo, sin resumir ni añadir nada. No traduzcas los identificadores de ventana ni cambies ninguna fecha. ${instruccionDeIdioma(idioma)}`,
      prompt: JSON.stringify({ apertura: texto.apertura, ventanas: texto.ventanas, secundarias: texto.secundarias, cierre: texto.cierre }),
    })

    const porId = new Map(texto.ventanas.map((v) => [v.id, v]))

    return {
      ...object,
      idioma,
      ventanas: object.ventanas
        .filter((escrita) => porId.has(escrita.id))
        .map((escrita) => {
          const original = porId.get(escrita.id)!
          return { ...escrita, desde: original.desde, hasta: original.hasta, fecha: original.fecha, nivel: original.nivel }
        }),
    }
  } catch (error) {
    console.error('[pronostico] falló la traducción', error)
    throw new PronosticoError('No pudimos traducir tu pronóstico ahora mismo.')
  }
}
