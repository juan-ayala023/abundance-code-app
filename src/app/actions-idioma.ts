'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { COOKIE_IDIOMA, esIdioma, IDIOMA_POR_DEFECTO } from '@/i18n/idioma'
import { createClient } from '@/lib/supabase/server'

/**
 * Guarda el idioma elegido.
 *
 * En la cookie siempre —cubre a quien todavía no tiene cuenta— y además en
 * `profiles.locale` si hay sesión, para que la elección le siga entre
 * dispositivos en vez de vivir solo en este navegador.
 *
 * Un valor que no reconozcamos cae al idioma por defecto en vez de guardarse:
 * el nombre de la cookie es visible y editable desde el navegador, y de ahí
 * sale el nombre del archivo de mensajes que se importa.
 */
export async function cambiarIdioma(formData: FormData) {
  const elegido = formData.get('idioma')
  const idioma = esIdioma(elegido) ? elegido : IDIOMA_POR_DEFECTO

  const almacen = await cookies()
  almacen.set(COOKIE_IDIOMA, idioma, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Si falla, la cookie ya está puesta: la pantalla cambia igual y la próxima
    // vez se vuelve a intentar. No merece romper la interacción.
    const { error } = await supabase.from('profiles').update({ locale: idioma }).eq('id', user.id)
    if (error) console.error('[idioma] no se pudo guardar en el perfil', error)
  }

  revalidatePath('/', 'layout')
}
