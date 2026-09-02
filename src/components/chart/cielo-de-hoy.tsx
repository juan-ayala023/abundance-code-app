import { getTranslations } from 'next-intl/server'

import { COLOR_ASPECTO, GLIFO_CUERPO, GLIFO_SIGNO } from '@/components/chart/glifos'
import { Tarjeta } from '@/components/layout/tarjeta'
import { cieloDeHoy } from '@/lib/astrology/cielo'
import { aspectosDeTransito } from '@/lib/astrology/transitos'
import { signoDe, type Carta } from '@/lib/astrology/types'

/**
 * El cielo de hoy sobre la carta de esta persona.
 *
 * Es lo único del portal que cambia solo, todos los días, sin que nadie escriba
 * nada ni cueste una llamada al modelo: son los planetas reales de hoy y los
 * ángulos que forman con su carta de nacimiento. La app ya lo calculaba para
 * dárselo a la IA; no se le enseñaba al usuario en ninguna parte.
 *
 * Por qué merece ir arriba, y en el móvil especialmente: un portal de astrología
 * que enseña siempre lo mismo se agota en tres visitas. Esto da una razón real
 * para volver mañana, y es una razón astrológica —no una notificación—: mañana
 * la Luna estará en otro sitio y tocará otro punto de su carta.
 *
 * Cada tránsito lleva debajo una línea que traduce el tecnicismo: qué mueve ese
 * planeta hoy, qué parte de ella toca y si el ángulo suma o roza. Sin eso, «la
 * Luna hace trígono a tu Plutón natal» no le dice nada a quien no sabe leer una
 * carta —que es casi todo el mundo—, y la tarjeta se queda en decoración.
 *
 * **La explicación es del mecanismo, no de su día.** Sale de dos tablas fijas
 * —planeta y aspecto— y sería la misma para cualquier persona con ese tránsito:
 * no cuesta una llamada al modelo ni pretende ser una lectura. Lo que sí está
 * escrito para ella es la activación del día, que está a un clic; por eso esta
 * línea explica el ángulo y se calla lo que significa para su vida.
 */

/**
 * Cuántos tránsitos se enseñan.
 *
 * Tres, y no todos. `aspectosDeTransito()` los devuelve del orbe más cerrado al
 * más abierto, así que los tres primeros son los que de verdad se notan hoy; a
 * partir del cuarto la lista deja de decir «esto es lo de hoy» y pasa a parecer
 * un informe. En un teléfono, además, tres filas caben sin empujar la rueda
 * fuera de la pantalla.
 */
const CUANTOS = 3

export async function CieloDeHoy({ carta }: { carta: Carta }) {
  const t = await getTranslations('cielo')
  const tCuerpos = await getTranslations('cuerpos')
  const tSignos = await getTranslations('signos')
  const tAspectos = await getTranslations('aspectos')
  const tMueve = await getTranslations('cielo.mueve')
  const tTuyo = await getTranslations('cielo.tuyo')
  const tTono = await getTranslations('cielo.tono')

  const cielo = await cieloDeHoy()
  if (!cielo) return null

  const transitos = aspectosDeTransito(carta, cielo).slice(0, CUANTOS)

  /** Dónde está hoy cada planeta del cielo, para decir «la Luna en Escorpio». */
  const signoEnElCielo = (cuerpo: string) => {
    const planeta = cielo.planetas.find((p) => p.cuerpo === cuerpo)
    return planeta ? signoDe(planeta.longitud) : null
  }

  return (
    <Tarjeta className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
          {t('sobretitulo')}
        </p>
        <h2 className="text-xl font-light">{t('titulo')}</h2>
      </div>

      {transitos.length === 0 ? (
        /*
          Días así existen y son bastantes. Decir «hoy el cielo no toca tu carta
          de cerca» es una lectura verdadera del día; dejar la tarjeta vacía o
          esconderla haría pensar que algo no cargó.
        */
        <p className="text-sm leading-relaxed text-tinta-suave">{t('sinAspectos')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {transitos.map((transito, indice) => {
            const signo = signoEnElCielo(transito.transitante)

            return (
              <li
                key={`${transito.transitante}-${transito.natal}-${indice}`}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                {/*
                  El glifo del planeta que se mueve, en el color del aspecto: azul
                  los armónicos, rojo los tensos. Es la convención de siempre en
                  astrología, la misma que ya usa la rueda, así que el color dice
                  algo antes de leer la frase.
                */}
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-lg leading-none"
                  style={{ color: COLOR_ASPECTO[transito.tipo] }}
                >
                  {GLIFO_CUERPO[transito.transitante]}
                </span>

                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm leading-relaxed">
                    {/*
                      «La Luna en Escorpio hace trígono a tu Venus.» Una frase
                      entera y no una tabla: en un teléfono una tabla de cuatro
                      columnas se parte, y además así lo entiende quien no sabe
                      leer una carta todavía.
                    */}
                    <span className="text-tinta">
                      {t('linea', {
                        planeta: tCuerpos(transito.transitante),
                        signo: signo ? tSignos(signo) : '',
                        aspecto: tAspectos(transito.tipo),
                        natal: tCuerpos(transito.natal),
                      })}
                    </span>{' '}
                    {signo ? (
                      <span aria-hidden="true" className="text-tinta-tenue">
                        {GLIFO_SIGNO[signo]}
                      </span>
                    ) : null}
                  </p>

                  {/*
                    Y debajo, en gris y más pequeño, la misma frase sin jerga:
                    «El ánimo del día y tu fondo más profundo encajan: hoy eso
                    sale sin esfuerzo.» El tamaño dice lo que es —una nota al pie
                    del hecho, no otro hecho— y deja que quien ya sabe leer la
                    carta se salte la línea de un vistazo.
                  */}
                  <p className="text-xs leading-relaxed text-tinta-suave">
                    {t('explicacion', {
                      mueve: tMueve(transito.transitante),
                      tuyo: tTuyo(transito.natal),
                      tono: tTono(transito.tipo),
                    })}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-tinta-tenue">{t('pie')}</p>
    </Tarjeta>
  )
}
