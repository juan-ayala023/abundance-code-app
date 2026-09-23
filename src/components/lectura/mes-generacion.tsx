'use client'

import { CalendarDays, RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { escribirMes } from '@/app/(app)/activacion/actions'

type Estado = 'inicial' | 'escribiendo' | 'error' | 'suscripcion' | 'sin-carta'

/**
 * Pide el pronóstico del periodo y espera con un estado visible.
 *
 * Aquí no se lanza solo al montar, a diferencia del retrato: el pronóstico
 * cuesta bastante más (31 cálculos del cielo y un texto largo) y dura un mes.
 * Que lo dispare un clic evita escribir un periodo entero a quien solo pasaba
 * por la pantalla, y deja claro qué se va a hacer antes de hacerlo.
 */
export function MesGeneracion({ tieneCarta }: { tieneCarta: boolean }) {
  const t = useTranslations('mes')
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>(tieneCarta ? 'inicial' : 'sin-carta')

  const pedir = async () => {
    setEstado('escribiendo')
    try {
      const { listo, motivo } = await escribirMes()
      if (listo) {
        router.refresh()
        return
      }
      setEstado(motivo === 'suscripcion' ? 'suscripcion' : motivo === 'sin-carta' ? 'sin-carta' : 'error')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'sin-carta') {
    return <p className="rounded-2xl border border-borde bg-superficie px-5 py-4 text-sm">{t('sinCarta')}</p>
  }

  if (estado === 'suscripcion') {
    return <p className="rounded-2xl border border-borde bg-superficie px-5 py-4 text-sm">{t('requiereSuscripcion')}</p>
  }

  if (estado === 'escribiendo') {
    return (
      <section className="flex flex-col gap-5" aria-busy="true">
        <p role="status" aria-live="polite" className="text-sm text-tinta-suave">
          {t('escribiendo')}
        </p>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-oro-palido/60" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl border border-borde bg-superficie px-5 py-6">
      {estado === 'error' ? (
        <p role="alert" className="text-sm text-[#a8503c]">
          {t('noDisponible')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-light">{t('aunNo')}</h2>
          <p className="max-w-prose text-sm leading-relaxed text-tinta-suave">{t('queEs')}</p>
        </div>
      )}

      <button
        type="button"
        onClick={pedir}
        className="inline-flex items-center gap-2 rounded-full bg-oro px-7 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
      >
        {estado === 'error' ? <RotateCw size={17} aria-hidden="true" /> : <CalendarDays size={17} aria-hidden="true" />}
        {estado === 'error' ? t('reintentar') : t('escribir')}
      </button>
    </section>
  )
}
