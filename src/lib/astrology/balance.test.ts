import { describe, expect, it } from 'vitest'

import { balanceDe, elementoDe, modalidadDe } from './balance'
import { SIGNOS, type Carta, type Cuerpo, type Signo } from './types'

/**
 * El reparto por elementos aparece en el portal como un hecho sobre la persona
 * —«tu carta pesa en agua»—, así que tiene que ser exacto y tiene que callarse
 * cuando no hay nada verdadero que decir. Las dos cosas se comprueban aquí.
 */

/** Una carta con los diez planetas colocados en los signos que se indiquen. */
function cartaCon(signos: Signo[]): Carta {
  const CUERPOS_ORDEN: Cuerpo[] = [
    'sol', 'luna', 'mercurio', 'venus', 'marte',
    'jupiter', 'saturno', 'urano', 'neptuno', 'pluton',
  ]

  return {
    precision: 'exact',
    utc: '1992-06-15T13:30:00.000Z',
    sistemaCasas: 'placidus',
    // 15° dentro del signo: lejos de los dos bordes, para que ningún redondeo
    // pueda desplazar un planeta al signo vecino y falsear el recuento.
    planetas: signos.map((signo, indice) => ({
      cuerpo: CUERPOS_ORDEN[indice]!,
      longitud: SIGNOS.indexOf(signo) * 30 + 15,
      signo,
      gradoEnSigno: 15,
      casa: null,
      retrogrado: false,
    })),
    cuspides: [],
    ascendente: null,
    medioCielo: null,
    aspectos: [],
  }
}

/** Diez signos del mismo elemento, repitiendo los tres que lo componen. */
const DIEZ_DE_FUEGO: Signo[] = [
  'aries', 'leo', 'sagitario', 'aries', 'leo',
  'sagitario', 'aries', 'leo', 'sagitario', 'aries',
]

describe('elementoDe y modalidadDe', () => {
  it('siguen los dos ciclos del zodiaco', () => {
    expect(elementoDe('aries')).toBe('fuego')
    expect(elementoDe('tauro')).toBe('tierra')
    expect(elementoDe('geminis')).toBe('aire')
    expect(elementoDe('cancer')).toBe('agua')
    // El ciclo de cuatro se reinicia en Leo.
    expect(elementoDe('leo')).toBe('fuego')
    expect(elementoDe('piscis')).toBe('agua')

    expect(modalidadDe('aries')).toBe('cardinal')
    expect(modalidadDe('tauro')).toBe('fijo')
    expect(modalidadDe('geminis')).toBe('mutable')
    // El de tres se reinicia en Cáncer.
    expect(modalidadDe('cancer')).toBe('cardinal')
    expect(modalidadDe('piscis')).toBe('mutable')
  })
})

describe('balanceDe', () => {
  it('cuenta los diez planetas y reparte los porcentajes', () => {
    const balance = balanceDe(cartaCon(DIEZ_DE_FUEGO))
    const fuego = balance.elementos.find((e) => e.clave === 'fuego')!

    expect(fuego.cuenta).toBe(10)
    expect(fuego.porcentaje).toBe(100)
    expect(balance.elementos.reduce((suma, e) => suma + e.cuenta, 0)).toBe(10)
  })

  it('nombra el elemento dominante cuando uno destaca', () => {
    // Seis de agua contra cuatro repartidos.
    const balance = balanceDe(
      cartaCon([
        'cancer', 'escorpio', 'piscis', 'cancer', 'escorpio', 'piscis',
        'aries', 'tauro', 'geminis', 'leo',
      ]),
    )

    expect(balance.elementoDominante).toBe('agua')
  })

  /**
   * Con empate arriba no hay dominante, y esto no es un detalle: decirle a
   * alguien «tu carta pesa en fuego» cuando tiene tantos de fuego como de aire
   * es elegir por sorteo y presentárselo como un rasgo suyo.
   */
  it('no elige dominante si hay empate en lo más alto', () => {
    const balance = balanceDe(
      cartaCon([
        'aries', 'leo', 'sagitario', 'aries', 'leo',
        'geminis', 'libra', 'acuario', 'geminis', 'libra',
      ]),
    )

    expect(balance.elementoDominante).toBeNull()
  })

  it('señala el elemento ausente solo cuando falta exactamente uno', () => {
    // Sin ningún planeta en tierra; los otros tres presentes.
    const soloFaltaTierra = balanceDe(
      cartaCon([
        'aries', 'leo', 'sagitario', 'aries',
        'geminis', 'libra', 'acuario',
        'cancer', 'escorpio', 'piscis',
      ]),
    )
    expect(soloFaltaTierra.elementoAusente).toBe('tierra')

    // Todo en fuego: faltan tres. Enumerarlos no distinguiría nada.
    expect(balanceDe(cartaCon(DIEZ_DE_FUEGO)).elementoAusente).toBeNull()
  })
})
