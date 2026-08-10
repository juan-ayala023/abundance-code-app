import { getRequestConfig } from 'next-intl/server'

import { idiomaActual } from './idioma'

/**
 * Configuración de next-intl.
 *
 * No hay enrutado por idioma —ver `idioma.ts`— así que el locale no sale de la
 * URL sino de la cookie, y los mensajes se cargan a partir de él.
 */
export default getRequestConfig(async () => {
  const locale = await idiomaActual()

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
