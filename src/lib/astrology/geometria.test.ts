import { describe, expect, it } from 'vitest'

import { anguloEnPantalla, distribuir, normalizar, punto } from './geometria'
import { separacion } from './types'

describe('anguloEnPantalla', () => {
  const ASC = 16.5

  it('coloca el Ascendente a la izquierda', () => {
    expect(normalizar(anguloEnPantalla(ASC, ASC))).toBe(180)
  })

  it('coloca el Fondo del Cielo abajo', () => {
    // En SVG el eje Y crece hacia abajo, así que 90° es la parte inferior.
    expect(normalizar(anguloEnPantalla(ASC + 90, ASC))).toBe(90)
  })

  it('coloca el Descendente a la derecha', () => {
    expect(normalizar(anguloEnPantalla(ASC + 180, ASC))).toBe(0)
  })

  it('coloca el Medio Cielo arriba', () => {
    expect(normalizar(anguloEnPantalla(ASC + 270, ASC))).toBe(270)
  })

  it('sin ascendente, ancla 0 Aries a la izquierda', () => {
    expect(normalizar(anguloEnPantalla(0, null))).toBe(180)
    expect(normalizar(anguloEnPantalla(90, null))).toBe(90)
  })
})

describe('punto', () => {
  it('sitúa los cuatro puntos cardinales donde toca', () => {
    const cerca = (a: number, b: number) => expect(a).toBeCloseTo(b, 6)

    const derecha = punto(0, 0, 100, 0)
    cerca(derecha.x, 100)
    cerca(derecha.y, 0)

    const abajo = punto(0, 0, 100, 90)
    cerca(abajo.x, 0)
    cerca(abajo.y, 100) // Y crece hacia abajo

    const izquierda = punto(0, 0, 100, 180)
    cerca(izquierda.x, -100)

    const arriba = punto(0, 0, 100, 270)
    cerca(arriba.y, -100)
  })

  it('respeta el centro', () => {
    const p = punto(400, 400, 100, 0)
    expect(p.x).toBeCloseTo(500, 6)
    expect(p.y).toBeCloseTo(400, 6)
  })
})

describe('distribuir', () => {
  const MIN = 8

  it('deja en su sitio los planetas ya separados', () => {
    const entrada = [0, 60, 120, 180, 240, 300]
    expect(distribuir(entrada, MIN)).toEqual(entrada)
  })

  it('separa un cúmulo hasta la distancia mínima', () => {
    // Tres planetas en cuatro grados: sin separarlos, un borrón ilegible.
    const salida = distribuir([100, 102, 104], MIN)

    for (let i = 0; i < salida.length; i++) {
      for (let j = i + 1; j < salida.length; j++) {
        expect(separacion(salida[i]!, salida[j]!)).toBeGreaterThanOrEqual(MIN - 0.01)
      }
    }
  })

  it('mantiene el cúmulo centrado donde estaba', () => {
    // Se abre en abanico, no se arrastra hacia un lado.
    const salida = distribuir([100, 102, 104], MIN)
    const medio = salida.reduce((suma, valor) => suma + valor, 0) / salida.length
    expect(medio).toBeCloseTo(102, 0)
  })

  it('funciona con un cúmulo que cruza 0 Aries', () => {
    // El caso que rompe cualquier implementación que ordene linealmente.
    const salida = distribuir([358, 359, 1, 2], MIN)

    for (let i = 0; i < salida.length; i++) {
      for (let j = i + 1; j < salida.length; j++) {
        expect(separacion(salida[i]!, salida[j]!)).toBeGreaterThanOrEqual(MIN - 0.01)
      }
      expect(salida[i]).toBeGreaterThanOrEqual(0)
      expect(salida[i]).toBeLessThan(360)
    }
  })

  it('conserva el orden del array de entrada', () => {
    // El resultado debe poder emparejarse posición a posición con la entrada.
    const salida = distribuir([200, 10, 100], MIN)
    expect(salida).toHaveLength(3)
    expect(separacion(salida[0]!, 200)).toBeLessThan(20)
    expect(separacion(salida[1]!, 10)).toBeLessThan(20)
    expect(separacion(salida[2]!, 100)).toBeLessThan(20)
  })

  it('no se cuelga con muchos planetas juntos', () => {
    const salida = distribuir([10, 10, 10, 10, 10, 10, 10, 10, 10, 10], 8)
    expect(salida).toHaveLength(10)
    expect(salida.every((valor) => Number.isFinite(valor))).toBe(true)
  })

  it('devuelve vacío para una carta sin planetas', () => {
    expect(distribuir([], MIN)).toEqual([])
  })
})
