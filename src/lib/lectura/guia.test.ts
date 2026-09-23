import { describe, expect, it } from 'vitest'

import { mesDeGuia } from './guia'

/** `AAAA-MM-DD` de un instante, leído en una zona. */
function dia(fecha: Date, zona: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: zona }).format(fecha)
}

describe('mesDeGuia', () => {
  const creado = '2026-09-01T15:00:00.000Z'
  const zona = 'America/Bogota'

  it('el primer mes empieza el día en que se creó el portal', () => {
    const mes = mesDeGuia(creado, zona, new Date('2026-09-10T12:00:00Z'))!

    expect(mes.numero).toBe(1)
    expect(dia(mes.desde, zona)).toBe('2026-09-01')
  })

  it('el día 30 sigue siendo el primer mes', () => {
    // Creado el 1; el día 30 del ciclo es el 30 de septiembre.
    const mes = mesDeGuia(creado, zona, new Date('2026-09-30T12:00:00Z'))!

    expect(mes.numero).toBe(1)
    expect(dia(mes.desde, zona)).toBe('2026-09-01')
  })

  /**
   * El día 31 empieza el segundo mes, y con él otras doce consultas.
   *
   * Es el punto que importa: quien sigue pagando después del ciclo inicial no
   * se queda sin guía, que fue el fallo más caro del cambio de contrato.
   */
  it('el día 31 abre el segundo mes', () => {
    const mes = mesDeGuia(creado, zona, new Date('2026-10-01T12:00:00Z'))!

    expect(mes.numero).toBe(2)
    expect(dia(mes.desde, zona)).toBe('2026-10-01')
  })

  it('el corte es a medianoche de su zona, no en UTC', () => {
    /*
     * A las 02:00 UTC del 2 de octubre en Bogotá son las 21:00 del 1: todavía
     * es el día 30 y el mes sigue siendo el primero. Con UTC habría cambiado.
     */
    const mes = mesDeGuia(creado, zona, new Date('2026-10-01T02:00:00Z'))!

    expect(mes.numero).toBe(1)
  })

  it('el mes dura treinta días', () => {
    const mes = mesDeGuia(creado, zona, new Date('2026-09-10T12:00:00Z'))!

    const dias = Math.round((mes.hasta.getTime() - mes.desde.getTime()) / 86_400_000)
    expect(dias).toBe(30)
  })

  /**
   * Un huso con cambio de hora dentro del bloque.
   *
   * Madrid atrasa el reloj el último domingo de octubre. Si el bloque se
   * calculara restando milisegundos, el corte caería a las 23:00 del día
   * anterior y una consulta de esa hora se contaría en el mes equivocado.
   */
  it('el cambio de hora no descuadra el corte', () => {
    // Creado el 10 de octubre; el día 31 —y el segundo mes— cae el 9 de
    // noviembre, con el cambio de hora del 25 de octubre por en medio.
    const mes = mesDeGuia('2026-10-10T10:00:00.000Z', 'Europe/Madrid', new Date('2026-11-09T12:00:00Z'))!

    expect(mes.numero).toBe(2)
    expect(dia(mes.desde, 'Europe/Madrid')).toBe('2026-11-09')
    expect(mes.desde.toISOString()).toBe('2026-11-08T23:00:00.000Z')
  })

  it('sin fecha de creación no cuenta nada', () => {
    expect(mesDeGuia(null, zona)).toBeNull()
    expect(mesDeGuia('no es una fecha', zona)).toBeNull()
  })
})
