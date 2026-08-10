import type { Idioma } from '@/i18n/idioma'

/**
 * En qué idioma tiene que escribir el modelo.
 *
 * **Esta es la mitad del bilingüe que se olvida.** Traducir botones y titulares
 * no traduce el producto: lo que la persona compra es la lectura, y esa la
 * escribe un modelo que hace lo que le diga el prompt. Con «En español» fijo,
 * un comprador inglés pagaría 49 $ por un texto que no puede leer, con la
 * interfaz perfectamente traducida alrededor.
 *
 * El resto de instrucciones —el tono, tutear, no ser místico de catálogo— no
 * cambia con el idioma. Lo único que cambia es esta línea, así que vive aquí y
 * no repetida en tres prompts.
 */
export const INSTRUCCION_IDIOMA: Record<Idioma, string> = {
  es: 'En español, tuteando, en segunda persona.',
  /*
   * El inglés no distingue tú de usted, así que «tuteando» no se traduce: lo
   * que hay que pedir es el registro equivalente, que es el tono directo y sin
   * ceremonia. Sin decirlo, el modelo tiende a un inglés más formal del que
   * tiene la versión española, y las dos dejarían de sonar al mismo producto.
   */
  en: 'In English, second person, warm and direct — never formal or ceremonious.',
}

/**
 * El contenido ya generado **no se traduce**.
 *
 * La lectura base se genera una sola vez y se guarda. Si alguien cambia de
 * idioma después, lo que ya tiene se queda como está: regenerarla costaría
 * dinero y, sobre todo, le cambiaría su lectura personal bajo los pies. Lo que
 * se genere a partir de ahí sí sale en el idioma nuevo.
 */
export function instruccionDeIdioma(idioma: Idioma): string {
  return INSTRUCCION_IDIOMA[idioma]
}
