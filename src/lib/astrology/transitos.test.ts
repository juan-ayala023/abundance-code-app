import { describe, expect, it } from 'vitest'

import { aspectosDeTransito, describirTransitos } from './transitos'
import { CUERPOS, gradoEnSigno, signoDe, type Carta, type Cuerpo } from './types'

/** Carta mínima con los diez cuerpos en las longitudes que se le pasen. */
function carta(longitudes: Partial<Record<Cuerpo, number>>): Carta {
  return {
    precision: 'partial',
    utc: '2000-01-01T12:00:00.000Z',
    sistemaCasas: 'placidus',
    planetas: CUERPOS.map((cuerpo) => {
      const longitud = longitudes[cuerpo] ?? 0
      return {
        cuerpo,
        longitud,
        signo: signoDe(longitud),
        gradoEnSigno: gradoEnSigno(longitud),
        casa: null,
        retrogrado: false,
      }
    }),
    cuspides: [],
    ascendente: null,
    medioCielo: null,
    aspectos: [],
  }
}

describe('aspectosDeTransito', () => {
  it('detecta una conjunción exacta', () => {
    const natal = carta({ sol: 100 })
    const cielo = carta({ marte: 100 })

    const encontrados = aspectosDeTransito(natal, cielo).filter(
      (a) => a.transitante === 'marte' && a.natal === 'sol',
    )

    expect(encontrados).toHaveLength(1)
    expect(encontrados[0]).toMatchObject({ tipo: 'conjuncion', orbe: 0 })
  })

  it('detecta una oposición y calcula su orbe', () => {
    const natal = carta({ luna: 10 })
    const cielo = carta({ saturno: 192 })

    const encontrado = aspectosDeTransito(natal, cielo).find(
      (a) => a.transitante === 'saturno' && a.natal === 'luna',
    )

    expect(encontrado?.tipo).toBe('oposicion')
    expect(encontrado?.orbe).toBeCloseTo(2, 6)
  })

  /*
   * El orbe estrecho es lo que hace que una activación distinga un día de otro.
   * Con el orbe amplio de la carta natal, media carta estaría en aspecto
   * siempre.
   */
  it('ignora lo que queda fuera del orbe de tránsito', () => {
    const natal = carta({ sol: 100 })
    const cielo = carta({ marte: 104.5 })

    const encontrados = aspectosDeTransito(natal, cielo).filter(
      (a) => a.transitante === 'marte' && a.natal === 'sol',
    )

    expect(encontrados).toHaveLength(0)
  })

  it('cruza correctamente el 0° de Aries', () => {
    // 359° y 1° están a 2°, no a 358°. Sin separación circular, este aspecto se
    // perdería justo en el punto donde empieza el zodiaco.
    const natal = carta({ venus: 359 })
    const cielo = carta({ jupiter: 1 })

    const encontrado = aspectosDeTransito(natal, cielo).find(
      (a) => a.transitante === 'jupiter' && a.natal === 'venus',
    )

    expect(encontrado?.tipo).toBe('conjuncion')
    expect(encontrado?.orbe).toBeCloseTo(2, 6)
  })

  it('ordena del aspecto más ajustado al más amplio', () => {
    const natal = carta({ sol: 0, luna: 100 })
    const cielo = carta({ marte: 2.5, venus: 100.2 })

    const orbes = aspectosDeTransito(natal, cielo).map((a) => a.orbe)

    expect(orbes).toEqual([...orbes].sort((a, b) => a - b))
  })
})

describe('describirTransitos', () => {
  it('dice explícitamente que no hay aspectos, en vez de callar', () => {
    // Si el texto quedara vacío, el modelo rellenaría el hueco inventando un
    // acontecimiento. Mejor decirle que hoy no hay nada estrecho.
    expect(describirTransitos([])).toMatch(/ningún planeta/i)
  })

  it('se queda con los seis más ajustados', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ({
      transitante: 'marte' as const,
      natal: 'sol' as const,
      tipo: 'conjuncion' as const,
      orbe: i * 0.1,
    }))

    const lineas = describirTransitos(muchos).split('\n').filter((l) => l.startsWith('-'))
    expect(lineas).toHaveLength(6)
  })
})
