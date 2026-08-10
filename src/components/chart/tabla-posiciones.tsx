import type { Carta } from '@/lib/astrology/types'
import { gradoEnSigno, signoDe } from '@/lib/astrology/types'

import { GLIFO_CUERPO, GLIFO_SIGNO, NOMBRE_CUERPO, NOMBRE_SIGNO } from './glifos'

/**
 * Las mismas posiciones de la rueda, en texto.
 *
 * No es un extra: un gráfico SVG, por bien etiquetado que esté, no se lee con
 * lector de pantalla ni se consulta con precisión. Aquí están los grados
 * exactos, que en la rueda solo se intuyen.
 *
 * **Tiene que caber en un teléfono.** El `overflow-x-auto` es una red de
 * seguridad, no la solución: su barra de desplazamiento es invisible hasta que
 * se arrastra, así que una tabla recortada no se lee como «hay más a la
 * derecha» sino como contenido cortado —y la página no desborda, de modo que
 * ninguna prueba de desbordamiento lo delata—. Por eso el ancho mínimo se
 * recorta en la fuente: sin canal a la derecha de la última columna, con
 * separaciones más estrechas en móvil y con la retrogradación en su símbolo.
 * Así pasó de 316 px de ancho mínimo a 252, que entra en cualquier teléfono
 * actual. Por debajo de 340 px vuelve a desplazarse, y ahí sí es lo correcto.
 */
export function TablaPosiciones({ carta }: { carta: Carta }) {
  const parcial = carta.precision === 'partial'

  return (
    <div className="overflow-x-auto">
      {/*
        El canal de la última columna no separa de nada: solo suma al ancho
        mínimo. Se quita aquí y no en cada celda porque cuál es la última
        depende de si la carta tiene casas.
      */}
      <table className="w-full border-collapse text-sm [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
        <caption className="sr-only">
          Posiciones planetarias de la carta natal
        </caption>
        <thead>
          <tr className="border-b border-borde-fuerte text-left">
            <th scope="col" className="py-2 pr-2 font-medium sm:pr-4">Planeta</th>
            <th scope="col" className="py-2 pr-2 font-medium sm:pr-4">Signo</th>
            <th scope="col" className="py-2 pr-2 font-medium sm:pr-4">Grado</th>
            {!parcial ? (
              <th scope="col" className="py-2 pr-2 font-medium sm:pr-4">Casa</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {carta.planetas.map((planeta) => {
            const signo = signoDe(planeta.longitud)
            const grado = gradoEnSigno(planeta.longitud)
            const grados = Math.floor(grado)
            // Los minutos de arco son la unidad habitual en astrología.
            const minutos = Math.round((grado - grados) * 60)

            return (
              <tr
                key={planeta.cuerpo}
                className="border-b border-borde"
              >
                <th scope="row" className="py-2 pr-2 text-left font-normal sm:pr-4">
                  <span aria-hidden="true">{GLIFO_CUERPO[planeta.cuerpo]}</span>{' '}
                  {NOMBRE_CUERPO[planeta.cuerpo]}
                  {/*
                    El símbolo, no la palabra. «(retrógrado)» era la cadena más
                    larga e irrompible de la tabla y por sí sola fijaba el ancho
                    mínimo de la primera columna. ℞ es además la notación que ya
                    usa la rueda, así que las dos vistas dicen lo mismo. La
                    palabra sigue ahí para quien no ve el símbolo.
                  */}
                  {planeta.retrogrado ? (
                    <>
                      {' '}
                      <span aria-hidden="true" className="text-tinta-suave">℞</span>
                      <span className="sr-only">, retrógrado</span>
                    </>
                  ) : null}
                </th>
                <td className="py-2 pr-2 sm:pr-4">
                  <span aria-hidden="true">{GLIFO_SIGNO[signo]}</span>{' '}
                  {NOMBRE_SIGNO[signo]}
                </td>
                {/*
                  `whitespace-nowrap`: «24° 39′» partido en dos líneas se lee
                  como dos datos y descuadra la fila. Cabe entero porque las dos
                  columnas anteriores ya no gastan de más.
                */}
                <td className="py-2 pr-2 tabular-nums whitespace-nowrap sm:pr-4">
                  {grados}° {String(minutos).padStart(2, '0')}′
                </td>
                {!parcial ? (
                  <td className="py-2 pr-2 tabular-nums sm:pr-4">{planeta.casa ?? '—'}</td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
