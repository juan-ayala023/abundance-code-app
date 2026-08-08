import Link from 'next/link'

/** Encabezado común de las pantallas del portal. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  volver,
}: {
  titulo: string
  descripcion?: string
  volver?: { href: string; texto: string }
}) {
  return (
    <header className="flex flex-col gap-3">
      {volver ? (
        <Link
          href={volver.href}
          className="text-sm text-oro-hondo underline-offset-4 hover:underline"
        >
          ← {volver.texto}
        </Link>
      ) : null}

      <h1 className="text-4xl font-light tracking-tight">{titulo}</h1>

      {descripcion ? (
        <p className="max-w-prose text-tinta-suave">{descripcion}</p>
      ) : null}
    </header>
  )
}

/**
 * Aviso de sección aún no conectada.
 *
 * Se usa en todas las pantallas cuyo contenido depende de la capa de IA, que
 * todavía no existe. Decirlo así evita la alternativa mala: rellenar la
 * pantalla con texto de muestra que el usuario podría tomar por suyo.
 */
export function AvisoPendiente({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
    >
      {children}
    </p>
  )
}
