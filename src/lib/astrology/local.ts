import 'server-only'

import { Horoscope, Origin } from 'circular-natal-horoscope-js'
import { DateTime } from 'luxon'

import { normalizar } from './geometria'
import { ChartError, type ChartProvider, type ChartRequest } from './provider'
import {
  ANGULO_ASPECTO,
  CUERPOS,
  TIPOS_ASPECTO,
  gradoEnSigno,
  separacion,
  signoDe,
  type Aspecto,
  type Carta,
  type Cuerpo,
  type PosicionPlanetaria,
  type SistemaCasas,
  type TipoAspecto,
} from './types'

/**
 * Cálculo de la carta natal en nuestro propio proceso.
 *
 * Usa `circular-natal-horoscope-js` (dominio público, efemérides Moshier). Se
 * eligió sobre las APIs externas porque los datos de nacimiento no salen de
 * aquí: fecha, hora y lugar identifican a una persona de forma prácticamente
 * única y no se pueden rotar como una contraseña. Ver `docs/proveedor-carta.md`.
 *
 * El paquete se publica como un bundle de webpack que marca `__esModule: true`
 * pero no define `default`. Hay que importarlo **con nombres**: con importación
 * por defecto, Vite hace un apaño y devuelve el espacio de nombres —así que las
 * pruebas pasan— mientras que webpack respeta la marca y entrega `undefined`,
 * de modo que solo revienta en el build real. Lo cazaron las pruebas e2e.
 */

/**
 * Identifica el motor que calculó una carta guardada.
 *
 * Se guarda junto a la carta en `portals.chart_version`. Al cambiarlo, las
 * cartas anteriores dejan de considerarse vigentes y se recalculan solas la
 * próxima vez que alguien las lee.
 */
export const VERSION_MOTOR = 'local-moshier-1'

/** Nuestros cuerpos, en la nomenclatura de la librería. */
const CLAVE_LIB: Record<Cuerpo, string> = {
  sol: 'sun',
  luna: 'moon',
  mercurio: 'mercury',
  venus: 'venus',
  marte: 'mars',
  jupiter: 'jupiter',
  saturno: 'saturn',
  urano: 'uranus',
  neptuno: 'neptune',
  pluton: 'pluto',
}

/**
 * La librería también devuelve Quirón y Sirio, que no están en nuestro
 * contrato. No basta con ignorarlos al leer los planetas: si se dejaran pasar,
 * sus aspectos aparecerían en la rueda. Recorremos `CUERPOS` en vez de la lista
 * de la librería, así quedan fuera por construcción y el orden es estable.
 */

const SISTEMA_LIB: Record<SistemaCasas, string> = {
  placidus: 'placidus',
  'whole-sign': 'whole-sign',
  koch: 'koch',
  // La librería lo llama así; con 'equal' lanza.
  equal: 'equal-house',
}

/**
 * Orbes máximos por aspecto, en grados. Son los valores clásicos: más margen
 * para los aspectos mayores y menos para el sextil, que es el más débil.
 */
const ORBE_MAXIMO: Record<TipoAspecto, number> = {
  conjuncion: 8,
  oposicion: 8,
  trigono: 8,
  cuadratura: 7,
  sextil: 6,
}

export function createLocalChartProvider(): ChartProvider {
  return {
    async calcular(request: ChartRequest): Promise<Carta> {
      const sistemaCasas = request.sistemaCasas ?? 'placidus'
      const exacta = request.precision === 'exact'

      const instante = DateTime.fromISO(request.utc, { zone: 'utc' })
      if (!instante.isValid) {
        throw new ChartError(`Instante de nacimiento no válido: ${request.utc}`)
      }

      const origin = construirOrigin(instante, request)

      let horoscopo: HoroscopoLib
      try {
        horoscopo = new Horoscope({
          origin,
          houseSystem: SISTEMA_LIB[sistemaCasas],
          zodiac: 'tropical',
          language: 'en',
        }) as HoroscopoLib
      } catch (error) {
        console.error('[carta] la librería rechazó los datos', error)
        throw new ChartError('No pudimos calcular la carta natal.')
      }

      const planetas = leerPlanetas(horoscopo, exacta)

      return {
        precision: request.precision,
        utc: instante.toISO()!,
        sistemaCasas,
        planetas,
        cuspides: exacta ? leerCuspides(horoscopo) : [],
        ascendente: exacta ? leerAngulo(horoscopo.Ascendant, 'ascendente') : null,
        medioCielo: exacta ? leerAngulo(horoscopo.Midheaven, 'medio cielo') : null,
        aspectos: calcularAspectos(planetas),
      }
    },
  }
}

/**
 * Construye el `Origin` de la librería a partir de NUESTRO instante UTC.
 *
 * Aquí está la trampa de este adaptador. La librería no acepta UTC: pide hora
 * local y deriva ella misma la zona horaria de las coordenadas, con su propia
 * copia de la base de datos de zonas. Nosotros ya resolvimos el instante en
 * `resolveBirthInstant()`, con la zona IANA que da GeoNames y los desfases
 * históricos. Son dos fuentes de verdad para el dato del que depende el
 * ascendente entero, y cuando discrepan la carta sale mal en silencio.
 *
 * La salida no es pelearse con la librería sino alimentarla en sus términos:
 * se le pasa una hora local, se mira a qué UTC la convirtió y se corrige la
 * diferencia. Como solo lee año, mes, día, hora y minuto —ignora la zona que
 * lleve el objeto—, desplazar la hora local un delta desplaza el UTC ese mismo
 * delta, y una sola corrección basta. Se reserva alguna iteración más para
 * cuando el desplazamiento cruza un cambio de horario, donde esa linealidad se
 * rompe.
 *
 * Si tras eso no coincide, se lanza. Una carta desplazada es peor que ninguna:
 * parece correcta.
 */
const INTENTOS_ORIGIN = 3

function construirOrigin(instante: DateTime, request: ChartRequest): OriginLib {
  // Se parte de nuestra zona: cuando ambas coinciden —el caso normal— acierta
  // a la primera y no hay corrección que aplicar.
  let local = instante.setZone(request.tz)
  if (!local.isValid) {
    throw new ChartError(`Zona horaria desconocida: ${request.tz}`)
  }

  for (let intento = 1; intento <= INTENTOS_ORIGIN; intento++) {
    const origin = nuevoOrigin(local, request)
    const desvio = instante.diff(utcDe(origin)).toMillis()

    if (desvio === 0) return origin

    local = local.plus({ milliseconds: desvio })
  }

  console.error('[carta] no se pudo alinear el instante', {
    utc: request.utc,
    tz: request.tz,
    lat: request.lat,
    lng: request.lng,
  })
  throw new ChartError('No pudimos calcular la carta natal.')
}

function nuevoOrigin(local: DateTime, request: ChartRequest): OriginLib {
  return new Origin({
    year: local.year,
    // La librería cuenta los meses desde 0.
    month: local.month - 1,
    date: local.day,
    hour: local.hour,
    minute: local.minute,
    second: local.second,
    latitude: request.lat,
    longitude: request.lng,
  }) as OriginLib
}

function utcDe(origin: OriginLib): DateTime {
  const iso = origin.utcTime?.toISOString?.()
  if (!iso) {
    throw new ChartError('No pudimos calcular la carta natal.')
  }
  return DateTime.fromISO(iso, { zone: 'utc' })
}

function leerPlanetas(horoscopo: HoroscopoLib, exacta: boolean): PosicionPlanetaria[] {
  const porClave = new Map<string, CuerpoLib>()
  for (const cuerpo of horoscopo.CelestialBodies?.all ?? []) {
    porClave.set(cuerpo.key, cuerpo)
  }

  return CUERPOS.map((cuerpo): PosicionPlanetaria => {
    const crudo = porClave.get(CLAVE_LIB[cuerpo])
    const grados = crudo?.ChartPosition?.Ecliptic?.DecimalDegrees

    // Los tipos del paquete son `any` casi enteros, así que se comprueba lo que
    // llega en vez de confiar en la forma (CLAUDE.md §10.3).
    if (typeof grados !== 'number' || !Number.isFinite(grados)) {
      console.error('[carta] falta la posición de un cuerpo', { cuerpo })
      throw new ChartError('No pudimos calcular la carta natal.')
    }

    const longitud = normalizar(grados)
    const casa = crudo?.House?.id

    return {
      cuerpo,
      longitud,
      signo: signoDe(longitud),
      gradoEnSigno: gradoEnSigno(longitud),
      casa: exacta && typeof casa === 'number' ? casa : null,
      retrogrado: Boolean(crudo?.isRetrograde),
    }
  })
}

function leerCuspides(horoscopo: HoroscopoLib): number[] {
  const casas = [...(horoscopo.Houses ?? [])].sort((a, b) => a.id - b.id)

  if (casas.length !== 12) {
    console.error('[carta] número de casas inesperado', { casas: casas.length })
    throw new ChartError('No pudimos calcular la carta natal.')
  }

  return casas.map((casa) => {
    const grados = casa.ChartPosition?.StartPosition?.Ecliptic?.DecimalDegrees
    if (typeof grados !== 'number' || !Number.isFinite(grados)) {
      console.error('[carta] cúspide sin posición', { casa: casa.id })
      throw new ChartError('No pudimos calcular la carta natal.')
    }
    return normalizar(grados)
  })
}

function leerAngulo(angulo: AnguloLib | undefined, nombre: string): number {
  const grados = angulo?.ChartPosition?.Ecliptic?.DecimalDegrees
  if (typeof grados !== 'number' || !Number.isFinite(grados)) {
    console.error('[carta] ángulo sin posición', { nombre })
    throw new ChartError('No pudimos calcular la carta natal.')
  }
  return normalizar(grados)
}

/**
 * Los aspectos se calculan aquí y no se toman de la librería.
 *
 * `ANGULO_ASPECTO` y `separacion()` ya existían para esto. Calcularlos nosotros
 * fija los orbes de forma explícita y garantiza que solo intervienen los diez
 * cuerpos del contrato: la librería incluye a Sirio entre los suyos, y sus
 * aspectos habrían acabado dibujados en la rueda.
 */
function calcularAspectos(planetas: PosicionPlanetaria[]): Aspecto[] {
  const aspectos: Aspecto[] = []

  for (let i = 0; i < planetas.length; i++) {
    for (let j = i + 1; j < planetas.length; j++) {
      const a = planetas[i]!
      const b = planetas[j]!
      const sep = separacion(a.longitud, b.longitud)

      // Los ángulos distan 60° o más y los orbes no llegan a 8°, así que no hay
      // empate posible. Quedarse con el más ajustado es una red por si algún
      // día se ensanchan los orbes.
      let mejor: Aspecto | null = null
      for (const tipo of TIPOS_ASPECTO) {
        const orbe = Math.abs(sep - ANGULO_ASPECTO[tipo])
        if (orbe <= ORBE_MAXIMO[tipo] && (mejor === null || orbe < mejor.orbe)) {
          mejor = { a: a.cuerpo, b: b.cuerpo, tipo, orbe }
        }
      }

      if (mejor) aspectos.push(mejor)
    }
  }

  return aspectos
}

/*
 * El paquete declara sus tipos como `any`. Estos son los trozos de su salida
 * que realmente consumimos, escritos con `?` porque nada garantiza que estén:
 * de ahí las comprobaciones al leerlos.
 */

type PosicionLib = { Ecliptic?: { DecimalDegrees?: number } }

type CuerpoLib = {
  key: string
  ChartPosition?: PosicionLib
  House?: { id?: number }
  isRetrograde?: boolean
}

type CasaLib = {
  id: number
  ChartPosition?: { StartPosition?: PosicionLib }
}

type AnguloLib = { ChartPosition?: PosicionLib }

type OriginLib = {
  utcTime?: { toISOString?: () => string }
}

type HoroscopoLib = {
  CelestialBodies?: { all?: CuerpoLib[] }
  Houses?: CasaLib[]
  Ascendant?: AnguloLib
  Midheaven?: AnguloLib
}
