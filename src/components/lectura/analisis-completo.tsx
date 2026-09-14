'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Tarjeta } from '@/components/layout/tarjeta'

/**
 * Desarrollo largo de la lectura, plegado por defecto.
 *
 * Se usa `aria-expanded` y `aria-controls` en lugar de un `<details>` para
 * poder darle al disparador la forma de botón de la marca sin pelearse con el
 * estilo por defecto del navegador.
 */
export function AnalisisCompleto({ texto }: { texto: string }) {
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
        <Tarjeta id="analisis-completo" className="w-full">
          <div className="flex flex-col gap-4 leading-relaxed text-tinta-suave">
            {texto.split('\n\n').map((parrafo, indice) => (
              <p key={indice}>{parrafo}</p>
            ))}
          </div>
        </Tarjeta>
      ) : null}
    </div>
  )
}
