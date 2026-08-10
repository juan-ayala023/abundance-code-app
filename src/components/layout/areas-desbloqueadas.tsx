import { Compass, DollarSign, GitBranch, Heart, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { getTranslations } from 'next-intl/server'

import { Tarjeta } from './tarjeta'

/**
 * Las cinco áreas que cubre la lectura.
 *
 * Vienen del producto anterior. Los iconos van en círculo perfilado, no
 * relleno: en el original marcan territorio, no acciones que se puedan pulsar.
 */
const AREAS: readonly { clave: string; Icono: LucideIcon }[] = [
  { clave: 'abundancia', Icono: DollarSign },
  { clave: 'decisiones', Icono: GitBranch },
  { clave: 'proposito', Icono: Compass },
  { clave: 'bloqueos', Icono: Lock },
  { clave: 'relaciones', Icono: Heart },
]

export async function AreasDesbloqueadas() {
  const t = await getTranslations('areas')
  return (
    <Tarjeta className="flex flex-col gap-6">
      <h2 className="text-xl font-light">{t('titulo')}</h2>

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {AREAS.map(({ clave, Icono }) => (
          <li key={clave} className="flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full border border-oro-claro text-oro"
            >
              <Icono size={20} />
            </span>
            <span className="text-sm text-tinta-suave">{t(clave as never)}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}
