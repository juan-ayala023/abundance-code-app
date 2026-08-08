'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export function GoogleSignInButton({ next }: { next: string }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function iniciarSesion() {
    setCargando(true)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (oauthError) {
      console.error('[activar] no se pudo iniciar el flujo de Google', oauthError)
      setError('No pudimos conectar con Google. Revisa tu conexión y vuelve a intentarlo.')
      setCargando(false)
    }
    // Si no hay error, el navegador ya está navegando a Google: no se quita el
    // estado de carga a propósito, para que no parezca que el botón se resetea.
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={iniciarSesion}
        disabled={cargando}
        className="inline-flex items-center justify-center gap-3 rounded-xl border border-borde bg-superficie px-5 py-3 font-medium transition-colors hover:bg-fondo-hondo disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleLogo />
        {cargando ? 'Conectando…' : 'Entrar con Google'}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-[#a8503c]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}
