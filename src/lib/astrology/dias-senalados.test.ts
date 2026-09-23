import { describe, expect, it } from 'vitest'

import { diasSenalados } from './dias-senalados'
import type { EventoPronostico, Pronostico, VentanaPronostico } from './pronostico'

/** Un aspecto de tránsito, con lo mínimo para clasificarlo. */
function asp(
  fecha: string,
  tipo: 'trigono' | 'sextil' | 'cuadratura' | 'oposicion' | 'conjuncion',
  transitante: 'venus' | 'jupiter' | 'saturno' | 'marte' | 'pluton' | 'sol' = 'sol',
  peso = 1,
): EventoPronostico {
  return {
    clase: 'aspecto',
    fecha,
    desde: fecha,
    hasta: fecha,
    transitante,
    natal: 'luna',
    tipo,
    orbe: 0.1,
    casa: 5,
    peso,
  }
}

function pronostico(eventos: EventoPronostico[], ventanas: VentanaPronostico[] = []): Pronostico {
  return {
    desde: '2026-10-01',
    hasta: '2026-10-30',
    ventanas,
    trasfondo: [],
    eventos,
  }
}

describe('diasSenalados', () => {
  it('separa lo que abre de lo que aprieta', () => {
    const { favorables, cuidado } = diasSenalados(
      pronostico([
        asp('2026-10-03', 'trigono'),
        asp('2026-10-12', 'cuadratura'),
        asp('2026-10-20', 'sextil'),
        asp('2026-10-25', 'oposicion'),
      ]),
    )

    expect(favorables.map((d) => d.fecha)).toEqual(['2026-10-03', '2026-10-20'])
    expect(cuidado.map((d) => d.fecha)).toEqual(['2026-10-12', '2026-10-25'])
  })

  it('la conjunción la decide el planeta que transita', () => {
    const { favorables, cuidado } = diasSenalados(
      pronostico([
        asp('2026-10-05', 'conjuncion', 'venus'),
        asp('2026-10-15', 'conjuncion', 'saturno'),
        // El Sol no inclina la balanza en ningún sentido: se descarta.
        asp('2026-10-25', 'conjuncion', 'sol'),
      ]),
    )

    expect(favorables.map((d) => d.fecha)).toEqual(['2026-10-05'])
    expect(cuidado.map((d) => d.fecha)).toEqual(['2026-10-15'])
  })

  /**
   * Un día que abre y aprieta a la vez no es ninguna de las dos cosas.
   *
   * Mandar a alguien a «aprovechar» un día que también le exige es peor que no
   * señalárselo: el consejo se le queda grande a la realidad de ese día.
   */
  it('un día mezclado no entra en ninguna lista', () => {
    const { favorables, cuidado } = diasSenalados(
      pronostico([asp('2026-10-08', 'trigono'), asp('2026-10-08', 'cuadratura')]),
    )

    expect(favorables).toEqual([])
    expect(cuidado).toEqual([])
  })

  it('no repite días que ya están en una ventana importante', () => {
    const ventana: VentanaPronostico = {
      id: 'v1',
      fecha: '2026-10-10',
      desde: '2026-10-08',
      hasta: '2026-10-12',
      intensidad: 5,
      nivel: 'alta',
      eventos: [],
    }

    const { favorables } = diasSenalados(
      pronostico([asp('2026-10-09', 'trigono'), asp('2026-10-20', 'trigono')], [ventana]),
    )

    expect(favorables.map((d) => d.fecha)).toEqual(['2026-10-20'])
  })

  it('no amontona tres fechas de la misma semana', () => {
    const { favorables } = diasSenalados(
      pronostico([
        asp('2026-10-10', 'trigono', 'sol', 3),
        asp('2026-10-11', 'trigono', 'sol', 2.5),
        asp('2026-10-12', 'trigono', 'sol', 2),
        asp('2026-10-22', 'trigono', 'sol', 1),
      ]),
    )

    // El más fuerte de la racha, y después uno de otra parte del mes.
    expect(favorables.map((d) => d.fecha)).toEqual(['2026-10-10', '2026-10-22'])
  })

  it('como mucho tres de cada, de más fuerte a más suave', () => {
    const { favorables } = diasSenalados(
      pronostico([
        asp('2026-10-02', 'trigono', 'sol', 1),
        asp('2026-10-08', 'trigono', 'sol', 5),
        asp('2026-10-14', 'trigono', 'sol', 4),
        asp('2026-10-20', 'trigono', 'sol', 3),
        asp('2026-10-26', 'trigono', 'sol', 2),
      ]),
    )

    expect(favorables).toHaveLength(3)
    expect(favorables.map((d) => d.fecha)).toEqual(['2026-10-08', '2026-10-14', '2026-10-20'])
    // Y van en orden de calendario, que es como se leen.
    expect(favorables.map((d) => d.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it('un periodo sin aspectos claros no inventa fechas', () => {
    expect(diasSenalados(pronostico([]))).toEqual({ favorables: [], cuidado: [] })
  })
})
