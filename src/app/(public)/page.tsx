import Link from 'next/link'

import { Logo } from '@/components/layout/logo'

/**
 * Home pública.
 *
 * Es la única superficie pública de la app que no es transaccional: `/activar`
 * y `/planes` existen para completar una acción, y ahí una imagen grande solo
 * retrasa el botón que la persona vino a pulsar. Aquí sí cabe dar tono.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:gap-16">
      {/*
        `<img>` y no `next/image`, por lo mismo que el logo: `next/image`
        activaría `sharp` en tiempo de ejecución, cuyos CVEs el README acepta
        precisamente mientras no se use. El archivo ya va reducido a 1200 px y
        136 KB —el original de 2,1 MB se queda en `src/components/`— y lleva
        medidas explícitas, así que no hay salto de maquetación.

        `fetchPriority`: en pantalla grande esta imagen es el elemento más
        grande de la página, así que es lo que mide el LCP. Sin la pista, el
        navegador la descarga después de recursos que importan menos.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/portada.jpg"
        alt="Una mujer consulta su portal de Abundance Code en el móvil, al atardecer."
        width={1200}
        height={1200}
        fetchPriority="high"
        className="aspect-4/3 w-full max-w-md rounded-3xl object-cover shadow-[0_8px_32px_-16px_rgba(60,53,45,0.35)] lg:aspect-square lg:max-w-sm"
      />

      <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
        <Logo size={120} className="lg:mx-0" />

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-light tracking-tight">
            Tu código personal, leído desde el cielo
          </h1>
          <p className="text-tinta-suave">
            Tu carta natal calculada y una interpretación creada para ti, en tu
            portal privado.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
          <Link
            href="/activar"
            className="rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
          >
            Ya compré, quiero entrar
          </Link>
          <Link
            href="/planes"
            className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
          >
            Ver planes
          </Link>
        </div>
      </div>
    </main>
  )
}
