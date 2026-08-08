import { Compass, DollarSign, GitBranch, Heart, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Tarjeta } from './tarjeta'

/**
 * Las cinco áreas que cubre la lectura.
 *
 * Vienen del producto anterior. Los iconos van en círculo perfilado, no
 * relleno: en el original marcan territorio, no acciones que se puedan pulsar.
 */
const AREAS: readonly { etiqueta: string; Icono: LucideIcon }[] = [
  { etiqueta: 'Abundancia y dinero', Icono: DollarSign },
  { etiqueta: 'Decisiones', Icono: GitBranch },
  { etiqueta: 'Propósito', Icono: Compass },
  { etiqueta: 'Bloqueos internos', Icono: Lock },
  { etiqueta: 'Relaciones y vínculos', Icono: Heart },
]

export function AreasDesbloqueadas() {
  return (
    <Tarjeta className="flex flex-col gap-6">
      <h2 className="text-xl font-light">Áreas desbloqueadas</h2>

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {AREAS.map(({ etiqueta, Icono }) => (
          <li key={etiqueta} className="flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full border border-oro-claro text-oro"
            >
              <Icono size={20} />
            </span>
            <span className="text-sm text-tinta-suave">{etiqueta}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}
