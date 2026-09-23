'use client'

import { useEffect, useRef } from 'react'

import { guardarZonaHoraria } from '@/app/(app)/activacion/actions'

/**
 * Le dice al servidor en qué zona horaria está la persona.
 *
 * No pinta nada. Existe porque el día del portal —qué activación toca, cuándo
 * se reinician las consultas— se calculaba con la zona de la ciudad de
 * nacimiento, y quien vive en otro huso veía el día equivocado. El navegador es
 * el único que sabe dónde está; se envía una vez y se guarda.
 */
export function ZonaHoraria({ guardada }: { guardada: string | null }) {
  const enviado = useRef(false)

  useEffect(() => {
    if (enviado.current) return

    let zona: string | undefined
    try {
      zona = Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return
    }

    if (!zona || zona === guardada) return
    enviado.current = true
    void guardarZonaHoraria(zona)
  }, [guardada])

  return null
}
