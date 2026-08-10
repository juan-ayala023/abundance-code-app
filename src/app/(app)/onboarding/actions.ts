'use server'

import { redirect } from 'next/navigation'

import { asegurarCarta, COLUMNAS_CARTA } from '@/lib/astrology/portal'
import { resolveBirthInstant, BirthInstantError } from '@/lib/time/birth-instant'
import { createClient } from '@/lib/supabase/server'
import { datosNacimientoSchema } from '@/lib/validation/schemas'

import type { EstadoFormulario } from './estado'

export async function guardarDatosNacimiento(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Tu sesión expiró. Vuelve a entrar.', campos: {} }

  const timeUnknown = formData.get('timeUnknown') === 'on'
  const horaBruta = String(formData.get('birthTime') ?? '').trim()

  let lugar: unknown
  try {
    lugar = JSON.parse(String(formData.get('place') ?? 'null'))
  } catch {
    return { error: null, campos: { place: 'Elige una ciudad de la lista' } }
  }

  const parsed = datosNacimientoSchema.safeParse({
    fullName: formData.get('fullName'),
    birthDate: formData.get('birthDate'),
    timeUnknown,
    birthTime: timeUnknown || horaBruta === '' ? null : horaBruta,
    place: lugar,
  })

  if (!parsed.success) {
    const campos: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const campo = issue.path[0]
      if (typeof campo === 'string' && !campos[campo]) campos[campo] = issue.message
    }
    return { error: null, campos }
  }

  const datos = parsed.data

  // Resolver el instante aquí sirve de validación final: si la zona horaria
  // del lugar no es utilizable, es mejor saberlo antes de guardar que al
  // intentar calcular la carta.
  try {
    resolveBirthInstant({
      birthDate: datos.birthDate,
      birthTime: datos.birthTime,
      timeUnknown: datos.timeUnknown,
      tz: datos.place.tz,
    })
  } catch (error) {
    if (error instanceof BirthInstantError) {
      console.error('[onboarding] instante irresoluble', error.message)
      return {
        error: 'No pudimos interpretar esa combinación de fecha, hora y lugar.',
        campos: {},
      }
    }
    throw error
  }

  const { data: portal, error } = await supabase
    .from('portals')
    .upsert(
      {
        user_id: user.id,
        full_name: datos.fullName,
        birth_date: datos.birthDate,
        birth_time: datos.timeUnknown ? null : datos.birthTime,
        time_unknown: datos.timeUnknown,
        birth_city: datos.place.city,
        birth_country: datos.place.country,
        lat: datos.place.lat,
        lng: datos.place.lng,
        tz: datos.place.tz,

        // Si alguien corrige su hora o su ciudad, la carta anterior ya no
        // describe su nacimiento. Se invalida aquí para que no quede una carta
        // vieja que aparenta estar al día.
        chart: null,
        chart_version: null,
        chart_computed_at: null,
      },
      { onConflict: 'user_id' },
    )
    .select(COLUMNAS_CARTA)
    .single()

  if (error) {
    console.error('[onboarding] no se pudo guardar el portal', error)
    return { error: 'No pudimos guardar tus datos. Inténtalo de nuevo.', campos: {} }
  }

  /*
   * La carta se calcula aquí, con los datos recién guardados, para que el
   * portal ya la tenga al llegar. Si fallara no se interrumpe el onboarding:
   * los datos están a salvo y `asegurarCarta()` lo reintenta en la siguiente
   * visita a la pantalla de la carta.
   */
  await asegurarCarta(supabase, portal)

  redirect('/portal')
}
