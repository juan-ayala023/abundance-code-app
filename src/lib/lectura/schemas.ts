import { z } from 'zod'

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

/** Duración del portal, en días. */
export const DIAS_DE_PORTAL = 30

/**
 * Consultas de guía incluidas por día.
 *
 * Son 3, no 20: la app anterior lo promete por escrito al usuario en pantalla.
 * CLAUDE.md §8 proponía 20 como ejemplo; manda el producto.
 */
export const CONSULTAS_GUIA_POR_DIA = 3
