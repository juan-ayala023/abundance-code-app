import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Superficie base de todo el portal. */
export function Tarjeta({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-borde bg-superficie p-6 shadow-[0_1px_2px_rgba(60,53,45,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Insignia circular dorada, el motivo de iconos del portal. */
export function Insignia({ Icono }: { Icono: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-oro-claro to-oro text-white"
    >
      <Icono size={20} />
    </span>
  )
}

/**
 * Tarjeta con icono, título y acción.
 *
 * `href` es opcional a propósito: las secciones que aún no existen se muestran
 * sin enlace y con su estado real, en vez de con un enlace que no lleva a
 * ninguna parte.
 */
export function TarjetaAccion({
  Icono,
  sobretitulo,
  titulo,
  descripcion,
  href,
  accion,
  pendiente,
}: {
  Icono: LucideIcon
  sobretitulo?: string
  titulo: string
  descripcion: string
  href?: string
  accion?: string
  pendiente?: string
}) {
  return (
    <Tarjeta className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <Insignia Icono={Icono} />
        <div className="min-w-0">
          {sobretitulo ? (
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              {sobretitulo}
            </p>
          ) : null}
          <h2 className="text-xl font-light">{titulo}</h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-tinta-suave">{descripcion}</p>

      {href && accion ? (
        <Link
          href={href}
          className="mt-auto text-sm font-medium text-oro-hondo underline-offset-4 hover:underline"
        >
          {accion} →
        </Link>
      ) : null}

      {pendiente ? (
        <p className="mt-auto rounded-xl bg-fondo-hondo px-3 py-2 text-xs text-tinta-suave">
          {pendiente}
        </p>
      ) : null}
    </Tarjeta>
  )
}
