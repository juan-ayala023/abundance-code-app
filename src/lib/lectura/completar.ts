import 'server-only'

/**
 * Ninguna sección se publica a medias.
 *
 * En la revisión del 23 de septiembre aparecieron secciones de la carta que
 * terminaban a mitad de palabra. El motivo es siempre el mismo: el modelo se
 * queda sin tope de salida mientras escribe, y lo que llega es un texto
 * perfectamente formado hasta que deja de serlo.
 *
 * Un texto cortado no es un texto peor: es un producto roto. Así que se
 * comprueba antes de guardar y se vuelve a pedir **solo lo que salió mal**,
 * que es más barato y más rápido que regenerar la lectura entera.
 */

/** Con qué termina una frase acabada. */
const FINAL = /[.!?…»"”)\]]$/u

/**
 * ¿Está completa esta sección?
 *
 * Se mira el cierre, no la longitud: un párrafo corto puede estar bien y uno
 * largo puede haberse cortado. Los dos puntos y la coma cuentan como corte
 * porque anuncian algo que no llegó.
 */
export function seccionCompleta(texto: unknown): boolean {
  if (typeof texto !== 'string') return true

  const limpio = texto.trim()
  if (limpio.length === 0) return false

  return FINAL.test(limpio)
}

/** Las claves de un objeto cuyo texto quedó a medias. */
export function seccionesIncompletas(objeto: Record<string, unknown>): string[] {
  return Object.entries(objeto)
    .filter(([clave, valor]) => clave !== 'idioma' && typeof valor === 'string' && !seccionCompleta(valor))
    .map(([clave]) => clave)
}

/**
 * Reintenta las secciones incompletas, una vez.
 *
 * `rehacer` recibe las claves que hay que volver a escribir y devuelve solo
 * esas. Si el segundo intento también las trae cortadas, se devuelve lo mejor
 * de los dos —se prefiere la versión completa, venga del intento que venga— y
 * se registra: el aviso importa porque significa que el tope de salida se está
 * quedando corto de verdad, y eso se arregla en el generador, no aquí.
 */
export async function completarSecciones<T extends Record<string, unknown>>(
  objeto: T,
  rehacer: (claves: string[]) => Promise<Partial<T>>,
  etiqueta: string,
): Promise<T> {
  const incompletas = seccionesIncompletas(objeto)
  if (incompletas.length === 0) return objeto

  console.warn(`[${etiqueta}] secciones incompletas, reintentando`, incompletas)

  let rehechas: Partial<T>
  try {
    rehechas = await rehacer(incompletas)
  } catch (error) {
    console.error(`[${etiqueta}] no se pudieron rehacer las secciones`, error)
    return objeto
  }

  const resultado: Record<string, unknown> = { ...objeto }
  for (const clave of incompletas) {
    const nueva = (rehechas as Record<string, unknown>)[clave]
    if (typeof nueva === 'string' && seccionCompleta(nueva)) {
      resultado[clave] = nueva
    }
  }

  const siguenMal = seccionesIncompletas(resultado)
  if (siguenMal.length > 0) {
    console.error(`[${etiqueta}] siguen incompletas tras el reintento`, siguenMal)
  }

  return resultado as T
}
