'use server'

import { revalidatePath } from 'next/cache'

import { idiomaActual } from '@/i18n/idioma'
import { z } from 'zod'

import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { createLocalChartProvider } from '@/lib/astrology/local'
import { cartaSchema } from '@/lib/astrology/schema'
import { zonaDelPortal } from '@/lib/time/dia'
import { aspectosDeTransito } from '@/lib/astrology/transitos'
import {
  lecturaBaseSchema,
  CONSULTAS_GUIA_POR_MES,
  SEGUIMIENTOS_POR_CONSULTA,
} from '@/lib/lectura/schemas'
import { generarRespuestaGuia, type MensajeDeHilo } from '@/lib/lectura/generar-guia'
import { mesDeGuia } from '@/lib/lectura/guia'
import { nombreDePila } from '@/lib/lectura/voz'
import { createAdminClient, createClient } from '@/lib/supabase/server'

import type { EstadoConsulta, MensajeConsulta } from './estado'

const preguntaSchema = z.string().trim().min(10, 'Escribe un poco más').max(500)
const hiloSchema = z.string().uuid()

/**
 * Responde una consulta de la guía.
 *
 * Los límites se aplican **aquí**, no en el formulario. Lo que se muestra en
 * pantalla es informativo; esto es lo que de verdad impide gastar de más, y
 * por eso cuenta contra `guidance_queries`, que el usuario no puede escribir
 * (la política RLS solo le concede `select`).
 *
 * Desde el 23 de septiembre de 2026 hay dos límites y no uno:
 *
 *   · **Doce consultas al mes** del portal. Solo las filas de tipo `consulta`
 *     cuentan: un seguimiento va dentro de la que ya se gastó.
 *   · **Dos seguimientos por consulta.** Una aclaración —cuando la guía pide
 *     un dato antes de responder— no gasta ninguno de los dos, porque no la
 *     pidió la persona.
 */
export async function consultarGuia(
  _previo: EstadoConsulta,
  formData: FormData,
): Promise<EstadoConsulta> {
  const vacio = { mensajes: [], hilo: null, seguimientosRestantes: 0, restantesDelMes: null }

  const pregunta = preguntaSchema.safeParse(formData.get('pregunta'))
  if (!pregunta.success) {
    return { ...vacio, error: pregunta.error.issues[0]!.message }
  }

  /* Viene relleno solo cuando se está profundizando en un tema ya abierto. */
  const hiloPedido = hiloSchema.safeParse(formData.get('hilo'))
  const hiloId = hiloPedido.success ? hiloPedido.data : null

  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, full_name, chart, base_reading, created_at, tz, display_tz')
    .maybeSingle()

  if (!portal) {
    return { ...vacio, error: 'Tu sesión expiró. Vuelve a entrar.' }
  }

  /*
   * El nivel se comprueba AQUÍ además de en la pantalla. Ocultar el formulario
   * no impide enviar el formulario: sin esto, quien pasó de los 30 días seguiría
   * consumiendo consultas —y facturándolas— con una petición directa.
   */
  const acceso = await resolveAccess()
  if (nivelDeAcceso(entitlementDe(acceso)) === 'solo-lectura') {
    return { ...vacio, error: await textoDe('suscripcion', 'mensaje') }
  }

  const carta = cartaSchema.safeParse(portal.chart)
  if (!carta.success) {
    return { ...vacio, error: await textoDe('guia_form', 'sinCarta') }
  }

  const zona = zonaDelPortal(portal)
  const mes = mesDeGuia(portal.created_at, zona)

  /* Lo ya hablado en este hilo, si lo hay. Es lo que lo hace una conversación. */
  const hilo = hiloId ? await leerHilo(portal.id, hiloId) : []
  const esSeguimiento = hilo.length > 0

  if (esSeguimiento) {
    const usados = hilo.filter((mensaje) => mensaje.tipo === 'seguimiento').length
    if (usados >= SEGUIMIENTOS_POR_CONSULTA) {
      return {
        ...vacio,
        error: await textoDe('guia_form', 'seguimientosAgotados'),
        mensajes: hilo.map(aMensaje),
        hilo: hiloId,
      }
    }
  } else {
    const { count } = await supabase
      .from('guidance_queries')
      .select('id', { count: 'exact', head: true })
      .eq('portal_id', portal.id)
      .eq('tipo', 'consulta')
      .gte('created_at', (mes?.desde ?? new Date(0)).toISOString())

    if ((count ?? 0) >= CONSULTAS_GUIA_POR_MES) {
      return { ...vacio, error: await textoDe('guia_form', 'agotadasError'), restantesDelMes: 0 }
    }
  }

  const transitos = await calcularTransitosDeHoy(carta.data)
  const lectura = lecturaBaseSchema.safeParse(portal.base_reading)

  let resultado
  try {
    resultado = await generarRespuestaGuia({
      nombre: nombreDePila(portal.full_name),
      idioma: await idiomaActual(),
      carta: carta.data,
      transitos,
      resumen: lectura.success ? lectura.data.resumen : null,
      pregunta: pregunta.data,
      historial: hilo.map(
        (mensaje): MensajeDeHilo => ({ pregunta: mensaje.question, respuesta: mensaje.answer }),
      ),
    })
  } catch (error) {
    console.error('[guia] no se pudo responder', error)
    return {
      ...vacio,
      error: 'No pudimos responder tu consulta ahora mismo. Inténtalo en unos minutos.',
      mensajes: hilo.map(aMensaje),
      hilo: hiloId,
      seguimientosRestantes: seguimientosQueQuedan(hilo),
    }
  }

  /*
   * Qué se acaba de gastar.
   *
   * Una aclaración no gasta nada: la pidió el sistema. La primera pregunta de
   * un hilo gasta consulta; las siguientes, seguimiento.
   */
  const tipo: MensajeConsulta['tipo'] =
    resultado.tipo === 'aclaracion' ? 'aclaracion' : esSeguimiento ? 'seguimiento' : 'consulta'

  /*
   * Se registra DESPUÉS de responder, y con el cliente administrativo porque el
   * usuario no tiene `insert`. Si la generación falla, la consulta no se le
   * descuenta: sería cobrarle un intento que no llegó a existir.
   */
  const nuevoId = crypto.randomUUID()
  const { error } = await createAdminClient()
    .from('guidance_queries')
    .insert({
      id: nuevoId,
      portal_id: portal.id,
      thread_id: hiloId ?? nuevoId,
      tipo,
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

  /*
   * Para que «Mis consultas» y el contador se refresquen con la nueva sin
   * recargar. Sin esto la respuesta aparecía arriba y la lista, debajo, seguía
   * diciendo «todavía no has hecho ninguna consulta».
   */
  revalidatePath('/guia')

  const mensajes: MensajeConsulta[] = [
    ...hilo.map(aMensaje),
    { pregunta: pregunta.data, respuesta: resultado.respuesta, tipo },
  ]

  return {
    error: null,
    mensajes,
    hilo: hiloId ?? nuevoId,
    seguimientosRestantes:
      SEGUIMIENTOS_POR_CONSULTA -
      mensajes.filter((mensaje) => mensaje.tipo === 'seguimiento').length,
    restantesDelMes: null,
  }
}

type FilaDeHilo = {
  question: string
  answer: string | null
  tipo: string
}

/** Los mensajes de un hilo, de más antiguo a más nuevo. */
async function leerHilo(portalId: string, hiloId: string): Promise<FilaDeHilo[]> {
  const { data } = await createAdminClient()
    .from('guidance_queries')
    .select('question, answer, tipo')
    /* Por portal además de por hilo: un id de otra persona no abre su hilo. */
    .eq('portal_id', portalId)
    .eq('thread_id', hiloId)
    .order('created_at', { ascending: true })

  return data ?? []
}

function aMensaje(fila: FilaDeHilo): MensajeConsulta {
  return {
    pregunta: fila.question,
    respuesta: fila.answer ?? '',
    tipo: (fila.tipo as MensajeConsulta['tipo']) ?? 'consulta',
  }
}

function seguimientosQueQuedan(hilo: FilaDeHilo[]): number {
  const usados = hilo.filter((mensaje) => mensaje.tipo === 'seguimiento').length
  return Math.max(SEGUIMIENTOS_POR_CONSULTA - usados, 0)
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

/**
 * Un texto de los diccionarios, desde el servidor.
 *
 * Los errores de esta acción pueden llegarle a alguien que forzó el envío —el
 * formulario solo informa; la defensa es esto— y tienen que llegarle en su
 * idioma, no en el del código.
 */
async function textoDe(espacio: string, clave: string): Promise<string> {
  const { getTranslations } = await import('next-intl/server')
  const t = await getTranslations(espacio as never)
  return t(clave as never)
}
