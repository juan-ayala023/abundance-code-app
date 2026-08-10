import { z } from 'zod'

import { CUERPOS, SIGNOS, SISTEMAS_CASAS, TIPOS_ASPECTO } from './types'

/**
 * Validación de una carta que viene de la base de datos.
 *
 * `portals.chart` es una columna `jsonb` que el propio usuario puede escribir
 * —la política RLS le permite actualizar su fila— y su contenido acaba en el
 * prompt de la lectura. Aunque solo pueda estropear su propia carta, leerla sin
 * validar convertiría esa columna en una vía para meter texto arbitrario en lo
 * que le pedimos al modelo.
 *
 * También protege del caso aburrido: una carta guardada con una forma anterior
 * que ya no encaja con el contrato.
 */

const gradoAbsoluto = z.number().min(0).lt(360)

const posicionSchema = z.object({
  cuerpo: z.enum(CUERPOS),
  longitud: gradoAbsoluto,
  signo: z.enum(SIGNOS),
  gradoEnSigno: z.number().min(0).lt(30),
  casa: z.number().int().min(1).max(12).nullable(),
  retrogrado: z.boolean(),
})

const aspectoSchema = z.object({
  a: z.enum(CUERPOS),
  b: z.enum(CUERPOS),
  tipo: z.enum(TIPOS_ASPECTO),
  orbe: z.number().min(0).max(180),
})

export const cartaSchema = z
  .object({
    precision: z.enum(['exact', 'partial']),
    utc: z.iso.datetime(),
    sistemaCasas: z.enum(SISTEMAS_CASAS),
    // Los diez cuerpos, siempre. Una carta con nueve no es una carta parcial:
    // es una carta rota.
    planetas: z.array(posicionSchema).length(CUERPOS.length),
    // Doce cúspides, o ninguna si no se conocía la hora.
    cuspides: z
      .array(gradoAbsoluto)
      .refine((valor) => valor.length === 0 || valor.length === 12, {
        message: 'una carta tiene doce cúspides, o ninguna si es parcial',
      }),
    ascendente: gradoAbsoluto.nullable(),
    medioCielo: gradoAbsoluto.nullable(),
    aspectos: z.array(aspectoSchema),
  })
  /*
   * Sin hora de nacimiento no hay casas ni ángulos, y con ella los hay siempre.
   * Una carta a medias —ángulos sí, cúspides no— significaría que algo se
   * perdió por el camino, y en la rueda se dibujaría torcida sin avisar.
   */
  .refine(
    (carta) =>
      carta.precision === 'exact'
        ? carta.cuspides.length === 12 &&
          carta.ascendente !== null &&
          carta.medioCielo !== null
        : carta.cuspides.length === 0 &&
          carta.ascendente === null &&
          carta.medioCielo === null &&
          carta.planetas.every((planeta) => planeta.casa === null),
    { message: 'la precisión no concuerda con las casas y los ángulos' },
  )
