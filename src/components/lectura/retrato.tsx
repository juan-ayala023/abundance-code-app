import { Sparkles, Waypoints } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { GLIFO_CUERPO, GLIFO_SIGNO } from '@/components/chart/glifos'
import { Tarjeta } from '@/components/layout/tarjeta'
import type { Carta } from '@/lib/astrology/types'
import { gradoEnSigno, signoDe } from '@/lib/astrology/types'
import { SECCIONES_RETRATO, type Retrato } from '@/lib/lectura/schemas'

/**
 * El retrato de la carta, sección a sección.
 *
 * La forma de cada sección es la petición del cliente hecha maquetación: el
 * titular es experiencial —«Tu forma de ser»— y encima, en pequeño, va la
 * posición real: «☉ Sol en Cáncer 24°». Así el texto puede hablar de la persona
 * sin gastar su primera frase en recitar un dato, y la astrología de la que sale
 * queda igualmente a la vista de quien quiera comprobarla.
 *
 * **Esa línea la calcula esta pantalla, no el modelo.** Sale de la carta
 * guardada, así que no puede contradecir a la tabla de posiciones que hay justo
 * encima ni inventarse un grado. Es la misma frontera de `describirCarta()`: la
 * IA interpreta, la astronomía la pone el servidor.
 */
export async function RetratoDeCarta({
  retrato,
  carta,
}: {
  retrato: Retrato
  carta: Carta
}) {
  const t = await getTranslations('retrato')
  const tSignos = await getTranslations('signos')

  const longitudDe = (clave: string, cuerpo: string | null) => {
    if (clave === 'ascendente') return carta.ascendente
    if (!cuerpo) return null
    return carta.planetas.find((planeta) => planeta.cuerpo === cuerpo)?.longitud ?? null
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-light tracking-tight lg:text-4xl">{t('titulo')}</h2>
        <p className="max-w-2xl leading-relaxed text-tinta-suave">{t('descripcion')}</p>
      </header>

      <Tarjeta className="bg-oro-palido/40">
        {/* `max-w-prose`: la apertura es prosa suelta y a 1280 px daría líneas
            de 180 caracteres. */}
        <p className="max-w-prose text-lg leading-relaxed text-tinta-suave">
          {retrato.apertura}
        </p>
      </Tarjeta>

      {/*
        Dos columnas a partir de `md` y no tres: son párrafos de unas cien
        palabras, y a tres columnas en 1280 px cada una queda tan estrecha que el
        texto se parte en líneas de cinco palabras.
      */}
      <div className="grid gap-5 md:grid-cols-2">
        {SECCIONES_RETRATO.map(({ clave, cuerpo }) => {
          const texto = retrato[clave]

          /*
           * `ascendente` es el único que puede faltar, y falta entero: quien no
           * dio su hora de nacimiento no tiene Ascendente que interpretar. Se
           * omite la tarjeta en vez de dejarla vacía; el aviso de que la carta
           * es parcial ya está arriba, junto a la rueda.
           */
          if (!texto) return null

          const longitud = longitudDe(clave, cuerpo)

          return (
            <Tarjeta key={clave} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
                  <Marca clave={clave} cuerpo={cuerpo} />
                  {longitud === null ? (
                    t(`marcas.${clave}` as never)
                  ) : (
                    <>
                      {/* «Sol en Cáncer 24°» — el dato, en pequeño y arriba. */}
                      {t(`marcas.${clave}` as never)}{' '}
                      <span aria-hidden="true">{GLIFO_SIGNO[signoDe(longitud)]}</span>{' '}
                      {tSignos(signoDe(longitud))}{' '}
                      <span className="tabular-nums">
                        {Math.floor(gradoEnSigno(longitud))}°
                      </span>
                    </>
                  )}
                </p>
                <h3 className="text-xl font-light">{t(`titulos.${clave}` as never)}</h3>
              </div>

              <p className="leading-relaxed text-tinta-suave">{texto}</p>
            </Tarjeta>
          )
        })}
      </div>
    </section>
  )
}

/**
 * El símbolo de la sección.
 *
 * Los planetas llevan su glifo de siempre, que es el mismo que pinta la rueda.
 * Las dos secciones que no cuelgan de un planeta —habilidades y nudo— llevan
 * icono en vez de glifo: inventarles un símbolo astrológico sería fingir una
 * correspondencia que no existe.
 */
function Marca({ clave, cuerpo }: { clave: string; cuerpo: string | null }) {
  if (cuerpo) {
    return (
      <span aria-hidden="true" className="text-base text-oro">
        {GLIFO_CUERPO[cuerpo as keyof typeof GLIFO_CUERPO]}
      </span>
    )
  }

  if (clave === 'ascendente') {
    return (
      <span aria-hidden="true" className="text-oro">
        AC
      </span>
    )
  }

  const Icono = clave === 'habilidades' ? Sparkles : Waypoints
  return <Icono size={14} aria-hidden="true" className="text-oro" />
}
