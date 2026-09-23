'use client'

import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { solicitarCorreccion } from '@/app/(app)/cuenta/correccion/actions'
import { ESTADO_INICIAL } from '@/app/(app)/cuenta/correccion/estado'
import { Tarjeta } from '@/components/layout/tarjeta'

/**
 * Pedir que se corrijan los datos de nacimiento.
 *
 * Cuatro campos, los del documento del 23 de septiembre: qué hay ahora, qué
 * debería haber, por qué, y la confirmación de que son sus propios datos.
 *
 * No corrige nada: deja la petición escrita. Cambiar el nacimiento invalida la
 * carta y archiva la lectura base y el retrato, así que esa puerta no se abre
 * sin que alguien mire lo que hay detrás.
 */
export function FormularioCorreccion({ datoActual }: { datoActual: string }) {
  const t = useTranslations('correccion')
  const [estado, enviar] = useActionState(solicitarCorreccion, ESTADO_INICIAL)

  if (estado.enviada) {
    return (
      <Tarjeta className="flex flex-col items-start gap-4 bg-oro-palido/50">
        <h2 className="flex items-center gap-3 text-xl font-light">
          <CheckCircle2 size={20} className="text-oro" aria-hidden="true" />
          {t('enviadaTitulo')}
        </h2>
        <p className="max-w-prose leading-relaxed text-tinta-suave">{t('enviadaTexto')}</p>
        <Link
          href="/cuenta"
          className="rounded-xl border border-borde bg-superficie px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fondo-hondo"
        >
          {t('volver')}
        </Link>
      </Tarjeta>
    )
  }

  return (
    <Tarjeta>
      <form action={enviar} className="flex flex-col gap-6">
        <Campo etiqueta={t('datoActual')} ayuda={t('datoActualAyuda')}>
          <textarea
            id="datoActual"
            name="datoActual"
            rows={2}
            required
            maxLength={300}
            defaultValue={datoActual}
            className="resize-y rounded-2xl border border-borde bg-fondo px-4 py-3 leading-relaxed"
          />
        </Campo>

        <Campo etiqueta={t('datoCorrecto')} ayuda={t('datoCorrectoAyuda')} id="datoCorrecto">
          <textarea
            id="datoCorrecto"
            name="datoCorrecto"
            rows={2}
            required
            maxLength={300}
            placeholder={t('datoCorrectoEjemplo')}
            className="resize-y rounded-2xl border border-borde bg-fondo px-4 py-3 leading-relaxed"
          />
        </Campo>

        <Campo etiqueta={t('motivo')} ayuda={t('motivoAyuda')} id="motivo">
          <textarea
            id="motivo"
            name="motivo"
            rows={3}
            maxLength={1000}
            className="resize-y rounded-2xl border border-borde bg-fondo px-4 py-3 leading-relaxed"
          />
        </Campo>

        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="confirmado" required className="mt-1" />
          {t('confirmacion')}
        </label>

        {estado.error ? (
          <p role="alert" className="text-sm text-[#a8503c]">
            {estado.error}
          </p>
        ) : null}

        <Enviar />
      </form>
    </Tarjeta>
  )
}

function Campo({
  etiqueta,
  ayuda,
  id = 'datoActual',
  children,
}: {
  etiqueta: string
  ayuda: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <p className="text-sm text-tinta-tenue">{ayuda}</p>
      {children}
    </div>
  )
}

function Enviar() {
  const t = useTranslations('correccion')
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo disabled:opacity-60"
    >
      {pending ? t('enviando') : t('enviar')}
    </button>
  )
}
