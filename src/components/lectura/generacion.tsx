'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { generarLectura } from '@/app/(app)/generando/actions'

type Estado = 'generando' | 'lista' | 'error'

/**
 * Dispara la generación de la lectura y espera a que termine.
 *
 * La espera es real —del orden de un minuto— y por eso esta pantalla existe.
 * Lo que NO se hace es simular avance con un temporizador: mientras se genera
 * el progreso es indeterminado y se dice así, en vez de fingir un porcentaje
 * que no significa nada.
 */
export function Generacion({ pasosTotales }: { pasosTotales: number }) {
  const t = useTranslations('generando')
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('generando')
  const lanzada = useRef(false)

  useEffect(() => {
    // En desarrollo React monta dos veces; sin esto se pediría la generación
    // dos veces y se pagaría el doble.
    if (lanzada.current) return
    lanzada.current = true

    let vigente = true

    generarLectura()
      .then(({ lista }) => {
        if (!vigente) return

        if (lista) {
          setEstado('lista')
          router.replace('/lectura-base')
        } else {
          setEstado('error')
        }
      })
      .catch(() => {
        if (vigente) setEstado('error')
      })

    return () => {
      vigente = false
    }
  }, [router])

  if (estado === 'error') {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
      >
        <strong>{t('error')}</strong> {t('errorTexto')}
      </div>
    )
  }

  return (
    <p role="status" aria-live="polite" className="text-center text-sm text-tinta-suave">
      {estado === 'lista'
        ? t('lista')
        : t('esperando', { total: pasosTotales })}
    </p>
  )
}
