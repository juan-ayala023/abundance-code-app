import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { resolveAccess } from '@/lib/access/entitlement'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/validation/schemas'

import { canjearYVincular } from './actions'
import { cambiarDeCuenta } from './vincular/actions'

export const metadata: Metadata = {
  title: 'Activar tu acceso · Abundance Code',
}

/** Códigos de error que traen las redirecciones. El texto está en `messages/`. */
const ERRORES_CONOCIDOS = ['cancelado', 'sin_codigo', 'sesion'] as const

export default async function ActivarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === 'string' ? params.next : null)
  const t = await getTranslations('activar')
  const token = typeof params.token === 'string' && params.token.trim() ? params.token : null

  /*
   * `reciente=1` lo pone esta misma página en el destino tras Google: marca
   * que la sesión se acaba de crear para este token. Sin esa marca, una sesión
   * con token es una sesión que ya estaba abierta antes de llegar aquí — y
   * entonces no se canjea sin preguntar (ver más abajo).
   */
  const sesionRecienCreada = params.reciente === '1'

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

    /*
     * Sesión abierta de antes + token nuevo: se pregunta antes de vincular.
     *
     * Vincular «a la cuenta con la que entre, sea cual sea» es lo correcto
     * cuando la persona acaba de entrar para esto. Pero si el navegador ya
     * tenía otra sesión —la de la oficina, la de un familiar—, la compra se
     * ataba a esa cuenta en silencio y quien pagó ni se enteraba. Pasó con la
     * primera compra real: quedó en la cuenta que estaba abierta, no en la de
     * la compradora. Aquí se muestra a qué cuenta va a ir y se deja elegir.
     */
    if (data.user && !sesionRecienCreada) {
      const tc = await getTranslations('activar.confirmar')
      const correo = data.user.email ?? ''
      const seguir = new URLSearchParams({ token, reciente: '1' })
      if (next !== '/portal') seguir.set('next', next)

      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
          <header className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{tc('titulo')}</h1>
            <p className="opacity-80">{tc('texto', { correo })}</p>
          </header>

          <div className="flex flex-col gap-3">
            <a
              href={`/activar?${seguir.toString()}`}
              className="w-full rounded-xl bg-oro px-5 py-3 text-center font-medium text-white transition-colors hover:bg-oro-hondo"
            >
              {tc('si')}
            </a>
            <form action={cambiarDeCuenta.bind(null, token, next)}>
              <button
                type="submit"
                className="w-full rounded-xl border border-oro-claro px-5 py-3 text-center font-medium transition-colors hover:bg-oro-palido/60"
              >
                {tc('no')}
              </button>
            </form>
          </div>
        </main>
      )
    }

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

  const codigoError = typeof params.error === 'string' ? params.error : null
  const error =
    codigoError && (ERRORES_CONOCIDOS as readonly string[]).includes(codigoError)
      ? t(`errores.${codigoError as (typeof ERRORES_CONOCIDOS)[number]}`)
      : undefined

  /*
   * Sin sesión y con token: al volver de Google hay que aterrizar aquí otra vez,
   * con el token intacto, para poder canjearlo. Si se perdiera, el comprador
   * caería en el emparejado por correo — que es justo lo que el token evita.
   */
  const destinoTrasLogin = token
    ? `/activar?token=${encodeURIComponent(token)}&reciente=1${next !== '/portal' ? `&next=${encodeURIComponent(next)}` : ''}`
    : next

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="opacity-80">{t('descripcion')}</p>
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
      <p className="text-sm opacity-70">{token ? t('conToken') : t('sinToken')}</p>
    </main>
  )
}
