import { describe, expect, it } from 'vitest'

import es from '../../messages/es.json'
import en from '../../messages/en.json'
import { esIdioma, IDIOMAS, NOMBRE_IDIOMA } from './idioma'
import { INSTRUCCION_IDIOMA } from '@/lib/lectura/idioma-prompt'

/** Todas las claves de un diccionario, aplanadas: `nav.portal`, `home.titulo`… */
function claves(objeto: unknown, prefijo = ''): string[] {
  if (typeof objeto !== 'object' || objeto === null) return [prefijo]
  return Object.entries(objeto).flatMap(([k, v]) =>
    claves(v, prefijo ? `${prefijo}.${k}` : k),
  )
}

describe('diccionarios', () => {
  /*
   * Un idioma al que le falta una clave no rompe el build ni las pruebas de
   * pantalla: next-intl pinta la clave en crudo —«nav.portal»— justo en el sitio
   * donde debería ir el texto. Es un fallo que solo se ve mirando cada pantalla
   * en cada idioma, que es exactamente lo que nadie hace antes de desplegar.
   */
  it('tienen exactamente las mismas claves', () => {
    const enEs = claves(es).sort()
    const enEn = claves(en).sort()

    expect(enEn.filter((k) => !enEs.includes(k))).toEqual([])
    expect(enEs.filter((k) => !enEn.includes(k))).toEqual([])
  })

  it('ningún texto está vacío', () => {
    for (const [idioma, dic] of [
      ['es', es],
      ['en', en],
    ] as const) {
      const vacias = claves(dic).filter((ruta) => {
        const valor = ruta.split('.').reduce<unknown>((o, k) => (o as never)?.[k], dic)
        return typeof valor !== 'string' || valor.trim() === ''
      })
      expect(vacias, `${idioma} tiene textos vacíos`).toEqual([])
    }
  })

  /*
   * Traducir la interfaz sin traducir el contenido dejaría a un comprador
   * inglés con los botones en su idioma y su lectura —lo que pagó— en español.
   */
  it('cada idioma sabe decirle al modelo en qué idioma escribir', () => {
    for (const idioma of IDIOMAS) {
      expect(INSTRUCCION_IDIOMA[idioma]?.trim()).toBeTruthy()
      expect(NOMBRE_IDIOMA[idioma]?.trim()).toBeTruthy()
    }
  })

  /*
   * La comprobación anterior mira que `es` y `en` digan lo mismo, pero no que
   * digan lo que el código pide. Una clave colocada en el bloque equivocado
   * está presente en los dos idiomas por igual y aun así se pinta en crudo:
   * pasó de verdad con `sugeridas`, que vivía en `guia` mientras el componente
   * traducía con ámbito `guia_form`.
   */
  it('tiene las claves que el código pide por su ámbito', () => {
    const exigidas: [keyof typeof es, string[]][] = [
      ['guia_form', ['pregunta', 'placeholder', 'sugeridasTitulo', 'restantes', 'agotadas', 'responde', 'aviso', 'sugeridas']],
      ['guia', ['titulo', 'descripcion', 'seccion', 'consultar', 'consultando']],
      ['generando', ['pasos', 'paso', 'progresoLabel', 'error', 'errorTexto', 'lista', 'esperando']],
      ['nav', ['portal', 'lecturaBase', 'activacion', 'guia', 'cuenta', 'dia']],
      ['suscripcion', ['necesita', 'mensaje', 'continuar', 'volverLectura']],
    ]

    for (const [ambito, claves] of exigidas) {
      for (const clave of claves) {
        expect(
          (es[ambito] as Record<string, unknown>)?.[clave],
          `falta es.${String(ambito)}.${clave}`,
        ).toBeDefined()
        expect(
          (en[ambito] as Record<string, unknown>)?.[clave],
          `falta en.${String(ambito)}.${clave}`,
        ).toBeDefined()
      }
    }
  })

  it('rechaza un idioma que no reconocemos', () => {
    // La cookie es editable desde el navegador y de su valor sale el nombre del
    // archivo de mensajes que se importa.
    expect(esIdioma('es')).toBe(true)
    expect(esIdioma('en')).toBe(true)
    expect(esIdioma('../../etc/passwd')).toBe(false)
    expect(esIdioma('fr')).toBe(false)
    expect(esIdioma(undefined)).toBe(false)
  })
})
