import { cn } from '@/lib/utils'

/**
 * Ancho y respiración comunes a todas las pantallas del portal.
 *
 * Existe porque cada página traía el suyo —de `max-w-2xl` a `max-w-6xl`— y el
 * portal se veía descuadrado al pasar de una a otra.
 *
 * El ancho es generoso (1280 px) pero **el texto nunca lo ocupa entero**:
 * ensanchar un párrafo hasta 1300 px daría líneas de 180 caracteres, que se
 * leen peor que las cortas. El espacio se aprovecha repartiendo en columnas
 * —carta junto a tabla, secciones de tres en tres— y limitando la prosa suelta
 * con `max-w-prose`.
 *
 * En el teléfono el criterio se invierte: ahí el margen no sobra, se resta. Con
 * `px-6` a cada lado, una pantalla de 390 px dedicaba 48 px —el 12 %— a no
 * mostrar nada, y eso se sumaba al relleno de cada tarjeta. Por debajo de `sm`
 * el margen baja a `px-4`, que sigue separando del borde sin comerse el
 * contenido.
 */
export function Contenedor({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-12 xl:px-16',
        className,
      )}
    >
      {children}
    </main>
  )
}
