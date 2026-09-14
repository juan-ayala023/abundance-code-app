import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { FormularioNacimiento } from '@/components/onboarding/formulario-nacimiento'
import type { Place } from '@/lib/geo/types'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Tus datos de nacimiento · Abundance Code',
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // El layout de (app) ya garantizó sesión y acceso.
  if (!user) redirect('/activar')

  const { data: portal } = await supabase
    .from('portals')
    .select(
      'full_name, birth_date, birth_time, time_unknown, birth_city, birth_country, lat, lng, tz',
    )
    .maybeSingle()

  /*
   * Dos modos en una pantalla.
   *
   * Sin `?editar`, es el onboarding de siempre: quien ya completó sus datos no
   * tiene que volver a pasar por aquí y se le manda al portal. Con `?editar`,
   * es la corrección de datos que Mi Cuenta promete: el mismo formulario, con
   * lo que hay guardado ya escrito, y un aviso de lo que pasa con las lecturas
   * al cambiar el nacimiento. Antes este segundo modo no existía y el enlace
   * «revisar mis datos» de la carta acababa aquí y rebotaba al portal.
   */
  const params = await searchParams
  const editando = Boolean(portal?.birth_date) && params.editar !== undefined

  if (portal?.birth_date && !editando) redirect('/portal')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('full_name')
    .maybeSingle()

  const t = await getTranslations('onboarding')

  /*
   * El lugar guardado, con la forma que espera el buscador. `providerId` no se
   * guarda en `portals`, así que se fabrica uno reconocible: solo sirve para
   * distinguir «el lugar de siempre» de uno recién elegido.
   */
  const lugarInicial: Place | null =
    editando && portal?.birth_city && portal.lat !== null && portal.lng !== null && portal.tz
      ? {
          providerId: `guardado:${portal.lat},${portal.lng}`,
          city: portal.birth_city,
          region: null,
          country: portal.birth_country ?? '',
          countryCode: '',
          lat: Number(portal.lat),
          lng: Number(portal.lng),
          tz: portal.tz,
        }
      : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {editando ? t('editar.titulo') : t('titulo')}
        </h1>
        <p className="opacity-80">{editando ? t('editar.descripcion') : t('descripcion')}</p>
      </header>

      {editando ? (
        <p
          role="note"
          className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm leading-relaxed"
        >
          {t.rich('editar.aviso', { b: (trozo) => <strong>{trozo}</strong> })}
        </p>
      ) : null}

      <FormularioNacimiento
        nombreInicial={portal?.full_name ?? perfil?.full_name ?? ''}
        editando={editando}
        valoresIniciales={
          editando && portal
            ? {
                birthDate: portal.birth_date ?? '',
                birthTime: portal.birth_time ? String(portal.birth_time).slice(0, 5) : '',
                timeUnknown: portal.time_unknown,
                lugar: lugarInicial,
              }
            : undefined
        }
      />

      {editando ? (
        <Link href="/cuenta" className="text-center text-sm underline underline-offset-4">
          {t('editar.cancelar')}
        </Link>
      ) : null}
    </main>
  )
}
