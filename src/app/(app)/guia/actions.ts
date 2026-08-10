'use server'

import { z } from 'zod'

import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { MENSAJE_SOLO_LECTURA, nivelDeAcceso } from '@/lib/access/nivel'
import { createLocalChartProvider } from '@/lib/astrology/local'
import { cartaSchema } from '@/lib/astrology/schema'
import { aspectosDeTransito } from '@/lib/astrology/transitos'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { lecturaBaseSchema, CONSULTAS_GUIA_POR_DIA } from '@/lib/lectura/schemas'
import { generarRespuestaGuia } from '@/lib/lectura/generar-guia'
import { createAdminClient, createClient } from '@/lib/supabase/server'

import type { EstadoConsulta } from './estado'

const preguntaSchema = z.string().trim().min(10, 'Escribe un poco más').max(500)

/**
 * Responde una consulta de la guía.
 *
 * El límite de 3 al día se aplica **aquí**, no en el formulario. Lo que se
 * muestra en pantalla es informativo; esto es lo que de verdad impide gastar de
 * más, y por eso cuenta contra `guidance_queries`, que el usuario no puede
 * escribir (la política RLS solo le concede `select`).
 */
export async function consultarGuia(
  _previo: EstadoConsulta,
  formData: FormData,
): Promise<EstadoConsulta> {
  const pregunta = preguntaSchema.safeParse(formData.get('pregunta'))
  if (!pregunta.success) {
    return { error: pregunta.error.issues[0]!.message, respuesta: null, pregunta: null }
  }

  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, chart, base_reading, created_at')
    .maybeSingle()

  if (!portal) {
    return { error: 'Tu sesión expiró. Vuelve a entrar.', respuesta: null, pregunta: null }
  }

  /*
   * El nivel se comprueba AQUÍ además de en la pantalla. Ocultar el formulario
   * no impide enviar el formulario: sin esto, quien pasó de los 30 días seguiría
   * consumiendo consultas —y facturándolas— con una petición directa.
   */
  const acceso = await resolveAccess()
  const nivel = nivelDeAcceso(entitlementDe(acceso))

  if (nivel === 'solo-lectura') {
    return {
      error: MENSAJE_SOLO_LECTURA,
      respuesta: null,
      pregunta: null,
    }
  }

  const carta = cartaSchema.safeParse(portal.chart)
  if (!carta.success) {
    return {
      error: 'Tu carta todavía no está calculada. Vuelve en un momento.',
      respuesta: null,
      pregunta: null,
    }
  }

  // El día se corta a medianoche UTC, igual que el contador del ciclo.
  const inicioDelDia = new Date()
  inicioDelDia.setUTCHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('guidance_queries')
    .select('id', { count: 'exact', head: true })
    .eq('portal_id', portal.id)
    .gte('created_at', inicioDelDia.toISOString())

  if ((count ?? 0) >= CONSULTAS_GUIA_POR_DIA) {
    return {
      error: `Has usado tus ${CONSULTAS_GUIA_POR_DIA} consultas de hoy. Vuelven a estar disponibles mañana.`,
      respuesta: null,
      pregunta: null,
    }
  }

  const transitos = await calcularTransitosDeHoy(carta.data)
  const lectura = lecturaBaseSchema.safeParse(portal.base_reading)

  let resultado
  try {
    resultado = await generarRespuestaGuia({
      carta: carta.data,
      transitos,
      resumen: lectura.success ? lectura.data.resumen : null,
      pregunta: pregunta.data,
    })
  } catch (error) {
    console.error('[guia] no se pudo responder', error)
    return {
      error: 'No pudimos responder tu consulta ahora mismo. Inténtalo en unos minutos.',
      respuesta: null,
      pregunta: pregunta.data,
    }
  }

  /*
   * Se registra DESPUÉS de responder, y con el cliente administrativo porque el
   * usuario no tiene `insert`. Si la generación falla, la consulta no se le
   * descuenta: sería cobrarle un intento que no llegó a existir.
   */
  const { error } = await createAdminClient().from('guidance_queries').insert({
    portal_id: portal.id,
    question: pregunta.data,
    answer: resultado.respuesta,
    model: resultado.modelo,
    tokens: resultado.tokens,
  })

  if (error) {
    // La respuesta ya existe y es suya: se le entrega igualmente. Lo que se
    // pierde es el registro, y eso es un problema nuestro, no suyo.
    console.error('[guia] no se pudo registrar la consulta', error)
  }

  return { error: null, respuesta: resultado.respuesta, pregunta: pregunta.data }
}

/** El cielo de hoy, para que la respuesta hable del momento y no solo del nacimiento. */
async function calcularTransitosDeHoy(carta: Parameters<typeof aspectosDeTransito>[0]) {
  const hoy = new Date()
  hoy.setUTCHours(12, 0, 0, 0)

  try {
    const cielo = await createLocalChartProvider().calcular({
      utc: hoy.toISOString(),
      lat: 0,
      lng: 0,
      tz: 'UTC',
      precision: 'partial',
    })

    return aspectosDeTransito(carta, cielo)
  } catch (error) {
    // Sin tránsitos la respuesta sigue siendo válida: se apoya solo en la carta.
    console.error('[guia] no se pudieron calcular los tránsitos', error)
    return []
  }
}
