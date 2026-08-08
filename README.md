# Abundance Code — Portal

Portal de astrología personalizada. Next.js 15 (App Router) + Supabase.
El contexto permanente del repo está en `CLAUDE.md`; léelo antes de tocar nada.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena los valores
npm run dev
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (falla ante errores de tipos o lint) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Tests unitarios (vitest) |
| `npm run test:routes` | Protección de rutas contra el build real |
| `npm run test:integration` | RLS contra el proyecto Supabase real |
| `npm run test:e2e` | Páginas tras login, en navegador real |
| `npm run test:e2e` | Tests e2e (playwright) |
| `npm run check:secrets` | Verifica que ningún secreto de servidor llegó al bundle del cliente |
| `npm run check:actions` | Verifica que los módulos `'use server'` solo exportan funciones asíncronas |
| `npm run verify` | typecheck + lint + test + build + check:secrets + test:routes |

`npm run verify` es la comprobación que debe pasar antes de dar por cerrada
cualquier fase.

## Base de datos

Migraciones versionadas en `supabase/migrations/`, aplicadas con:

```bash
npx supabase db push
```

Nunca hacer cambios manuales en el dashboard: el esquema vive en el repo.
Para verificar las políticas contra el proyecto real:

```bash
npm run test:integration
```

Crea dos usuarios de verdad e intenta que uno acceda a los datos del otro.
Se limpian solos al terminar.

## Estado

Lo que existe hoy:

- Repositorio git propio, aislado del repo del directorio home.
- Next.js 15 + React 19 + TypeScript estricto, Tailwind 4, shadcn/ui configurado.
- Validación de entorno con zod, separando lo público de lo secreto
  (`src/lib/env/`). Los secretos de servidor están tras `server-only`.
- Clientes de Supabase para navegador, servidor y administración
  (`src/lib/supabase/`), más refresco de sesión en `middleware.ts`.
- Comprobación automatizada de fuga de secretos al cliente.

De la fase 1 (datos y acceso), ya está hecho:

- Las 6 tablas de CLAUDE.md §6, con sus triggers, índices y restricciones.
- RLS activo en todas, con privilegios concedidos de forma explícita por rol.
- `claim_entitlement()`: vincula la compra con la cuenta por email, sin permitir
  que el usuario escriba en `entitlements` ni se apropie de uno ajeno.
- 17 pruebas de integración que verifican todo lo anterior contra la base real.

Del flujo de acceso, ya está hecho:

- Login con Google (`/activar`), canje del código en `/auth/callback` y
  vinculación automática de la compra con la cuenta.
- Pantalla `/activar/vincular` para quien entra sin compra o con la suscripción
  inactiva: siempre ofrece una salida, nunca un callejón (CLAUDE.md §3.5).
- Protección de rutas de `(app)` en el middleware (sesión) y en su layout
  (entitlement activo), con 15 pruebas contra el servidor real.

Del webhook de Stripe:

- `/api/stripe/webhook` con firma verificada sobre el cuerpo crudo,
  idempotencia por `stripe_events.id` y descarte de eventos que llegan fuera
  de orden (`apply_stripe_entitlement`). Stripe no garantiza el orden de
  entrega, así que las dos defensas son necesarias y distintas.

Del onboarding:

- `resolveBirthInstant()`: fecha + hora + zona → instante UTC usando el desfase
  vigente en ESA fecha. Detecta horas locales que no existieron y las que
  ocurrieron dos veces.
- Geocoding con GeoNames tras `GeocodingProvider`, vía `/api/geo/search`.
- Formulario `/onboarding`, que obliga a elegir la ciudad de la lista porque la
  carta necesita coordenadas y zona horaria, no un nombre escrito a mano.

Pantallas del portal, todas con navegación lateral y el sistema visual de la
marca: `/portal`, `/carta`, `/lectura-base`, `/activacion`, `/guia`, `/cuenta`
y `/generando`, más las públicas `/` y `/planes`.

Las secciones cuyo contenido depende de la capa de IA muestran su estructura y
dicen que aún no está generada. **No se rellenan con texto de muestra**: en un
producto cuyo entregable es una interpretación personal, un párrafo de relleno
puede confundirse con la lectura del usuario.

Lo que **no** existe todavía:

- Vinculación por correo de verificación cuando el email de Google no coincide
  con el de la compra (CLAUDE.md §3.5): requiere decidir proveedor de email.
  Hoy la salida es entrar con otra cuenta o escribir a soporte.
- Redención del token legacy `/activar?token=…`: el parámetro se acepta sin
  romper nada, pero todavía no hace nada.
- Portal de facturación de Stripe (`/api/billing/portal`).
- Tabla legacy `access_tokens`: hace falta el esquema real del sistema anterior.
- Cálculo de la carta natal, capa de IA y el resto de pantallas.
- i18n: `next-intl` está instalado pero sin cablear.

## Páginas tras login: `npm run test:e2e`

`npm run test:routes` solo ve lo que ve un visitante sin sesión —una
redirección— así que las páginas de `(app)` nunca llegaban a renderizarse en
las pruebas. Dos errores de render se escaparon por ahí.

Las pruebas e2e cierran ese hueco. No automatizan el login de Google, que no es
fiable de automatizar: crean un usuario con contraseña por la API de
administración, inician sesión y **le preguntan a `@supabase/ssr` qué cookies
espera**, usando un almacén falso y quedándose con lo que escribe. Si la
librería cambia su formato, el arnés sigue funcionando.

La fixture de sesión es `auto: true` a propósito. Sin eso, un test que solo pida
`page` no la dispara, se ejecuta sin sesión y acaba comprobando la pantalla de
login creyendo que comprueba el portal — pasando en verde.

## `dev` y `verify` usan carpetas de build distintas

Por defecto `next dev` y `next build` comparten `.next`, y se pisan en las dos
direcciones: el build deja al servidor de desarrollo sirviendo CSS y chunks que
ya no existen, y el servidor de desarrollo deja el build a medias con un
`Cannot find module './NNN.js'` que no se parece en nada a la causa real.

Por eso `npm run verify` construye en `.next-verify` (vía `NEXT_DIST_DIR`) y no
toca `.next`. Puedes tener `npm run dev` abierto mientras verificas.

`vitest.routes.setup.ts` mantiene además dos guardas: aborta si el puerto 3100
ya está ocupado —las pruebas irían contra un build viejo— y si el servidor
devuelve 500 en la home, que delata un build corrupto.

## `middleware.ts` va dentro de `src/`

Con directorio `src/`, Next.js **solo** reconoce el middleware en
`src/middleware.ts`. En la raíz del proyecto se compila, aparece en el bundle y
**no se ejecuta nunca**, sin un solo error ni aviso. El resultado es una app que
parece protegida y no lo está.

`npm run test:routes` existe justamente para eso: comprueba contra el servidor
de producción que las rutas de `(app)` redirigen. Si alguien vuelve a mover el
archivo, esas pruebas fallan.

## Desviaciones conscientes

- **`eslint-config-next` va en la 16 aunque Next esté en la 15.** La 15 solo
  trae configuración estilo `eslintrc`, que con ESLint 9 hay que cargar vía
  `FlatCompat` y produce un error de estructura circular al resolver plugins.
  La 16 exporta flat config nativo y lintea el proyecto sin incidencias.
- **`next lint` está deprecado**; el script `lint` llama a `eslint` directamente.
- **Override de `postcss`.** Next fija `postcss@8.4.31` exacto, que arrastra un
  XSS conocido. `package.json` fuerza `^8.5.26` (mismo major, compatible).
  Revisar el override al subir de versión de Next.

## Claves de Stripe: nunca `sk_live`

Esta app no cobra (§1). Con Stripe solo hace dos cosas:

- **Verificar firmas de webhook**, que usa `STRIPE_WEBHOOK_SECRET` y **no** la
  clave de API.
- **Abrir el portal de facturación**, que necesita permisos mínimos.

Por eso `STRIPE_SECRET_KEY` debe contener una **clave restringida** creada para
esta app, con solo `Billing Portal Sessions: write` y `Customers: read`. Una
clave secreta completa daría a este proceso capacidad de cobrar y reembolsar
que no necesita para nada.

En desarrollo, siempre claves de test (`sk_test_`).

## Riesgo aceptado: cuenta propietaria de Supabase

El proyecto `abundance-code-dev` (`exwfdgpgftguwovshgsn`) vive bajo la cuenta
institucional `juan_ayala82231@elpoli.edu.co`. Las cuentas de universidad se
desactivan al terminar los estudios; si el proyecto de producción acaba ahí, se
pierde el acceso a la base de datos de un cliente.

Decisión tomada de forma consciente. **Revisar antes del cutover a producción**:
ese es el último momento en que mover el proyecto sigue siendo barato.

## Seguridad de dependencias

`npm audit` reporta 2 vulnerabilidades altas, ambas con la misma raíz:
`sharp@0.34.x` hereda CVEs de libvips. El fix exige `sharp >= 0.35`, fuera del
rango que Next 15 declara (`^0.34.3`), y lo único que npm propone es subir a
Next 16 — un cambio de major que `CLAUDE.md` §2 no contempla.

`sharp` solo interviene en la optimización de imágenes y hoy no se usa
`next/image`. Queda como decisión pendiente: aceptar el riesgo mientras no haya
imágenes optimizadas, o evaluar el salto a Next 16.

## Decisiones tomadas (delegadas, revisables)

El cliente delegó estas tres. Quedan por escrito para poder revertirlas.

**Geocoding: GeoNames.** Gratuito, permite almacenar los resultados —que es
exactamente lo que hacemos al guardarlos en `portals`, y donde la licencia de
Google Places habría dado problemas— y devuelve la zona horaria IANA en la
misma respuesta. Vive tras `GeocodingProvider`: cambiarlo es sustituir un
adaptador. **Requiere registrar un usuario gratuito** (ver `.env.example`).

**Cálculo de la carta: API externa primero.** Permite tener cartas reales en
días en vez de semanas y aplaza sin coste la decisión de licencia de Swiss
Ephemeris. Irá detrás de un adaptador que siempre devuelva el mismo formato
—el que ya guarda `portals.chart`— para poder migrar a motor propio cuando el
volumen lo justifique. Dos condiciones al elegir proveedor: que soporte
**Placidus** (§7) y que sus condiciones sobre datos personales sean aceptables,
porque le enviaríamos fecha, hora y lugar de nacimiento de los clientes.

**Presupuesto de IA: $0,15 por lectura, provisional.** Fijado a falta de
conocer el precio de venta. Cuando se sepa, se ajusta.

## Decisiones abiertas

Estas bloquean fases posteriores y necesitan confirmación humana:

1. ~~Ortografía del dominio de la landing.~~ **Resuelto**: el cliente confirma
   que la landing es `abundacecode.com`, sin la "n". No es una errata. El código
   nunca lo hardcodea de todos modos: usa `NEXT_PUBLIC_LANDING_URL`.
2. **Proveedor de geocoding.** Afecta a coste y, sobre todo, a si la licencia
   permite almacenar los resultados en `portals` (lat, lng, tz).
3. **Modelo de IA y presupuesto por lectura.** El proveedor por defecto es
   Anthropic vía Vercel AI SDK. El ID de modelo vigente es `claude-opus-5`.
   Falta fijar el techo de coste por lectura para dimensionar los prompts.
4. **Licencia de efemérides.** Swiss Ephemeris es AGPL o licencia comercial de
   pago. Si el proyecto es cerrado, hay que decidir antes de construir el motor.
