'use client'

import { RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Lo que se ve si una pantalla del portal revienta.
 *
 * Sin esto, Next enseña «Application error: a client-side exception has
 * occurred» en inglés y en crudo. Le pasó a Andrea (17 sept 2026) al enviar una
 * consulta a la guía con un corte de red: la respuesta se había guardado, pero
 * la pantalla técnica no lo decía y parecía que se había perdido todo.
 *
 * Aquí se explica en el idioma de la persona, se recuerda que lo guardado sigue
 * ahí y se ofrece recargar —que es lo que recupera la respuesta del historial—.
 */
export default function ErrorPantalla({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorPantalla')

  useEffect(() => {
    console.error('[portal] error de pantalla', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div role="alert" className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="opacity-80">{t('texto')}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-oro px-7 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          <RotateCw size={17} aria-hidden="true" />
          {t('reintentar')}
        </button>
        <Link
          href="/portal"
          className="inline-flex items-center justify-center rounded-full border border-oro-claro px-7 py-3 font-medium transition-colors hover:bg-oro-palido/60"
        >
          {t('portal')}
        </Link>
      </div>
    </main>
  )
}
