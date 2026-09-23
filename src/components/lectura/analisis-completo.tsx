'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Tarjeta } from '@/components/layout/tarjeta'

/**
 * El contexto astrológico de la lectura, plegado por defecto.
 *
 * Es el último punto del orden que pidió el documento del 23 de septiembre:
 * «contexto astrológico técnico desplegable». Dentro van las dos cosas que lo
 * forman —el desarrollo largo que escribe el modelo y la tabla de posiciones de
 * la que sale— en un solo desplegable. Antes eran dos botones seguidos que
 * prometían lo mismo.
 *
 * Se usa `aria-expanded` y `aria-controls` en lugar de un `<details>` para
 * poder darle al disparador la forma de botón de la marca sin pelearse con el
 * estilo por defecto del navegador.
 */
export function AnalisisCompleto({
  texto,
  children,
}: {
  /** Puede faltar: una lectura anterior a este bloque no siempre lo trae. */
  texto?: string
  /** La tabla de posiciones, si hay carta. */
  children?: React.ReactNode
}) {
  const t = useTranslations('lectura')
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex flex-col items-center gap-5">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-controls="analisis-completo"
        className="inline-flex items-center gap-2 rounded-full bg-oro px-7 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
      >
        {/*
          Antes: «Leer análisis completo». Ahora la lectura deja el detalle
          astrológico aquí a propósito —una referencia por sección arriba, y el
          recorrido completo de colocaciones y aspectos debajo—, así que el
          botón dice lo que hay detrás.
        */}
        {abierto ? t('ocultarContexto') : t('verContexto')}
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={abierto ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>

      {abierto ? (
        <Tarjeta id="analisis-completo" className="flex w-full flex-col gap-6">
          {texto ? (
            <div className="flex flex-col gap-4 leading-relaxed text-tinta-suave">
              {texto.split('\n\n').map((parrafo, indice) => (
                <p key={indice}>{parrafo}</p>
              ))}
            </div>
          ) : null}
          {children}
        </Tarjeta>
      ) : null}
    </div>
  )
}
