'use client'

import { Home, LogOut, MessageCircle, Sparkles, Sun, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cerrarSesion } from '@/app/actions'
import { cn } from '@/lib/utils'

/**
 * Las etiquetas en español van en Mayúsculas Iniciales porque así están en el
 * producto que el usuario ya conoce: «Mi Portal», «Lectura Base», «Guía
 * Personalizada». No es el uso habitual del español, pero aquí funcionan como
 * nombres propios de cada sección, y manda el producto. En inglés esa
 * capitalización es la normal para nombres de sección, así que coincide.
 */
const ENLACES = [
  { href: '/portal', clave: 'portal', Icono: Home },
  { href: '/lectura-base', clave: 'lecturaBase', Icono: Sparkles },
  { href: '/activacion', clave: 'activacion', Icono: Sun },
  { href: '/guia', clave: 'guia', Icono: MessageCircle },
  { href: '/cuenta', clave: 'cuenta', Icono: User },
] as const

export function NavLateral({
  ciclo,
}: {
  ciclo: { dia: number; total: number } | null
}) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <nav aria-label={t('principal')} className="flex h-full flex-col gap-8">
      <ul className="flex flex-col gap-1">
        {ENLACES.map(({ href, clave, Icono }) => {
          const activo = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors',
                  activo
                    ? 'bg-oro-palido font-medium text-oro-hondo'
                    : 'text-tinta-suave hover:bg-fondo-hondo',
                )}
              >
                <Icono size={18} aria-hidden="true" />
                {t(clave)}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-4">
        {/*
          Este recuadro llevaba «de 30 días» en grande, entre el rótulo y la
          frase. Se quitó con el resto de los contadores: era el más insistente
          de todos, porque la barra lateral acompaña al usuario a todas las
          pantallas y le recordaba el plazo en cada una.

          El recuadro se queda sin él. Lo que decía el número lo dice ya la frase
          de abajo, sin ponerle plazo a nada.
        */}
        {ciclo ? (
          <div className="rounded-2xl border border-borde bg-superficie px-4 py-4 text-center">
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              {t('viaje')}
            </p>
            <p className="mt-2 text-xs text-tinta-suave">{t('viajeTexto')}</p>
          </div>
        ) : null}

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-tinta-suave transition-colors hover:bg-fondo-hondo"
          >
            <LogOut size={18} aria-hidden="true" />
            {t('cerrarSesion')}
          </button>
        </form>
      </div>
    </nav>
  )
}
