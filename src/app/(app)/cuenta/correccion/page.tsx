import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { FormularioCorreccion } from '@/components/cuenta/formulario-correccion'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Tarjeta } from '@/components/layout/tarjeta'
import { idiomaActual } from '@/i18n/idioma'
import { createClient } from '@/lib/supabase/server'
import { fechaDeCalendario, horaDeReloj } from '@/lib/time/formato'

export const metadata: Metadata = {
  title: 'Solicitar una corrección · Abundance Code',
}

/**
 * Pedir que se corrijan la fecha, la hora o el lugar de nacimiento.
 *
 * El nombre se cambia solo, desde Mi Cuenta. Esto no: cambiar el nacimiento
 * invalida la carta y archiva la lectura base y el retrato, y eso no puede
 * pasar por un clic. Se registra la petición y alguien la mira; hasta
 * entonces, la persona conserva todo lo que tiene.
 */
export default async function CorreccionPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('birth_date, birth_time, time_unknown, birth_city, birth_country')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  const t = await getTranslations('correccion')
  const tNav = await getTranslations('nav')
  const tCuenta = await getTranslations('cuenta')
  const idioma = await idiomaActual()

  /* Lo que hay guardado, en una línea, para no obligar a copiarlo a mano. */
  const nacimiento = [
    fechaDeCalendario(portal.birth_date, idioma),
    portal.time_unknown ? tCuenta('sinHora') : horaDeReloj(portal.birth_time),
    [portal.birth_city, portal.birth_country].filter(Boolean).join(', '),
  ]
    .filter((parte) => parte && parte !== '—')
    .join(' · ')

  return (
    <Contenedor className="max-w-3xl">
      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={t('descripcion')}
        volver={{ href: '/cuenta', texto: tNav('volverACuenta') }}
      />

      <Tarjeta className="bg-oro-palido/40 text-sm leading-relaxed text-tinta-suave">
        {t('queVaAPasar')}
      </Tarjeta>

      <FormularioCorreccion datoActual={nacimiento} />
    </Contenedor>
  )
}
