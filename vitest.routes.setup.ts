import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

const PORT = 3100
export const BASE_URL = `http://127.0.0.1:${PORT}`

let server: ChildProcess | undefined

async function respondeAlgo(): Promise<boolean> {
  try {
    await fetch(BASE_URL, { redirect: 'manual', signal: AbortSignal.timeout(1500) })
    return true
  } catch {
    return false
  }
}

async function esperarServidor(timeoutMs = 60_000) {
  const limite = Date.now() + timeoutMs

  while (Date.now() < limite) {
    if (await respondeAlgo()) return
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  throw new Error(`El servidor no respondió en ${timeoutMs}ms`)
}

export async function setup() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')

  const distDir = process.env.NEXT_DIST_DIR || '.next'
  if (!existsSync(`${distDir}/server/middleware-manifest.json`)) {
    throw new Error(
      `Falta el build de producción en ${distDir}. Ejecuta "npm run build:verify" antes.`,
    )
  }

  /*
   * Si el puerto ya está ocupado, `next start` falla al arrancar y las pruebas
   * acaban interrogando a un servidor VIEJO, con un build anterior. Eso produce
   * fallos incomprensibles —o peor, aciertos falsos— así que se aborta de forma
   * explícita en vez de continuar.
   */
  if (await respondeAlgo()) {
    throw new Error(
      `Ya hay algo escuchando en el puerto ${PORT}. Sería un servidor de una ` +
        'ejecución anterior y las pruebas se harían contra un build obsoleto. ' +
        'Ciérralo antes de continuar.',
    )
  }

  server = spawn('npx', ['next', 'start', '--port', String(PORT)], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: process.env,
  })

  await esperarServidor()

  /*
   * `next dev` y `next build` comparten la carpeta .next. Si el servidor de
   * desarrollo sigue corriendo mientras se construye, va reescribiendo esos
   * artefactos y el build de producción queda a medias: el servidor arranca
   * pero devuelve 500 en todo, con un "Cannot find module './NNN.js'" que no
   * se parece en nada a la causa real.
   */
  const res = await fetch(BASE_URL, { redirect: 'manual' })
  if (res.status >= 500) {
    throw new Error(
      `El servidor responde ${res.status} incluso en la home. Lo más probable ` +
        'es que "npm run dev" estuviera corriendo durante el build y haya ' +
        'corrompido .next. Ciérralo, ejecuta "npm run build" y repite.',
    )
  }
}

export async function teardown() {
  const pid = server?.pid
  if (!pid) return

  if (process.platform === 'win32') {
    // En Windows el proceso se lanza a través del shell, así que `kill()` mata
    // el intermediario y deja vivo al servidor. Hay que matar el árbol entero.
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    server?.kill()
  }
}
