/**
 * Arco de luz: el motivo decorativo que acompaña a la activación diaria.
 *
 * Está en el producto original, a la izquierda de la tarjeta, y es lo que
 * impide que esa pantalla —cinco párrafos cortos— se quede con medio ancho
 * vacío en pantallas grandes.
 *
 * Es puramente ornamental: `aria-hidden`, y se oculta en pantallas estrechas,
 * donde el espacio lo necesita el texto.
 */
export function ArcoDeLuz({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 320"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <radialGradient id="arco-luz" cx="50%" cy="62%" r="55%">
          <stop offset="0%" stopColor="var(--color-oro-claro)" stopOpacity="0.38" />
          <stop offset="60%" stopColor="var(--color-oro-claro)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="var(--color-oro-claro)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* El resplandor interior */}
      <path
        d="M40 300 L40 120 A60 60 0 0 1 160 120 L160 300 Z"
        fill="url(#arco-luz)"
      />

      {/* Dos contornos concéntricos, como en el original */}
      <path
        d="M40 300 L40 120 A60 60 0 0 1 160 120 L160 300"
        fill="none"
        stroke="var(--color-oro-claro)"
        strokeWidth="1.5"
        opacity="0.75"
      />
      <path
        d="M58 300 L58 126 A42 42 0 0 1 142 126 L142 300"
        fill="none"
        stroke="var(--color-oro-claro)"
        strokeWidth="1"
        opacity="0.45"
      />

      {/* La estrella de la marca, coronando el arco */}
      <path
        d="M100 46 L103.5 61 L118 64.5 L103.5 68 L100 83 L96.5 68 L82 64.5 L96.5 61 Z"
        fill="var(--color-oro)"
        opacity="0.85"
      />
    </svg>
  )
}
