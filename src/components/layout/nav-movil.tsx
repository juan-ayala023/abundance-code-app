'use client'

import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Logo } from '@/components/layout/logo'
import { NavLateral } from '@/components/layout/nav-lateral'

/**
 * Navegación en móvil: barra superior y cajón lateral.
 *
 * Existe porque la barra lateral es `lg:flex`, así que por debajo de ese ancho
 * simplemente no había forma de moverse por el portal.
 *
 * Lo que hace que un cajón sea usable y no un adorno:
 * - `Escape` lo cierra, que es lo primero que prueba quien usa teclado.
 * - El foco entra al abrirlo y **vuelve al botón** al cerrarlo; si no, quien
 *   navega con teclado acaba al principio del documento sin saber dónde está.
 * - Se bloquea el desplazamiento del fondo: sin eso, al arrastrar sobre el
 *   cajón se mueve la página de detrás.
 * - Se cierra solo al cambiar de ruta. Un cajón que sigue abierto sobre la
 *   pantalla nueva parece que el enlace no funcionó.
 */
export function NavMovil({ ciclo }: { ciclo: { dia: number; total: number } | null }) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const botonRef = useRef<HTMLButtonElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  /*
   * El estado guarda la ruta en la que se abrió, no un booleano.
   *
   * Así «cerrar al navegar» sale solo: al cambiar `pathname` deja de coincidir
   * y el cajón se cierra. Con un booleano habría que apagarlo desde un efecto
   * que observara la ruta, que es justo lo que React desaconseja.
   */
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null)
  const abierto = abiertoEn === pathname

  const cerrar = () => setAbiertoEn(null)

  useEffect(() => {
    if (!abierto) return

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbiertoEn(null)
    }

    document.addEventListener('keydown', alPulsar)

    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()

    // Se copia ahora: en la limpieza, la ref podría apuntar ya a otra cosa.
    const boton = botonRef.current

    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = desbordeAnterior
      boton?.focus()
    }
  }, [abierto])

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur lg:hidden">
        {/*
          `mx-0` anula el `mx-auto` que `Logo` trae por defecto. Dentro de un
          flex ese margen automático absorbe el espacio libre de la fila, así
          que empujaba el logo al centro pese al `justify-between` de la
          cabecera. El cliente lo quiere a la izquierda.
        */}
        <Logo size={52} variante="tinta" className="mx-0" />

        <button
          ref={botonRef}
          type="button"
          onClick={() => setAbiertoEn(pathname)}
          aria-expanded={abierto}
          aria-controls="menu-portal"
          className="flex items-center gap-2 rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-fondo-hondo"
        >
          <Menu size={18} aria-hidden="true" />
          {t('menu')}
        </button>
      </header>

      {abierto ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/*
            El fondo es un botón de verdad y no un `div` con `onClick`: así se
            puede cerrar también con teclado, y los lectores de pantalla no
            anuncian un elemento pulsable sin nombre.
          */}
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar el menú"
            className="absolute inset-0 bg-tinta/25 backdrop-blur-[2px]"
          />

          <div
            id="menu-portal"
            role="dialog"
            aria-modal="true"
            aria-label={t('principal')}
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col gap-8 overflow-y-auto border-r border-borde bg-fondo px-6 py-6 shadow-2xl motion-safe:animate-[entrar-cajon_180ms_ease-out]"
          >
            <div className="flex items-start justify-between gap-4">
              <Logo size={88} variante="tinta" className="mx-0" />

              <button
                ref={cerrarRef}
                type="button"
                onClick={cerrar}
                className="rounded-xl border border-borde bg-superficie p-2.5 transition-colors hover:bg-fondo-hondo"
              >
                <X size={18} aria-hidden="true" />
                <span className="sr-only">{t('cerrarMenu')}</span>
              </button>
            </div>

            <NavLateral ciclo={ciclo} />
          </div>
        </div>
      ) : null}
    </>
  )
}
