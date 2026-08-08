import { describe, expect, it } from 'vitest'

import { diaDelCiclo } from './ciclo'

const INICIO = '2026-08-01T15:30:00.000Z'

describe('diaDelCiclo', () => {
  it('el día de la creación es el día 1', () => {
    const r = diaDelCiclo(INICIO, new Date('2026-08-01T23:00:00.000Z'))
    expect(r?.dia).toBe(1)
  })

  it('cuenta días de calendario, no periodos de 24 horas', () => {
    // Una hora después de medianoche del día siguiente ya es el día 2, aunque
    // no hayan pasado 24 horas desde la creación.
    const r = diaDelCiclo(INICIO, new Date('2026-08-02T01:00:00.000Z'))
    expect(r?.dia).toBe(2)
  })

  it('avanza con los días', () => {
    expect(diaDelCiclo(INICIO, new Date('2026-08-10T10:00:00.000Z'))?.dia).toBe(10)
    expect(diaDelCiclo(INICIO, new Date('2026-08-30T10:00:00.000Z'))?.dia).toBe(30)
  })

  it('se satura en 30 y marca el ciclo terminado', () => {
    const r = diaDelCiclo(INICIO, new Date('2026-10-01T10:00:00.000Z'))
    expect(r?.dia).toBe(30)
    expect(r?.terminado).toBe(true)
    expect(r?.progreso).toBe(100)
  })

  it('no marca terminado dentro del ciclo', () => {
    expect(diaDelCiclo(INICIO, new Date('2026-08-30T10:00:00.000Z'))?.terminado).toBe(false)
  })

  it('calcula el progreso sobre 30 días', () => {
    expect(diaDelCiclo(INICIO, new Date('2026-08-01T10:00:00.000Z'))?.progreso).toBe(3)
    expect(diaDelCiclo(INICIO, new Date('2026-08-15T10:00:00.000Z'))?.progreso).toBe(50)
  })

  it('devuelve null si no hay fecha o es inválida', () => {
    expect(diaDelCiclo(null)).toBeNull()
    expect(diaDelCiclo(undefined)).toBeNull()
    expect(diaDelCiclo('no es una fecha')).toBeNull()
  })

  it('devuelve null si la fecha está en el futuro', () => {
    // Sin esto saldría «Día 0» o negativo.
    expect(diaDelCiclo(INICIO, new Date('2026-07-01T10:00:00.000Z'))).toBeNull()
  })
})
