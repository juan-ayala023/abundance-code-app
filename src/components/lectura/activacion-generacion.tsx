'use client'

import { RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { escribirActivacion } from '@/app/(app)/activacion/actions'

type Estado = 'escribiendo' | 'error' | 'suscripcion' | 'sin-carta'

/**
 * Prepara la activación de hoy y espera con un estado visible.
 *
 * Sustituye a lo que había: la página generaba durante el render y, al fallar,
 * pintaba los cinco títulos sin texto. Quien lo veía entendía que su lectura
 * estaba vacía, no que algo había fallado. Ahora hay tres estados —preparando,
 * error con botón, sin acceso— y ninguno se parece a una lectura.
 *
 * Se lanza solo al montar: la activación es de hoy y se espera encontrarla
 * hecha; que haya que pedirla es la excepción, no una decisión del usuario.
 */
export function ActivacionGeneracion({ tieneCarta }: { tieneCarta: boolean }) {
  const t = useTranslations('activacion')
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>(tieneCarta ? 'escribiendo' : 'sin-carta')
  const [intento, setIntento] = useState(0)
  const ultimoLanzado = useRef(-1)

  useEffect(() => {
    if (!tieneCarta) return
    // En desarrollo React monta dos veces; sin esto se pediría dos veces.
    if (ultimoLanzado.current === intento) return
    ultimoLanzado.current = intento

    let vigente = true
    setEstado('escribiendo')

    escribirActivacion()
      .then(({ listo, motivo }) => {
        if (!vigente) return
        if (listo) {
          router.refresh()
          return
        }
        setEstado(motivo === 'suscripcion' ? 'suscripcion' : motivo === 'sin-carta' ? 'sin-carta' : 'error')
      })
      .catch(() => {
        if (vigente) setEstado('error')
      })

    return () => {
      vigente = false
    }
  }, [router, intento, tieneCarta])

  if (estado === 'sin-carta') {
    return <p className="rounded-2xl border border-borde bg-superficie px-5 py-4 text-sm">{t('sinCarta')}</p>
  }

  if (estado === 'suscripcion') {
    return <p className="rounded-2xl border border-borde bg-superficie px-5 py-4 text-sm">{t('requiereSuscripcion')}</p>
  }

  if (estado === 'error') {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-oro-claro bg-oro-palido/60 px-5 py-5">
        <p role="alert" className="max-w-prose leading-relaxed">
          {t('noLista')}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-full bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
          >
            <RotateCw size={17} aria-hidden="true" />
            {t('reintentar')}
          </button>
          <Link
            href="/portal"
            className="inline-flex items-center rounded-full border border-oro-claro px-6 py-3 font-medium transition-colors hover:bg-oro-palido"
          >
            {t('volverAlPortal')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5" aria-busy="true">
      <p role="status" aria-live="polite" className="text-sm text-tinta-suave">
        {t('preparando')}
      </p>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-oro-palido/60" />
        ))}
      </div>
    </section>
  )
}
