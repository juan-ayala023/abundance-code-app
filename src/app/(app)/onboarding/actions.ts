'use server'

import { redirect } from 'next/navigation'

import { asegurarCarta, COLUMNAS_CARTA } from '@/lib/astrology/portal'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { resolveBirthInstant, BirthInstantError } from '@/lib/time/birth-instant'
import { createAdminClient, createClient } from '@/lib/supabase/server'
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

  const editando = formData.get('editando') === '1'
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

  /*
   * Lo que había antes, para saber si el nacimiento cambió de verdad.
   *
   * Corregir una letra del nombre no es corregir el nacimiento: la carta y las
   * lecturas siguen valiendo, y regenerarlas costaría dinero y le quitaría a
   * la persona un texto que ya leyó por nada. Solo cuando cambian la fecha, la
   * hora o el lugar se invalida la carta y se archivan las lecturas.
   */
  const { data: anterior } = await supabase
    .from('portals')
    .select(
      'id, created_at, birth_date, birth_time, time_unknown, lat, lng, tz, birth_city, birth_country, base_reading, base_reading_at, chart_reading, chart_reading_at',
    )
    .maybeSingle()

  const nacimientoCambio =
    !anterior ||
    anterior.birth_date !== datos.birthDate ||
    horaGuardada(anterior.birth_time) !== (datos.timeUnknown ? null : datos.birthTime) ||
    anterior.time_unknown !== datos.timeUnknown ||
    Number(anterior.lat) !== datos.place.lat ||
    Number(anterior.lng) !== datos.place.lng ||
    anterior.tz !== datos.place.tz

  if (editando && anterior && !nacimientoCambio) {
    const { error } = await supabase
      .from('portals')
      .update({ full_name: datos.fullName })
      .eq('id', anterior.id)

    if (error) {
      console.error('[onboarding] no se pudo actualizar el nombre', error)
      return { error: 'No pudimos guardar tus datos. Inténtalo de nuevo.', campos: {} }
    }

    redirect('/cuenta?datos=nombre')
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
   * El nacimiento cambió y había lecturas: se retiran y se conservan.
   *
   * La lectura base y el retrato se escribieron sobre la carta anterior, así
   * que ya no describen a esta persona. Se archivan en `reading_versions` con
   * los datos sobre los que se escribieron —se pueden releer desde la pantalla
   * de la lectura— y se vacían en el portal para que `/generando` y `/carta`
   * los vuelvan a escribir sobre la carta nueva. Con el cliente administrativo:
   * el usuario no tiene `insert` en la tabla de versiones, a propósito.
   *
   * Las activaciones de días pasados se quedan: fueron las de esos días. La de
   * hoy se borra para que se escriba sobre la carta correcta. Las consultas de
   * la guía se conservan todas: son un historial, no una interpretación viva.
   */
  const habiaLecturas = Boolean(anterior?.base_reading || anterior?.chart_reading)

  if (anterior && habiaLecturas) {
    const admin = createAdminClient()
    const nacimiento = {
      birth_date: anterior.birth_date,
      birth_time: anterior.birth_time,
      time_unknown: anterior.time_unknown,
      birth_city: anterior.birth_city,
      birth_country: anterior.birth_country,
    }

    const versiones = [
      anterior.base_reading
        ? {
            portal_id: anterior.id,
            kind: 'lectura',
            content: anterior.base_reading,
            generated_at: anterior.base_reading_at,
            ...nacimiento,
          }
        : null,
      anterior.chart_reading
        ? {
            portal_id: anterior.id,
            kind: 'retrato',
            content: anterior.chart_reading,
            generated_at: anterior.chart_reading_at,
            ...nacimiento,
          }
        : null,
    ].filter((version) => version !== null)

    const { error: errorArchivo } = await admin.from('reading_versions').insert(versiones)

    if (errorArchivo) {
      /*
       * Si no se pudo archivar, NO se vacían las lecturas: perder un texto que
       * la persona ya leyó es peor que dejarle uno desactualizado un rato más.
       * Los datos nuevos ya están guardados y la carta se recalcula igual.
       */
      console.error('[onboarding] no se pudieron archivar las lecturas', errorArchivo)
    } else {
      const { error: errorVaciado } = await admin
        .from('portals')
        .update({
          base_reading: null,
          base_reading_at: null,
          chart_reading: null,
          chart_reading_at: null,
        })
        .eq('id', anterior.id)

      if (errorVaciado) {
        console.error('[onboarding] no se pudieron retirar las lecturas', errorVaciado)
      }

      const ciclo = diaDelCiclo(anterior.created_at, anterior.tz)
      if (ciclo) {
        const { error: errorActivacion } = await admin
          .from('daily_activations')
          .delete()
          .eq('portal_id', anterior.id)
          .gte('day_number', ciclo.diaReal)

        if (errorActivacion) {
          console.error('[onboarding] no se pudo retirar la activación de hoy', errorActivacion)
        }
      }
    }
  }

  /*
   * La carta se calcula aquí, con los datos recién guardados, para que el
   * portal ya la tenga al llegar. Si fallara no se interrumpe el onboarding:
   * los datos están a salvo y `asegurarCarta()` lo reintenta en la siguiente
   * visita a la pantalla de la carta.
   */
  await asegurarCarta(supabase, portal)

  // Quien corrigió y tenía lectura va directo a que se escriba la nueva.
  redirect(editando && habiaLecturas ? '/generando' : '/portal')
}

/** `time` de Postgres llega como `HH:MM:SS`; el formulario manda `HH:MM`. */
function horaGuardada(valor: string | null): string | null {
  return valor ? String(valor).slice(0, 5) : null
}
