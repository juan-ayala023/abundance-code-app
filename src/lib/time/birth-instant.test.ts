import { describe, expect, it } from 'vitest'

import { BirthInstantError, resolveBirthInstant } from './birth-instant'

const base = { timeUnknown: false as const }

describe('desfase horario según la fecha, no según hoy', () => {
  it('aplica el horario de verano que Colombia tuvo en 1992', () => {
    // Colombia adelantó los relojes entre 1992 y 1993. Calcular esta carta con
    // el desfase actual de Bogotá (-5) la desplazaría una hora entera.
    const r = resolveBirthInstant({
      ...base,
      birthDate: '1992-06-15',
      birthTime: '12:00',
      tz: 'America/Bogota',
    })

    expect(r.offsetMinutes).toBe(-240) // -04:00
    expect(r.utc).toBe('1992-06-15T16:00:00.000Z')
  })

  it('usa el desfase normal de Bogotá fuera de esos años', () => {
    const r = resolveBirthInstant({
      ...base,
      birthDate: '2000-06-15',
      birthTime: '12:00',
      tz: 'America/Bogota',
    })

    expect(r.offsetMinutes).toBe(-300) // -05:00
    expect(r.utc).toBe('2000-06-15T17:00:00.000Z')
  })

  it('distingue verano e invierno en una zona con cambio de hora', () => {
    const verano = resolveBirthInstant({
      ...base,
      birthDate: '2024-07-15',
      birthTime: '12:00',
      tz: 'Europe/Madrid',
    })
    const invierno = resolveBirthInstant({
      ...base,
      birthDate: '2024-01-15',
      birthTime: '12:00',
      tz: 'Europe/Madrid',
    })

    expect(verano.offsetMinutes).toBe(120)
    expect(invierno.offsetMinutes).toBe(60)
  })

  it('maneja fechas anteriores a los husos horarios', () => {
    // En 1880 Madrid iba por hora local media: un desfase que no es ni siquiera
    // un número entero de minutos.
    const r = resolveBirthInstant({
      ...base,
      birthDate: '1880-01-01',
      birthTime: '12:00',
      tz: 'Europe/Madrid',
    })

    expect(r.offsetMinutes).toBeCloseTo(-14.73, 1)
    expect(r.utc).toBe('1880-01-01T12:14:44.000Z')
  })
})

describe('casos raros del cambio de hora', () => {
  it('marca una hora local que no llegó a existir', () => {
    // El 31/03/2024 Madrid saltó de las 02:00 a las 03:00: las 02:30 no existieron.
    const r = resolveBirthInstant({
      ...base,
      birthDate: '2024-03-31',
      birthTime: '02:30',
      tz: 'Europe/Madrid',
    })

    expect(r.ambiguity).toBe('inexistente')
  })

  it('marca una hora local que ocurrió dos veces', () => {
    // El 27/10/2024 Madrid retrasó de las 03:00 a las 02:00: las 02:30 pasaron dos veces.
    const r = resolveBirthInstant({
      ...base,
      birthDate: '2024-10-27',
      birthTime: '02:30',
      tz: 'Europe/Madrid',
    })

    expect(r.ambiguity).toBe('repetida')
    expect(r.offsetMinutes).toBe(120) // se toma la primera de las dos
  })

  it('no marca ambigüedad en una hora normal', () => {
    const r = resolveBirthInstant({
      ...base,
      birthDate: '2024-06-15',
      birthTime: '14:20',
      tz: 'Europe/Madrid',
    })

    expect(r.ambiguity).toBe('ninguna')
  })
})

describe('hora de nacimiento desconocida', () => {
  it('usa el mediodía local y marca la carta como parcial', () => {
    const r = resolveBirthInstant({
      birthDate: '1985-03-20',
      birthTime: null,
      timeUnknown: true,
      tz: 'America/Bogota',
    })

    expect(r.precision).toBe('partial')
    expect(r.utc).toBe('1985-03-20T17:00:00.000Z') // 12:00 en -05:00
  })

  it('una hora conocida produce una carta exacta', () => {
    const r = resolveBirthInstant({
      ...base,
      birthDate: '1985-03-20',
      birthTime: '08:15',
      tz: 'America/Bogota',
    })

    expect(r.precision).toBe('exact')
  })

  it('rechaza que haya hora si se marcó como desconocida', () => {
    // La misma incoherencia que impide la restricción de la base de datos.
    expect(() =>
      resolveBirthInstant({
        birthDate: '1985-03-20',
        birthTime: '08:15',
        timeUnknown: true,
        tz: 'America/Bogota',
      }),
    ).toThrow(BirthInstantError)
  })
})

describe('entradas inválidas', () => {
  it('rechaza una zona horaria desconocida', () => {
    expect(() =>
      resolveBirthInstant({
        ...base,
        birthDate: '1990-01-01',
        birthTime: '10:00',
        tz: 'Marte/Olympus',
      }),
    ).toThrow(/Zona horaria desconocida/)
  })

  it('rechaza una fecha imposible', () => {
    expect(() =>
      resolveBirthInstant({
        ...base,
        birthDate: '1990-02-31',
        birthTime: '10:00',
        tz: 'America/Bogota',
      }),
    ).toThrow(BirthInstantError)
  })

  it('rechaza que falte la hora sin marcarla como desconocida', () => {
    expect(() =>
      resolveBirthInstant({
        ...base,
        birthDate: '1990-01-01',
        birthTime: null,
        tz: 'America/Bogota',
      }),
    ).toThrow(/Falta la hora/)
  })
})
