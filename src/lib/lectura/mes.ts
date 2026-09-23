import 'server-only'

import { DateTime } from 'luxon'
import type { SupabaseClient } from '@supabase/supabase-js'

import { idiomaActual, type Idioma } from '@/i18n/idioma'
import { diasSenalados } from '@/lib/astrology/dias-senalados'
import { calcularPronostico, DIAS_PRONOSTICO } from '@/lib/astrology/pronostico'
import { cartaSchema } from '@/lib/astrology/schema'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

import { generarMes } from './generar-mes'
import { mesGuardadoSchema, mesTextoSchema, type MesGuardado, type MesTexto } from './schemas'
import { nombreDePila } from './voz'

/**
 * La lectura del mes de un portal, escribiéndola si hace falta.
 *
 * El periodo empieza el día en que se pide y dura 30 días. Mientras siga
 * dentro de ese periodo se devuelve la misma: no se reescribe cada vez que
 * alguien abre la pantalla —costaría dinero y, peor, le cambiaría las fechas
 * a quien está siguiendo el mes—. Cuando el periodo vence, la siguiente se
 * escribe a partir de ese día.
 *
 * Vive en la tabla `forecasts`, que ya existía para el pronóstico: es el mismo
 * dato —un periodo, su calendario calculado y su texto— con más apartados.
 */

type Cliente = SupabaseClient<Database>

export type PortalParaMes = {
  id: string
  full_name: string | null
  chart: unknown
  tz: string | null
}

export const COLUMNAS_MES = 'id, full_name, chart, tz'

export type MesVigente = {
  desde: string
  hasta: string
  contenido: MesGuardado
}

/** La lectura del mes en curso, si existe y no ha vencido. */
export async function mesGuardado(supabase: Cliente, portalId: string): Promise<MesVigente | null> {
  const hoy = DateTime.utc().toISODate()!

  const { data } = await supabase
    .from('forecasts')
    .select('desde, hasta, content')
    .eq('portal_id', portalId)
    .gte('hasta', hoy)
    .order('desde', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const contenido = mesGuardadoSchema.safeParse(data.content)
  if (!contenido.success) return null

  return { desde: data.desde, hasta: data.hasta, contenido: contenido.data }
}

/**
 * La escribe si no hay ninguna vigente.
 *
 * Devuelve `null` cuando no se puede: sin carta calculada no hay nada que
 * mirar, y si el cálculo del periodo o el modelo fallan, la pantalla lo dice
 * y ofrece reintentar — nunca se queda en blanco.
 */
export async function asegurarMes(supabase: Cliente, portal: PortalParaMes): Promise<MesVigente | null> {
  const vigente = await mesGuardado(supabase, portal.id)
  if (vigente) return vigente

  const carta = cartaSchema.safeParse(portal.chart)
  if (!carta.success) return null

  const calculado = await calcularPronostico(carta.data, { dias: DIAS_PRONOSTICO })
  if (!calculado) return null

  const dias = diasSenalados(calculado)

  let texto: MesTexto
  try {
    texto = await generarMes({
      nombre: nombreDePila(portal.full_name),
      carta: carta.data,
      pronostico: calculado,
      dias,
      idioma: await idiomaActual(),
    })
  } catch (error) {
    console.error('[mes] no se pudo generar', { portal: portal.id, error })
    return null
  }

  const admin = createAdminClient()
  /*
   * `upsert` y no `insert`.
   *
   * La clave única (portal_id, desde) sigue impidiendo dos filas del mismo
   * periodo. Lo que cambia es qué pasa cuando ya hay una: antes se abandonaba,
   * y una fila con el formato anterior —el pronóstico de cuatro campos— dejaba
   * la pantalla en error para siempre, porque al no validar se volvía a
   * generar y al guardar chocaba con ella. Ahora la nueva la sustituye.
   */
  const { error } = await admin
    .from('forecasts')
    .upsert(
      {
        portal_id: portal.id,
        desde: calculado.desde,
        hasta: calculado.hasta,
        content: texto as never,
        eventos: {
          ventanas: calculado.ventanas,
          trasfondo: calculado.trasfondo,
          diasFavorables: dias.favorables,
          diasCuidado: dias.cuidado,
        } as never,
      },
      { onConflict: 'portal_id,desde' },
    )

  if (error) {
    console.error('[mes] no se pudo guardar', error)
    const otra = await mesGuardado(supabase, portal.id)
    if (otra) return otra
  }

  return { desde: calculado.desde, hasta: calculado.hasta, contenido: texto }
}

/** La lectura del mes en el idioma de la interfaz, si está. Ver `lecturaEnIdioma`. */
export function mesEnIdioma(
  guardado: MesGuardado,
  idioma: Idioma,
): { texto: MesTexto; original: boolean } | null {
  const escritoEn = guardado.idioma ?? 'es'
  if (escritoEn === idioma) return { texto: guardado, original: true }

  const traduccion = mesTextoSchema.safeParse(guardado.traducciones?.[idioma])
  return traduccion.success ? { texto: traduccion.data, original: false } : null
}

/**
 * El resumen del mes que recibe la lectura de hoy.
 *
 * No se le pasa el mes entero: son dos mil palabras de las que hoy solo
 * importa el hilo —de qué va el mes— y si hoy cae dentro de una de sus fechas
 * señaladas. Con el texto completo, el modelo tendía a resumirlo en vez de
 * escribir el día.
 */
export function contextoDelMes(mes: MesGuardado, fecha: string): string {
  const partes = [`Tema del mes: ${mes.titular}`, mes.temaPrincipal]

  const ventana = mes.diasImportantes.find((dia) => fecha >= dia.desde && fecha <= dia.hasta)
  if (ventana) {
    partes.push(
      `HOY CAE DENTRO de una de sus fechas importantes («${ventana.titular}», del ${ventana.desde} al ${ventana.hasta}): ${ventana.texto} La señal que ya se le anunció: ${ventana.senal}`,
    )
  }

  const favorable = mes.diasFavorables.find((dia) => dia.fecha === fecha)
  if (favorable) partes.push(`Hoy es uno de sus días que abren: ${favorable.texto}`)

  const cuidado = mes.diasCuidado.find((dia) => dia.fecha === fecha)
  if (cuidado) partes.push(`Hoy es uno de sus días de cuidado: ${cuidado.texto}`)

  return partes.join('\n')
}
