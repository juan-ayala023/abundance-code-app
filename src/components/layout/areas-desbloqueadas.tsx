import { ChevronRight, Compass, DollarSign, GitBranch, Heart, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { GLIFO_CUERPO, GLIFO_SIGNO } from '@/components/chart/glifos'
import { AREAS, anclaDeArea, type AnclaDeArea } from '@/lib/astrology/areas'
import type { Carta } from '@/lib/astrology/types'

import { Tarjeta } from './tarjeta'

/**
 * Las cinco áreas que cubre la lectura, cada una anclada a su lugar en la carta
 * de quien mira y abierta hacia la guía.
 *
 * Antes era un friso: cinco iconos con su nombre, iguales para todo el mundo,
 * sin nada que pulsar. Ocupaba el ancho entero del portal para no decir nada de
 * nadie. Ahora hace dos trabajos, y ninguno de los dos cuesta una llamada al
 * modelo:
 *
 *  1. **Dice dónde cae cada área en SU carta.** «Relaciones y vínculos · Casa 7
 *     en Sagitario.» Sale de la carta ya calculada (ver `areas.ts`), así que es
 *     exacto y distinto para cada persona.
 *
 *  2. **Lleva a la guía con la pregunta puesta.** Es el paso que faltaba: la
 *     guía es lo más vivo del producto —tres consultas al día— y hasta ahora
 *     había que llegar a ella con la pregunta ya pensada, delante de un cuadro
 *     de texto en blanco. Ahora cada área es una puerta con su pregunta escrita.
 *
 * Se pasa `?area=` y no la pregunta entera en la URL. La pregunta se resuelve en
 * el servidor desde el diccionario, así que el enlace no puede llevar texto
 * arbitrario hasta un campo que acaba en el prompt del modelo.
 */

const ICONOS: Record<string, LucideIcon> = {
  abundancia: DollarSign,
  decisiones: GitBranch,
  proposito: Compass,
  bloqueos: Lock,
  relaciones: Heart,
}

export async function AreasDesbloqueadas({ carta }: { carta: Carta | null }) {
  const t = await getTranslations('areas')

  return (
    <Tarjeta className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-light">{t('titulo')}</h2>
        <p className="text-sm text-tinta-suave">{t('subtitulo')}</p>
      </div>

      {/*
        Una columna en el teléfono, y no dos.

        Cada área lleva ahora dos líneas de texto —el nombre y el lugar de la
        carta— y son objetos que se pulsan. A dos columnas en 360 px, «Relaciones
        y vínculos» se parte en tres líneas y el área de toque queda por debajo
        de lo que un pulgar acierta con comodidad. En una columna cada fila ocupa
        el ancho entero: se lee de un vistazo y se acierta sin mirar.
      */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {AREAS.map(({ clave, ...area }) => {
          const Icono = ICONOS[clave] ?? Compass
          const ancla = carta ? anclaDeArea(carta, { clave, ...area }) : null

          return (
            <li key={clave}>
              <Link
                href={`/guia?area=${clave}`}
                className="flex h-full items-center gap-4 rounded-2xl border border-borde bg-fondo px-4 py-3.5 transition-colors hover:bg-fondo-hondo"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-oro-claro text-oro"
                >
                  <Icono size={18} />
                </span>

                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{t(clave as never)}</span>
                  {/*
                    Sin carta —o sin ancla resoluble— se queda solo el nombre. No
                    se rellena con un lugar inventado: en un producto cuyo
                    entregable es una interpretación personal, una casa que no es
                    la suya es peor que ninguna.
                  */}
                  {ancla ? (
                    <span className="text-xs text-tinta-suave">
                      <Ancla ancla={ancla} />
                    </span>
                  ) : null}
                </span>

                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="ml-auto shrink-0 text-tinta-tenue"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </Tarjeta>
  )
}

/** «Casa 7 en ♐ Sagitario 12°» o «☿ Mercurio en ♌ Leo 7°». */
async function Ancla({ ancla }: { ancla: AnclaDeArea }) {
  const t = await getTranslations('areas')
  const tSignos = await getTranslations('signos')
  const tCuerpos = await getTranslations('cuerpos')

  const donde =
    ancla.que === 'casa'
      ? t('casa', { numero: ancla.numero ?? 0 })
      : ancla.que === 'medioCielo'
        ? t('medioCielo')
        : tCuerpos(ancla.que)

  return (
    <>
      {/* El glifo solo cuando lo hay: una casa no tiene símbolo propio. */}
      {ancla.que !== 'casa' && ancla.que !== 'medioCielo' ? (
        <span aria-hidden="true" className="text-oro">
          {GLIFO_CUERPO[ancla.que]}{' '}
        </span>
      ) : null}
      {donde} {t('en')} <span aria-hidden="true">{GLIFO_SIGNO[ancla.signo]}</span>{' '}
      {tSignos(ancla.signo)} <span className="tabular-nums">{ancla.grado}°</span>
    </>
  )
}
