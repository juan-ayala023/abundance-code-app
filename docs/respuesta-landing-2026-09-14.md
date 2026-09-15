# Respuesta de la landing/backend a los pendientes del 13 de septiembre

Para la sesión que trabaja en la app. Punto por punto, con lo verificado en producción y lo que no se pudo verificar y por qué.

## 1 · El pago no llegaba al checkout — resuelto

Reproducido contra producción con la petición exacta del botón:

```
POST https://api.abundacecode.com/api/stripe/create-subscription-session
→ 200  {"url":"https://checkout.stripe.com/c/pay/cs_live_…","sessionId":"cs_live_…"}
```

La sesión de Stripe se creaba bien. El fallo era **CORS**: `www.abundancecode.us` sirve la web entera sin redirigir y no estaba en la lista de orígenes permitidos. El navegador anulaba la respuesta, el `fetch` lanzaba excepción y la landing lo mostraba como «Problema de conexión». Quien probaba sin `www` no lo veía nunca.

Corregido en el backend (commit `8038855`, desplegado y verificado: el preflight desde `www.abundancecode.us` devuelve 204 con `access-control-allow-origin`). La landing añade además una redirección 301 `www → sin www` en `.htaccess`, ya aplicada en su repo y pendiente de subir a Hostinger.

No era Stripe, ni las claves, ni la conexión de nadie.

## 2 · Compra completa en pruebas — parcial, con token de prueba

**No se puede hacer una compra de prueba**: Stripe está en **modo real** (`cs_live_`). No hay claves de test configuradas y una compra cobraría de verdad. Es una decisión del dueño.

Lo que sí está hecho: **el contrato de canje y estado, verificado en producción** con una fila de suscripción creada a mano en la base del backend (sin pasar por Stripe).

`GET /api/access/status?email=prueba-app@abundancecode.us` devolvió:
```json
{ "email": "prueba-app@abundancecode.us", "name": "…", "plan": "monthly", "status": "active",
  "source": "legacy_sphere", "currentPeriodEnd": "2026-10-15T02:13:53…", "hasAccess": true, "utmCampaign": null }
```

`POST /api/access/redeem { token, appUserId }` devolvió lo mismo más `"alreadyRedeemed": false`. Un segundo canje del mismo token devuelve 200 con `alreadyRedeemed: true`, no error: recargar `/activar` no rompe nada.

**Token sin usar, para vuestra prueba de punta a punta en `/activar`:**

```
https://app.abundancecode.us/activar?token=KlGuOtXx_bZsz-SJfqNQsXEhEIC3LAWj2e8i2hVhzsU
```

Corresponde al correo `prueba-app-2@abundancecode.us`. Iniciad sesión con cualquier cuenta de Google: el canje devuelve el correo que pagó y la app lo vincula por `app_user_id`; ese es justamente el caso «Stripe y Google no coinciden», y el backend lo cubre devolviendo siempre el correo del pago. La revalidación diaria (`/status`) se consulta por ese correo, el del entitlement, no por el de Google.

Hay una segunda fila, `prueba-app@abundancecode.us`, **ya canjeada**, por si queréis probar el camino `alreadyRedeemed`.

Sobre «que al día siguiente siga diciendo `hasAccess: true`»: el estado no caduca por fecha. Solo cambia cuando Stripe manda un webhook (`customer.subscription.updated/deleted`, `invoice.payment_failed`). Estas filas manuales dirán `true` hasta que se borren.

**Sobre el `success_url`**: apunta a `https://app.abundancecode.us/activar?token=…` (dominio `.us`). Desde `446604a` está garantizado por código: aunque la variable `APP_PUBLIC_URL` estuviera vacía o apuntara al prototipo de Lovable, el backend usa la app real.

**Cuando terminéis, borrad las dos filas de prueba** de la tabla `subscriptions` del proyecto Supabase del backend (`xaexhjswztqedoygsodz`):
- `9fb62b48-eb27-4921-8e8f-27152a45bb15` (prueba-app, canjeada)
- `0723aa8c-a10f-4fcf-a12f-ce6134a23598` (prueba-app-2, sin canjear)

Aparecen en la pestaña *Payments* del panel admin mientras existan.

## 3 · Renovación e importe de continuación

- Entrada: **$49 USD**, cargo único, incluye 30 días.
- Después: **$14.99 USD/mes**, renovación automática. En Stripe es una sola suscripción con 30 días de trial; el trial no es gratis, son los días que ya cubrió el cargo inicial.
- Se informa antes de pagar: la landing ya lo muestra en `/pricing` junto al precio (aplicado, pendiente de subir).

**No existe una URL de precio de continuación.** Es la misma suscripción. Dejad el botón a `/pricing` como está.

Dos comportamientos que conviene que sepáis, porque los decide el backend:

- Quien **canceló** y vuelve a `/pricing` paga **$49 otra vez** (se crea un checkout nuevo con su trial). No hay «reactivar por $14.99». Si eso no es lo que se quiere, es una decisión de producto, no un fallo.
- Quien está **`past_due`** sigue con `hasAccess: true` (gracia por impago). Para arreglar su tarjeta debe ir al portal de Stripe (punto 4), no a `/pricing`. Si le mandáis a `/pricing` estando `past_due`, el backend le abriría un segundo checkout, porque solo bloquea el recompra cuando `status === 'active'`.

## 4 · Portal de facturación — verificado por código, no ejecutado

`POST /api/stripe/portal { email }` busca la suscripción por correo y necesita `stripe_customer_id`. **Las filas de prueba no lo tienen** (no pasaron por Stripe), así que con ellas devuelve `404 "No encontramos una suscripción con ese correo."`. Manejad ese caso en la app.

No se puede probar sin una suscripción real de Stripe, y no hay modo de pruebas. Lo que garantiza el código:

1. Cancelar en el portal → Stripe pone `cancel_at_period_end` y **el `status` sigue `active`** → `hasAccess: true` hasta el fin del periodo pagado.
2. Al vencer → webhook `customer.subscription.deleted` → `status: 'canceled'` → `hasAccess: false`.

Es decir: `false` cuando termina el periodo, no antes. Correcto por diseño; pendiente de ejecutar con una suscripción real.

## 5 · Correspondencia landing–app — aplicado en la landing

La landing ya dice lo que hay (aplicado en su repo, pendiente de subir a Hostinger): 30 días y después suscripción; **3 consultas al día, iguales para cualquier cuenta**; lectura base, patrón central, ciclos y tránsitos, guía diaria; **sin historial ni favoritos**; sin numerología, árbol ni ventanas horarias.

**Los PDF legales que enlaza la app no son los vigentes.** La sesión de la landing los comparó con el HTML y difieren: nombran **Wyoming** y **AOA Global Services LLC**, y llevan `[email de soporte]` **sin rellenar**. El dueño gestiona lo legal por su cuenta; hasta que entregue los PDF buenos, lo más seguro es que la app enlace a las páginas HTML de la landing (`/privacy`, `/terms`, `/refund`, `/disclaimer`) en vez de a los PDF.

## 6 · La cuenta de Railway impagada — el backend ya no está ahí

**Este backend se migró el 8 de septiembre** al proyecto `charismatic-vitality`, en la cuenta pagada. `api.abundacecode.com` apunta al servicio nuevo, verificado por DNS y por certificado. **Nada de la app depende de la cuenta impagada.**

Sobre `shimmering-curiosity` «con Postgres y Redis»: **no es este backend**. Este usa Supabase y no tiene Postgres ni Redis propios en Railway. Debe de ser un proyecto anterior. Antes de borrarlo, que el dueño mire qué contiene; después, borrarlo junto con `faithful-perception` (el servicio viejo del backend, también en la cuenta impagada).

---

## Lo que os habíamos pedido y su estado

| Pedido | Estado |
|---|---|
| Resultado del checkout en pruebas | Hecho. Era CORS con `www`; corregido y desplegado. |
| Token de prueba canjeable | Entregado arriba. |
| Importe de renovación y URL de continuación | $14.99 USD/mes. No hay URL aparte. |
| Correo de una suscripción de pruebas activa | `prueba-app-2@abundancecode.us` para `/status`. **Para el portal (punto 4) no sirve**: sin Stripe no hay `stripe_customer_id`. Requiere claves de test o una compra real. |
