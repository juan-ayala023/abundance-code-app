import 'server-only'

import { cookies } from 'next/headers'

/**
 * Resolución del idioma, **sin prefijo en la URL**.
 *
 * Lo habitual en Next sería `/es/portal` y `/en/portal`. Aquí no se puede: la
 * puerta de entrada del producto es `/activar?token=…`, que compone el backend
 * de la landing con `APP_PUBLIC_URL + APP_ACTIVATE_PATH`. Meter el idioma en la
 * ruta obligaría a que ese sistema —que no controlamos— supiera elegirlo, y
 * cualquier enlace ya enviado por correo dejaría de funcionar.
 *
 * Así que el idioma vive en una cookie, y para quien ha iniciado sesión se
 * guarda además en `profiles.locale`, que ya existía en el esquema con
 * `check (locale in ('es','en'))`. La cookie cubre a quien todavía no tiene
 * cuenta —la portada, `/planes`, `/activar`— y el perfil hace que la elección
 * le siga entre dispositivos.
 */

export const IDIOMAS = ['es', 'en'] as const
export type Idioma = (typeof IDIOMAS)[number]

/** El del producto original. Quien no elija nada, ve español. */
export const IDIOMA_POR_DEFECTO: Idioma = 'es'

export const COOKIE_IDIOMA = 'idioma'

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === 'string' && (IDIOMAS as readonly string[]).includes(valor)
}

/**
 * Idioma de esta petición.
 *
 * Se lee de la cookie y no del perfil, aunque el perfil sea la fuente
 * duradera: consultar la base de datos en cada render para saber en qué idioma
 * pintar sería un viaje por pantalla para un dato que cambia una vez al año. Al
 * iniciar sesión y al cambiarlo se sincronizan las dos.
 */
export async function idiomaActual(): Promise<Idioma> {
  const valor = (await cookies()).get(COOKIE_IDIOMA)?.value
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO
}

/** Cómo se llama cada idioma **en su propio idioma**, que es como se ofrece. */
export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: 'Español',
  en: 'English',
}
