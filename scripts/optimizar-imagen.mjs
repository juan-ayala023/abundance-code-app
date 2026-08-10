import { statSync } from 'node:fs'
import process from 'node:process'

/**
 * Reduce una imagen de `src/` a una versión servible en `public/`.
 *
 *   node scripts/optimizar-imagen.mjs src/components/mockup-lifestyle.png public/portada.jpg 1200
 *
 * Existe para dejar constancia de CÓMO se generó lo que hay en `public/`. Los
 * originales que entrega el cliente pesan megas —2,1 MB la portada, 1,7 MB el
 * logo— y lo que se sirve es una reducción. Sin este script, dentro de seis
 * meses nadie sabría con qué medidas ni con qué calidad se hizo, y regenerarla
 * daría un archivo distinto.
 *
 * No se ejecuta en el build ni forma parte de `verify`: se lanza a mano cuando
 * llega una imagen nueva. Por eso tampoco añade `sharp` a `package.json` — lo
 * toma del que ya arrastra Next. Si algún día Next deja de traerlo, instálalo
 * de forma temporal; nada del runtime depende de esto.
 *
 * `sharp` en tiempo de EJECUCIÓN es justo lo que el README evita, y por eso las
 * imágenes van con `<img>` y no con `next/image`. Aquí se usa en tiempo de
 * desarrollo, en tu máquina, sobre un archivo que ya está en el repo: es otra
 * cosa.
 */

const [origen, destino, ancho = '1200'] = process.argv.slice(2)

if (!origen || !destino) {
  console.error('Uso: node scripts/optimizar-imagen.mjs <origen> <destino> [ancho]')
  process.exit(1)
}

const { default: sharp } = await import('sharp')

const meta = await sharp(origen).metadata()
console.log(`origen:  ${meta.width}×${meta.height} ${meta.format}, ${kb(origen)} KB`)

const salida = sharp(origen).resize({ width: Number(ancho), withoutEnlargement: true })

// JPEG progresivo para fotografía; PNG solo si hace falta transparencia.
await (destino.endsWith('.png')
  ? salida.png({ compressionLevel: 9, palette: true })
  : salida.jpeg({ quality: 82, mozjpeg: true, progressive: true })
).toFile(destino)

const final = await sharp(destino).metadata()
console.log(`destino: ${final.width}×${final.height} ${final.format}, ${kb(destino)} KB`)

function kb(ruta) {
  return Math.round(statSync(ruta).size / 1024)
}
