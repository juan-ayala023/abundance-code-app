import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
