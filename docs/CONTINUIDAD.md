# Continuidad — Abundance Code

Documento para retomar el trabajo en otra conversación. Léelo entero antes de
tocar nada, junto con `CLAUDE.md` (contexto permanente) y
`docs/hallazgos-app-anterior.md` (discrepancias con el producto real).

---

## 1. Qué es y dónde está

Migración de **Abundance Code** —portal de astrología personalizada— desde
Lovable (React + Vite + Lovable Cloud) a **Next.js 15 + Supabase**.

- **Código:** `c:\Users\user\Desktop\App Australia`
- **Git:** repo propio, rama `main`, **solo local** (sin remoto). 13 commits.
- **App anterior en producción:** `astro-ai-decoder.lovable.app`
- **Landing de pago:** `https://abundacecode.com` — **sin la «n»**, confirmado
  por el cliente, no es una errata.

El pago ocurre en la landing externa. Esta app **no cobra**: valida acceso,
calcula la carta y genera interpretaciones.

## 2. Cómo arrancar

```bash
npm install
npm run dev          # http://localhost:3000
npm run verify       # typecheck + lint + check:actions + tests + build + secretos + rutas + e2e
```

`.env.local` ya está configurado con Supabase, Stripe (test) y GeoNames.

## 3. Estado

**174 pruebas, `npm run verify` en verde.**

| Suite | Nº | Qué cubre |
|---|---|---|
| Unitarias | 95 | Instante de nacimiento, geometría, validación, Stripe, entorno, ciclo |
| Rutas | 22 | Protección de rutas y webhook, contra el build de producción |
| e2e | 18 | Pantallas tras login, en navegador real |
| Integración | 22 | RLS y `apply_stripe_entitlement` contra la base real |

### Hecho

- **Base de datos**: 6 tablas de CLAUDE.md §6, RLS en todas, privilegios
  explícitos por rol, migraciones versionadas en `supabase/migrations/`.
- **Acceso**: login con Google, `claim_entitlement()` que vincula compra y
  cuenta por email, protección en dos capas (sesión en middleware, entitlement
  en el layout de `(app)`).
- **Webhook de Stripe**: firma verificada, idempotencia por `stripe_events.id`,
  y descarte de eventos que llegan fuera de orden.
- **Onboarding**: `resolveBirthInstant()` con desfases históricos, geocoding
  con GeoNames, formulario completo.
- **Carta natal**: contrato de datos, rueda SVG, tabla de posiciones, descarga
  en PNG. **El cálculo real no existe todavía** — se muestra un ejemplo con
  aviso explícito.
- **Front completo**: portal, carta, lectura base, activación, guía, cuenta,
  generando, más las públicas. Sistema visual de la marca aplicado.

### No hecho

- **Cálculo de la carta** (decidido: API externa primero, sin proveedor elegido).
- **Capa de IA**: ninguna llamada a modelo todavía.
- **Tercer estado de acceso**: pasados los 30 días la lectura base debe seguir
  visible y la guía exigir suscripción. El contador de días sí está resuelto
  (`diaDelCiclo()`), la regla de acceso no.
- **Vinculación por correo** cuando el email de Google no coincide con el de la
  compra (§3.5): hoy la salida es cambiar de cuenta o soporte.
- **Token legacy** `/activar?token=`: se acepta sin romper, no hace nada.
- **`access_tokens` / `activation_codes`**: falta el esquema real del sistema
  anterior.
- **i18n**: `next-intl` instalado, sin cablear.
- **Despliegue**: nunca se ha desplegado.

## 4. Decisiones tomadas (el cliente delegó, son revisables)

| Decisión | Elección | Motivo |
|---|---|---|
| Geocoding | **GeoNames** | Gratis y **permite almacenar** resultados, que es lo que hacemos en `portals`. Google Places lo restringe. |
| Cálculo de carta | **API externa primero** | Cartas reales en días; aplaza sin coste la licencia de Swiss Ephemeris. Detrás de adaptador → migrable. |
| Presupuesto IA | **$0,15/lectura**, provisional | A falta del precio de venta. |
| Modelo | `claude-opus-5` | Anthropic por defecto (CLAUDE.md §2). |

Al elegir proveedor de carta, dos condiciones: que soporte **Placidus** (§7) y
que sus condiciones sobre datos personales sean aceptables — le enviaríamos
fecha, hora y lugar de nacimiento de los clientes.

## 5. Trampas descubiertas (cada una costó tiempo)

**`middleware.ts` va en `src/`.** Con directorio `src/`, Next solo lo reconoce
en `src/middleware.ts`. En la raíz compila, aparece en el bundle y **no se
ejecuta jamás**, sin aviso. La app parecía protegida y no lo estaba.
`npm run test:routes` existe para eso.

**`next dev` y `next build` compartían `.next`.** Se pisaban en ambas
direcciones (build a medias, o CSS sirviendo 404). Resuelto: `verify` construye
en `.next-verify` vía `NEXT_DIST_DIR`. Ya se pueden usar a la vez.

**Un módulo `'use server'` solo puede exportar funciones asíncronas.** Exportar
una constante compila, pasa el build y llega al cliente como `undefined`.
`npm run check:actions` lo detecta.

**Una variable de entorno vacía no es una variable ausente para zod.**
`ANTHROPIC_API_KEY=` sin valor tumbaba el webhook de Stripe. Resuelto con
`preprocess` y `requireServerEnv(nombre, para)`.

**Servidores zombis en Windows.** `pkill` no mata node. Si las pruebas fallan
de forma incomprensible, comprueba los puertos 3000/3100/3200 con
`Get-NetTCPConnection` antes de investigar otra cosa. Ya ocurrió dos veces que
las pruebas corrieran contra un build viejo.

**La fixture de sesión e2e necesita `auto: true`.** Sin eso, un test que solo
pide `page` no la dispara y comprueba la pantalla de login creyendo que
comprueba el portal — **pasando en verde**.

**`service_role` también necesita `GRANT`.** El proyecto tiene desactivada la
exposición automática de tablas. Saltarse RLS no sirve si falta el privilegio.

**Stripe no garantiza el orden de entrega.** Idempotencia y orden son problemas
distintos y hacen falta las dos defensas.

## 6. Cuentas y credenciales

- **Supabase**: proyecto `abundance-code-dev`, ref `exwfdgpgftguwovshgsn`, bajo
  la cuenta **institucional** `juan_ayala82231@elpoli.edu.co`. Riesgo aceptado
  y documentado en el README: revisar antes del cutover a producción.
- **Google Cloud**: proyecto `abundance-code` dentro de la organización
  `elpoli.edu.co`. La app OAuth está en **modo prueba**: solo entran los correos
  añadidos como usuarios de prueba. **Antes de lanzar hay que publicarla** —es
  inmediato, los permisos `email`/`profile` no requieren verificación.
- **Stripe**: claves de **test** configuradas. El `whsec_` actual puede ser de
  modo live: pendiente de confirmar. Las claves `sk_live`/`rk_live` que se
  expusieron **ya fueron rotadas**.
- **GeoNames**: usuario `abundane`, servicios web activados.

## 7. Pendiente del cliente

1. **¿3 consultas de guía al día?** Confirmado por pantalla en la app anterior;
   CLAUDE.md §8 decía 20. Implementado con 3.
2. **¿Se modela el ciclo de 30 días completo?** Falta el tercer estado de acceso.
3. **¿Se migran los usuarios de la app anterior?** Determina si hay que traer
   códigos de activación e historial.
4. **¿A cuánto se vende la lectura?** Para fijar el techo de coste de IA.
5. **Logo original en vectorial**, si existe. El actual es una interpretación en
   SVG (`src/components/layout/logo.tsx`), se cambia en un archivo.
6. **`whsec_` de modo test** (o usar `stripe listen`).

**La landing todavía NO está vendiendo**, así que no hay clientes en riesgo ni
urgencia de cutover.

## 8. Siguiente paso sugerido

Estaba en curso una **comparación pantalla por pantalla** contra capturas de la
app anterior. Portal y lectura base ya están alineados. Quedan por comparar:
`/activacion`, `/guia`, `/cuenta` y `/generando`.

Después, por orden de valor:

1. **Elegir proveedor de cálculo de carta** — evaluar 2-3, comparar precio,
   soporte de Placidus y política de datos. No contratar sin aprobación.
2. **Capa de IA** — el esquema zod ya existe en `src/lib/lectura/schemas.ts` y
   sirve directamente para `generateObject`. Reglas de CLAUDE.md §8: siempre en
   servidor, la IA **nunca** calcula astronomía, lectura base idempotente.
3. **Tercer estado de acceso** y regla de los 30 días.
4. **Despliegue** en Vercel y webhook de Stripe apuntando ahí.

## 9. Reglas de trabajo que se han seguido

De CLAUDE.md §10, y que conviene mantener:

- Una fase a la vez, resumiendo al final qué se hizo y qué falta.
- Migraciones SQL versionadas, nunca cambios manuales en el dashboard.
- Zod en todo borde externo.
- Errores que no exponen internals; mensaje accionable al usuario.
- Accesibilidad como piso: etiquetas asociadas de verdad, foco visible,
  `prefers-reduced-motion`.
- **Nada de contenido de relleno.** Las secciones sin generar dicen que no están
  generadas. En un producto cuyo entregable es una interpretación personal, un
  párrafo de muestra puede confundirse con la lectura del usuario.
- Ante un conflicto entre CLAUDE.md y lo observado en el producto real, **manda
  el producto**, pero se documenta y se pregunta.
