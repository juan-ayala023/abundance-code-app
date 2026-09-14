import { describe, expect, it } from 'vitest'

import { LIMITES, nombreDePila, vozComun } from './voz'

describe('nombreDePila', () => {
  it('se queda con el nombre de pila', () => {
    expect(nombreDePila('María Fernanda López')).toBe('María')
    expect(nombreDePila('  juan ayala ')).toBe('Juan')
    expect(nombreDePila("D'Angelo Ruiz")).toBe("D'Angelo")
  })

  it('no le habla a una empresa', () => {
    // Una clienta puso su marca en «Nombre completo» y la lectura le habló a
    // la empresa. Ese caso, literal.
    expect(nombreDePila('Inversiones AOA')).toBeNull()
    expect(nombreDePila('AOA Inversiones')).toBeNull()
    expect(nombreDePila('Grupo Andino SAS')).toBeNull()
    expect(nombreDePila('Estudio Creativo')).toBeNull()
  })

  it('descarta lo que no parece un nombre', () => {
    expect(nombreDePila('')).toBeNull()
    expect(nombreDePila(null)).toBeNull()
    expect(nombreDePila(undefined)).toBeNull()
    expect(nombreDePila('J')).toBeNull()
    expect(nombreDePila('user123')).toBeNull()
    expect(nombreDePila('maria@gmail.com')).toBeNull()
    expect(nombreDePila('THEFOUNDERS')).toBeNull()
  })
})

describe('vozComun', () => {
  it('con nombre, prohíbe deducir nada de él', () => {
    const voz = vozComun('es', 'Juan')
    expect(voz).toContain('Le escribes a Juan')
    expect(voz).toMatch(/No deduzcas de él nada/)
  })

  it('sin nombre, prohíbe inventar uno', () => {
    expect(vozComun('es', null)).toMatch(/No inventes ninguno/)
  })

  it('lleva las reglas de la narrativa de septiembre de 2026', () => {
    const voz = vozComun('es', null)
    // Hipótesis, no certezas; nada deducido que no esté en los datos.
    expect(voz).toMatch(/Hipótesis, no certezas/)
    expect(voz).toMatch(/ni socio, ni proyecto/)
    // Lo kármico como lectura simbólica, nunca literal.
    expect(voz).toMatch(/Lo kármico es simbólico/)
    // Nada de síntomas atribuidos a planetas.
    expect(voz).toMatch(/Saturno pesa en el pecho/)
  })
})

describe('LIMITES', () => {
  it('cierra la puerta al miedo, la urgencia y la condena kármica', () => {
    expect(LIMITES).toMatch(/solo tu código puede salvarte/)
    expect(LIMITES).toMatch(/vidas pasadas/)
    expect(LIMITES).toMatch(/no lo llamas resistencia/)
    expect(LIMITES).toMatch(/no inventes ninguno para justificar/)
  })
})
