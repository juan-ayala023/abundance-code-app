'use client'

import { RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { generarLectura } from '@/app/(app)/generando/actions'

type Estado = 'generando' | 'lista' | 'error'

/**
 * Dispara la generación de la lectura y espera a que termine.
 *
 * La espera es real —del orden de un minuto— y por eso esta pantalla existe.
 * Lo que NO se hace es simular avance con un temporizador: mientras se genera
 * el progreso es indeterminado y se dice así, en vez de fingir un porcentaje
 * que no significa nada.
 *
 * ---
 *
 * **Por qué hay un botón de reintentar, y por qué su ausencia era grave.**
 *
 * Antes, si la generación fallaba, esta pantalla enseñaba un aviso y ahí se
 * acababa todo. `/lectura-base` decía «todavía no está escrita» sin ofrecer
 * forma de escribirla, y nada del portal enlazaba de vuelta aquí. La única
 * salida era recargar la página, que no se le ocurre a nadie porque la pantalla
 * no lo sugiere.
 *
 * O sea: **un fallo de un minuto dejaba a la persona sin su lectura para
 * siempre**, con la app diciéndole en todas las pantallas que estaba «en
 * camino». Le pasó a una clienta de verdad: generó su carta el 16 de agosto, la
 * llamada al modelo falló, y cuatro días después seguía viendo el mismo aviso.
 *
 * La generación ya era idempotente —`asegurarLecturaBase()` no escribe si ya hay
 * una—, así que reintentar nunca produce dos lecturas ni cobra dos veces. Solo
 * faltaba el botón.
 */
export function Generacion({ pasosTotales }: { pasosTotales: number }) {
  const t = useTranslations('generando')
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('generando')

  /*
   * El contador de intentos es lo que dispara el efecto de nuevo.
   *
   * Con un booleano no bastaría: React solo vuelve a ejecutar el efecto si
   * alguna dependencia **cambia de valor**, y volver a poner «lanzada» a falso
   * desde el manejador del botón sería justo el patrón que la guarda de abajo
   * existe para impedir. Un número que solo sube no puede confundirse.
   */
  const [intento, setIntento] = useState(0)
  const ultimoLanzado = useRef(-1)

  useEffect(() => {
    // En desarrollo React monta dos veces; sin esto se pediría la generación
    // dos veces y se pagaría el doble.
    if (ultimoLanzado.current === intento) return
    ultimoLanzado.current = intento

    let vigente = true
    setEstado('generando')

    generarLectura()
      .then(({ lista }) => {
        if (!vigente) return

        if (lista) {
          setEstado('lista')
          router.replace('/lectura-base')
        } else {
          setEstado('error')
        }
      })
      .catch(() => {
        if (vigente) setEstado('error')
      })

    return () => {
      vigente = false
    }
  }, [router, intento])

  if (estado === 'error') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          role="alert"
          className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
        >
          <strong>{t('error')}</strong> {t('errorTexto')}
        </div>

        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="flex items-center gap-2 rounded-full bg-oro px-7 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          <RotateCw size={17} aria-hidden="true" />
          {t('reintentar')}
        </button>
      </div>
    )
  }

  return (
    <p role="status" aria-live="polite" className="text-center text-sm text-tinta-suave">
      {estado === 'lista'
        ? t('lista')
        : t('esperando', { total: pasosTotales })}
    </p>
  )
}
