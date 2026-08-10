# Despliegue a producción

Guía de la puesta en marcha real. Está ordenada a propósito: cada paso necesita
lo anterior, y hacerlo en otro orden obliga a repetir trabajo. El webhook, por
ejemplo, no se puede crear antes de que exista la URL desplegada.

Estado: **nunca se ha desplegado**. Nada de lo que sigue está hecho.

---

## 0. La arquitectura, y por qué no se parte en dos

Decidido con el cliente (agosto de 2026): **Hostinger y Railway**.

| Pieza | Dónde | Qué es |
|---|---|---|
| `abundancecode.us` | Hostinger | La landing que vende. **No es este proyecto** |
| `app.abundancecode.us` | Railway | Esta app, entera |
| Base de datos y autenticación | Supabase | `abundance-code-dev` |
| Cobros | Stripe | La landing cobra; aquí solo se escucha el webhook |

**Esta app no se separa en «front» y «back», y no es una elección.** Es Next.js
con App Router: las pantallas son componentes de **servidor** que consultan
Supabase directamente, las acciones (`generarLectura`, `consultarGuia`,
`marcarActivacionLeida`) se ejecutan en el servidor, y el webhook de Stripe es
una ruta del mismo proyecto. No existe una API suelta que mover a un sitio ni un
front estático que subir a otro. Partirlos sería reescribir el producto como API
más SPA.

Se despliega **como una sola unidad en Railway**. Hostinger participa con el
**DNS**: un CNAME del subdominio apuntando a Railway.

### Por qué Railway resuelve un problema que Vercel traía

Generar la lectura base tarda unos **73 segundos**. En una plataforma serverless
eso es un problema serio: Vercel corta a los 15 s por defecto y su plan Hobby
tiene un techo absoluto de 60 s, por debajo de lo que hace falta. Habría obligado
a plan Pro o a rehacer `/generando` como trabajo en segundo plano.

**Railway no es serverless.** Es un contenedor con un proceso Node servidor: una
petición dura lo que dure. El problema desaparece sin escribir una línea.

Los `export const maxDuration` que hay en el código son inofensivos fuera de
Vercel —se ignoran— y se conservan a propósito: documentan cuánto tarda de
verdad cada pantalla, y protegen si algún día se mueve a una plataforma que sí
corte.

---

## 1. Dos decisiones que siguen abiertas

### 1.1 La base de datos: riesgo aceptado

Producción corre sobre **`abundance-code-dev`** (`exwfdgpgftguwovshgsn`), bajo la
cuenta institucional `juan_ayala82231@elpoli.edu.co`. **Decisión del cliente,
tomada a sabiendas.** Queda escrito lo que se asume:

1. **Producción y desarrollo comparten base.** Las pruebas de integración
   (`npm run test:integration`) crean y borran usuarios reales contra ella. Se
   limpian solos, pero corren sobre los mismos datos que los clientes.
2. **La cuenta puede caducar.** Las cuentas de universidad se desactivan al
   terminar los estudios, y con ellas el acceso a la base de un cliente que
   paga: datos de nacimiento, cartas y lecturas.

Mitigación mínima mientras siga así: **copias de seguridad**. Supabase → Database
→ Backups. Y no ejecutar `test:integration` con clientes reales dentro.

### 1.2 Cómo modela la landing los dos precios

El precio es **49 $ el primer mes y 15 $/mes después**. Eso está confirmado. Lo
que falta es **cómo lo construye la landing en Stripe**, porque hay varias formas
y cambian qué eventos llegan:

- Una suscripción cuyo primer periodo cuesta 49 $ y luego pasa a 15 $
  (*subscription schedule* con dos fases).
- Un pago único de 49 $ y una suscripción de 15 $ que arranca a los 30 días.
- Una suscripción de 15 $ con 30 días de prueba y un cargo inicial de 49 $.

Las reglas de acceso funcionan en los tres casos: lo que se mira es el estado de
la suscripción, no cómo se compuso. Pero conviene saberlo para interpretar los
eventos y para probar la baja.

**Lo que sí es seguro en los tres: todo comprador es un suscriptor.** No hay
compras sueltas, así que las bajas y los impagos son el funcionamiento normal y
tienen que aplicarse bien — de ahí que `Customers: read` en la clave restringida
(§8.2) no sea opcional.

---

## 2. Commitear

Nada está commiteado. Desplegar trabajo sin commitear deja sin punto al que
volver cuando algo salga mal, que es justo cuando hace falta.

## 3. Verificar en local

```bash
npm run verify          # el código
npm run check:entorno   # el entorno de tu máquina
```

## 4. Migraciones sobre la base de producción

```bash
npx supabase link --project-ref exwfdgpgftguwovshgsn
npx supabase db push
```

Las migraciones están versionadas en `supabase/migrations/`. **Nunca tocar el
esquema a mano desde el panel**: el esquema vive en el repo.

## 5. Desplegar en Railway

1. **New Project → Deploy from GitHub repo** y elegir este repositorio.
2. Railway detecta Next.js con Nixpacks. Comandos, si hay que declararlos:
   - Build: `npm run build`
   - Start: `npm run start`
3. **Antes del primer build, cargar las variables de entorno** (paso 8). No es un
   detalle de orden: las `NEXT_PUBLIC_*` se **incrustan en el build**, no se leen
   al arrancar. Si se construye sin ellas, el bundle sale con valores vacíos y no
   se arregla reiniciando — hay que **volver a construir**.
4. `PORT` lo inyecta Railway y `next start` lo respeta. No fijarlo a mano.
5. **No definir `NEXT_DIST_DIR`** en Railway. Es la variable que `verify` usa en
   local para no pisar el servidor de desarrollo; en producción sobra y solo
   puede desalinear build y arranque.

Railway da un dominio propio (`*.up.railway.app`). Sirve para terminar el resto
de pasos; el dominio bonito viene después.

## 6. El dominio, desde Hostinger

1. En Railway → **Settings → Networking → Custom Domain**: `app.abundancecode.us`.
   Railway indica el destino CNAME.
2. En Hostinger → **DNS del dominio** → registro **CNAME**:
   - Nombre: `app`
   - Destino: el que dé Railway
3. Esperar propagación y comprobar que responde por https.

**El certificado tiene que estar activo antes del paso 7.** Stripe no entrega
webhooks a un https que no valide.

## 7. Publicar la app de Google OAuth

Está en **modo prueba**: solo entran los correos añadidos a mano como usuarios de
prueba. En producción eso significa que **ningún cliente real puede entrar**.

Google Cloud → proyecto `abundance-code` → **APIs y servicios → Pantalla de
consentimiento OAuth → Publicar aplicación**. Es inmediato: los permisos `email`
y `profile` no requieren verificación.

Y en **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://app.abundancecode.us`
- **Redirect URLs**: añadir ese dominio

Sin esto, el login con Google vuelve a `localhost` después de autenticar. Es el
fallo más común del primer despliegue y no da ningún error claro: el usuario
acaba en una página que no existe.

## 8. Stripe — **ya no es cosa nuestra**

> **Este apartado quedó obsoleto** al conocerse `BRIEF-APP-INTEGRACION.md`, el
> contrato acordado entre los dos equipos. Dice: «La app no cobra nada. No
> necesita Stripe, ni claves, ni webhooks.»
>
> **No registres el endpoint del webhook, ni crees la clave restringida.** El
> webhook de Stripe lo tiene la landing, y añadir el nuestro pondría un segundo
> escritor sobre el acceso. Lo que esta app necesita es el apartado 8.bis.
>
> Se conserva escrito por si algún día el reparto cambia.

<details>
<summary>Lo que habría hecho falta si la app cobrara (obsoleto)</summary>

### 8.0 · Stripe en modo live

### 8.1 El endpoint del webhook

Stripe → **Developers → Webhooks → Add endpoint**, con el interruptor en **modo
live** (no test):

- **URL**: `https://app.abundancecode.us/api/stripe/webhook`
- **Eventos** — exactamente estos cuatro, los que el código interpreta
  (`EVENTOS_RELEVANTES`):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copiar el **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

> Es el secreto de firma **de ese endpoint concreto**, no una clave de API. Y el
> de modo test es **idéntico a la vista**: si se confunden, la firma no valida
> nunca y **todos los pagos reales se pierden en silencio**, con un solo «firma
> no válida» en el log. Es el error más caro de esta guía.

### 8.2 La clave restringida

Stripe → **Developers → API keys → Create restricted key**, en modo live.
Permisos, solo estos dos:

| Recurso | Permiso | Para qué |
|---|---|---|
| Billing Portal Sessions | write | Abrir el portal de facturación |
| Customers | **read** | **Resolver el email del cliente en los eventos de suscripción** |

→ `STRIPE_SECRET_KEY` (empieza por `rk_live_`).

**Nunca una `sk_live_`.** Esta app no cobra: una clave secreta completa le daría
capacidad de cobrar y reembolsar que no necesita. `check:produccion` lo rechaza.

`Customers: read` **no es opcional**: los webhooks de Stripe no expanden
`customer`, así que sin ese permiso ningún evento de suscripción se puede
emparejar con una cuenta y las cancelaciones no se aplicarían.

</details>

## 8.bis Lo que sí hay que acordar con el equipo de la landing

Son cuatro cosas, y **sin las dos primeras la app no puede dar acceso a nadie**:

1. **La URL pública de su backend Express** → `LANDING_API_URL`. Su brief la
   daba por pendiente de redespliegue.
2. **`APP_SHARED_SECRET`**, el secreto compartido de `/redeem` y `/status`. Va en
   las variables del servidor, **nunca en el navegador**: sus llamadas son
   servidor a servidor y su CORS solo acepta peticiones desde su dominio.
3. **La URL de esta app y su ruta de entrada.** Es el `success_url` de Stripe,
   que ellos componen con `APP_PUBLIC_URL` + `APP_ACTIVATE_PATH` (hoy
   `/activar`). Su brief propone `app.abundancecode.us`; aquí se ha venido
   asumiendo `app.abundancecode.us`. **Hay que elegir una y decírsela**, o el
   comprador aterrizará donde no hay nada.
4. **El código corto `AC-XXXX-XXXX`.** Su correo de acceso lo incluye, pero hoy
   `/redeem` solo acepta el token largo. O añaden soporte para canjear por
   código, o queda solo como referencia de soporte.

Y una pregunta de producto que sigue abierta en su §6: **¿renovación automática
o aceptada?** Está montado como automática. Si la intención es invitar a los 30
días y no cobrar a quien no haga nada, es otro montaje en Stripe y cambia el
copy, los términos y el aviso legal.

## 9. Lo que la landing tiene que hacer

Es un sistema que **no controlamos**, y de ello depende que alguien reciba lo que
compra. Conviene confirmarlo antes de vender:

**La sesión de Checkout debe llevar el email del comprador**, en `customer_email`
o en `customer_details`. Es la única forma de emparejar la compra con la cuenta
de Google con la que después inicie sesión. Si llega sin email y el cliente de
Stripe tampoco lo tiene, la compra no concede acceso.

## 10. Variables de entorno en Railway

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ídem |
| `SUPABASE_SERVICE_ROLE_KEY` | ídem — **salta RLS, jamás en el cliente** |
| `NEXT_PUBLIC_LANDING_URL` | `https://abundancecode.us` (sin la «n», confirmado) |
| `LANDING_API_URL` | paso 8.bis — **sin esto nadie obtiene acceso** |
| `APP_SHARED_SECRET` | paso 8.bis — **ídem** |
| `OPENAI_API_KEY` | **rotada**: la anterior se pegó en un chat |
| `GEOCODING_API_KEY` | usuario de GeoNames (`abundane`) |
| `SUPABASE_PROYECTO_CONFIRMADO` | `sí` |

Al cambiar cualquier `NEXT_PUBLIC_*`, **volver a construir**: van dentro del
bundle, no se leen al arrancar.

## 11. Comprobar que funciona de verdad

Que despliegue sin errores no dice nada sobre si un cliente recibe lo que paga.
Estas cinco cosas sí:

1. **Entorno**: `npm run check:produccion` con las variables de producción.
2. **Webhook**: en Stripe, en el endpoint → *Send test event* →
   `checkout.session.completed`. Debe responder **200**. Un 400 es firma mal
   configurada (8.1); un 500, entorno.
3. **Compra real**: una compra de verdad en modo live, con importe mínimo. Debe
   aparecer una fila en `entitlements` con ese email y `status = 'active'`.
4. **Login real**: entrar con una cuenta de Google que **no** sea usuario de
   prueba. Si falla, la app OAuth sigue sin publicar (paso 7).
5. **Lectura completa**: onboarding → `/generando` de principio a fin, sin cortes.
   Es lo único que demuestra que los 73 s caben, y no se puede comprobar en local.

Y una **cancelación**: cancelarla en Stripe y ver que `entitlements.status` pasa a
`canceled`. Ejercita el camino que antes se descartaba en silencio.

## 12. Coste

**~0,23 $ por usuario** en un ciclo completo de 30 días con uso máximo: lectura
base (0,078 $) + 30 activaciones (~0,001 $) + 90 consultas de guía (~0,0013 $).
Más lo que cueste el contenedor en Railway y el plan de Supabase.

Falta fijar el **precio de venta** para saber qué margen deja.

## 13. Volver atrás

Railway guarda los despliegues anteriores: **Deployments → … → Redeploy** sobre
el que funcionaba.

Lo que **no** vuelve atrás solo son las migraciones. Por eso van versionadas y
por eso no se tocan a mano: cada cambio de esquema debe poder aplicarse sobre el
anterior sin depender de lo que alguien hiciera en el panel.
