import { BookOpen, DoorOpen, Lock, Route, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Preparando tu lectura · Abundance Code',
}

const PASOS = [
  {
    titulo: 'Calculando tu carta natal',
    descripcion: 'Posicionando planetas y aspectos clave.',
    Icono: Sun,
  },
  {
    titulo: 'Identificando tus patrones de abundancia',
    descripcion: 'Reconociendo ciclos, tensiones y fortalezas personales.',
    Icono: Route,
  },
  {
    titulo: 'Analizando tus bloqueos internos',
    descripcion: 'Comprendiendo lo que puede estar limitando tu expansión.',
    Icono: Lock,
  },
  {
    titulo: 'Preparando tu guía personalizada',
    descripcion: 'Organizando la lectura creada para ti.',
    Icono: BookOpen,
  },
  {
    titulo: 'Activando tu portal privado',
    descripcion: 'Abriendo tu espacio personal de lectura.',
    Icono: DoorOpen,
  },
] as const

/**
 * Pantalla de espera mientras se genera la lectura.
 *
 * De momento es estática: no hay nada que generar todavía. Cuando exista la
 * capa de IA, el progreso vendrá del estado real del trabajo — nunca de un
 * temporizador que simule avance, que es la forma habitual de que una barra
 * llegue al 99 % y se quede ahí.
 */
export default async function GenerandoPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('birth_date, base_reading')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')
  if (portal.base_reading) redirect('/lectura-base')

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-12">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl font-light leading-tight tracking-tight">
          Estamos preparando tu{' '}
          <span className="italic text-oro-hondo">lectura personal</span>
        </h1>
        <p className="text-tinta-suave">
          Conectando los datos de tu nacimiento con los patrones que darán forma
          a tu guía personalizada.
        </p>
      </header>

      <Tarjeta className="flex flex-col gap-6">
        <ol className="flex flex-col gap-5">
          {PASOS.map(({ titulo, descripcion, Icono }) => (
            <li key={titulo} className="flex gap-4">
              <Insignia Icono={Icono} />
              <div className="min-w-0">
                <h2 className="font-light">{titulo}</h2>
                <p className="text-sm text-tinta-suave">{descripcion}</p>
              </div>
            </li>
          ))}
        </ol>
      </Tarjeta>

      <p role="status" className="text-center text-sm text-tinta-suave">
        Esta pantalla todavía no genera nada: la capa de interpretación está por
        conectar. Cuando lo esté, el progreso reflejará el estado real del
        trabajo.
      </p>
    </main>
  )
}
