import 'server-only'

import { DateTime } from 'luxon'

import { casaDe } from './casas'
import { createLocalChartProvider } from './local'
import {
  ANGULO_ASPECTO,
  TIPOS_ASPECTO,
  separacion,
  signoDe,
  type Carta,
  type Cuerpo,
  type Signo,
  type TipoAspecto,
} from './types'

/**
 * El calendario astrológico de un periodo, calculado.
 *
 * Esto existe por una petición concreta (Andrea, 22 sept 2026): que la lectura
 * deje de decir «es un periodo de transformación» y diga **qué podría pasar,
 * cuándo y en qué área**, con ventanas de fechas.
 *
 * La parte delicada no es el texto: es de dónde salen las fechas. Un modelo de
 * lenguaje no sabe astronomía —si se le pide «dame las fechas fuertes del mes»
 * las inventa, y suenan igual de bien estando mal—. Así que aquí no interviene:
 * este módulo recorre el periodo día a día con las mismas efemérides locales
 * que calculan la carta natal, encuentra los hechos (cuándo un tránsito llega
 * a exacto, cuándo un planeta se para, cuándo hay luna nueva o llena, cuándo
 * alguien cambia de signo) y los entrega ya fechados. El modelo solo
 * interpreta lo que aquí se calculó, igual que ya hace con la carta.
 *
 * Nada de esto predice hechos: mide **cuándo se concentran las activaciones**.
 * Lo que se afirme sobre ellas es cosa del prompt, que tiene sus propios
 * límites.
 */

/* ───────────────────────── Configuración ───────────────────────── */

/** Días que abarca un pronóstico por defecto. */
export const DIAS_PRONOSTICO = 30

/**
 * Orbe con el que se considera que un tránsito «está activo», en grados.
 *
 * Más estrecho que el de la carta natal y algo más ancho que el del día
 * (3°): aquí interesa la ventana alrededor del exacto, no el instante.
 */
const ORBE_VENTANA = 2.5

/**
 * La Luna queda fuera de las ventanas de aspecto.
 *
 * Se mueve 13° al día: aspecta a todo cada pocos días y, si entrara, las cinco
 * ventanas del mes serían siempre suyas y taparían a Saturno o a Júpiter, que
 * son los que marcan un periodo. Sí cuenta en las lunaciones, que es donde su
 * posición importa de verdad.
 */
const SIN_LUNA = (cuerpo: Cuerpo) => cuerpo !== 'luna'

/**
 * Cuánto pesa cada planeta cuando transita.
 *
 * No es una opinión: es la velocidad. Plutón tarda años en cruzar un grado, así
 * que su paso por un punto de la carta describe una etapa; Mercurio pasa en
 * horas. Un tránsito lento coincidiendo con uno rápido es lo que hace que un
 * día concreto destaque dentro de una etapa.
 */
const PESO_TRANSITANTE: Record<Cuerpo, number> = {
  pluton: 3,
  neptuno: 3,
  urano: 3,
  saturno: 2.8,
  jupiter: 2.4,
  marte: 1.8,
  sol: 1.4,
  venus: 1.2,
  mercurio: 1.2,
  luna: 0.4,
}

/** Cuánto pesa el punto natal que recibe el tránsito. */
const PESO_NATAL: Record<string, number> = {
  sol: 2,
  luna: 2,
  ascendente: 2,
  medioCielo: 1.8,
  mercurio: 1.3,
  venus: 1.4,
  marte: 1.4,
  jupiter: 1.2,
  saturno: 1.3,
  urano: 1,
  neptuno: 1,
  pluton: 1,
}

/** Los aspectos duros marcan acontecimientos; los suaves, facilidades. */
const PESO_ASPECTO: Record<TipoAspecto, number> = {
  conjuncion: 1.3,
  oposicion: 1.2,
  cuadratura: 1.2,
  trigono: 1,
  sextil: 0.85,
}

/* ───────────────────────── Tipos ───────────────────────── */

/** Un punto de la carta natal que puede recibir tránsitos. */
export type PuntoNatal = Cuerpo | 'ascendente' | 'medioCielo'

export type EventoPronostico =
  | {
      clase: 'aspecto'
      /** Día en que el aspecto es más exacto, `AAAA-MM-DD`. */
      fecha: string
      /** Primer y último día con orbe dentro de `ORBE_VENTANA`. */
      desde: string
      hasta: string
      transitante: Cuerpo
      natal: PuntoNatal
      tipo: TipoAspecto
      /** Orbe en el día central, en grados. */
      orbe: number
      /** Casa natal por la que pasa el planeta ese día. Null si la carta es parcial. */
      casa: number | null
      peso: number
    }
  | {
      clase: 'estacion'
      fecha: string
      desde: string
      hasta: string
      cuerpo: Cuerpo
      /** 'retrogrado' cuando empieza a retroceder; 'directo' cuando lo retoma. */
      sentido: 'retrogrado' | 'directo'
      signo: Signo
      casa: number | null
      peso: number
    }
  | {
      clase: 'lunacion'
      fecha: string
      desde: string
      hasta: string
      tipo: 'nueva' | 'llena'
      signo: Signo
      casa: number | null
      /** Punto natal al que cae encima, si cae a menos de 3°. */
      sobre: PuntoNatal | null
      peso: number
    }
  | {
      clase: 'ingreso'
      fecha: string
      desde: string
      hasta: string
      cuerpo: Cuerpo
      signo: Signo
      casa: number | null
      peso: number
    }

export type VentanaPronostico = {
  /** `v1`, `v2`… Es lo que el modelo usa para referirse a esta ventana. */
  id: string
  /** Día central: el de mayor concentración. */
  fecha: string
  desde: string
  hasta: string
  /** Suma de pesos de lo que ocurre dentro. */
  intensidad: number
  nivel: 'alta' | 'media' | 'observar'
  eventos: EventoPronostico[]
}

export type Pronostico = {
  desde: string
  hasta: string
  /**
   * Las 3–5 fechas fuertes del periodo.
   *
   * Un «pico»: el día en que varias cosas llegan a exacto a la vez, con dos
   * días de margen a cada lado.
   */
  ventanas: VentanaPronostico[]
  /**
   * Lo que dura todo el periodo y no tiene un día concreto.
   *
   * Un tránsito de Plutón está activo durante meses: decir «el 14 pasa algo»
   * sería falso, y decir que no pasa nada, también. Es la etapa de fondo, y
   * va aparte de las ventanas para que el modelo no le ponga fecha.
   */
  trasfondo: EventoPronostico[]
  /** Todo lo calculado, también lo que no llegó a ventana principal. */
  eventos: EventoPronostico[]
}

/* ───────────────────────── Cálculo ───────────────────────── */

type Muestra = {
  fecha: string
  posiciones: Map<Cuerpo, { longitud: number; retrogrado: boolean; casa: number | null }>
}

/** Las posiciones del cielo a mediodía UTC de un día. */
async function muestraDelDia(fecha: DateTime, natal: Carta): Promise<Muestra | null> {
  const utc = fecha.toUTC().set({ hour: 12, minute: 0, second: 0, millisecond: 0 })

  try {
    const cielo = await createLocalChartProvider().calcular({
      utc: utc.toISO()!,
      lat: 0,
      lng: 0,
      tz: 'UTC',
      precision: 'partial',
    })

    const posiciones = new Map<Cuerpo, { longitud: number; retrogrado: boolean; casa: number | null }>()
    for (const planeta of cielo.planetas) {
      posiciones.set(planeta.cuerpo, {
        longitud: planeta.longitud,
        retrogrado: planeta.retrogrado,
        casa: casaDe(planeta.longitud, natal.cuspides),
      })
    }

    return { fecha: fecha.toISODate()!, posiciones }
  } catch (error) {
    console.error('[pronostico] no se pudo calcular el cielo', { fecha: fecha.toISODate(), error })
    return null
  }
}

/** Los puntos de la carta natal que reciben tránsitos, con su longitud. */
function puntosNatales(natal: Carta): { punto: PuntoNatal; longitud: number }[] {
  const puntos = natal.planetas.map((p) => ({ punto: p.cuerpo as PuntoNatal, longitud: p.longitud }))

  if (natal.ascendente !== null) puntos.push({ punto: 'ascendente', longitud: natal.ascendente })
  if (natal.medioCielo !== null) puntos.push({ punto: 'medioCielo', longitud: natal.medioCielo })

  return puntos
}

/**
 * El nivel es relativo al propio periodo, no a una escala fija.
 *
 * Con un umbral absoluto todas las ventanas de un mes cargado salían «alta» y
 * el dato dejaba de informar: si todo pesa igual, nada destaca. Aquí se
 * comparan entre ellas —la más fuerte del mes marca el listón— con un suelo
 * absoluto para que un mes tranquilo no ascienda a «alta» un aspecto suelto.
 */
function nivelDe(intensidad: number, maximo: number): VentanaPronostico['nivel'] {
  if (intensidad < 5) return 'observar'
  if (intensidad >= maximo * 0.7) return 'alta'
  if (intensidad >= maximo * 0.4) return 'media'
  return 'observar'
}

/**
 * El calendario del periodo.
 *
 * Recorre día a día (mediodía UTC) y va anotando:
 *
 *   · **aspectos**: cuándo el orbe con un punto natal toca su mínimo dentro de
 *     la ventana. El mínimo es el «exacto»; los extremos de la ventana son los
 *     días en que entra y sale del orbe.
 *   · **estaciones**: el día en que un planeta cambia de sentido. Es de los
 *     pocos hechos astrológicos que la gente reconoce sin saber astrología.
 *   · **lunaciones**: luna nueva y llena, con la casa natal donde caen.
 *   · **ingresos**: cambio de signo de un planeta que no sea la Luna.
 *
 * Y agrupa lo que cae junto: varias cosas el mismo día son una ventana fuerte,
 * que es exactamente el criterio que pidió Andrea («mayor peso cuando coincidan
 * múltiples indicadores»).
 */
export async function calcularPronostico(
  natal: Carta,
  opciones: { desde?: DateTime; dias?: number } = {},
): Promise<Pronostico | null> {
  const dias = opciones.dias ?? DIAS_PRONOSTICO
  const inicio = (opciones.desde ?? DateTime.utc()).startOf('day')

  const muestras: Muestra[] = []
  for (let i = 0; i <= dias; i += 1) {
    const muestra = await muestraDelDia(inicio.plus({ days: i }), natal)
    if (!muestra) return null
    muestras.push(muestra)
  }

  const eventos: EventoPronostico[] = []
  const puntos = puntosNatales(natal)

  /* ── Aspectos: se busca el mínimo de orbe dentro de cada racha ── */
  for (const transitante of natal.planetas.map((p) => p.cuerpo).filter(SIN_LUNA)) {
    for (const { punto, longitud } of puntos) {
      for (const tipo of TIPOS_ASPECTO) {
        let racha: { indice: number; orbe: number }[] = []

        const cerrarRacha = () => {
          if (racha.length === 0) return
          const mejor = racha.reduce((a, b) => (b.orbe < a.orbe ? b : a))
          const central = muestras[mejor.indice]!
          const casa = central.posiciones.get(transitante)?.casa ?? null

          eventos.push({
            clase: 'aspecto',
            fecha: central.fecha,
            desde: muestras[racha[0]!.indice]!.fecha,
            hasta: muestras[racha[racha.length - 1]!.indice]!.fecha,
            transitante,
            natal: punto,
            tipo,
            orbe: Number(mejor.orbe.toFixed(2)),
            casa,
            peso:
              PESO_TRANSITANTE[transitante] *
              (PESO_NATAL[punto] ?? 1) *
              PESO_ASPECTO[tipo] *
              // Cuanto más exacto, más pesa: de 1 (en el borde) a 1,5 (clavado).
              (1.5 - (mejor.orbe / ORBE_VENTANA) * 0.5),
          })
          racha = []
        }

        muestras.forEach((muestra, indice) => {
          const cielo = muestra.posiciones.get(transitante)
          if (!cielo) return cerrarRacha()

          const orbe = Math.abs(separacion(cielo.longitud, longitud) - ANGULO_ASPECTO[tipo])
          if (orbe <= ORBE_VENTANA) racha.push({ indice, orbe })
          else cerrarRacha()
        })

        cerrarRacha()
      }
    }
  }

  /* ── Estaciones, lunaciones e ingresos ── */
  for (let i = 1; i < muestras.length; i += 1) {
    const ayer = muestras[i - 1]!
    const hoy = muestras[i]!

    for (const cuerpo of natal.planetas.map((p) => p.cuerpo)) {
      const antes = ayer.posiciones.get(cuerpo)
      const ahora = hoy.posiciones.get(cuerpo)
      if (!antes || !ahora) continue

      // Estación: cambia el sentido de la marcha. La Luna nunca retrograda.
      if (cuerpo !== 'luna' && cuerpo !== 'sol' && antes.retrogrado !== ahora.retrogrado) {
        eventos.push({
          clase: 'estacion',
          fecha: hoy.fecha,
          desde: ayer.fecha,
          hasta: muestras[Math.min(i + 2, muestras.length - 1)]!.fecha,
          cuerpo,
          sentido: ahora.retrogrado ? 'retrogrado' : 'directo',
          signo: signoDe(ahora.longitud),
          casa: ahora.casa,
          peso: PESO_TRANSITANTE[cuerpo] * 1.1,
        })
      }

      // Ingreso: cambia de signo.
      if (cuerpo !== 'luna' && signoDe(antes.longitud) !== signoDe(ahora.longitud)) {
        eventos.push({
          clase: 'ingreso',
          fecha: hoy.fecha,
          desde: hoy.fecha,
          hasta: hoy.fecha,
          cuerpo,
          signo: signoDe(ahora.longitud),
          casa: ahora.casa,
          peso: PESO_TRANSITANTE[cuerpo] * 0.8,
        })
      }
    }

    /* Lunación: el día en que la separación Sol-Luna toca su mínimo (nueva) o
       su máximo (llena). Se mira con el día anterior y el siguiente para no
       marcar dos días seguidos. */
    const siguiente = muestras[i + 1]
    if (siguiente) {
      const sep = (m: Muestra) => {
        const sol = m.posiciones.get('sol')
        const luna = m.posiciones.get('luna')
        return sol && luna ? separacion(sol.longitud, luna.longitud) : null
      }
      const a = sep(ayer)
      const b = sep(hoy)
      const c = sep(siguiente)
      const luna = hoy.posiciones.get('luna')

      if (a !== null && b !== null && c !== null && luna) {
        const esNueva = b < a && b < c && b < 15
        const esLlena = b > a && b > c && b > 165

        if (esNueva || esLlena) {
          // ¿Cae encima de algo de la carta? Tres grados: o cae, o no.
          const encima = puntos.find(({ longitud }) => separacion(luna.longitud, longitud) <= 3)

          eventos.push({
            clase: 'lunacion',
            fecha: hoy.fecha,
            desde: ayer.fecha,
            hasta: muestras[Math.min(i + 2, muestras.length - 1)]!.fecha,
            tipo: esNueva ? 'nueva' : 'llena',
            signo: signoDe(luna.longitud),
            casa: luna.casa,
            sobre: encima?.punto ?? null,
            peso: (esNueva ? 1.6 : 1.8) * (encima ? 2 : 1),
          })
        }
      }
    }
  }

  /* ── Trasfondo y picos ──────────────────────────────────────────────
     Un tránsito lento está dentro de orbe todo el mes y su mínimo cae en el
     borde del periodo: eso significa que el exacto queda fuera de lo que se
     ha mirado, así que **no se sabe el día** y sería falso darle uno. Esos
     van al trasfondo, que describe la etapa. Los demás sí tienen su día. */
  const ordenados = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const fin = inicio.plus({ days: dias }).toISODate()!
  const primeroDelPeriodo = inicio.toISODate()!

  const duracion = (e: EventoPronostico) =>
    DateTime.fromISO(e.hasta).diff(DateTime.fromISO(e.desde), 'days').days

  const esTrasfondo = (e: EventoPronostico) =>
    e.clase === 'aspecto' &&
    (duracion(e) >= 21 || e.fecha === primeroDelPeriodo || e.fecha === fin)

  const trasfondo = ordenados.filter(esTrasfondo).sort((a, b) => b.peso - a.peso)
  const picos = ordenados.filter((e) => !esTrasfondo(e))

  /* ── Ventanas: días donde se concentran los exactos ──
     Se agrupa por el día del exacto (no por la ventana de orbe, que en un
     planeta lento dura semanas y encadenaría todo el mes en un solo grupo).
     Cada ventana es su día central con dos días de margen. */
  const porDia = new Map<string, EventoPronostico[]>()
  for (const evento of picos) {
    const lista = porDia.get(evento.fecha) ?? []
    lista.push(evento)
    porDia.set(evento.fecha, lista)
  }

  const grupos: EventoPronostico[][] = []
  for (const [, delDia] of [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const ultimo = grupos[grupos.length - 1]
    const referencia = ultimo?.[0]
    const distancia = referencia
      ? DateTime.fromISO(delDia[0]!.fecha).diff(DateTime.fromISO(referencia.fecha), 'days').days
      : Infinity

    // Hasta dos días de separación es el mismo episodio; más, otro distinto.
    if (ultimo && distancia <= 2) ultimo.push(...delDia)
    else grupos.push([...delDia])
  }

  const ventanas = grupos
    .map((grupo) => {
      const intensidad = grupo.reduce((suma, e) => suma + e.peso, 0)
      const principal = grupo.reduce((a, b) => (b.peso > a.peso ? b : a))
      const fechas = grupo.map((e) => e.fecha).sort()
      const centro = DateTime.fromISO(principal.fecha)

      /* Margen de dos días a cada lado del exacto, sin salirse del periodo.
         Es lo que se le promete al usuario: «en torno a esta fecha». */
      const desdeVentana = DateTime.max(centro.minus({ days: 2 }), DateTime.fromISO(fechas[0]!).minus({ days: 1 }), inicio)
      const hastaVentana = DateTime.min(
        centro.plus({ days: 2 }),
        DateTime.fromISO(fechas[fechas.length - 1]!).plus({ days: 1 }),
        inicio.plus({ days: dias }),
      )

      return {
        id: '',
        fecha: principal.fecha,
        desde: desdeVentana.toISODate()!,
        hasta: hastaVentana.toISODate()!,
        intensidad: Number(intensidad.toFixed(2)),
        nivel: 'observar' as VentanaPronostico['nivel'],
        eventos: [...grupo].sort((a, b) => b.peso - a.peso),
      }
    })
    // Las cinco más cargadas del periodo, otra vez en orden de calendario.
    .sort((a, b) => b.intensidad - a.intensidad)
    .slice(0, 5)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((ventana, indice) => ({ ...ventana, id: `v${indice + 1}` }))

  const maximo = ventanas.reduce((mayor, v) => Math.max(mayor, v.intensidad), 0)
  for (const ventana of ventanas) ventana.nivel = nivelDe(ventana.intensidad, maximo)

  return {
    desde: primeroDelPeriodo,
    hasta: fin,
    ventanas,
    trasfondo: trasfondo.slice(0, 4),
    eventos: ordenados,
  }
}
