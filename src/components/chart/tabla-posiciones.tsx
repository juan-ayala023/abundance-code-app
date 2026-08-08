import type { Carta } from '@/lib/astrology/types'
import { gradoEnSigno, signoDe } from '@/lib/astrology/types'

import { GLIFO_CUERPO, GLIFO_SIGNO, NOMBRE_CUERPO, NOMBRE_SIGNO } from './glifos'

/**
 * Las mismas posiciones de la rueda, en texto.
 *
 * No es un extra: un gráfico SVG, por bien etiquetado que esté, no se lee con
 * lector de pantalla ni se consulta con precisión. Aquí están los grados
 * exactos, que en la rueda solo se intuyen.
 */
export function TablaPosiciones({ carta }: { carta: Carta }) {
  const parcial = carta.precision === 'partial'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Posiciones planetarias de la carta natal
        </caption>
        <thead>
          <tr className="border-b border-black/15 text-left dark:border-white/20">
            <th scope="col" className="py-2 pr-4 font-medium">Planeta</th>
            <th scope="col" className="py-2 pr-4 font-medium">Signo</th>
            <th scope="col" className="py-2 pr-4 font-medium">Grado</th>
            {!parcial ? (
              <th scope="col" className="py-2 pr-4 font-medium">Casa</th>
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
                className="border-b border-black/8 dark:border-white/10"
              >
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  <span aria-hidden="true">{GLIFO_CUERPO[planeta.cuerpo]}</span>{' '}
                  {NOMBRE_CUERPO[planeta.cuerpo]}
                  {planeta.retrogrado ? (
                    <span className="opacity-70"> (retrógrado)</span>
                  ) : null}
                </th>
                <td className="py-2 pr-4">
                  <span aria-hidden="true">{GLIFO_SIGNO[signo]}</span>{' '}
                  {NOMBRE_SIGNO[signo]}
                </td>
                <td className="py-2 pr-4 tabular-nums">
                  {grados}° {String(minutos).padStart(2, '0')}′
                </td>
                {!parcial ? (
                  <td className="py-2 pr-4 tabular-nums">{planeta.casa ?? '—'}</td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
