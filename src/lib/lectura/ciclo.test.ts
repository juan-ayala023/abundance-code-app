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

  it('el día real sigue contando después del 30', () => {
    // 1 de agosto → 1 de octubre son 61 días de calendario: día real 62.
    // Es la clave de la activación: sin esto, a partir del 31 se repetía la
    // misma activación cada día.
    const r = diaDelCiclo(INICIO, new Date('2026-10-01T10:00:00.000Z'))
    expect(r?.diaReal).toBe(62)
    expect(diaDelCiclo(INICIO, new Date('2026-08-10T10:00:00.000Z'))?.diaReal).toBe(10)
  })

  it('expone la fecha de calendario UTC del día', () => {
    // A las 23:30 UTC sigue siendo el 15; a las 00:30 UTC ya es el 16.
    expect(diaDelCiclo(INICIO, new Date('2026-08-15T23:30:00.000Z'))?.fecha).toBe('2026-08-15')
    expect(diaDelCiclo(INICIO, new Date('2026-08-16T00:30:00.000Z'))?.fecha).toBe('2026-08-16')
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
