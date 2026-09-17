'use client'

import { RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { escribirRetrato } from '@/app/(app)/carta/actions'

type Estado = 'escribiendo' | 'listo' | 'error' | 'suscripcion'

/**
 * Pide el retrato al servidor y espera con un estado visible.
 *
 * Mismo patrón que `Generacion` (la lectura base): la página ya está cargada
 * —rueda y tabla a la vista— y esto ocupa solo el hueco del retrato. Si falla,
 * hay botón; si no hay suscripción, se dice. El servidor no escribe dos veces.
 */
export function RetratoGeneracion() {
  const t = useTranslations('retrato')
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('escribiendo')
  const [intento, setIntento] = useState(0)
  const ultimoLanzado = useRef(-1)

  useEffect(() => {
    if (ultimoLanzado.current === intento) return
    ultimoLanzado.current = intento
    let vigente = true
    setEstado('escribiendo')

    escribirRetrato()
      .then(({ listo, motivo }) => {
        if (!vigente) return
        if (listo) {
          setEstado('listo')
          router.refresh()
        } else {
          setEstado(motivo === 'suscripcion' ? 'suscripcion' : 'error')
        }
      })
      .catch(() => {
        if (vigente) setEstado('error')
      })

    return () => {
      vigente = false
    }
  }, [router, intento])

  if (estado === 'suscripcion') {
    return <p className="rounded-2xl border border-borde bg-superficie px-5 py-4 text-sm">{t('requiereSuscripcion')}</p>
  }

  if (estado === 'error') {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-5 py-4 text-sm">
          {t('noDisponible')}
        </p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-full bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          <RotateCw size={17} aria-hidden="true" />
          {t('reintentar')}
        </button>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-5" aria-busy="true">
      <p role="status" aria-live="polite" className="text-sm text-tinta-suave">
        {t('escribiendo')}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-oro-palido/60" />
        ))}
      </div>
    </section>
  )
}
