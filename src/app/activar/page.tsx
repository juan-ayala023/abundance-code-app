import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { resolveAccess } from '@/lib/access/entitlement'
import { safeNextPath } from '@/lib/validation/schemas'

export const metadata: Metadata = {
  title: 'Activar tu acceso · Abundance Code',
}

/** Mensajes accionables. El detalle técnico queda en el log del servidor. */
const MENSAJES_DE_ERROR: Record<string, string> = {
  cancelado: 'Cancelaste el inicio de sesión. Puedes volver a intentarlo cuando quieras.',
  sin_codigo: 'Ese enlace de acceso ya no es válido. Entra con Google desde aquí.',
  sesion: 'No pudimos completar tu sesión. Vuelve a intentarlo.',
}

export default async function ActivarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === 'string' ? params.next : null)

  // Quien ya tiene acceso no necesita esta pantalla.
  const access = await resolveAccess()
  if (access.kind === 'concedido') redirect(next)
  if (access.kind === 'sin-compra') redirect('/activar/vincular')
  if (access.kind === 'inactivo') redirect('/activar/vincular?estado=inactivo')

  const error = typeof params.error === 'string' ? MENSAJES_DE_ERROR[params.error] : undefined

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Activar tu acceso</h1>
        <p className="opacity-80">
          Entra con la cuenta de Google asociada al correo que usaste al comprar.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      <GoogleSignInButton next={next} />

      <p className="text-sm opacity-70">
        Si compraste con un correo distinto al de tu cuenta de Google, entra igualmente:
        te ayudamos a vincular la compra en el siguiente paso.
      </p>
    </main>
  )
}
