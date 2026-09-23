import { getTranslations } from 'next-intl/server'

import { Tarjeta } from '@/components/layout/tarjeta'
import { casasDe } from '@/lib/astrology/casas'
import type { Carta } from '@/lib/astrology/types'
import { gradoEnSigno, signoDe } from '@/lib/astrology/types'
import type { Idioma } from '@/i18n/idioma'

import { GLIFO_CUERPO, GLIFO_SIGNO } from './glifos'

/**
 * Las doce casas, explicadas y plegadas.
 *
 * La revisión del 23 de septiembre pidió las **doce**, no cinco, y en acordeón
 * para que la página no se haga interminable. Se cumple con `<details>` nativo:
 * doce acordeones con estado propio serían doce componentes de cliente y un
 * puñado de JavaScript para algo que el navegador ya sabe hacer, con su
 * teclado y su lector de pantalla incluidos.
 *
 * El texto de cada casa es fijo y sale de los diccionarios. Es una explicación
 * —qué es la casa 8— y no una interpretación de nadie, así que no pasa por el
 * modelo: no cuesta, no falla y no puede alucinar. Lo personal es la línea de
 * arriba: en qué signo empieza la casa y qué planetas hay dentro, que es dato
 * de la carta.
 *
 * Sin hora de nacimiento **no hay casas**. En ese caso se explican igual las
 * doce —siguen siendo lo que son— y se dice por qué no llevan signo, en vez de
 * enseñar doce casas de relleno que la persona leería como suyas.
 */
export async function DoceCasas({ carta, idioma }: { carta: Carta; idioma: Idioma }) {
  const t = await getTranslations('casas')
  const tSignos = await getTranslations('signos')
  const tCuerpos = await getTranslations('cuerpos')

  const casas = casasDe(carta)
  const textos = t.raw('lista') as { nombre: string; texto: string }[]

  return (
    <Tarjeta className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-light">{t('titulo')}</h2>
        <p className="max-w-prose text-sm leading-relaxed text-tinta-suave">{t('descripcion')}</p>
      </div>

      {!casas ? (
        <p className="rounded-2xl border border-oro-claro bg-oro-palido/50 px-4 py-3 text-sm leading-relaxed">
          {t('sinHora')}
        </p>
      ) : null}

      <ul className="flex flex-col divide-y divide-borde border-y border-borde">
        {textos.map((texto, indice) => {
          const casa = casas?.[indice]

          return (
            <li key={indice}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5 transition-colors hover:text-oro-hondo">
                  {/* El número, en el mismo círculo dorado que el resto del portal. */}
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-oro-claro text-xs text-oro-hondo"
                  >
                    {indice + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
                      {t('numero', { n: indice + 1 })}
                    </span>
                    <span className="block font-light">{texto.nombre}</span>
                  </span>

                  {casa ? (
                    <span className="flex shrink-0 items-center gap-2 text-sm text-tinta-suave">
                      <span aria-hidden="true" className="text-base">
                        {GLIFO_SIGNO[casa.signo]}
                      </span>
                      <span className="hidden sm:inline">{tSignos(casa.signo)}</span>
                      {casa.planetas.length > 0 ? (
                        <span aria-hidden="true" className="text-base text-oro-hondo">
                          {casa.planetas.map((planeta) => GLIFO_CUERPO[planeta.cuerpo]).join(' ')}
                        </span>
                      ) : null}
                    </span>
                  ) : null}

                  {/* Gira al abrirse. `+` y `−` y no un icono: es texto, escala con la letra. */}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-tinta-tenue transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>

                <div className="flex flex-col gap-2 pb-5 pl-11 pr-1">
                  <p className="max-w-prose leading-relaxed text-tinta-suave">{texto.texto}</p>

                  {casa ? (
                    /* El detalle técnico, en pequeño: está para quien lo busca. */
                    <p className="text-sm text-tinta-tenue">
                      {t('cuspide', { grado: casa.grado, signo: tSignos(casa.signo) })}
                      {casa.signosSiguientes.length > 0
                        ? ` · ${t('recorre', {
                            signos: enumerar(
                              casa.signosSiguientes.map((signo) => tSignos(signo)),
                              idioma,
                            ),
                          })}`
                        : ''}
                      {' · '}
                      {casa.planetas.length > 0
                        ? t('conPlanetas', {
                            planetas: enumerar(
                              casa.planetas.map(
                                (planeta) =>
                                  `${tCuerpos(planeta.cuerpo)} (${Math.floor(
                                    gradoEnSigno(planeta.longitud),
                                  )}° ${tSignos(signoDe(planeta.longitud))})`,
                              ),
                              idioma,
                            ),
                          })
                        : t('sinPlanetas')}
                    </p>
                  ) : null}
                </div>
              </details>
            </li>
          )
        })}
      </ul>

      {casas ? (
        <p className="text-xs text-tinta-tenue">
          {t('sistema', { sistema: t(`sistemas.${carta.sistemaCasas}` as never) })}
        </p>
      ) : null}
    </Tarjeta>
  )
}

/**
 * «Marte, Plutón y la Luna», con la coma y la conjunción del idioma.
 *
 * `Intl.ListFormat` existe justamente para esto: en inglés la lista lleva coma
 * antes del «and» y en español no, y juntar los trozos con `join(', ')` deja un
 * «Marte, Plutón, la Luna» que se lee como una tabla, no como una frase.
 */
function enumerar(partes: string[], idioma: Idioma): string {
  try {
    return new Intl.ListFormat(idioma, { style: 'long', type: 'conjunction' }).format(partes)
  } catch {
    return partes.join(', ')
  }
}
