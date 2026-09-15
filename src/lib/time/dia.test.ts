import { describe, expect, it } from 'vitest'

import { diasDeCalendarioEntre, fechaDeHoy, inicioDelDia, zonaDe } from './dia'

describe('zonaDe', () => {
  it('acepta zonas IANA y cae a UTC con cualquier otra cosa', () => {
    expect(zonaDe('America/Bogota')).toBe('America/Bogota')
    expect(zonaDe('Australia/Sydney')).toBe('Australia/Sydney')
    expect(zonaDe(null)).toBe('UTC')
    expect(zonaDe(undefined)).toBe('UTC')
    expect(zonaDe('')).toBe('UTC')
    expect(zonaDe('Marte/Olympus')).toBe('UTC')
  })
})

describe('fechaDeHoy', () => {
  it('es la fecha de calendario en esa zona', () => {
    const instante = new Date('2026-09-15T01:00:00.000Z')
    expect(fechaDeHoy('America/Bogota', instante)).toBe('2026-09-14')
    expect(fechaDeHoy('UTC', instante)).toBe('2026-09-15')
    expect(fechaDeHoy('Australia/Sydney', instante)).toBe('2026-09-15')
  })
})

describe('inicioDelDia', () => {
  it('es la medianoche de esa zona, como instante', () => {
    const instante = new Date('2026-09-15T01:00:00.000Z')
    // Medianoche del 14 en Bogotá (UTC-5) = 05:00 UTC del 14.
    expect(inicioDelDia('America/Bogota', instante).toISOString()).toBe('2026-09-14T05:00:00.000Z')
    expect(inicioDelDia('UTC', instante).toISOString()).toBe('2026-09-15T00:00:00.000Z')
  })
})

describe('diasDeCalendarioEntre', () => {
  it('cuenta días de calendario, no periodos de 24 horas', () => {
    const a = new Date('2026-08-01T23:00:00.000Z')
    const b = new Date('2026-08-02T01:00:00.000Z')
    expect(diasDeCalendarioEntre(a, b, 'UTC')).toBe(1)
    // En Bogotá ambos instantes son el día 1 (18:00 y 20:00).
    expect(diasDeCalendarioEntre(a, b, 'America/Bogota')).toBe(0)
  })

  it('no se descuadra con el cambio de hora de verano', () => {
    // Sídney entra en horario de verano el primer domingo de octubre: un día
    // de 23 horas. Contando por milisegundos saldría un día de menos.
    const antes = new Date('2026-10-03T12:00:00.000Z')
    const despues = new Date('2026-10-05T12:00:00.000Z')
    expect(diasDeCalendarioEntre(antes, despues, 'Australia/Sydney')).toBe(2)
  })

  it('es negativo si el fin es anterior', () => {
    const a = new Date('2026-08-05T12:00:00.000Z')
    const b = new Date('2026-08-01T12:00:00.000Z')
    expect(diasDeCalendarioEntre(a, b, 'UTC')).toBe(-4)
  })
})
