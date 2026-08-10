import { IDIOMAS, NOMBRE_IDIOMA, idiomaActual } from '@/i18n/idioma'

import { cambiarIdioma } from '@/app/actions-idioma'

/**
 * Cambio de idioma.
 *
 * Son botones dentro de un formulario, no un desplegable con JavaScript: así
 * funciona sin hidratar y para quien navega con teclado o lector de pantalla no
 * hay nada que aprender. Cada idioma se ofrece **escrito en su propio idioma**
 * —«Español», «English»—, que es lo único que entiende con seguridad alguien que
 * ha aterrizado en el idioma equivocado.
 */
export async function SelectorIdioma({ className }: { className?: string }) {
  const actual = await idiomaActual()

  return (
    <form action={cambiarIdioma} className={`flex items-center gap-1 ${className ?? ''}`}>
      {IDIOMAS.map((idioma) => {
        const esActual = idioma === actual

        return (
          <button
            key={idioma}
            type="submit"
            name="idioma"
            value={idioma}
            aria-current={esActual ? 'true' : undefined}
            disabled={esActual}
            className={
              esActual
                ? 'rounded-lg bg-oro-palido px-2.5 py-1 text-xs font-medium text-oro-hondo'
                : 'rounded-lg px-2.5 py-1 text-xs text-tinta-tenue transition-colors hover:bg-fondo-hondo hover:text-tinta-suave'
            }
          >
            {NOMBRE_IDIOMA[idioma]}
          </button>
        )
      })}
    </form>
  )
}
