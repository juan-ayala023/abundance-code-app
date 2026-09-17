import 'server-only'

import { generateObject } from 'ai'

import { MODELO_LECTURA, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import type { Idioma } from '@/i18n/idioma'
import { instruccionDeIdioma } from './idioma-prompt'
import { LIMITES, vozComun } from '@/lib/lectura/voz'
import type { Carta } from '@/lib/astrology/types'

import { lecturaGeneradaSchema, lecturaSinAnalisisSchema, type LecturaTexto, type LecturaBase } from './schemas'

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
  'patronesAbundancia: cómo se relaciona con recibir, pedir, gastar y merecer. Qué le sale natural y dónde se le repite algo que ya no le sirve.',
  'bloqueosInternos: la tensión que más la frena, dicha con precisión y sin dramatizar. Y hacia dónde se abre cuando esa tensión se entiende.',
  'formaDecidir: cómo decide de verdad —rápido o rumiando, con la cabeza o con el cuerpo, a solas o pidiendo permiso— y qué la paraliza.',
  'senalesPersonales: qué señales suele pasar por alto y cuáles merecen su atención: cansancios, entusiasmos, repeticiones. Concreto y observable.',
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

    return { ...object, idioma: entrada.idioma }
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
  const conAnalisis = Boolean(lectura.analisisCompleto)
  const { idioma: _i, traducciones: _t, ...texto } = lectura as LecturaTexto & { idioma?: unknown; traducciones?: unknown }
  void _i; void _t
  try {
    const { object } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: conAnalisis ? lecturaGeneradaSchema : lecturaSinAnalisisSchema,
      system: `Traduces al ${idioma === 'en' ? 'inglés' : 'español'} una lectura astrológica personal, sección por sección, sin resumir ni añadir nada. Mantienes el tono cercano y directo, la segunda persona y la misma longitud. ${instruccionDeIdioma(idioma)}`,
      prompt: JSON.stringify(texto),
    })
    return object
  } catch (error) {
    console.error('[lectura] falló la traducción', error)
    throw new LecturaError('No pudimos traducir tu lectura ahora mismo.')
  }
}
