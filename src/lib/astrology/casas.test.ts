import { describe, expect, it } from 'vitest'

import { casaDe, casasDe } from './casas'
import type { Carta, Cuerpo, PosicionPlanetaria } from './types'
import { gradoEnSigno, signoDe } from './types'

describe('casaDe', () => {
  it('sitúa una longitud en su casa', () => {
    // Cúspides de 30 en 30 desde 0°: la casa 1 va de 0 a 30.
    const cuspides = Array.from({ length: 12 }, (_, i) => i * 30)
    expect(casaDe(5, cuspides)).toBe(1)
    expect(casaDe(35, cuspides)).toBe(2)
    expect(casaDe(355, cuspides)).toBe(12)
  })

  it('resuelve la casa que cruza 0° Aries', () => {
    // Casa 1 de 340° a 10°.
    const cuspides = [340, 10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310]
    expect(casaDe(350, cuspides)).toBe(1)
    expect(casaDe(5, cuspides)).toBe(1)
    expect(casaDe(20, cuspides)).toBe(2)
  })

  it('sin cúspides no inventa casa', () => {
    expect(casaDe(100, [])).toBeNull()
  })
})

/** Una carta mínima: solo lo que las casas necesitan. */
function carta(cuspides: number[], planetas: Partial<PosicionPlanetaria>[] = []): Carta {
  return {
    precision: cuspides.length === 12 ? 'exact' : 'partial',
    utc: '1992-06-15T13:30:00.000Z',
    sistemaCasas: 'placidus',
    cuspides,
    ascendente: cuspides[0] ?? null,
    medioCielo: cuspides[9] ?? null,
    aspectos: [],
    planetas: planetas.map((p) => ({
      cuerpo: (p.cuerpo ?? 'sol') as Cuerpo,
      longitud: p.longitud ?? 0,
      signo: signoDe(p.longitud ?? 0),
      gradoEnSigno: gradoEnSigno(p.longitud ?? 0),
      casa: p.casa ?? null,
      retrogrado: p.retrogrado ?? false,
    })),
  }
}

describe('casasDe', () => {
  it('devuelve las doce en orden, con el signo de su cúspide', () => {
    const casas = casasDe(carta(Array.from({ length: 12 }, (_, i) => i * 30 + 15)))

    expect(casas).not.toBeNull()
    expect(casas!.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(casas![0]!.signo).toBe('aries')
    expect(casas![0]!.grado).toBe(15)
    expect(casas![6]!.signo).toBe('libra')
  })

  /**
   * Sin hora de nacimiento no hay casas, y eso hay que poder decirlo.
   *
   * Es la mitad de la razón por la que esta función devuelve `null` en vez de
   * una lista vacía: doce casas en Aries se pintarían como si fueran las de esa
   * persona, y nadie que mirara la pantalla sabría que son de relleno.
   */
  it('una carta sin hora no tiene casas', () => {
    expect(casasDe(carta([]))).toBeNull()
  })

  it('reparte los planetas por la casa que ya traen', () => {
    const casas = casasDe(
      carta(Array.from({ length: 12 }, (_, i) => i * 30), [
        { cuerpo: 'sol', longitud: 84, casa: 3 },
        { cuerpo: 'luna', longitud: 200, casa: 7 },
        { cuerpo: 'venus', longitud: 95, casa: 4 },
      ]),
    )!

    expect(casas[2]!.planetas.map((p) => p.cuerpo)).toEqual(['sol'])
    expect(casas[3]!.planetas.map((p) => p.cuerpo)).toEqual(['venus'])
    expect(casas[6]!.planetas.map((p) => p.cuerpo)).toEqual(['luna'])
    expect(casas[0]!.planetas).toEqual([])
  })

  /*
   * El proveedor del cálculo podría no rellenar `casa`. Antes de enseñar una
   * casa vacía se calcula desde las cúspides, que es el mismo dato.
   */
  it('si al planeta le falta la casa, la deduce de las cúspides', () => {
    const casas = casasDe(
      carta(Array.from({ length: 12 }, (_, i) => i * 30), [
        { cuerpo: 'marte', longitud: 125, casa: null },
      ]),
    )!

    expect(casas[4]!.planetas.map((p) => p.cuerpo)).toEqual(['marte'])
  })

  it('cada planeta cae en una sola casa', () => {
    const casas = casasDe(
      carta([340, 10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310], [
        { cuerpo: 'sol', longitud: 350 },
        { cuerpo: 'luna', longitud: 5 },
        { cuerpo: 'pluton', longitud: 300 },
      ]),
    )!

    expect(casas.flatMap((c) => c.planetas).length).toBe(3)
  })

  describe('signos que recorre la casa', () => {
    it('una casa estrecha no sale de su signo', () => {
      // De 5° a 25° de Aries: veinte grados, un solo signo.
      const cuspides = [5, 25, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310]
      expect(casasDe(carta(cuspides))![0]!.signosSiguientes).toEqual([])
    })

    it('una casa ancha dice los signos que atraviesa', () => {
      // De 10° Aries a 25° Géminis: pasa por Tauro y termina en Géminis.
      const cuspides = [10, 85, 115, 145, 175, 205, 235, 265, 295, 325, 355, 25]
      expect(casasDe(carta(cuspides))![0]!.signosSiguientes).toEqual(['tauro', 'geminis'])
    })

    /**
     * Una casa que acaba justo donde empieza el signo siguiente **no** lo
     * contiene. Es el caso de las casas iguales de 30°, y decir «además recorre
     * Tauro» sobre una casa que termina en 0° Tauro sería falso.
     */
    it('el signo que solo roza al final no cuenta', () => {
      const cuspides = Array.from({ length: 12 }, (_, i) => i * 30)
      expect(casasDe(carta(cuspides))![0]!.signosSiguientes).toEqual([])
    })
  })
})
