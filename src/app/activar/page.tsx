import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { resolveAccess } from '@/lib/access/entitlement'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/validation/schemas'

import { canjearYVincular } from './actions'

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
  const token = typeof params.token === 'string' && params.token.trim() ? params.token : null

  const access = await resolveAccess()

  /*
   * Esta es la puerta de entrada real del producto: `success_url` de Stripe es
   * `/activar?token=…`, y el correo de acceso lleva ese mismo enlace.
   *
   * El canje va DESPUÉS de iniciar sesión, no antes. El token es de un solo uso
   * y sin cuenta a la que atarlo se desperdiciaría; además el contrato pide
   * mandar `appUserId`, que hasta ese momento no existe. Por eso, si todavía no
   * hay sesión, el token viaja en `next` y se vuelve aquí ya identificado.
   */
  if (token && access.kind !== 'anonimo') {
    const { data } = await (await createClient()).auth.getUser()

    if (data.user) {
      const resultado = await canjearYVincular(token, data.user.id)

      // Con la compra ya vinculada, el acceso vuelve a resolverse desde cero.
      if (resultado.ok) redirect(next)

      if (resultado.fallo.motivo === 'caducado') {
        redirect(`/activar/vincular?estado=caducado`)
      }

      // Los demás fallos caen a la pantalla normal, que ya explica qué hacer.
      redirect('/activar/vincular')
    }
  }

  // Quien ya tiene acceso no necesita esta pantalla.
  if (access.kind === 'concedido') redirect(next)
  if (access.kind === 'sin-compra') redirect('/activar/vincular')
  if (access.kind === 'inactivo') redirect('/activar/vincular?estado=inactivo')

  const error = typeof params.error === 'string' ? MENSAJES_DE_ERROR[params.error] : undefined

  /*
   * Sin sesión y con token: al volver de Google hay que aterrizar aquí otra vez,
   * con el token intacto, para poder canjearlo. Si se perdiera, el comprador
   * caería en el emparejado por correo — que es justo lo que el token evita.
   */
  const destinoTrasLogin = token
    ? `/activar?token=${encodeURIComponent(token)}${next !== '/portal' ? `&next=${encodeURIComponent(next)}` : ''}`
    : next

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
          className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      <GoogleSignInButton next={destinoTrasLogin} />

      {/*
        Con token, el correo deja de importar: el enlace ya demuestra el pago y
        la compra se vincula a la cuenta con la que entre, sea cual sea. Decirlo
        evita que alguien abandone creyendo que se equivocó de cuenta.
      */}
      <p className="text-sm opacity-70">
        {token
          ? 'Puedes entrar con cualquier cuenta de Google: tu enlace ya lleva la compra dentro y la vinculamos sola.'
          : 'Si compraste con un correo distinto al de tu cuenta de Google, entra igualmente: te ayudamos a vincular la compra en el siguiente paso.'}
      </p>
    </main>
  )
}
