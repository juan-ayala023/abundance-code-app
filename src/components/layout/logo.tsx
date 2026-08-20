import { cn } from '@/lib/utils'

/**
 * Marca de Abundance Code.
 *
 * Dos versiones del mismo dibujo —el árbol de la vida dentro de la rueda
 * zodiacal, con el texto debajo—, y las dos las entregó el cliente:
 *
 * - `oro`: la original, dorada. Sigue en las pantallas públicas.
 * - `tinta`: la misma en negro, que el cliente pidió para la navegación.
 *
 * Las dos incluyen ya el texto «Abundance Code», así que no se repite debajo.
 *
 * Cada una lleva sus medidas reales porque **no comparten proporción**: la
 * dorada es cuadrada y la de tinta es un poco más alta que ancha (512×544). El
 * componente daba por hecho que el logo era cuadrado y escribía
 * `height={size}`; con un archivo no cuadrado eso declara una proporción falsa,
 * y el navegador reserva un hueco que no coincide con lo que acaba pintando —un
 * salto de maquetación al cargar, justo en la barra superior del móvil.
 *
 * Se usa `<img>` y no `next/image` a propósito: `next/image` activaría `sharp`
 * en tiempo de ejecución, y el README acepta sus CVEs justamente mientras no se
 * use. Los archivos ya van reducidos —57 y 71 KB— con `sharp` en local y una
 * sola vez; los originales se conservan en `src/components/`.
 */

const VARIANTES = {
  oro: { src: '/logo.png', ancho: 512, alto: 512 },
  tinta: { src: '/logo-tinta.png', ancho: 512, alto: 544 },
} as const

export type VarianteLogo = keyof typeof VARIANTES

export function Logo({
  size = 112,
  className,
  variante = 'oro',
}: {
  size?: number
  className?: string
  variante?: VarianteLogo
}) {
  const { src, ancho, alto } = VARIANTES[variante]

  // `size` es el ancho; el alto sale de la proporción real del archivo.
  const altoEnPantalla = Math.round((size * alto) / ancho)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Abundance Code"
      width={size}
      height={altoEnPantalla}
      /*
        `mx-auto` por defecto porque casi siempre va centrado. `className` deja
        anularlo donde no —en la home, y en la barra del móvil, donde el logo va
        pegado a la izquierda— sin que cada sitio tenga que envolverlo en un
        contenedor.

        Ojo con `mx-auto` dentro de un flex: no solo centra dentro de su caja,
        sino que **se come el espacio libre de la fila**. En la barra del móvil,
        con `justify-between`, eso empujaba el logo al centro aunque fuera el
        primer elemento. Ahí se anula con `mx-0`.
      */
      className={cn('mx-auto block', className)}
      style={{ width: size, height: altoEnPantalla }}
    />
  )
}
