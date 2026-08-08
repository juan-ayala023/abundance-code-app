/**
 * La estrella de cuatro puntas que encabeza cada sección.
 *
 * Es el motivo de la marca, y va como carácter y no como icono para que
 * coincida exactamente con el del producto anterior.
 */
export function Estrella({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className ?? 'text-oro'}>
      ✦
    </span>
  )
}
