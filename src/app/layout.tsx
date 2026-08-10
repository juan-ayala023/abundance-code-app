import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

import { idiomaActual } from '@/i18n/idioma'

import './globals.css'

/**
 * Poppins en pesos ligeros: es la tipografía geométrica de la app anterior,
 * con titulares en 300 y cuerpo en 400.
 */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--fuente-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Abundance Code',
  description: 'Tu carta natal calculada y tu lectura personalizada.',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const idioma = await idiomaActual()
  const messages = await getMessages()

  return (
    /*
      `lang` tiene que reflejar el idioma real: de ahí sacan los lectores de
      pantalla qué voz usar y el navegador si ofrecer traducir la página. Dejarlo
      fijo en "es" con la interfaz en inglés es un fallo de accesibilidad que no
      se ve mirando.
    */
    <html lang={idioma} className={poppins.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
