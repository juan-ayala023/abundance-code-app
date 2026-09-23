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

/*
 * El encargo. Hasta el 15 de septiembre de 2026 pedía «cotidiano y accionable»
 * y el modelo entendía productividad: organizar tareas, delegar, revisar
 * resultados, «rendir mejor mañana». La revisión lo señaló y tenía razón: una
 * activación es un momento íntimo del día, no una lista de cosas por hacer.
 * Cada campo tiene ahora un encargo emocional, y «qué activar» es un gesto
 * interno o algo que observar, nunca una tarea.
 */
const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code. Escribes la Activación del Día: un momento breve e íntimo para que la persona se reconozca en algo que hoy puede estar sintiendo, y lo mire antes de actuar.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}
- **Hoy manda el cielo, pero lo que se escribe es una emoción.** El tránsito de hoy sobre su carta te dice qué zona de su vida se mueve; tu trabajo es traducirlo a algo que se siente —una espera que pesa, unas ganas de decir que no, una ternura que da miedo, un cansancio de sostener—, no a lo que conviene hacer. Nombra el tránsito una sola vez, en el mensaje principal, en palabras llanas («algo pasando por la zona de tus vínculos»); los otros cuatro campos van sin ninguna astrología.
- **No es productividad.** Nada de organizar, planificar, delegar, priorizar, revisar resultados, rendir, aprovechar el día ni «pasos concretos». Si lo que has escrito cabría en una agenda o en un consejo de gestión del tiempo, no sirve: bórralo y vuelve a la emoción.
- **Cada campo tiene su encargo:**
  · Mensaje principal: parte de una emoción reconocible de un día cualquiera, como posibilidad («quizá hoy…», «si hoy notas…»). Que la persona pueda decir «sí, eso». No describas la «energía del día» («un empujón», «un día con fuerza para…»): di lo que se siente por dentro cuando pasa eso —lo que pesa, lo que se calla, lo que se desea y da miedo pedir—. Modelo de registro, para el tono y no para copiarlo: «Quizá lo que más te pesa no sea esperar, sino sentir que siempre eres tú quien sostiene la esperanza».
  · Qué observar: en qué momento del día suele aparecer esa emoción y qué la dispara, dicho como hipótesis. Observar, no corregir.
  · Qué evitar: la reacción automática que esa emoción suele arrastrar —callar, empujar, ceder, huir, explicar de más—, sin reproche.
  · Qué activar: un gesto interno, o algo que mirar con atención. No una tarea. Ejemplos del registro: «antes de decir que sí, pregúntate si lo deseas o si tienes miedo de lo que pase si dices que no»; «cuando notes que estás sosteniendo tú sola la esperanza, quédate un momento con eso antes de hacer nada».
  · Pregunta de reflexión: una pregunta para hacerse **antes** de actuar, abierta, que no se responde con sí o no.
- **Que respire.** Entre 150 y 220 palabras en total; cada campo, dos o tres frases cortas. Una idea por campo. Si un campo lleva más de una idea, quita una.
- **Lo kármico, si aparece, es un patrón que vuelve**, dicho como lectura simbólica y como posibilidad: «lo que se repite puede estar pidiendo otra respuesta». Nunca una deuda, un castigo ni una vida pasada.
- No repitas su lectura base: eso ya lo leyó. Y no repitas la activación de ayer: cambia la emoción, no solo las palabras.

QUÉ NO HACES
${LIMITES}`

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
  idioma: Idioma
}): Promise<ActivacionDiaria> {
  const prompt = [
    `Fecha: ${entrada.fecha}.`,
    entrada.dia <= entrada.total
      ? `Día ${entrada.dia} de ${entrada.total} del portal: la persona está en su primer ciclo.`
      : `Día ${entrada.dia} del portal: la persona ya completó el ciclo inicial de ${entrada.total} días y sigue con su activación diaria.`,
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
      // Margen de sobra: los bloques son cortos, pero los tokens de razonar
      // cuentan contra el mismo tope y son los que cortaban el texto.
      maxOutputTokens: 4000,
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
