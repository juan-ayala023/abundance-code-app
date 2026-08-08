/**
 * Marca de Abundance Code: árbol de la vida dentro de un anillo zodiacal.
 *
 * Va en SVG y no como imagen para que se vea nítido a cualquier tamaño y
 * herede el color del tema. Es una interpretación del logo de la app anterior;
 * si existe el original vectorial del cliente, se sustituye aquí.
 */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Abundance Code"
        className="text-oro"
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />

        {/* Doce marcas: el anillo zodiacal */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180
          return (
            <line
              key={i}
              x1={50 + 40 * Math.cos(a)}
              y1={50 + 40 * Math.sin(a)}
              x2={50 + 46 * Math.cos(a)}
              y2={50 + 46 * Math.sin(a)}
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.55"
            />
          )
        })}

        {/* Árbol: tronco, raíces y copa */}
        <path
          d="M50 74 L50 46"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M50 74 C44 76 40 78 36 80 M50 74 C56 76 60 78 64 80 M50 74 L50 80"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M50 52 C42 50 36 44 34 38 M50 52 C58 50 64 44 66 38 M50 46 C46 40 44 34 44 28 M50 46 C54 40 56 34 56 28"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <circle cx="50" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      </svg>

      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-oro-hondo">
        Abundance
      </p>
      <p className="-mt-1 text-[0.6rem] uppercase tracking-[0.35em] text-oro-hondo">
        Code
      </p>
    </div>
  )
}
