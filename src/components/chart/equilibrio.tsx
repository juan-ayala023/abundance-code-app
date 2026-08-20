import { getTranslations } from 'next-intl/server'

import { COLOR_ELEMENTO } from '@/components/chart/glifos'
import { balanceDe } from '@/lib/astrology/balance'
import type { Carta } from '@/lib/astrology/types'

/**
 * El reparto de la carta por elementos, y su lectura en una frase.
 *
 * Es de lo primero que mira quien sabe leer una carta y de lo que más se
 * reconoce sin saber: «soy muy de agua» lo entiende cualquiera. Sale de contar
 * los signos de los diez planetas, así que no cuesta nada, no puede
 * equivocarse y no depende del modelo.
 *
 * La barra va antes que la frase a propósito: el dibujo se lee de un vistazo
 * —cuál pesa— y la frase le pone nombre. Al revés, la frase parecería una
 * afirmación suelta y la barra su justificación.
 */
export async function Equilibrio({ carta }: { carta: Carta }) {
  const t = await getTranslations('equilibrio')
  const tElementos = await getTranslations('elementos')

  const balance = balanceDe(carta)

  return (
    <section className="flex w-full flex-col gap-3">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
        {t('titulo')}
      </p>

      {/*
        Una sola barra partida en cuatro, no cuatro barras.

        Lo que importa aquí es la PROPORCIÓN entre elementos, y una barra
        compartida la enseña sin que haya que comparar longitudes de arriba
        abajo. En un teléfono es además la diferencia entre una fila y cuatro.

        Los tramos vacíos no se pintan —`flex-grow` con 0 no ocupa—, y eso ya
        dice algo verdadero: un elemento ausente se ve por su hueco.
      */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-fondo-hondo">
        {balance.elementos.map(({ clave, cuenta, porcentaje }) =>
          cuenta === 0 ? null : (
            <span
              key={clave}
              title={`${tElementos(clave)} · ${cuenta}`}
              style={{ width: `${porcentaje}%`, backgroundColor: COLOR_ELEMENTO[clave] }}
            />
          ),
        )}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {balance.elementos.map(({ clave, cuenta }) => (
          <li
            key={clave}
            className={
              cuenta === 0
                ? 'flex items-center gap-1.5 text-xs text-tinta-tenue'
                : 'flex items-center gap-1.5 text-xs text-tinta-suave'
            }
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: COLOR_ELEMENTO[clave] }}
            />
            {tElementos(clave)} <span className="tabular-nums">{cuenta}</span>
          </li>
        ))}
      </ul>

      {/*
        La frase solo aparece cuando hay algo verdadero que decir. Con empate
        arriba no hay dominante, y con dos elementos vacíos «te falta X» dejaría
        de distinguir nada: en esos casos manda la barra y se calla el texto.
        Ver `balanceDe()`.
      */}
      {balance.elementoDominante ? (
        <p className="text-sm leading-relaxed text-tinta-suave">
          {t('dominante', { elemento: tElementos(balance.elementoDominante) })}
          {balance.elementoAusente ? (
            <> {t('ausente', { elemento: tElementos(balance.elementoAusente) })}</>
          ) : null}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-tinta-suave">{t('repartido')}</p>
      )}
    </section>
  )
}
