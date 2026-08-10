import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetServerEnvCache } from '@/lib/env/server'

import { correosDeCortesia, esCortesia } from './cortesia'

/**
 * La lista de cortesía es la única puerta de acceso que no decide la landing,
 * así que lo que hay que probar no es solo que deje entrar a quien está en ella,
 * sino sobre todo **que no deje entrar a nadie más**. Un fallo en el sentido
 * permisivo aquí regala el producto sin que nada lo delate: quien entra ve el
 * portal completo y no tiene motivo para avisar.
 */

function configurar(valor: string | undefined) {
  if (valor === undefined) delete process.env.ACCESOS_CORTESIA
  else process.env.ACCESOS_CORTESIA = valor

  resetServerEnvCache()
}

beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-prueba'
  configurar(undefined)
})

afterEach(() => {
  configurar(undefined)
})

describe('esCortesia', () => {
  it('reconoce un correo de la lista', () => {
    configurar('inversionesaoa7@gmail.com')
    expect(esCortesia('inversionesaoa7@gmail.com')).toBe(true)
  })

  it('no reconoce a nadie más', () => {
    configurar('inversionesaoa7@gmail.com')
    expect(esCortesia('otra@gmail.com')).toBe(false)
  })

  /*
   * Sin variable configurada, la lista está vacía y no concede nada. Es el
   * estado en el que corren las pruebas, el desarrollo de cualquiera y la app
   * antes de este cambio: el comportamiento por defecto tiene que ser el de
   * siempre.
   */
  it('sin variable configurada no concede acceso a nadie', () => {
    configurar(undefined)
    expect(esCortesia('inversionesaoa7@gmail.com')).toBe(false)
    expect(correosDeCortesia()).toEqual([])
  })

  it('admite varios correos separados por comas, con espacios', () => {
    configurar(' una@gmail.com , dos@gmail.com ')
    expect(esCortesia('una@gmail.com')).toBe(true)
    expect(esCortesia('dos@gmail.com')).toBe(true)
    expect(esCortesia('tres@gmail.com')).toBe(false)
  })

  /*
   * El correo llega de Google tal y como lo escribió la persona, y la lista la
   * rellena alguien a mano. Que no coincidieran por una mayúscula sería un fallo
   * mudo: la propietaria vería «no encontramos tu compra» y nadie sabría por qué.
   */
  it('ignora mayúsculas en los dos lados', () => {
    configurar('Inversionesaoa7@Gmail.com')
    expect(esCortesia('inversionesaoa7@gmail.com')).toBe(true)
    expect(esCortesia('INVERSIONESAOA7@GMAIL.COM')).toBe(true)
  })

  /*
   * Una coma de más deja una cadena vacía en la lista. Si se comparara contra
   * ella, bastaría con que el correo del usuario fuera vacío o ausente para
   * entrar — y de ahí a regalar el acceso hay un paso.
   */
  it('una coma suelta no abre la puerta', () => {
    configurar('una@gmail.com,,')
    expect(correosDeCortesia()).toEqual(['una@gmail.com'])
    expect(esCortesia('')).toBe(false)
    expect(esCortesia('   ')).toBe(false)
  })

  it('sin correo, no hay cortesía', () => {
    configurar('una@gmail.com')
    expect(esCortesia(null)).toBe(false)
    expect(esCortesia(undefined)).toBe(false)
  })

  /*
   * Una variable vacía es lo que queda al retirar el último correo, y al
   * declararla sin valor en un .env. Tiene que comportarse como si no existiera.
   */
  it('la variable vacía equivale a no tenerla', () => {
    configurar('')
    expect(correosDeCortesia()).toEqual([])
    expect(esCortesia('una@gmail.com')).toBe(false)
  })
})
