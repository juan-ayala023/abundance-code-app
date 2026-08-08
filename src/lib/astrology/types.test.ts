import { describe, expect, it } from 'vitest'

import { gradoEnSigno, separacion, signoDe } from './types'

describe('signoDe', () => {
  it('asigna el signo por tramos de 30 grados', () => {
    expect(signoDe(0)).toBe('aries')
    expect(signoDe(29.9)).toBe('aries')
    expect(signoDe(30)).toBe('tauro')
    expect(signoDe(180)).toBe('libra')
    expect(signoDe(359.9)).toBe('piscis')
  })

  it('normaliza longitudes fuera de rango', () => {
    expect(signoDe(360)).toBe('aries')
    expect(signoDe(390)).toBe('tauro')
    expect(signoDe(-30)).toBe('piscis')
  })
})

describe('gradoEnSigno', () => {
  it('devuelve la posición dentro del signo', () => {
    expect(gradoEnSigno(0)).toBe(0)
    expect(gradoEnSigno(15)).toBe(15)
    expect(gradoEnSigno(45)).toBe(15) // 15° de Tauro
    expect(gradoEnSigno(359)).toBe(29)
  })
})

describe('separacion', () => {
  it('mide el arco más corto', () => {
    expect(separacion(0, 90)).toBe(90)
    expect(separacion(90, 0)).toBe(90)
    expect(separacion(0, 180)).toBe(180)
  })

  it('cruza correctamente el 0 de Aries', () => {
    // Sin tomar el arco corto, esto daría 340 y no se detectaría el aspecto.
    expect(separacion(350, 10)).toBe(20)
    expect(separacion(10, 350)).toBe(20)
  })

  it('nunca supera los 180 grados', () => {
    expect(separacion(0, 270)).toBe(90)
    expect(separacion(0, 200)).toBe(160)
  })

  it('es simétrica', () => {
    for (const [a, b] of [
      [12, 300],
      [45, 200],
      [359, 1],
    ]) {
      expect(separacion(a!, b!)).toBeCloseTo(separacion(b!, a!), 10)
    }
  })
})
