import { getTranslations } from 'next-intl/server'

import type { Carta } from '@/lib/astrology/types'
import { gradoEnSigno, signoDe } from '@/lib/astrology/types'
import { cn } from '@/lib/utils'

import { GLIFO_CUERPO, GLIFO_SIGNO } from './glifos'

/**
 * Sol, Luna y Ascendente.
 *
 * Son los tres datos que cualquiera reconoce de su carta, y los únicos que la
 * mayoría sabe decir de memoria. La rueda los contiene, pero para sacarlos de
 * ella hay que saber leerla: quien mira el dibujo por primera vez no distingue
 * el glifo del Sol de los otros nueve. Escritos al lado, la rueda deja de ser
 * un adorno y pasa a ilustrar algo que la persona ya puede leer.
 *
 * Se calculan de la carta guardada, así que **son distintos para cada persona**
 * y no hay ningún texto fijo aquí: si esta pantalla enseñara siempre lo mismo,
 * sería decoración con aspecto de dato.
 */
export async function TrioPrincipal({ carta }: { carta: Carta }) {
  const t = await getTranslations('carta')
  const tSignos = await getTranslations('signos')

  const longitudDe = (cuerpo: 'sol' | 'luna') =>
    carta.planetas.find((planeta) => planeta.cuerpo === cuerpo)?.longitud ?? null

  const FILAS = [
    { clave: 'sol', glifo: GLIFO_CUERPO.sol, longitud: longitudDe('sol') },
    { clave: 'luna', glifo: GLIFO_CUERPO.luna, longitud: longitudDe('luna') },
    /*
     * El Ascendente es el único de los tres que puede faltar: depende de la hora
     * exacta de nacimiento, y sin ella la carta se calcula `partial`. Se deja la
     * fila puesta con su explicación en vez de esconderla — el trío es lo que la
     * gente viene a buscar, y que falte uno sin decir por qué se lee como un
     * fallo de la app y no como un dato que la persona no nos dio.
     */
    { clave: 'ascendente', glifo: 'AC', longitud: carta.ascendente },
  ] as const

  return (
    <dl className="flex w-full flex-col divide-y divide-borde">
      {FILAS.map(({ clave, glifo, longitud }) => (
        <div key={clave} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 sm:gap-4 sm:py-4">
          {/*
            Círculo perfilado y no relleno, como en «Áreas desbloqueadas»: en
            este portal el círculo lleno marca acciones que se pulsan, y esto no
            se pulsa. El «AC» va más pequeño que los glifos porque son dos
            letras y no un símbolo: al mismo cuerpo se salía del círculo.
          */}
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border border-oro-claro text-oro sm:size-11',
              clave === 'ascendente'
                ? 'text-[0.6rem] font-medium tracking-wide sm:text-xs'
                : 'text-base sm:text-xl',
            )}
          >
            {glifo}
          </span>

          <div className="min-w-0">
            <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              {t(clave)}
            </dt>
            <dd className="text-lg font-light sm:text-xl">
              {longitud === null ? (
                <span className="text-sm text-tinta-suave">{t('sinHora')}</span>
              ) : (
                <>
                  <span aria-hidden="true">{GLIFO_SIGNO[signoDe(longitud)]}</span>{' '}
                  {tSignos(signoDe(longitud))}{' '}
                  {/*
                    El grado, en pequeño y al lado. Es lo que distingue dos
                    cartas del mismo signo, y sin él «Cáncer» a secas se parece
                    demasiado al horóscopo de periódico que este producto no es.
                  */}
                  <span className="text-sm tabular-nums text-tinta-suave">
                    {Math.floor(gradoEnSigno(longitud))}°
                  </span>
                </>
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}
