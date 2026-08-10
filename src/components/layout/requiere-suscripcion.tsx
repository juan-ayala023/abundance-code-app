import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { Tarjeta } from '@/components/layout/tarjeta'
import { getPublicEnv } from '@/lib/env/public'

/**
 * Lo que se ve cuando una sección exige suscripción.
 *
 * Nunca es un callejón sin salida (CLAUDE.md §3.5): siempre hay a dónde ir, y
 * se recuerda que lo ya comprado —la lectura base y la carta— no se ha perdido.
 * Es el momento en que más importa decirlo: quien llega aquí acaba de encontrar
 * una puerta cerrada.
 */
export async function RequiereSuscripcion({ seccion }: { seccion: string }) {
  const landingUrl = getPublicEnv().NEXT_PUBLIC_LANDING_URL
  const t = await getTranslations('suscripcion')

  return (
    <Tarjeta className="flex flex-col gap-5 bg-oro-palido/40">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-light">{t('necesita', { seccion })}</h2>
        <p className="text-sm leading-relaxed text-tinta-suave">
          {t('mensaje')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <a
          href={landingUrl}
          className="rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          {t('continuar')}
        </a>
        <Link href="/lectura-base" className="text-sm underline underline-offset-4">
          {t('volverLectura')}
        </Link>
      </div>
    </Tarjeta>
  )
}
