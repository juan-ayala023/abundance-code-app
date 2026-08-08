import { describe, expect, it } from 'vitest'

import { safeNextPath } from './schemas'

describe('safeNextPath', () => {
  it('acepta rutas internas', () => {
    expect(safeNextPath('/portal')).toBe('/portal')
    expect(safeNextPath('/carta?x=1')).toBe('/carta?x=1')
  })

  it('rechaza dominios externos disfrazados de ruta', () => {
    // El navegador resuelve estos como URLs absolutas a otro host.
    expect(safeNextPath('//evil.com')).toBe('/portal')
    expect(safeNextPath('/\\evil.com')).toBe('/portal')
  })

  it('rechaza URLs absolutas', () => {
    expect(safeNextPath('https://evil.com')).toBe('/portal')
    expect(safeNextPath('javascript:alert(1)')).toBe('/portal')
  })

  it('cae al valor por defecto si no hay nada', () => {
    expect(safeNextPath(null)).toBe('/portal')
    expect(safeNextPath(undefined)).toBe('/portal')
    expect(safeNextPath('')).toBe('/portal')
  })

  it('permite cambiar el destino por defecto', () => {
    expect(safeNextPath(null, '/onboarding')).toBe('/onboarding')
  })
})
