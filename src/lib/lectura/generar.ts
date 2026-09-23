import 'server-only'

import { generateObject } from 'ai'

import { MODELO_LECTURA, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import { z } from 'zod'

import type { Idioma } from '@/i18n/idioma'
import { completarSecciones } from './completar'
import { instruccionDeIdioma } from './idioma-prompt'
import { LIMITES, vozComun } from '@/lib/lectura/voz'
import type { Carta } from '@/lib/astrology/types'

import { esquemaDeTexto, lecturaGeneradaSchema, type LecturaTexto, type LecturaBase } from './schemas'

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

/**
 * Qué tiene que cubrir cada sección.
 *
 * Una línea por sección, y es lo que impide que ocho párrafos sobre la misma
 * persona acaben repitiendo impulso, control y seguridad de principio a fin —que
 * es lo que señaló la revisión de septiembre de 2026—. Cada sección tiene un
 * encargo, y el encargo es distinto.
 */
const ENCARGOS = [
  'resumen: cómo es esta persona por dentro y qué la mueve. Sin lista de rasgos: una imagen que se pueda recordar.',
  'energiaPrincipal: de qué está hecha su fuerza de fondo, qué la enciende y qué la agota. Abre con una escena cotidiana en la que esa energía se nota.',
  'mundoEmocional: cómo siente y cómo se le nota —o no— por fuera. De qué necesita para calmarse y qué hace cuando algo le duele. Se apoya sobre todo en la Luna, su signo, su casa y sus aspectos, y en el agua de la carta.',
  'patronesAbundancia: cómo se relaciona con recibir, pedir, gastar y merecer. Qué le sale natural y dónde se le repite algo que ya no le sirve.',
  'amorVinculos: cómo se acerca, qué busca en el otro y qué le cuesta sostener cuando el vínculo se hace cotidiano. Se apoya en Venus y Marte, en la casa 7 si la carta tiene hora, y en sus aspectos. Sin predecir relaciones ni describir lo que otra persona siente.',
  'bloqueosInternos: la tensión que más se le repite, dicha con precisión y sin dramatizar. Y hacia dónde se abre cuando esa tensión se entiende.',
  'senalesPersonales: qué señales suele pasar por alto y cuáles merecen su atención: cansancios, entusiasmos, repeticiones. Concreto y observable.',
  'aprendizajeKarmico: lo que esta vida le pide aprender, y que suele costarle. Se apoya en Saturno —su signo, su casa, sus aspectos duros— y en el reparto de elementos que le falta. Se dice como aprendizaje, nunca como castigo, deuda de otra vida o destino cerrado.',
  'formaDecidir: cómo decide de verdad —rápido o rumiando, con la cabeza o con el cuerpo, a solas o pidiendo permiso— y qué la paraliza.',
  'fortalezas: lo que sabe hacer bien, deducido de lo mejor situado en su carta. Utilizable, no una lista de adjetivos.',
  'recomendacionInicial: un solo paso pequeño para esta semana, que salga de todo lo anterior. Una acción, no un propósito de vida.',
]

const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code, un portal de astrología personalizada.

Escribes la Lectura Base: la interpretación que la persona recibe al abrir su portal. Es el entregable del producto y la leerá una sola persona, sobre su propia carta.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}
- **Cada sección sigue este movimiento, con variaciones:** abre con una experiencia emocional o una pregunta concreta; introduce una referencia breve a su carta, en palabras llanas; explica el patrón posible sin convertirlo en certeza; y cierra con una reflexión o una acción pequeña. No repitas el mismo arranque en dos secciones.
- Cada sección, entre 60 y 100 palabras. El resumen, entre 50 y 80.
- **El detalle astrológico va en \`analisisCompleto\`, no en las secciones.** Ahí sí recorres las colocaciones, casas y aspectos que sostienen lo dicho arriba, explicando cada uno; la persona lo abre desde «Ver el contexto astrológico» cuando quiere saber de dónde sale todo. Las secciones se quedan con una referencia cada una.

QUÉ CUBRE CADA SECCIÓN
${ENCARGOS.map((encargo) => `- ${encargo}`).join('\n')}

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
    'Escribe la lectura completa. El campo `analisisCompleto` es el contexto astrológico (entre 300 y 450 palabras): recorre las colocaciones y aspectos de los que salen las secciones anteriores, explica cada uno en palabras corrientes y muestra cómo se relacionan entre sí. No repitas frases de las secciones.',
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

    /* Ninguna sección se publica cortada: se rehace solo la que lo esté. */
    const completo = await completarSecciones(
      object,
      async (claves) => {
        const { object: rehechas } = await generateObject({
          model: modelo(MODELO_LECTURA),
          schema: z.object(Object.fromEntries(claves.map((c) => [c, z.string().min(1)]))),
          system: sistema(entrada.idioma, nombre),
          prompt: `${prompt}\n\nVuelve a escribir SOLO estas secciones, completas y terminadas en punto: ${claves.join(', ')}. La anterior quedó cortada.`,
          providerOptions: opcionesRazonamiento('low'),
        })
        return rehechas as Partial<typeof object>
      },
      'lectura',
    )

    return { ...completo, idioma: entrada.idioma }
  } catch (error) {
    console.error('[lectura] falló la generación', error)
    throw new LecturaError('No pudimos generar tu lectura ahora mismo.')
  }
}

/**
 * Traduce una lectura ya escrita, conservando cada sección tal cual.
 *
 * No la reescribe: traducir es más barato y, sobre todo, no le cambia la
 * lectura a la persona. El resultado se guarda en `traducciones[idioma]`.
 */
export async function traducirLecturaBase(lectura: LecturaTexto, idioma: Idioma): Promise<LecturaTexto> {
  const { idioma: _i, traducciones: _t, ...texto } = lectura as LecturaTexto & { idioma?: unknown; traducciones?: unknown }
  void _i; void _t

  /* Las secciones que esta lectura tiene, y solo esas. Ver `esquemaDeTexto`. */
  const claves = Object.entries(texto)
    .filter(([, valor]) => typeof valor === 'string' && valor.trim().length > 0)
    .map(([clave]) => clave)

  try {
    const { object } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: esquemaDeTexto(claves),
      system: `Traduces al ${idioma === 'en' ? 'inglés' : 'español'} una lectura astrológica personal, sección por sección, sin resumir ni añadir nada. Mantienes el tono cercano y directo, la segunda persona y la misma longitud. ${instruccionDeIdioma(idioma)}`,
      prompt: JSON.stringify(texto),
    })
    return object as LecturaTexto
  } catch (error) {
    console.error('[lectura] falló la traducción', error)
    throw new LecturaError('No pudimos traducir tu lectura ahora mismo.')
  }
}

/**
 * Escribe las secciones que se añadieron después, para una lectura ya escrita.
 *
 * El 23 de septiembre de 2026 la lectura pasó de siete secciones a diez. Quien
 * ya tenía la suya se quedaría con tres huecos, y reescribirla entera no es una
 * opción: la lectura es de esa persona, la ha leído y puede haberla guardado.
 * Así que se escriben **solo las que faltan**, con la lectura actual delante
 * para que no repitan lo que ya dice ni la contradigan.
 */
export async function escribirSeccionesNuevas(entrada: {
  nombre: string | null
  carta: Carta
  idioma: Idioma
  /** La lectura tal como está guardada, para no repetirse. */
  lectura: LecturaTexto
  /** Las claves que faltan. Nunca vacío. */
  claves: string[]
}): Promise<Record<string, string>> {
  const nombre = entrada.nombre?.trim() || null

  const yaEscrito = Object.entries(entrada.lectura)
    .filter(([clave, valor]) => typeof valor === 'string' && clave !== 'analisisCompleto')
    .map(([clave, valor]) => `${clave}: ${valor as string}`)
    .join('\n\n')

  const prompt = [
    'CARTA NATAL YA CALCULADA:',
    describirCarta(entrada.carta),
    '',
    'LO QUE SU LECTURA YA DICE (no lo repitas, no lo contradigas):',
    yaEscrito,
    '',
    `Escribe únicamente estas secciones: ${entrada.claves.join(', ')}. Cada una entre 60 y 100 palabras, con el mismo tono y la misma persona que lo de arriba.`,
  ].join('\n')

  try {
    const { object } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: esquemaDeTexto(entrada.claves),
      system: sistema(entrada.idioma, nombre),
      prompt,
      providerOptions: opcionesRazonamiento('medium'),
    })

    /* Ninguna se publica cortada, igual que al generar la lectura entera. */
    return await completarSecciones(
      object as Record<string, string>,
      async (claves) => {
        const { object: rehechas } = await generateObject({
          model: modelo(MODELO_LECTURA),
          schema: esquemaDeTexto(claves),
          system: sistema(entrada.idioma, nombre),
          prompt: `${prompt}\n\nVuelve a escribir SOLO estas secciones, completas y terminadas en punto: ${claves.join(', ')}. La anterior quedó cortada.`,
          providerOptions: opcionesRazonamiento('low'),
        })
        return rehechas as Record<string, string>
      },
      'lectura',
    )
  } catch (error) {
    console.error('[lectura] no se pudieron escribir las secciones nuevas', error)
    throw new LecturaError('No pudimos ampliar tu lectura ahora mismo.')
  }
}
