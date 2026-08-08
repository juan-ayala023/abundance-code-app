import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

const PORT = 3100
export const BASE_URL = `http://127.0.0.1:${PORT}`

let server: ChildProcess | undefined

async function esperarServidor(timeoutMs = 60_000) {
  const limite = Date.now() + timeoutMs

  while (Date.now() < limite) {
    try {
      await fetch(BASE_URL, { redirect: 'manual' })
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  throw new Error(`El servidor no respondió en ${timeoutMs}ms`)
}

export async function setup() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')

  if (!existsSync('.next/server/middleware-manifest.json')) {
    throw new Error('Falta el build de producción. Ejecuta "npm run build" antes.')
  }

  server = spawn('npx', ['next', 'start', '--port', String(PORT)], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: process.env,
  })

  await esperarServidor()
}

export async function teardown() {
  server?.kill()
}
