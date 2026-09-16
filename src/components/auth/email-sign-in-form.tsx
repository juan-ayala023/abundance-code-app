'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

/**
 * Entrada con correo: el camino principal.
 *
 * En la compra la persona escribe su correo, así que es el correo lo que
 * la identifica. Pedirle Google al llegar rompía ese hilo: quien no lo usa se
 * quedaba fuera, y quien lo usa con otro correo se confundía.
 *
 * Supabase manda un enlace de un solo uso al correo; al abrirlo, vuelve a
 * `/auth/callback` con un `code` igual que Google, así que el resto del flujo
 * —canje del token, vinculación, destino— es el mismo y no se toca.
 *
 * El enlace hay que abrirlo en el mismo navegador desde el que se pidió: el
 * intercambio del código depende de un secreto que solo tiene ese navegador.
 * Se dice en pantalla, porque es lo primero que la gente hace mal.
 */
export function EmailSignInForm({ next }: { next: string }) {
  const t = useTranslations('activar.correo')
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'enviado' | 'error'>('inicial')

  async function enviarEnlace(evento: React.FormEvent) {
    evento.preventDefault()
    const correo = email.trim().toLowerCase()
    if (!correo) return

    setEstado('enviando')

    const supabase = createClient()
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: { emailRedirectTo, shouldCreateUser: true },
    })

    if (error) {
      console.error('[activar] no se pudo enviar el enlace por correo', error)
      setEstado('error')
      return
    }

    setEstado('enviado')
  }

  if (estado === 'enviado') {
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-2xl border border-oro-claro bg-oro-palido/60 px-5 py-4"
      >
        <p className="font-medium">{t('enviadoTitulo')}</p>
        <p className="text-sm opacity-80">{t('enviado', { correo: email.trim().toLowerCase() })}</p>
      </div>
    )
  }

  return (
    <form onSubmit={enviarEnlace} className="flex flex-col gap-3">
      <label htmlFor="correo-acceso" className="sr-only">
        {t('etiqueta')}
      </label>
      <input
        id="correo-acceso"
        type="email"
        required
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('placeholder')}
        className="rounded-xl border border-borde bg-superficie px-4 py-3.5 text-base outline-none transition-colors focus:border-oro"
      />
      {/* Es el camino principal de entrada: mismo estilo que el botón de compra. */}
      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="rounded-xl bg-oro px-5 py-3.5 font-medium text-white transition-colors hover:bg-oro-hondo disabled:cursor-not-allowed disabled:opacity-60"
      >
        {estado === 'enviando' ? t('enviando') : t('boton')}
      </button>

      {estado === 'error' ? (
        <p role="alert" className="text-sm text-[#a8503c]">
          {t('error')}
        </p>
      ) : null}
    </form>
  )
}
