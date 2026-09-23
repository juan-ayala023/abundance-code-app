'use client'

import { Plus, RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Estado = 'listo' | 'escribiendo' | 'error' | 'suscripcion'

/**
 * Ofrece añadir a una lectura ya escrita las secciones que se crearon después.
 *
 * El 23 de septiembre de 2026 la lectura pasó de siete secciones a diez. Quien
 * compró antes tiene una lectura completa —la suya— a la que le faltan tres
 * apartados nuevos, y hay dos formas de resolverlo: escribírselas sin avisar al
 * entrar, o preguntar. Se pregunta, por dos razones: reescribir sobre lo que
 * alguien ya leyó sin pedirlo no se hace, y generar durante el render es
 * exactamente lo que se quitó de la activación.
 *
 * **No se dispara solo.** A diferencia de la activación de hoy, esto no es algo
 * que la persona esté esperando: su lectura ya está ahí y se lee entera.
 */
export function AmpliarLectura({
  cuantas,
  titulos,
  ampliar,
}: {
  /** Cuántas secciones faltan. */
  cuantas: number
  /** Sus nombres, ya traducidos por la página. */
  titulos: string[]
  ampliar: () => Promise<{ listo: boolean; motivo?: 'suscripcion' }>
}) {
  const t = useTranslations('lectura.ampliar')
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('listo')

  async function pedir() {
    setEstado('escribiendo')
    try {
      const { listo, motivo } = await ampliar()
      if (listo) {
        router.refresh()
        return
      }
      setEstado(motivo === 'suscripcion' ? 'suscripcion' : 'error')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'suscripcion') {
    return (
      <p className="rounded-2xl border border-borde bg-superficie px-5 py-4 text-sm leading-relaxed">
        {t('requiereSuscripcion')}
      </p>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-oro-claro bg-oro-palido/50 px-5 py-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-light">{t('titulo', { n: cuantas })}</h2>
        <p className="max-w-prose text-sm leading-relaxed text-tinta-suave">
          {t('texto', { secciones: titulos.join(' · ') })}
        </p>
      </div>

      {estado === 'error' ? (
        <p role="alert" className="text-sm">
          {t('error')}
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={pedir}
          disabled={estado === 'escribiendo'}
          className="inline-flex items-center gap-2 rounded-full bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo disabled:opacity-60"
        >
          {estado === 'escribiendo' ? (
            <RotateCw size={17} aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus size={17} aria-hidden="true" />
          )}
          {estado === 'escribiendo' ? t('escribiendo') : estado === 'error' ? t('reintentar') : t('boton')}
        </button>
      </div>
    </section>
  )
}
