import { cn } from '@/lib/utils'

/**
 * Marca de Abundance Code: el logo original del cliente.
 *
 * El archivo que entregó pesa 1,7 MB (2000×2000). Lo que se sirve es una
 * versión reducida a 512 px y 57 KB en `public/logo.png`: en la barra lateral
 * se ve a 112 px, así que 512 sobra incluso en pantallas de alta densidad.
 * El original se conserva en `src/components/logo-transparent.png` como fuente.
 *
 * Se usa `<img>` y no `next/image` a propósito: `next/image` activaría `sharp`
 * en tiempo de ejecución, y el README acepta sus CVEs justamente mientras no se
 * use. Con medidas explícitas no hay salto de maquetación que justifique el
 * cambio.
 *
 * El logo ya incluye el texto «Abundance Code», así que no se repite debajo.
 */
export function Logo({ size = 112, className }: { size?: number; className?: string }) {
  return (
    /*
     * `next/image` activaría `sharp` en tiempo de ejecución, cuyos CVEs el
     * README acepta precisamente mientras no se use. El archivo ya va
     * optimizado a 57 KB y lleva medidas explícitas: no hay salto de
     * maquetación que justifique el cambio.
     */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Abundance Code"
      width={size}
      height={size}
      /*
        `mx-auto` por defecto porque casi siempre va centrado. `className` deja
        anularlo donde no —en la home, sobre un bloque alineado a la izquierda—
        sin que cada sitio tenga que envolverlo en un contenedor.
      */
      className={cn('mx-auto block h-auto', className)}
      style={{ width: size }}
    />
  )
}
