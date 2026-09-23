import { describe, expect, it, vi } from 'vitest'

import { completarSecciones, seccionCompleta, seccionesIncompletas } from './completar'

describe('seccionCompleta', () => {
  it('acepta una frase terminada', () => {
    expect(seccionCompleta('Hoy conviene esperar.')).toBe(true)
    expect(seccionCompleta('¿Y si no fuera prisa?')).toBe(true)
    expect(seccionCompleta('«lo que se va deja espacio»')).toBe(true)
  })

  it('rechaza lo que se cortó', () => {
    // El caso real de la revisión: se acaba el tope a mitad de palabra.
    expect(seccionCompleta('Tu manera de decidir se apoya en lo que ya cono')).toBe(false)
    expect(seccionCompleta('Esto pide un ajuste,')).toBe(false)
    expect(seccionCompleta('Lo importante es esto:')).toBe(false)
    expect(seccionCompleta('   ')).toBe(false)
  })

  it('no juzga lo que no es texto', () => {
    expect(seccionCompleta(undefined)).toBe(true)
    expect(seccionCompleta(42)).toBe(true)
  })
})

describe('seccionesIncompletas', () => {
  it('nombra solo las que están mal, y nunca el idioma', () => {
    const lectura = {
      resumen: 'Completa.',
      energiaPrincipal: 'A medio decir',
      idioma: 'es',
    }

    expect(seccionesIncompletas(lectura)).toEqual(['energiaPrincipal'])
  })
})

describe('completarSecciones', () => {
  it('no llama al modelo si todo está completo', async () => {
    const rehacer = vi.fn()
    const objeto = { a: 'Una.', b: 'Dos.' }

    expect(await completarSecciones(objeto, rehacer, 'prueba')).toEqual(objeto)
    expect(rehacer).not.toHaveBeenCalled()
  })

  it('rehace solo lo cortado y conserva lo demás', async () => {
    const rehacer = vi.fn(async (claves: string[]) => {
      expect(claves).toEqual(['b'])
      return { b: 'Dos, ahora entera.' }
    })

    const resultado = await completarSecciones({ a: 'Una.', b: 'Dos a medi' }, rehacer, 'prueba')

    expect(resultado).toEqual({ a: 'Una.', b: 'Dos, ahora entera.' })
  })

  it('si el reintento falla, devuelve lo que había sin romperse', async () => {
    const objeto = { a: 'Una.', b: 'Cortada' }
    const resultado = await completarSecciones(objeto, async () => {
      throw new Error('el modelo no contestó')
    }, 'prueba')

    expect(resultado).toEqual(objeto)
  })

  it('descarta un reintento que también viene cortado', async () => {
    const resultado = await completarSecciones(
      { a: 'Cortada otra vez' },
      async () => ({ a: 'Sigue cortad' }),
      'prueba',
    )

    expect(resultado).toEqual({ a: 'Cortada otra vez' })
  })
})
