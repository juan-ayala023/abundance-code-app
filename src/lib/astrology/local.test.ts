import { beforeAll, describe, expect, it } from 'vitest'

import { createLocalChartProvider } from './local'
import { ChartError, type ChartRequest } from './provider'
import { CUERPOS, separacion, type Carta } from './types'

const proveedor = createLocalChartProvider()

const BOGOTA = { lat: 4.60971, lng: -74.08175, tz: 'America/Bogota' }
const SIDNEY = { lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' }
const LONDRES = { lat: 51.5072, lng: -0.1276, tz: 'Europe/London' }
const MADRID = { lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid' }

function pedir(overrides: Partial<ChartRequest> & { utc: string }): ChartRequest {
  return { ...BOGOTA, precision: 'exact', ...overrides }
}

/**
 * El instante es el dato del que depende el ascendente entero, y la librería lo
 * deriva por un camino distinto al nuestro. Si estas pruebas fallan, todas las
 * demás mienten.
 */
describe('alineación del instante', () => {
  const casos: Array<[string, ChartRequest]> = [
    ['Bogotá, sin horario de verano', pedir({ utc: '2003-07-17T08:42:00.000Z' })],
    ['Bogotá, durante el horario de verano de 1992', pedir({ utc: '1992-12-01T09:00:00.000Z' })],
    ['Sídney, hemisferio sur en verano', pedir({ ...SIDNEY, utc: '1988-12-24T19:15:00.000Z' })],
    ['Madrid, en horario de verano', pedir({ ...MADRID, utc: '1978-06-15T02:00:00.000Z' })],
    ['Londres, en invierno', pedir({ ...LONDRES, utc: '1995-01-09T23:10:00.000Z' })],
    ['un minuto no redondo', pedir({ utc: '1999-02-28T17:37:00.000Z' })],
  ]

  it.each(casos)('conserva el UTC exacto: %s', async (_nombre, request) => {
    const carta = await proveedor.calcular(request)
    expect(new Date(carta.utc).toISOString()).toBe(new Date(request.utc).toISOString())
  })

  /*
   * Caso real, no hipotético: Luxon —que es quien resuelve el instante en
   * `resolveBirthInstant()`— da por terminado el horario de verano colombiano
   * de 1993 antes que la base de zonas que trae la librería. Para la misma hora
   * local, una dice -5 y la otra -4.
   *
   * El bucle de corrección existe justamente para esto: da igual qué zona use
   * la librería, se le ajusta la hora local hasta que su UTC es el nuestro.
   */
  it('absorbe que las bases de zonas horarias discrepen', async () => {
    const carta = await proveedor.calcular(pedir({ utc: '1993-04-04T03:30:00.000Z' }))
    expect(carta.utc).toBe('1993-04-04T03:30:00.000Z')
  })

  /*
   * Lo que el bucle NO puede arreglar. Al volver del horario de verano, la hora
   * local 23:30 del 3 de abril de 1993 ocurrió dos veces en Bogotá. La librería
   * solo sabe devolver una de las dos, así que la otra es inalcanzable por
   * mucho que se ajuste la entrada.
   *
   * Se lanza en vez de devolver la vecina: una carta con una hora de diferencia
   * mueve el ascendente unos 15°, o sea un signo entero, y no se distingue a
   * simple vista de una correcta. Ver `docs/proveedor-carta.md`.
   */
  it('lanza ante una hora repetida que no puede reproducir, en vez de devolver la vecina', async () => {
    await expect(
      proveedor.calcular(pedir({ utc: '1993-04-04T04:30:00.000Z' })),
    ).rejects.toThrow(ChartError)
  })

  it('rechaza un instante inválido en vez de inventarse una fecha', async () => {
    await expect(proveedor.calcular(pedir({ utc: 'no-es-una-fecha' }))).rejects.toThrow(
      ChartError,
    )
  })

  it('rechaza una zona horaria desconocida', async () => {
    await expect(
      proveedor.calcular(pedir({ utc: '2003-07-17T08:42:00.000Z', tz: 'Marte/Olympus' })),
    ).rejects.toThrow(ChartError)
  })
})

/**
 * Comprobación contra algo que no sale de esta librería: en el equinoccio el Sol
 * está en 0° Aries por definición, y en el solsticio en 0° Cáncer. Si las
 * efemérides estuvieran mal cableadas, esto se rompe.
 */
describe('posición del Sol contra efemérides conocidas', () => {
  async function longitudDelSol(utc: string): Promise<number> {
    const carta = await proveedor.calcular(pedir({ ...LONDRES, utc }))
    return carta.planetas.find((p) => p.cuerpo === 'sol')!.longitud
  }

  it('equinoccio de marzo de 2000: el Sol en 0° Aries', async () => {
    expect(separacion(await longitudDelSol('2000-03-20T07:35:00.000Z'), 0)).toBeLessThan(0.1)
  })

  it('solsticio de junio de 2000: el Sol en 0° Cáncer', async () => {
    expect(separacion(await longitudDelSol('2000-06-21T01:48:00.000Z'), 90)).toBeLessThan(0.1)
  })

  it('equinoccio de septiembre de 2000: el Sol en 0° Libra', async () => {
    expect(separacion(await longitudDelSol('2000-09-22T17:27:00.000Z'), 180)).toBeLessThan(0.1)
  })
})

describe('estructura de la carta', () => {
  let carta: Carta

  beforeAll(async () => {
    carta = await proveedor.calcular(pedir({ utc: '2003-07-17T08:42:00.000Z' }))
  })

  it('devuelve los diez cuerpos del contrato, en orden', () => {
    expect(carta.planetas.map((p) => p.cuerpo)).toEqual([...CUERPOS])
  })

  it('deriva signo y grado de la longitud', () => {
    for (const planeta of carta.planetas) {
      expect(planeta.longitud).toBeGreaterThanOrEqual(0)
      expect(planeta.longitud).toBeLessThan(360)
      expect(planeta.gradoEnSigno).toBeCloseTo(planeta.longitud % 30, 6)
    }
  })

  it('sitúa cada planeta en una casa entre 1 y 12', () => {
    for (const planeta of carta.planetas) {
      expect(planeta.casa).toBeGreaterThanOrEqual(1)
      expect(planeta.casa).toBeLessThanOrEqual(12)
    }
  })

  it('devuelve doce cúspides', () => {
    expect(carta.cuspides).toHaveLength(12)
  })

  /*
   * Invariantes de Placidus, no valores concretos: son ciertos para cualquier
   * carta y detectan una lectura cruzada de las casas.
   */
  it('la primera cúspide es el ascendente y la décima el medio cielo', () => {
    expect(separacion(carta.cuspides[0]!, carta.ascendente!)).toBeLessThan(0.01)
    expect(separacion(carta.cuspides[9]!, carta.medioCielo!)).toBeLessThan(0.01)
  })

  it('las cúspides opuestas distan 180°', () => {
    for (let i = 0; i < 6; i++) {
      expect(separacion(carta.cuspides[i]!, carta.cuspides[i + 6]!)).toBeCloseTo(180, 3)
    }
  })

  it('conserva el sistema de casas pedido', () => {
    expect(carta.sistemaCasas).toBe('placidus')
  })
})

describe('carta parcial (hora de nacimiento desconocida)', () => {
  let carta: Carta

  beforeAll(async () => {
    carta = await proveedor.calcular(
      pedir({ utc: '2003-07-17T17:00:00.000Z', precision: 'partial' }),
    )
  })

  it('mantiene las posiciones planetarias', () => {
    expect(carta.planetas).toHaveLength(CUERPOS.length)
  })

  /*
   * Sin hora de nacimiento no hay casas ni ángulos. La librería los calcula
   * igualmente sobre la hora por defecto: dejarlos pasar sería fingir una
   * precisión que no tenemos.
   */
  it('no inventa casas, cúspides ni ángulos', () => {
    expect(carta.cuspides).toEqual([])
    expect(carta.ascendente).toBeNull()
    expect(carta.medioCielo).toBeNull()
    expect(carta.planetas.every((p) => p.casa === null)).toBe(true)
  })
})

describe('aspectos', () => {
  let carta: Carta

  beforeAll(async () => {
    carta = await proveedor.calcular(pedir({ utc: '2003-07-17T08:42:00.000Z' }))
  })

  /*
   * La librería incluye a Sirio y a Quirón entre sus cuerpos. Si sus aspectos
   * se colaran, acabarían dibujados en la rueda como si fueran planetas.
   */
  it('solo relaciona cuerpos del contrato', () => {
    for (const aspecto of carta.aspectos) {
      expect(CUERPOS).toContain(aspecto.a)
      expect(CUERPOS).toContain(aspecto.b)
    }
  })

  it('el orbe declarado coincide con la separación real', () => {
    const ANGULOS = { conjuncion: 0, sextil: 60, cuadratura: 90, trigono: 120, oposicion: 180 }

    for (const aspecto of carta.aspectos) {
      const a = carta.planetas.find((p) => p.cuerpo === aspecto.a)!
      const b = carta.planetas.find((p) => p.cuerpo === aspecto.b)!
      const real = Math.abs(separacion(a.longitud, b.longitud) - ANGULOS[aspecto.tipo])
      expect(aspecto.orbe).toBeCloseTo(real, 6)
    }
  })

  it('no repite un par de planetas', () => {
    const pares = carta.aspectos.map((x) => [x.a, x.b].sort().join('-'))
    expect(new Set(pares).size).toBe(pares.length)
  })
})
