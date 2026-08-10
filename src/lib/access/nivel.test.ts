import { describe, expect, it } from 'vitest'

import { nivelDeAcceso } from './nivel'

/**
 * El nivel depende de `has_access`, que calcula el backend de la landing, y de
 * nada más. El ciclo de 30 días dejó de decidir el acceso al conocerse el
 * precio real: 49 $ y luego 14,99 $/mes es **una sola suscripción con trial**,
 * así que todo comprador es suscriptor y no existen las compras sueltas.
 */

const conAcceso = { status: 'active', has_access: true }
const sinAcceso = { status: 'canceled', has_access: false }

describe('nivelDeAcceso', () => {
  it('da acceso completo a quien lo tiene vigente', () => {
    expect(nivelDeAcceso(conAcceso)).toBe('completo')
  })

  it('deja solo la lectura a quien ya no lo tiene', () => {
    expect(nivelDeAcceso(sinAcceso)).toBe('solo-lectura')
  })

  /*
   * `past_due` es impago en gracia. Su backend lo considera cliente y nosotros
   * no podemos ser más estrictos que quien cobra: cerrarle la app a alguien a
   * quien ellos siguen facturando sería quitarle lo que está pagando.
   */
  it('respeta la gracia por impago que concede la landing', () => {
    expect(nivelDeAcceso({ status: 'past_due', has_access: true })).toBe('completo')
  })

  /*
   * `has_access` manda sobre `status`. Es lo que pide el contrato: si mañana
   * cambian las reglas de gracia, esta app no tiene que enterarse.
   */
  it('hace caso a has_access aunque el estado diga otra cosa', () => {
    expect(nivelDeAcceso({ status: 'active', has_access: false })).toBe('solo-lectura')
    expect(nivelDeAcceso({ status: 'canceled', has_access: true })).toBe('completo')
  })

  /*
   * Respaldo para las filas escritas por el webhook de Stripe antes del cambio
   * de contrato, que no tienen `has_access`.
   */
  describe('sin has_access, se cae al estado', () => {
    it.each(['active', 'trialing', 'past_due'])('%s concede acceso', (status) => {
      expect(nivelDeAcceso({ status })).toBe('completo')
    })

    it.each(['canceled', 'incomplete', 'none'])('%s no lo concede', (status) => {
      expect(nivelDeAcceso({ status })).toBe('solo-lectura')
    })
  })

  /*
   * Sin compra, el layout ya ha redirigido antes de llegar aquí. Si aun así se
   * llegara, cerrar la guía por un dato ausente castigaría a quien acaba de
   * entrar — el acceso a la app ya se comprobó una capa antes.
   */
  it('sin entitlement concede el nivel completo', () => {
    expect(nivelDeAcceso(null)).toBe('completo')
  })
})
