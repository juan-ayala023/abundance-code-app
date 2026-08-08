import { describe, expect, it } from 'vitest'

import { datosNacimientoSchema } from './schemas'

const lugar = {
  providerId: '3688689',
  city: 'Bogotá',
  region: 'Bogota D.C.',
  country: 'Colombia',
  countryCode: 'CO',
  lat: 4.60971,
  lng: -74.08175,
  tz: 'America/Bogota',
}

const valido = {
  fullName: 'Juan Ayala',
  birthDate: '1992-06-15',
  timeUnknown: false,
  birthTime: '08:30',
  place: lugar,
}

describe('datosNacimientoSchema', () => {
  it('acepta unos datos completos', () => {
    expect(datosNacimientoSchema.parse(valido).fullName).toBe('Juan Ayala')
  })

  it('acepta hora desconocida sin hora', () => {
    const r = datosNacimientoSchema.safeParse({
      ...valido,
      timeUnknown: true,
      birthTime: null,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza hora desconocida CON hora', () => {
    const r = datosNacimientoSchema.safeParse({
      ...valido,
      timeUnknown: true,
      birthTime: '08:30',
    })
    expect(r.success).toBe(false)
  })

  it('rechaza que falte la hora sin marcarla como desconocida', () => {
    const r = datosNacimientoSchema.safeParse({ ...valido, birthTime: null })
    expect(r.success).toBe(false)
  })

  it('rechaza una fecha en el futuro', () => {
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const r = datosNacimientoSchema.safeParse({ ...valido, birthDate: manana })
    expect(r.success).toBe(false)
  })

  it('rechaza una hora imposible', () => {
    const r = datosNacimientoSchema.safeParse({ ...valido, birthTime: '25:00' })
    expect(r.success).toBe(false)
  })

  it('rechaza coordenadas fuera de rango', () => {
    const r = datosNacimientoSchema.safeParse({
      ...valido,
      place: { ...lugar, lat: 120 },
    })
    expect(r.success).toBe(false)
  })

  it('rechaza un lugar sin zona horaria', () => {
    // Sin zona no hay instante UTC, y sin instante no hay carta.
    const r = datosNacimientoSchema.safeParse({
      ...valido,
      place: { ...lugar, tz: '' },
    })
    expect(r.success).toBe(false)
  })
})
