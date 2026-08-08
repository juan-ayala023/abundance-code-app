'use client'

import { Download } from 'lucide-react'
import { useRef, useState } from 'react'

/**
 * Descarga la carta como PNG.
 *
 * Esto es posible porque la rueda es un SVG nuestro (CLAUDE.md §2): se
 * serializa, se pinta en un lienzo al doble de resolución y se exporta. Con una
 * imagen devuelta por un tercero no habría nada que exportar.
 *
 * El envoltorio existe solo para tener una referencia al SVG que renderiza el
 * servidor, sin convertir toda la carta en un componente de cliente.
 */
export function CartaDescargable({
  children,
  nombreArchivo,
}: {
  children: React.ReactNode
  nombreArchivo: string
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'listo' | 'trabajando' | 'error'>('listo')

  async function descargar() {
    const svg = contenedor.current?.querySelector('svg')
    if (!svg) return

    setEstado('trabajando')

    try {
      const blob = await svgAPng(svg)
      const url = URL.createObjectURL(blob)

      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `${nombreArchivo}.png`
      enlace.click()

      URL.revokeObjectURL(url)
      setEstado('listo')
    } catch (error) {
      console.error('[carta] no se pudo exportar la imagen', error)
      setEstado('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={descargar}
          disabled={estado === 'trabajando'}
          className="inline-flex items-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-2.5 text-sm font-medium transition-colors hover:bg-fondo-hondo disabled:opacity-60"
        >
          <Download size={16} aria-hidden="true" />
          {estado === 'trabajando' ? 'Preparando…' : 'Descargar imagen'}
        </button>
      </div>

      {estado === 'error' ? (
        <p role="alert" className="text-right text-sm text-[#a8503c]">
          No pudimos generar la imagen. Vuelve a intentarlo.
        </p>
      ) : null}

      <div ref={contenedor}>{children}</div>
    </div>
  )
}

/** Escala de exportación: el doble, para que no se vea borrosa al ampliar. */
const ESCALA = 2

async function svgAPng(svg: SVGSVGElement): Promise<Blob> {
  const clon = svg.cloneNode(true) as SVGSVGElement

  // Un SVG suelto necesita su espacio de nombres; dentro del HTML no hace falta.
  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const viewBox = (svg.getAttribute('viewBox') ?? '0 0 800 800').split(/\s+/)
  const ancho = Number(viewBox[2] ?? 800)
  const alto = Number(viewBox[3] ?? 800)

  clon.setAttribute('width', String(ancho))
  clon.setAttribute('height', String(alto))

  /*
   * Los colores del tema son variables CSS, y una vez fuera del documento no
   * resuelven a nada. Se sustituyen por su valor calculado antes de exportar,
   * o la carta saldría en negro.
   */
  const raiz = getComputedStyle(document.documentElement)
  let markup = new XMLSerializer().serializeToString(clon)
  markup = markup.replace(/var\((--[a-z0-9-]+)\)/gi, (_, nombre: string) => {
    return raiz.getPropertyValue(nombre).trim() || '#000000'
  })

  // La tipografía tampoco viaja: se fija una familia genérica para los glifos.
  markup = markup.replace(
    '<svg ',
    '<svg font-family="system-ui, -apple-system, Segoe UI, sans-serif" ',
  )

  const imagen = new Image()
  imagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`

  await new Promise<void>((resolver, rechazar) => {
    imagen.onload = () => resolver()
    imagen.onerror = () => rechazar(new Error('no se pudo cargar el SVG'))
  })

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho * ESCALA
  lienzo.height = alto * ESCALA

  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('sin contexto 2d')

  // Fondo opaco: un PNG transparente se ve ilegible sobre fondo oscuro.
  ctx.fillStyle = raiz.getPropertyValue('--color-superficie').trim() || '#ffffff'
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)

  return new Promise<Blob>((resolver, rechazar) => {
    lienzo.toBlob((blob) => {
      if (blob) resolver(blob)
      else rechazar(new Error('no se pudo generar el PNG'))
    }, 'image/png')
  })
}
