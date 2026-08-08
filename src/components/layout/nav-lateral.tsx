'use client'

import { Home, LogOut, MessageCircle, Sparkles, Sun, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cerrarSesion } from '@/app/actions'
import { cn } from '@/lib/utils'

const ENLACES = [
  { href: '/portal', etiqueta: 'Mi portal', Icono: Home },
  { href: '/lectura-base', etiqueta: 'Lectura base', Icono: Sparkles },
  { href: '/activacion', etiqueta: 'Activación de hoy', Icono: Sun },
  { href: '/guia', etiqueta: 'Guía personalizada', Icono: MessageCircle },
  { href: '/cuenta', etiqueta: 'Mi cuenta', Icono: User },
] as const

export function NavLateral({
  ciclo,
}: {
  ciclo: { dia: number; total: number } | null
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="Navegación principal" className="flex h-full flex-col gap-8">
      <ul className="flex flex-col gap-1">
        {ENLACES.map(({ href, etiqueta, Icono }) => {
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
                {etiqueta}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-4">
        {ciclo ? (
          <div className="rounded-2xl border border-borde bg-superficie px-4 py-4 text-center">
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              Tu viaje
            </p>
            <p className="mt-1 text-xl font-light">de {ciclo.total} días</p>
            <p className="mt-2 text-xs text-tinta-suave">
              Estás construyendo tu nueva realidad día a día.
            </p>
          </div>
        ) : null}

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-tinta-suave transition-colors hover:bg-fondo-hondo"
          >
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  )
}
