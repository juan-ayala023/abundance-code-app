/**
 * Adorno del ciclo: un sol seguido de un camino de puntos.
 *
 * Es decorativo —`aria-hidden`— pero no arbitrario: los puntos llenos marcan
 * los tercios ya recorridos del ciclo de 30 días, así que sigue diciendo algo
 * verdadero.
 */
export function IndicadorCiclo({ progreso }: { progreso: number }) {
  const tercios = [33, 66, 100]

  return (
    <div aria-hidden="true" className="flex items-center gap-2 text-oro-claro">
      <svg width="22" height="22" viewBox="0 0 24 24" className="text-oro">
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 * Math.PI) / 180
          return (
            <line
              key={i}
              x1={12 + 7 * Math.cos(a)}
              y1={12 + 7 * Math.sin(a)}
              x2={12 + 10 * Math.cos(a)}
              y2={12 + 10 * Math.sin(a)}
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      <span className="h-px w-24 border-t border-dashed border-oro-claro" />

      {tercios.map((umbral) => (
        <span
          key={umbral}
          className={
            progreso >= umbral
              ? 'size-2.5 rounded-full bg-oro'
              : 'size-2.5 rounded-full border border-oro-claro'
          }
        />
      ))}
    </div>
  )
}
