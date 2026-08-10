import 'server-only'

import { createOpenAI } from '@ai-sdk/openai'

import { requireServerEnv } from '@/lib/env/server'

/**
 * Acceso al proveedor de IA.
 *
 * Proveedor: OpenAI, por decisión del cliente. Va a través del AI SDK, así que
 * cambiarlo es sustituir el modelo y no reescribir las llamadas.
 *
 * La clave se pide con `requireServerEnv` en vez de dejar que el SDK la lea de
 * `process.env`: si falta, el error dice qué falta y para qué, en lugar de un
 * 401 del proveedor a mitad de una generación.
 */

/** La lectura base: se genera una vez por usuario y es el entregable. */
export const MODELO_LECTURA = 'gpt-5'

/**
 * Activaciones diarias y guía. Son repetidas —una al día, hasta tres consultas
 * diarias— y es donde el coste se multiplica.
 */
export const MODELO_RAPIDO = 'gpt-5-mini'

export function modelo(id: string) {
  const openai = createOpenAI({
    apiKey: requireServerEnv('OPENAI_API_KEY', 'generar interpretaciones'),
  })

  return openai(id)
}

/**
 * Los GPT-5 son modelos de razonamiento: gastan tokens pensando antes de
 * escribir, y esos tokens se facturan como salida. En una prueba trivial fueron
 * 448 de 496. Se fija el esfuerzo de forma explícita en cada llamada para que
 * el coste no dependa de un valor por defecto que puede cambiar.
 */
export type EsfuerzoRazonamiento = 'minimal' | 'low' | 'medium' | 'high'

export function opcionesRazonamiento(esfuerzo: EsfuerzoRazonamiento) {
  return { openai: { reasoningEffort: esfuerzo } }
}
