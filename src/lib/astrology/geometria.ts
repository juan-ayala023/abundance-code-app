/**
 * Geometría de la rueda astrológica.
 *
 * Va en funciones puras y probadas porque es donde se esconden los errores
 * silenciosos: una carta con el ascendente mal orientado o con dos planetas
 * superpuestos sigue pareciendo una carta correcta.
 */

export type Punto = { x: number; y: number }

/**
 * Convierte una longitud eclíptica en el ángulo de pantalla (grados SVG).
 *
 * Convención de toda la astrología occidental: el Ascendente a la IZQUIERDA y
 * las longitudes creciendo en sentido antihorario. Como en SVG el eje Y crece
 * hacia abajo, avanzar en antihorario significa restar ángulo.
 *
 *   Ascendente        -> izquierda (180°)
 *   Ascendente + 90°  -> abajo, el Fondo del Cielo
 *   Ascendente + 180° -> derecha, el Descendente
 *   Ascendente + 270° -> arriba, el Medio Cielo
 *
 * Sin ascendente (carta parcial) se ancla 0° Aries a la izquierda.
 */
export function anguloEnPantalla(longitud: number, ascendente: number | null): number {
  const ancla = ascendente ?? 0
  return 180 - (longitud - ancla)
}

/** Punto cartesiano a un radio y ángulo dados, en grados SVG. */
export function punto(cx: number, cy: number, radio: number, anguloGrados: number): Punto {
  const rad = (anguloGrados * Math.PI) / 180
  return {
    x: cx + radio * Math.cos(rad),
    y: cy + radio * Math.sin(rad),
  }
}

/** Normaliza a 0–360. */
export function normalizar(grados: number): number {
  return ((grados % 360) + 360) % 360
}

/**
 * Separa las etiquetas de planetas que caerían unas encima de otras.
 *
 * Devuelve la longitud DE DIBUJO de cada planeta, que puede diferir de la real.
 * La posición verdadera se sigue marcando con una línea hasta el círculo, de
 * modo que el desplazamiento no engaña sobre dónde está el planeta.
 *
 * Sin esto, un cúmulo —tres planetas en cuatro grados, algo muy común— se
 * dibuja como un borrón ilegible.
 */
export function distribuir(longitudes: number[], separacionMinima: number): number[] {
  const total = longitudes.length
  if (total === 0) return []

  const ordenados = longitudes
    .map((longitud, indice) => ({ longitud: normalizar(longitud), indice }))
    .sort((a, b) => a.longitud - b.longitud)

  const resultado = new Array<number>(total)

  // Si no caben con la separación pedida, se reparten por igual: apretarlos
  // más solo produciría un borrón distinto.
  if (total * separacionMinima >= 360) {
    const paso = 360 / total
    ordenados.forEach((item, posicion) => {
      resultado[item.indice] = normalizar(ordenados[0]!.longitud + posicion * paso)
    })
    return resultado
  }

  /*
   * Se corta el círculo por el hueco más grande y se trabaja en línea recta.
   * Es lo que hace que el algoritmo converja: empujar sobre un círculo puede
   * dar vueltas indefinidamente, mientras que sobre una secuencia con
   * principio y fin basta una pasada.
   */
  let corte = 0
  let mayorHueco = -1
  for (let i = 0; i < total; i++) {
    const hueco = normalizar(
      ordenados[(i + 1) % total]!.longitud - ordenados[i]!.longitud,
    )
    if (hueco > mayorHueco) {
      mayorHueco = hueco
      corte = (i + 1) % total
    }
  }

  // Secuencia desenrollada: creciente de verdad, sin saltos por el 0 de Aries.
  const secuencia = Array.from({ length: total }, (_, posicion) => {
    const item = ordenados[(corte + posicion) % total]!
    return item.longitud
  })

  const desenrollada = [secuencia[0]!]
  for (let i = 1; i < total; i++) {
    const previo = desenrollada[i - 1]!
    let valor = secuencia[i]!
    while (valor < previo) valor += 360
    desenrollada.push(valor)
  }

  const original = [...desenrollada]

  // Una sola pasada hacia delante basta sobre una secuencia ordenada.
  for (let i = 1; i < total; i++) {
    const minimo = desenrollada[i - 1]! + separacionMinima
    if (desenrollada[i]! < minimo) desenrollada[i] = minimo
  }

  /*
   * El empuje solo va hacia delante, así que el grupo se desplaza. Se recentra
   * para que el cúmulo siga apareciendo donde el usuario espera verlo, no
   * corrido hacia un lado.
   */
  const centroOriginal = (original[0]! + original[total - 1]!) / 2
  const centroNuevo = (desenrollada[0]! + desenrollada[total - 1]!) / 2
  const desplazamiento = centroOriginal - centroNuevo

  desenrollada.forEach((valor, posicion) => {
    const item = ordenados[(corte + posicion) % total]!
    resultado[item.indice] = normalizar(valor + desplazamiento)
  })

  return resultado
}
