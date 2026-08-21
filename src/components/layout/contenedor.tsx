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
 *
 * **Lo mismo vale para el alto, y ahí se notaba más.** El aire entre secciones
 * era de 40 px y el de arriba y abajo de 48, medidas pensadas para una pantalla
 * ancha. En un teléfono, donde las secciones van una debajo de otra en vez de
 * repartidas en columnas, ese mismo aire se acumula: recorrer el portal de
 * arriba abajo eran cientos de píxeles de nada entre cosas. Por debajo de `sm`
 * baja a 24 y 32, que sigue separando las secciones sin que haya que arrastrar
 * el dedo tres veces para pasar de una a la siguiente.
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
        'mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12 lg:px-12 xl:px-16',
        className,
      )}
    >
      {children}
    </main>
  )
}
