import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Abundance Code',
  description: 'Tu carta natal calculada y tu lectura personalizada.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
