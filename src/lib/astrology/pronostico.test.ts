import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'

import { createLocalChartProvider } from './local'
import { calcularPronostico, casaDe } from './pronostico'

/**
 * El pronóstico se prueba contra el cielo real, no contra una carta de
 * juguete: lo que hay que garantizar es que las fechas que acaban en pantalla
 * salen del cálculo y no de un modelo de lenguaje. Se usa un periodo del
 * pasado para que el resultado sea siempre el mismo.
 */
const NATAL = {
  utc: '1992-05-14T15:30:00.000Z', // 10:30 en Bogotá
  lat: 4.61,
  lng: -74.08,
  tz: 'America/Bogota',
  precision: 'exact' as const,
}

async function pronosticoDePrueba() {
  const natal = await createLocalChartProvider().calcular(NATAL)
  return calcularPronostico(natal, { desde: DateTime.utc(2026, 3, 1), dias: 30 })
}

describe('casaDe', () => {
  it('sitúa una longitud en su casa', () => {
    // Cúspides de 30 en 30 desde 0°: la casa 1 va de 0 a 30.
    const cuspides = Array.from({ length: 12 }, (_, i) => i * 30)
    expect(casaDe(5, cuspides)).toBe(1)
    expect(casaDe(35, cuspides)).toBe(2)
    expect(casaDe(355, cuspides)).toBe(12)
  })

  it('resuelve la casa que cruza 0° Aries', () => {
    // Casa 1 de 340° a 10°.
    const cuspides = [340, 10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310]
    expect(casaDe(350, cuspides)).toBe(1)
    expect(casaDe(5, cuspides)).toBe(1)
    expect(casaDe(20, cuspides)).toBe(2)
  })

  it('sin cúspides no inventa casa', () => {
    expect(casaDe(100, [])).toBeNull()
  })
})

describe('calcularPronostico', () => {
  it('devuelve un periodo con ventanas fechadas', async () => {
    const p = await pronosticoDePrueba()

    expect(p).not.toBeNull()
    expect(p!.desde).toBe('2026-03-01')
    expect(p!.hasta).toBe('2026-03-31')
    expect(p!.ventanas.length).toBeGreaterThan(0)
    expect(p!.ventanas.length).toBeLessThanOrEqual(5)

    for (const ventana of p!.ventanas) {
      // Las fechas son del periodo, y la central cae dentro de su ventana.
      expect(ventana.desde >= p!.desde).toBe(true)
      expect(ventana.hasta <= p!.hasta).toBe(true)
      expect(ventana.fecha >= ventana.desde).toBe(true)
      expect(ventana.fecha <= ventana.hasta).toBe(true)
      expect(ventana.eventos.length).toBeGreaterThan(0)
    }

    // Una ventana es un episodio corto, no el mes entero.
    for (const ventana of p!.ventanas) {
      const dias = DateTime.fromISO(ventana.hasta).diff(DateTime.fromISO(ventana.desde), 'days').days
      expect(dias).toBeLessThanOrEqual(5)
    }

    // El trasfondo es lo largo, y nunca se presenta como una fecha.
    for (const evento of p!.trasfondo) {
      expect(p!.ventanas.some((v) => v.eventos.includes(evento))).toBe(false)
    }

    // Numeradas en orden de calendario: el modelo las cita por id.
    const ids = p!.ventanas.map((v) => v.id)
    expect(ids).toEqual(ids.map((_, i) => `v${i + 1}`))
    const fechas = p!.ventanas.map((v) => v.fecha)
    expect([...fechas].sort()).toEqual(fechas)
  }, 60_000)

  it('encuentra las dos lunaciones del mes', async () => {
    const p = await pronosticoDePrueba()
    const lunaciones = p!.eventos.filter((e) => e.clase === 'lunacion')

    // Un mes tiene una luna nueva y una llena (a veces dos de una).
    expect(lunaciones.length).toBeGreaterThanOrEqual(2)
    expect(new Set(lunaciones.map((l) => (l.clase === 'lunacion' ? l.tipo : '')))).toEqual(
      new Set(['nueva', 'llena']),
    )
  }, 60_000)

  it('no mete a la Luna en las ventanas de aspecto', async () => {
    const p = await pronosticoDePrueba()
    const conLuna = p!.eventos.filter((e) => e.clase === 'aspecto' && e.transitante === 'luna')

    expect(conLuna).toHaveLength(0)
  }, 60_000)

  it('sitúa los tránsitos en casas cuando la carta tiene hora', async () => {
    const p = await pronosticoDePrueba()
    const aspectos = p!.eventos.filter((e) => e.clase === 'aspecto')

    expect(aspectos.some((e) => e.clase === 'aspecto' && e.casa !== null)).toBe(true)
  }, 60_000)

  it('sin hora de nacimiento no inventa casas ni ángulos', async () => {
    const natal = await createLocalChartProvider().calcular({ ...NATAL, precision: 'partial' })
    const p = await calcularPronostico(natal, { desde: DateTime.utc(2026, 3, 1), dias: 15 })

    expect(p).not.toBeNull()
    for (const evento of p!.eventos) {
      expect(evento.casa).toBeNull()
      if (evento.clase === 'aspecto') {
        expect(['ascendente', 'medioCielo']).not.toContain(evento.natal)
      }
    }
  }, 60_000)
})
