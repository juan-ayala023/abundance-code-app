import { describe, expect, it } from 'vitest'

import { esRutaProtegida } from './rutas'

describe('esRutaProtegida', () => {
  it('protege las rutas del grupo (app)', () => {
    expect(esRutaProtegida('/portal')).toBe(true)
    expect(esRutaProtegida('/carta')).toBe(true)
    expect(esRutaProtegida('/cuenta')).toBe(true)
  })

  it('protege también las subrutas', () => {
    expect(esRutaProtegida('/guia/conversacion')).toBe(true)
    expect(esRutaProtegida('/activacion/3')).toBe(true)
  })

  it('deja pasar las rutas públicas', () => {
    expect(esRutaProtegida('/')).toBe(false)
    expect(esRutaProtegida('/planes')).toBe(false)
    expect(esRutaProtegida('/activar')).toBe(false)
    expect(esRutaProtegida('/activar/vincular')).toBe(false)
    expect(esRutaProtegida('/auth/callback')).toBe(false)
  })

  it('no confunde rutas que solo comparten prefijo', () => {
    // "/portales" no es "/portal": sin esta comprobación, un prefijo suelto
    // protegería rutas públicas por accidente.
    expect(esRutaProtegida('/portales')).toBe(false)
    expect(esRutaProtegida('/cartas-publicas')).toBe(false)
  })
})
