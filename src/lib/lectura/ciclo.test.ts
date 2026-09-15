import { describe, expect, it } from 'vitest'

import { diaDelCiclo } from './ciclo'

const INICIO = '2026-08-01T15:30:00.000Z'

describe('diaDelCiclo', () => {
  it('el día de la creación es el día 1', () => {
    const r = diaDelCiclo(INICIO, 'UTC', new Date('2026-08-01T23:00:00.000Z'))
    expect(r?.dia).toBe(1)
  })

  it('cuenta días de calendario, no periodos de 24 horas', () => {
    // Una hora después de medianoche del día siguiente ya es el día 2, aunque
    // no hayan pasado 24 horas desde la creación.
    const r = diaDelCiclo(INICIO, 'UTC', new Date('2026-08-02T01:00:00.000Z'))
    expect(r?.dia).toBe(2)
  })

  it('avanza con los días', () => {
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-10T10:00:00.000Z'))?.dia).toBe(10)
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-30T10:00:00.000Z'))?.dia).toBe(30)
  })

  it('se satura en 30 y marca el ciclo terminado', () => {
    const r = diaDelCiclo(INICIO, 'UTC', new Date('2026-10-01T10:00:00.000Z'))
    expect(r?.dia).toBe(30)
    expect(r?.terminado).toBe(true)
    expect(r?.progreso).toBe(100)
  })

  it('el día real sigue contando después del 30', () => {
    // 1 de agosto → 1 de octubre son 61 días de calendario: día real 62.
    // Es la clave de la activación: sin esto, a partir del 31 se repetía la
    // misma activación cada día.
    const r = diaDelCiclo(INICIO, 'UTC', new Date('2026-10-01T10:00:00.000Z'))
    expect(r?.diaReal).toBe(62)
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-10T10:00:00.000Z'))?.diaReal).toBe(10)
  })

  it('expone la fecha de calendario del día en la zona dada', () => {
    // A las 23:30 UTC sigue siendo el 15; a las 00:30 UTC ya es el 16.
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-15T23:30:00.000Z'))?.fecha).toBe('2026-08-15')
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-16T00:30:00.000Z'))?.fecha).toBe('2026-08-16')
  })

  it('cuenta los días en la zona del lugar de nacimiento, no en UTC', () => {
    // Es lo que vio la revisión: a las 20:00 de Bogotá del día 14, UTC ya va
    // por el 15, y la app enseñaba la activación de mañana con fecha de mañana.
    const bogota = diaDelCiclo(INICIO, 'America/Bogota', new Date('2026-09-15T01:00:00.000Z'))
    expect(bogota?.fecha).toBe('2026-09-14')

    const utc = diaDelCiclo(INICIO, 'UTC', new Date('2026-09-15T01:00:00.000Z'))
    expect(utc?.fecha).toBe('2026-09-15')
    expect(utc!.diaReal - bogota!.diaReal).toBe(1)

    // Y al revés en Australia: a las 06:00 de Sídney ya es el 15 aunque en
    // UTC sean las 20:00 del 14.
    const sidney = diaDelCiclo(INICIO, 'Australia/Sydney', new Date('2026-09-14T20:00:00.000Z'))
    expect(sidney?.fecha).toBe('2026-09-15')
  })

  it('el día 1 se mide en la zona: creado a las 22:00 de Bogotá, dos horas después sigue siendo el día 1', () => {
    // Creado a las 03:00 UTC del 2 = 22:00 del 1 en Bogotá. A las 05:00 UTC
    // del 2 (00:00 en Bogotá) ya es día 2 allí; a las 04:59 sigue el 1.
    const creado = '2026-08-02T03:00:00.000Z'
    expect(diaDelCiclo(creado, 'America/Bogota', new Date('2026-08-02T04:59:00.000Z'))?.dia).toBe(1)
    expect(diaDelCiclo(creado, 'America/Bogota', new Date('2026-08-02T05:00:00.000Z'))?.dia).toBe(2)
  })

  it('sin zona válida cae a UTC', () => {
    const conNull = diaDelCiclo(INICIO, null, new Date('2026-09-15T01:00:00.000Z'))
    const conBasura = diaDelCiclo(INICIO, 'Marte/Olympus', new Date('2026-09-15T01:00:00.000Z'))
    expect(conNull?.fecha).toBe('2026-09-15')
    expect(conBasura?.fecha).toBe('2026-09-15')
  })

  it('no marca terminado dentro del ciclo', () => {
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-30T10:00:00.000Z'))?.terminado).toBe(false)
  })

  it('calcula el progreso sobre 30 días', () => {
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-01T10:00:00.000Z'))?.progreso).toBe(3)
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-08-15T10:00:00.000Z'))?.progreso).toBe(50)
  })

  it('devuelve null si no hay fecha o es inválida', () => {
    expect(diaDelCiclo(null, 'UTC')).toBeNull()
    expect(diaDelCiclo(undefined, 'UTC')).toBeNull()
    expect(diaDelCiclo('no es una fecha', 'UTC')).toBeNull()
  })

  it('devuelve null si la fecha está en el futuro', () => {
    // Sin esto saldría «Día 0» o negativo.
    expect(diaDelCiclo(INICIO, 'UTC', new Date('2026-07-01T10:00:00.000Z'))).toBeNull()
  })
})
