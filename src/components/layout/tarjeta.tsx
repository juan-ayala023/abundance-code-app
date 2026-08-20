import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Superficie base de todo el portal.
 *
 * El relleno es menor por debajo de `sm`. Con `p-7` fijo, una tarjeta en una
 * pantalla de 390 px se quedaba con 56 px de relleno propio más los 32 del
 * contenedor: 88 px de 390, casi una cuarta parte de la pantalla sin contenido.
 * Eso es lo que dejaba la tabla de posiciones sin sitio.
 */
export function Tarjeta({
  children,
  className,
  id,
}: {
  /**
   * Opcional: una tarjeta vacía es el hueco que ocupará la que aún se está
   * cargando. La usa el esqueleto del retrato en `/carta`.
   */
  children?: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-3xl border border-borde bg-superficie p-5 sm:p-7 shadow-[0_1px_3px_rgba(60,53,45,0.05),0_8px_24px_-12px_rgba(60,53,45,0.10)]',
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
  recorte,
  href,
  accion,
  pendiente,
}: {
  Icono: LucideIcon
  sobretitulo?: string
  titulo: string
  /** Opcional: una tarjeta cuyo contenido aún no existe solo lleva `pendiente`. */
  descripcion?: string
  /** Limita la descripción a seis líneas visibles. Para textos largos. */
  recorte?: boolean
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

      {/*
        `recorte` limita las líneas VISIBLES, no el texto: el párrafo entero
        sigue en el DOM, así que un lector de pantalla lo lee completo y el
        enlace de debajo lleva a la versión larga. Se usa para el resumen de la
        lectura, que mide unas 90 palabras y descuadraría la fila de tarjetas.
      */}
      {descripcion ? (
        <p
          className={cn(
            'text-sm leading-relaxed text-tinta-suave',
            recorte ? 'line-clamp-6' : undefined,
          )}
        >
          {descripcion}
        </p>
      ) : null}

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
