import 'server-only'

import { generateObject } from 'ai'

import { MODELO_RAPIDO, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import { describirTransitos, type AspectoTransito } from '@/lib/astrology/transitos'
import type { Idioma } from '@/i18n/idioma'
import { CONTROL_CALIDAD, LEXICO_MARCA, LIMITES_PRONOSTICO, vozComun } from '@/lib/lectura/voz'
import type { Carta } from '@/lib/astrology/types'

import { activacionDiariaSchema, type ActivacionDiaria } from './schemas'

/**
 * Escribe la activación de un día.
 *
 * Va con `gpt-5-mini` y no con el modelo de la lectura: se genera una vez al
 * día por usuario, así que es donde el coste se multiplica.
 *
 * ---
 *
 * **Lo que cambió el 23 de septiembre de 2026.** Era un texto de 150 a 220
 * palabras repartido en cinco bloques contemplativos —observa, evita, activa,
 * y una pregunta para hacerse— y el documento pidió otra cosa: más corta (80 a
 * 140), con un titular que enganche, y **predictiva**. Ya no describe cómo
 * podría sentirse el día: dice qué podría pasar y qué señal mirar.
 *
 * Y sobre todo, deja de vivir suelta: se escribe **colgando de la lectura del
 * mes**, para que el día sea un capítulo de esa historia y no un horóscopo
 * distinto cada mañana. Cuando todavía no hay lectura del mes, se escribe sin
 * ella; se nota menos hilo, pero nunca se inventa uno.
 */

export class ActivacionError extends Error {}

const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code. Escribes la Lectura de Hoy: qué podría moverse hoy en la vida de esta persona y qué señal conviene que mire.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}

${LEXICO_MARCA}

QUÉ VA EN CADA CAMPO
- titular: **una sola frase** de intriga, dirigida a la persona. Es lo que decide si sigue leyendo. Modelo del tono, no para copiar: «hoy una respuesta incompleta puede decirte más que una promesa».
- situacion: dos o tres frases. Qué podría pasar hoy y en qué área de su vida se sentiría. Una situación reconocible —una conversación, una propuesta, un silencio, una decisión, un gasto, un mensaje que no llega—, dicha como posibilidad.
- senal: qué observar hoy, en concreto. Una frase, un comportamiento, una repetición, una sensación. Tiene que poder reconocerse cuando pase: «palabras bonitas sin fecha, acción ni compromiso concreto».
- evita: la reacción automática que hoy le costaría cara. Sin reproche.
- activa: un gesto pequeño, de hoy. Una pregunta que hacer, algo que esperar antes de responder, una frase que decir. Nunca una tarea ni un plan.

CUÁNTO OCUPA
- **Entre 80 y 140 palabras en total, los cinco campos juntos.** Es corta a propósito: se lee de una vez, por la mañana. Si te pasas, quita adjetivos, no contenido.

QUÉ NO HACES ADEMÁS
- No repitas el gancho ni el tema de los días anteriores que te doy. Cambia la emoción, no solo las palabras.
- No cuentes otra vez la lectura del mes: apóyate en ella, que es distinto. Hoy es un día de esa historia.
- No nombres tránsitos, planetas, casas ni signos. Hoy no se explica astrología: se dice lo que puede pasar. La configuración del día la tienes para saber DE QUÉ hablar, no para contarla.
- No abras con el clima ni con la energía del día («hoy hay un día intenso», «la energía favorece»). Se abre por lo que puede pasarle a ella.

${CONTROL_CALIDAD}

QUÉ NO HACES
${LIMITES_PRONOSTICO}`

export async function generarActivacionDiaria(entrada: {
  /** Nombre de pila, si se conoce. Lo usa `vozComun()`. */
  nombre: string | null
  carta: Carta
  transitos: AspectoTransito[]
  /**
   * Día real del portal, sin saturar en 30: a partir del 31 sigue contando.
   * El modelo solo lo usa para saber si está en el arranque o ya en rutina.
   */
  dia: number
  total: number
  /** La fecha de calendario (UTC) a la que corresponde, `AAAA-MM-DD`. */
  fecha: string
  /** De qué va su mes, para que hoy sea un capítulo y no otra historia. */
  contextoDelMes?: string | null
  /** Los titulares de los últimos días, para no repetir el gancho. */
  titularesRecientes?: string[]
  idioma: Idioma
}): Promise<ActivacionDiaria> {
  const prompt = [
    `Fecha: ${entrada.fecha}.`,
    entrada.dia <= entrada.total
      ? `Día ${entrada.dia} de ${entrada.total} del portal: la persona está en su primer ciclo.`
      : `Día ${entrada.dia} del portal: la persona ya completó el ciclo inicial de ${entrada.total} días y sigue con su lectura diaria.`,
    '',
    'CARTA NATAL:',
    describirCarta(entrada.carta),
    '',
    describirTransitos(entrada.transitos),
    '',
    entrada.contextoDelMes
      ? `SU LECTURA DEL MES (el hilo del que cuelga hoy; no la repitas, engánchate a ella):\n${entrada.contextoDelMes}`
      : 'No hay lectura del mes todavía: escribe la de hoy por sí sola, sin mencionar que falta.',
    '',
    entrada.titularesRecientes && entrada.titularesRecientes.length > 0
      ? `TITULARES DE LOS DÍAS ANTERIORES (no repitas su gancho ni su tema):\n${entrada.titularesRecientes
          .map((titular) => `- ${titular}`)
          .join('\n')}`
      : '',
    '',
    'Escribe la lectura de hoy.',
  ]
    .filter((parte) => parte !== '')
    .join('\n')

  try {
    const { object, usage } = await generateObject({
      model: modelo(MODELO_RAPIDO),
      schema: activacionDiariaSchema,
      system: sistema(entrada.idioma, entrada.nombre?.trim() || null),
      prompt,
      // Texto corto y muy pautado: razonar mucho aquí no mejora el resultado y
      // sí multiplica el coste, que se paga treinta veces por usuario.
      providerOptions: opcionesRazonamiento('low'),
      // Margen de sobra: los bloques son cortos, pero los tokens de razonar
      // cuentan contra el mismo tope y son los que cortaban el texto.
      maxOutputTokens: 4000,
    })

    console.info('[activacion] generada', {
      dia: entrada.dia,
      conMes: Boolean(entrada.contextoDelMes),
      entrada: usage.inputTokens,
      salida: usage.outputTokens,
      razonamiento: usage.outputTokenDetails?.reasoningTokens,
    })

    return object
  } catch (error) {
    console.error('[activacion] falló la generación', error)
    throw new ActivacionError('No pudimos preparar tu lectura de hoy.')
  }
}
