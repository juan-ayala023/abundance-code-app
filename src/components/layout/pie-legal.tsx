import { getTranslations } from 'next-intl/server'

import { SelectorIdioma } from '@/components/layout/selector-idioma'
import { getPublicEnv } from '@/lib/env/public'

/**
 * Enlaces a los documentos legales.
 *
 * Los textos **no viven aquí**: viven en la landing, que es quien vende y quien
 * cobra. Una segunda copia en esta app acabaría divergiendo de la primera, y
 * dos versiones de una política de privacidad que no dicen lo mismo son peor
 * que una sola.
 *
 * Aun así tienen que ser alcanzables desde aquí: la app es donde el usuario
 * pasa el tiempo y —sobre todo— es donde la política de reembolsos le dice que
 * vaya a cancelar su suscripción.
 *
 * Las rutas salen de `NEXT_PUBLIC_LANDING_URL` y no están escritas a mano: el
 * dominio ya cambió una vez, y un enlace muerto en el pie legal es de los que
 * nadie revisa hasta que hace falta.
 */

/*
 * Nombres tal como están subidos hoy: en `/img/`, en inglés y con espacios.
 * No es donde uno los pondría, pero es donde están y se comprobó que responden
 * con `application/pdf`. Si algún día se mueven, este es el único sitio a
 * cambiar.
 */
const DOCUMENTOS = [
  ['privacidad', 'Privacy-Policy Abundance-Code.pdf'],
  ['terminos', 'Terms-and-Disclaimer Abundance-Code.pdf'],
  ['reembolsos', 'Refund-Cancellation-Policy Abundance-Code.pdf'],
] as const

export async function PieLegal({ className }: { className?: string }) {
  const landing = getPublicEnv().NEXT_PUBLIC_LANDING_URL.replace(/\/$/, '')
  const t = await getTranslations('legal')

  return (
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-8 text-xs text-tinta-tenue ${className ?? ''}`}
    >
      <SelectorIdioma />

      {DOCUMENTOS.map(([clave, archivo]) => (
        <a
          key={archivo}
          href={`${landing}/img/${encodeURIComponent(archivo)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 transition-colors hover:text-tinta-suave hover:underline"
        >
          {t(clave)}
        </a>
      ))}

      <span>© {new Date().getFullYear()} Abundance Code</span>
    </footer>
  )
}
