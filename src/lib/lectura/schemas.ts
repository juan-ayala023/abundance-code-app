import { z } from 'zod'

import type { Cuerpo } from '@/lib/astrology/types'

/**
 * Estructura de la lectura base y de las activaciones diarias.
 *
 * Las secciones salen del producto anterior, no de una invención: son las que
 * el usuario ya conoce. Este esquema hace doble función — valida lo que se
 * guarda en `portals.base_reading` y será el esquema que reciba `generateObject`
 * cuando se conecte la IA (CLAUDE.md §8), de modo que el modelo no pueda
 * devolver una lectura a la que le falte una sección.
 */

const parrafo = z.string().trim().min(1)

export const SECCIONES_LECTURA = [
  { clave: 'energiaPrincipal', titulo: 'Tu energía principal' },
  { clave: 'patronesAbundancia', titulo: 'Tus patrones de abundancia' },
  { clave: 'bloqueosInternos', titulo: 'Tus bloqueos internos' },
  { clave: 'formaDecidir', titulo: 'Tu forma de decidir' },
  { clave: 'senalesPersonales', titulo: 'Tus señales personales' },
  { clave: 'fortalezas', titulo: 'Tus fortalezas' },
  { clave: 'recomendacionInicial', titulo: 'Tu recomendación inicial' },
] as const

export type ClaveSeccion = (typeof SECCIONES_LECTURA)[number]['clave']

export const lecturaBaseSchema = z.object({
  /** Párrafo de apertura: «Resumen de tu Código Personal». */
  resumen: parrafo,
  energiaPrincipal: parrafo,
  patronesAbundancia: parrafo,
  bloqueosInternos: parrafo,
  formaDecidir: parrafo,
  senalesPersonales: parrafo,
  fortalezas: parrafo,
  recomendacionInicial: parrafo,
  /** Desarrollo largo, tras «Leer análisis completo». Opcional. */
  analisisCompleto: parrafo.optional(),
})

export type LecturaBase = z.infer<typeof lecturaBaseSchema>

/**
 * Lo que se le exige al modelo al generar.
 *
 * Se separa del anterior por una restricción del proveedor: el modo estricto de
 * OpenAI obliga a que **todas** las propiedades sean obligatorias, y rechaza el
 * esquema entero si una es opcional. Así que al generar se piden las nueve.
 *
 * El de arriba sigue admitiendo lecturas sin `analisisCompleto`, porque valida
 * lo que ya está guardado y no todo tiene por qué haberse generado igual.
 */
export const lecturaGeneradaSchema = lecturaBaseSchema.extend({
  analisisCompleto: parrafo,
})

export const activacionDiariaSchema = z.object({
  mensajePrincipal: parrafo,
  queObservar: parrafo,
  queEvitar: parrafo,
  queActivar: parrafo,
  preguntaReflexion: parrafo,
})

export type ActivacionDiaria = z.infer<typeof activacionDiariaSchema>

/* -------------------------------------------------------------------------
   Retrato de la carta: quién es esta persona, planeta a planeta.
   ------------------------------------------------------------------------- */

/**
 * Las secciones del retrato, en el orden en que se leen.
 *
 * El orden no es decorativo: es el que sigue cualquier lectura de carta. Sol,
 * Luna y Ascendente forman el trío que define a la persona —quién es, qué
 * necesita y cómo aparece—; después los llamados planetas personales, que
 * describen funciones concretas (pensar, querer, actuar); luego los sociales,
 * que sitúan a la persona frente al mundo. Las dos últimas no cuelgan de un
 * planeta: salen de cómo se relacionan entre sí.
 *
 * `cuerpo` es el planeta del que habla cada sección, y sirve para pintar al
 * lado su posición real —«Sol en Cáncer, 24°»— sacada de la carta y no del
 * texto. Así el título puede ser lo que el cliente pidió, «Tu forma de ser», y
 * la astrología detrás queda a la vista sin que el párrafo tenga que recitarla.
 */
export const SECCIONES_RETRATO = [
  { clave: 'sol', cuerpo: 'sol' },
  { clave: 'luna', cuerpo: 'luna' },
  /** Sale de la hora exacta: en una carta parcial no existe. Ver más abajo. */
  { clave: 'ascendente', cuerpo: null },
  { clave: 'mercurio', cuerpo: 'mercurio' },
  { clave: 'venus', cuerpo: 'venus' },
  { clave: 'marte', cuerpo: 'marte' },
  { clave: 'jupiter', cuerpo: 'jupiter' },
  { clave: 'saturno', cuerpo: 'saturno' },
  /** No cuelgan de un planeta: se derivan de los aspectos y los elementos. */
  { clave: 'habilidades', cuerpo: null },
  { clave: 'nudo', cuerpo: null },
] as const satisfies readonly { clave: string; cuerpo: Cuerpo | null }[]

export type ClaveRetrato = (typeof SECCIONES_RETRATO)[number]['clave']

const seccionesSinAscendente = {
  sol: parrafo,
  luna: parrafo,
  mercurio: parrafo,
  venus: parrafo,
  marte: parrafo,
  jupiter: parrafo,
  saturno: parrafo,
  habilidades: parrafo,
  nudo: parrafo,
}

/**
 * Lo que se valida al leer lo guardado.
 *
 * `ascendente` es opcional aquí porque **puede no existir**: depende de la hora
 * exacta de nacimiento, y sin ella la carta se calcula `partial`. Un retrato sin
 * esa sección es un retrato completo para esa persona, no uno a medias.
 */
export const retratoSchema = z.object({
  apertura: parrafo,
  ...seccionesSinAscendente,
  ascendente: parrafo.optional(),
})

export type Retrato = z.infer<typeof retratoSchema>

/**
 * Lo que se le exige al modelo al generar, en dos formas.
 *
 * Van separados del anterior por la misma restricción del proveedor que ya
 * obligó a separar `lecturaGeneradaSchema`: el modo estricto de OpenAI exige que
 * **todas** las propiedades sean obligatorias y rechaza el esquema entero si una
 * es opcional. Así que no se puede pedir «el ascendente si lo hay» en un solo
 * esquema: hay que pedir uno u otro según la carta.
 *
 * Que el esquema no lleve el campo es además la única defensa firme contra que
 * el modelo hable del Ascendente de alguien que no dio su hora de nacimiento.
 * Pedírselo por escrito en el prompt ayuda; no dejarle sitio donde escribirlo lo
 * impide.
 */
export const retratoExactoSchema = z.object({
  apertura: parrafo,
  ascendente: parrafo,
  ...seccionesSinAscendente,
})

export const retratoParcialSchema = z.object({
  apertura: parrafo,
  ...seccionesSinAscendente,
})

/** Duración del portal, en días. */
export const DIAS_DE_PORTAL = 30

/**
 * Consultas de guía incluidas por día.
 *
 * Son 3, no 20: la app anterior lo promete por escrito al usuario en pantalla.
 * CLAUDE.md §8 proponía 20 como ejemplo; manda el producto.
 */
export const CONSULTAS_GUIA_POR_DIA = 3
