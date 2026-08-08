import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { test as base, type BrowserContext } from '@playwright/test'

/**
 * Sesión de prueba sin pasar por Google.
 *
 * El login real es OAuth con Google, que no se puede automatizar de forma
 * fiable. En su lugar se crea un usuario con contraseña por la API de
 * administración, se inicia sesión y se inyectan las cookies resultantes en el
 * navegador.
 *
 * El formato de esas cookies no se adivina: se le pregunta a `@supabase/ssr`
 * usando un almacén falso y quedándose con lo que escribe. Si la librería
 * cambia su formato, esto sigue funcionando.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const PASSWORD = 'E2E-Password-1234!'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export type UsuarioE2E = {
  id: string
  email: string
}

/** Crea un usuario y, si se pide, su compra activa. */
export async function crearUsuario(etiqueta: string, conCompra: boolean): Promise<UsuarioE2E> {
  const email = `e2e-${etiqueta}-${Date.now()}@example.com`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw new Error(`No se pudo crear el usuario: ${error.message}`)

  if (conCompra) {
    const { error: errorCompra } = await admin
      .from('entitlements')
      .insert({ email, status: 'active', plan: 'e2e', source: 'e2e' })
    if (errorCompra) throw new Error(`No se pudo sembrar la compra: ${errorCompra.message}`)
  }

  return { id: data.user!.id, email }
}

export async function borrarUsuario(usuario: UsuarioE2E) {
  await admin.auth.admin.deleteUser(usuario.id)
  await admin.from('entitlements').delete().eq('email', usuario.email)
}

/** Inicia sesión y traduce el resultado a cookies del navegador. */
export async function inyectarSesion(
  context: BrowserContext,
  email: string,
  baseURL = 'http://127.0.0.1:3200',
) {
  const cliente = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await cliente.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (error || !data.session) {
    throw new Error(`No se pudo iniciar sesión: ${error?.message}`)
  }

  // Almacén falso: sirve solo para capturar lo que @supabase/ssr quiere escribir.
  const capturadas: { name: string; value: string }[] = []

  const ssr = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [],
      setAll: (lista) => {
        for (const { name, value } of lista) capturadas.push({ name, value })
      },
    },
  })

  await ssr.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })

  if (capturadas.length === 0) {
    throw new Error('@supabase/ssr no escribió ninguna cookie de sesión.')
  }

  // Se usa `url` en vez de `domain`+`path`: con direcciones IP el emparejado
  // por dominio es caprichoso, y aquí el host es 127.0.0.1.
  await context.addCookies(
    capturadas.map(({ name, value }) => ({ name, value, url: baseURL })),
  )
}

/**
 * Test con un usuario ya autenticado y con compra activa.
 *
 * Cada test recibe el suyo: no comparten estado, así que pueden completar el
 * onboarding sin pisarse.
 */
export const test = base.extend<{ usuario: UsuarioE2E }>({
  /*
   * `auto: true` es lo que hace que esto funcione. Sin ello, un test que solo
   * pide `page` nunca dispara la fixture, se ejecuta sin sesión y acaba
   * probando la pantalla de login creyendo que prueba el portal.
   */
  usuario: [
    async ({ context, baseURL }, use, testInfo) => {
      const etiqueta = testInfo.title.replace(/[^a-z0-9]/gi, '').slice(0, 20).toLowerCase()
      const usuario = await crearUsuario(etiqueta || 'test', true)

      await inyectarSesion(context, usuario.email, baseURL)
      await use(usuario)
      await borrarUsuario(usuario)
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
