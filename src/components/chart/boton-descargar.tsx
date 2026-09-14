'use client'

import { Check, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

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
  cabecera,
}: {
  children: React.ReactNode
  nombreArchivo: string
  /**
   * Lo que va a la izquierda del botón, en la misma fila. Existe para que el
   * botón quede arriba a la derecha de la tarjeta —como en el original— sin
   * sacar de aquí la referencia al SVG, que es lo que permite exportarlo.
   */
  cabecera?: React.ReactNode
}) {
  const t = useTranslations('descarga')
  const contenedor = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'listo' | 'trabajando' | 'descargado' | 'error'>('listo')

  // La confirmación se queda unos segundos y vuelve al estado normal.
  useEffect(() => {
    if (estado !== 'descargado') return
    const temporizador = setTimeout(() => setEstado('listo'), 4000)
    return () => clearTimeout(temporizador)
  }, [estado])

  async function descargar() {
    // `role="img"` es la rueda. Buscar un `svg` cualquiera podría encontrar el
    // icono de otro elemento si algún día se mete uno dentro.
    const svg = contenedor.current?.querySelector('svg[role="img"]')
    if (!(svg instanceof SVGSVGElement)) return

    setEstado('trabajando')

    try {
      const blob = await svgAPng(svg)
      const url = URL.createObjectURL(blob)

      /*
       * Dos detalles que hacían que el clic «no hiciera nada» en algunos
       * navegadores, y que la revisión de septiembre de 2026 no pudo
       * confirmar como descarga:
       *
       * 1. El enlace se inserta en el documento antes de pulsarlo. Firefox y
       *    Safari ignoran el `click()` de un `<a download>` que no está en el
       *    DOM.
       * 2. La URL del blob se revoca DESPUÉS, no en la misma vuelta: revocarla
       *    en seguida podía cancelar la descarga antes de que arrancara.
       */
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `${nombreArchivo}.png`
      enlace.rel = 'noopener'
      enlace.style.display = 'none'
      document.body.append(enlace)
      enlace.click()
      enlace.remove()

      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setEstado('descargado')
    } catch (error) {
      console.error('[carta] no se pudo exportar la imagen', error)
      setEstado('error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {cabecera}
        <button
          type="button"
          onClick={descargar}
          disabled={estado === 'trabajando'}
          className="inline-flex items-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-2.5 text-sm font-medium transition-colors hover:bg-fondo-hondo disabled:opacity-60"
        >
          {estado === 'descargado' ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          {estado === 'trabajando'
            ? t('preparando')
            : estado === 'descargado'
              ? t('descargada')
              : t('descargar')}
        </button>
      </div>

      {estado === 'descargado' ? (
        <p role="status" className="text-right text-sm text-tinta-suave">
          {t('confirmacion', { archivo: `${nombreArchivo}.png` })}
        </p>
      ) : null}

      {estado === 'error' ? (
        <p role="alert" className="text-right text-sm text-[#a8503c]">
          {t('error')}
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
